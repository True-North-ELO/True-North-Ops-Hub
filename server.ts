import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import fileUpload, { UploadedFile } from "express-fileupload";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import firebaseConfig from "./firebase-applet-config.json";
import { GoogleGenAI } from "@google/genai";

import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";

// Client SDK imports for server-side usage (to bypass admin permission issues)
import { initializeApp as initializeClientApp, getApp as getClientApp, getApps as getClientApps } from 'firebase/app';
import { getFirestore as getClientFirestore, doc as clientDoc, getDoc as clientGetDoc, collection as clientCollection, getDocs as clientGetDocs, query as clientQuery, orderBy as clientOrderBy } from 'firebase/firestore';

const require = createRequire(import.meta.url);
let pdf: any;
try {
  const pdfParse = require("pdf-parse");
  // Robust check for different export patterns in CJS-in-ESM
  if (typeof pdfParse === 'function') {
    pdf = pdfParse;
  } else if (pdfParse && typeof pdfParse.default === 'function') {
    pdf = pdfParse.default;
  } else {
    console.warn("[PDF Engine] pdf-parse required but function export not found matching known patterns.", typeof pdfParse);
    pdf = async () => ({ text: "PDF processing error: Parser not found." });
  }
} catch (err) {
  console.error("Failed to load pdf-parse:", err);
  pdf = async () => ({ text: "PDF processing error: Content unavailable." });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin (Only for batching/back-office tasks if credentials appear)
const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (getApps().length === 0) {
  try {
    if (serviceAccountEnv) {
      initializeApp({
        projectId: firebaseConfig.projectId,
        credential: admin.credential.cert(JSON.parse(serviceAccountEnv))
      });
      console.log("[Firebase Admin] Initialized with explicit Service Account.");
    } else {
      initializeApp({ 
        projectId: firebaseConfig.projectId,
        credential: admin.credential.applicationDefault() 
      });
      console.log("[Firebase Admin] Initialized with Application Default Credentials.");
    }
  } catch (err: any) {
    console.warn("[Firebase Admin] Initialization failed or ambient auth not available:", err.message);
  }
}
const adminApp = getApps().length > 0 ? getApps()[0] : null;

// Initialize Firebase Client SDK on Server (Uses API Key, obeys Security Rules)
if (getClientApps().length === 0) {
  initializeClientApp(firebaseConfig);
}
const clientApp = getClientApp();
const clientDb = getClientFirestore(clientApp, firebaseConfig.firestoreDatabaseId);

// Explicitly bind the Firestore instance to the secondary database ID provided by the configuration
// We use the admin SDK if available, but fallback to client for queries
const db = adminApp ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId) : null;
if (db) db.settings({ ignoreUndefinedProperties: true });

let startupError: any = null;

// Allowlist of permitted hostnames for the single-file URL fetch endpoint (SSRF prevention)
const ALLOWED_FETCH_HOSTNAMES = new Set([
  'drive.google.com',
  'docs.google.com',
  'sheets.googleapis.com',
  'storage.googleapis.com',
]);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '50mb' }));
  app.use(fileUpload());

  // Gemini AI client (server-side only — key never exposed to the client bundle)
  const geminiAI = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

  // Auth middleware: verifies Firebase ID token from Authorization header
  const requireAuth = async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization as string | undefined;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: missing token' });
    }
    const token = authHeader.slice(7);
    try {
      if (!adminApp) {
        return res.status(503).json({ error: 'Auth service unavailable' });
      }
      const decoded = await admin.auth().verifyIdToken(token);
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
    }
  };

  // Rate limiter for protected API routes — prevents abuse of auth-gated endpoints
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  // Stricter limiter for sync/write operations to protect Drive and Firestore quota
  const syncLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many sync requests, please try again later.' },
  });

  const getGemContext = async (gemId: string) => {
    try {
      // Local Fallback Check
      const bootstrapPath = path.join(process.cwd(), `bootstrap_${gemId}.json`);
      let localData: any = { files: [], lastUpdated: new Date().toISOString() };
      if (fs.existsSync(bootstrapPath)) {
        localData = JSON.parse(fs.readFileSync(bootstrapPath, 'utf8'));
      }

      // Use Client SDK for READS - it uses the API Key and respects the "allow read" rules
      const contextRef = clientDoc(clientDb, 'contexts', gemId);
      const docSnap = await clientGetDoc(contextRef);
      
      const filesRef = clientCollection(clientDb, 'contexts', gemId, 'files');
      const filesSnap = await clientGetDocs(clientQuery(filesRef, clientOrderBy('lastUpdated', 'desc')));

      const allFiles = filesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const driveFiles = allFiles.filter(f => f.id.startsWith('drive-'));
      
      // LOGIC: If we have ANY drive-synced files in Firestore, we MUST NOT use the bootstrap files.
      // We also prioritize the driveFiles over any other accidental records in the cloud.
      if (driveFiles.length > 0 || allFiles.length > 0) {
        const resultFiles = (driveFiles.length > 0 ? driveFiles : allFiles) as any[];
        console.log(`[Firestore Context] Found ${allFiles.length} files (${driveFiles.length} synced) for ${gemId}. Ignoring bootstrap data.`);
        const cloudData = (docSnap.exists() ? docSnap.data() : {}) as any;
        return {
          folderId: localData.folderId, // Ensure bootstrap ID is available as a fallback
          ...cloudData,
          lastUpdated: cloudData.lastUpdated || (resultFiles.length > 0 ? resultFiles[0].lastUpdated : new Date().toISOString()),
          files: resultFiles,
          _source: 'cloud'
        };
      }

      console.log(`[Firestore Context] No files found for ${gemId} in cloud. Using bootstrap data.`);
      return { 
        ...localData,
        files: localData.files || [],
        _source: 'bootstrap'
      };
    } catch (err: any) {
      // Suppress noisy permission errors in logs since we expect them without service account
      const isPermissionError = err.message?.includes('PERMISSION_DENIED') || err.code === 'permission-denied';
      
      if (!isPermissionError) {
        console.error(`[Firestore Error] Fetching context for ${gemId}:`, {
          code: err.code,
          message: err.message
        });
      }

      // Fallback to bootstrap data
      const bootstrapPath = path.join(process.cwd(), `bootstrap_${gemId}.json`);
      if (fs.existsSync(bootstrapPath)) {
        return {
          ...JSON.parse(fs.readFileSync(bootstrapPath, 'utf8')),
          _error: err.message
        };
      }
      
      return { files: [], lastUpdated: new Date().toISOString(), _error: err.message };
    }
  };

  const saveFileToContext = async (gemId: string, file: any) => {
    if (!db) {
      console.warn("[Firestore] Admin SDK not available. Skipping server-side write.");
      return;
    }
    
    try {
      const batch = db.batch();
      const contextRef = db.collection('contexts').doc(gemId);
      const fileRef = contextRef.collection('files').doc(file.id);
      
      batch.set(contextRef, { lastUpdated: new Date().toISOString() }, { merge: true });
      batch.set(fileRef, file);
      
      await batch.commit();
    } catch (err: any) {
      if (err.message.includes('PERMISSION_DENIED')) {
        // Just log a warning - the manual sync from the browser is the primary workaround
        console.warn(`[Firestore] Permission Denied for server-side write on ${gemId}. Manual browser sync required.`);
      } else {
        throw err;
      }
    }
  };

  const getDriveClient = () => {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (serviceAccountJson) {
      try {
        const authValue = new GoogleAuth({
          credentials: JSON.parse(serviceAccountJson),
          scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        return google.drive({ version: 'v3', auth: authValue });
      } catch (err) {
        console.error("[Drive Auth] Failed to parse service account JSON:", err);
      }
    }
    
    if (apiKey) {
      return google.drive({ version: 'v3', auth: apiKey });
    }
    
    throw new Error("Missing DRIVE_API_KEY or SERVICE_ACCOUNT_JSON. Please configure in Settings.");
  };

  /**
   * Scans a Google Drive folder and syncs its contents to the knowledge base.
   */
  const syncGoogleDriveFolder = async (gemId: string, folderId: string) => {
    try {
      const drive = getDriveClient();

      const driveRes = await drive.files.list({
        // Broaden query to help debugging if needed, but keeping original types
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, modifiedTime)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const allFiles = driveRes.data.files || [];
      console.log(`[Drive Sync debug] Folder ${folderId} has total ${allFiles.length} items.`);
      
      const files = allFiles.filter(file => 
        file.mimeType === 'text/csv' || 
        file.mimeType === 'application/pdf' || 
        file.mimeType === 'application/vnd.google-apps.spreadsheet' || 
        file.mimeType === 'application/vnd.google-apps.document' ||
        file.mimeType === 'text/plain' ||
        file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      
      console.log(`[Drive Sync Admin] Found ${files.length} compatible items out of ${allFiles.length}`);
      
      const processedFiles: any[] = [];
      for (const file of files) {
        try {
          let content = '';
          let type: 'csv' | 'pdf' | 'link-sheet' = 'csv';

          if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
            const exportRes = await drive.files.export({ fileId: file.id!, mimeType: 'text/csv' });
            content = exportRes.data as string;
            type = 'csv';
          } else if (file.mimeType === 'application/vnd.google-apps.document') {
            const exportRes = await drive.files.export({ fileId: file.id!, mimeType: 'text/plain' });
            content = exportRes.data as string;
            type = 'csv';
          } else {
            const downloadRes = await drive.files.get({ fileId: file.id!, alt: 'media' }, { responseType: 'arraybuffer' });
            if (file.mimeType === 'application/pdf') {
              const pdfData = await pdf(Buffer.from(downloadRes.data as ArrayBuffer));
              content = pdfData.text;
              type = 'pdf';
            } else {
              content = Buffer.from(downloadRes.data as ArrayBuffer).toString('utf-8');
              type = 'csv';
            }
          }

          const CHUNK_SIZE = 900000;
          const byteLength = Buffer.byteLength(content, 'utf8');
          const safeName = (file.name || 'unnamed').toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
          const baseId = `drive-${safeName}`;
          
          if (byteLength <= CHUNK_SIZE) {
            processedFiles.push({
              id: baseId,
              name: file.name!,
              content,
              type,
              lastUpdated: file.modifiedTime || new Date().toISOString(),
              sourceUrl: `https://drive.google.com/file/d/${file.id}/view`
            });
          } else {
            let currentOffset = 0;
            let partNumber = 1;
            while (currentOffset < content.length) {
              let endOffset = currentOffset + Math.floor(content.length * (CHUNK_SIZE / byteLength));
              if (endOffset > content.length) endOffset = content.length;
              if (endOffset < content.length) {
                const nextNewline = content.indexOf('\n', endOffset - 1000);
                if (nextNewline !== -1 && nextNewline < endOffset + 5000) endOffset = nextNewline + 1;
              }
              const chunkContent = content.substring(currentOffset, endOffset);
              processedFiles.push({
                id: `${baseId}-p${partNumber}`,
                name: partNumber === 1 ? file.name! : `${file.name} (Part ${partNumber})`,
                content: chunkContent,
                type,
                lastUpdated: file.modifiedTime || new Date().toISOString(),
                sourceUrl: `https://drive.google.com/file/d/${file.id}/view`
              });
              currentOffset = endOffset;
              partNumber++;
              if (partNumber > 20) break;
            }
          }
        } catch (fileErr) {
          console.error(`[Drive Sync Admin] Error processing ${file.name}:`, fileErr);
        }
      }

      if (db && processedFiles.length > 0) {
        const filesColRef = db.collection('contexts').doc(gemId).collection('files');
        const existingSnap = await filesColRef.get();
        const existingDocsMap = new Map(existingSnap.docs.map(d => [d.id, d.data()]));
        
        const deletions = existingSnap.docs.filter(d => !processedFiles.some(f => f.id === d.id));
        const updates = processedFiles.filter(f => {
          const existing: any = existingDocsMap.get(f.id);
          return !existing || existing.lastUpdated !== f.lastUpdated;
        });

        if (deletions.length > 0 || updates.length > 0) {
          const batch = db.batch();
          deletions.forEach(d => batch.delete(d.ref));
          updates.forEach(f => batch.set(filesColRef.doc(f.id), f));
          batch.set(db.collection('contexts').doc(gemId), { lastUpdated: new Date().toISOString() }, { merge: true });
          await batch.commit();
          console.log(`[Drive Sync Admin] ${gemId} updated: ${updates.length} set, ${deletions.length} deleted.`);
        } else {
          console.log(`[Drive Sync Admin] ${gemId} already up to date.`);
        }
      }
    } catch (rootErr) {
      console.error("[Drive Sync Admin Root Error]:", rootErr);
      throw rootErr;
    }
  };

  /**
   * Deactivates a file from the context.
   */
  const deleteFileFromContext = async (gemId: string, fileId: string) => {
    const batch = db.batch();
    const contextRef = db.collection('contexts').doc(gemId);
    const fileRef = contextRef.collection('files').doc(fileId);
    
    batch.set(contextRef, { lastUpdated: new Date().toISOString() }, { merge: true });
    batch.delete(fileRef);
    
    await batch.commit();
  };

  // Gemini AI proxy — keeps the API key server-side
  app.post("/api/gemini/chat", apiLimiter, requireAuth, async (req, res) => {
    if (!geminiAI) {
      return res.status(503).json({ error: "Gemini API not configured on this server" });
    }
    const { contents, systemInstruction, temperature, model } = req.body;
    try {
      const response = await geminiAI.models.generateContent({
        model: model || "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction,
          temperature: temperature ?? 0.1,
        },
      });
      res.json({ text: response.text });
    } catch (err: any) {
      console.error("[Gemini Proxy Error]:", err.message);
      res.status(500).json({ error: "Gemini API error", details: err.message });
    }
  });

  app.get("/api/drive-contents/:folderId", syncLimiter, requireAuth, async (req, res) => {
    const { folderId } = req.params;
    
    try {
      const drive = getDriveClient();

      const driveRes = await drive.files.list({
        // Broaden query to help debugging if needed, but keeping original types
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, modifiedTime)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const allFiles = driveRes.data.files || [];
      console.log(`[Drive API debug] Folder ${folderId} has total ${allFiles.length} items.`);
      
      const files = allFiles.filter(item => 
        item.mimeType === 'text/csv' || 
        item.mimeType === 'application/pdf' || 
        item.mimeType === 'application/vnd.google-apps.spreadsheet' || 
        item.mimeType === 'application/vnd.google-apps.document' ||
        item.mimeType === 'text/plain' ||
        item.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      
      console.log(`[Drive API] Found ${files.length} compatible items out of ${allFiles.length}`);
      
      const processedFiles = [];

      for (const file of files) {
        try {
          let content = '';
          let type: 'csv' | 'pdf' | 'link-sheet' = 'csv';

          if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
            const exportRes = await drive.files.export({
              fileId: file.id!,
              mimeType: 'text/csv',
            });
            content = exportRes.data as string;
            type = 'csv';
          } else if (file.mimeType === 'application/vnd.google-apps.document') {
            const exportRes = await drive.files.export({
              fileId: file.id!,
              mimeType: 'text/plain',
            });
            content = exportRes.data as string;
            type = 'csv'; // Store as text-based csv/text for simplicity
          } else {
            const downloadRes = await drive.files.get({
              fileId: file.id!,
              alt: 'media',
            }, { responseType: 'arraybuffer' });

            if (file.mimeType === 'application/pdf') {
              const pdfData = await pdf(Buffer.from(downloadRes.data as ArrayBuffer));
              content = pdfData.text;
              type = 'pdf';
            } else {
              content = Buffer.from(downloadRes.data as ArrayBuffer).toString('utf-8');
              type = 'csv';
            }
          }

          // CHUNKING LOGIC: Firestore limit is 1MB per doc
          // We chunk at ~900KB to leave room for other fields/metadata
          const CHUNK_SIZE = 900000; 
          const byteLength = Buffer.byteLength(content, 'utf8');
          
          const safeName = (file.name || 'unnamed').toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
          const baseId = `drive-${safeName}`;
          
          if (byteLength <= CHUNK_SIZE) {
            processedFiles.push({
              id: baseId,
              name: file.name!,
              content,
              type,
              lastUpdated: file.modifiedTime || new Date().toISOString(),
              sourceUrl: `https://drive.google.com/file/d/${file.id}/view`
            });
          } else {
            // Split content into chunks
            let currentOffset = 0;
            let partNumber = 1;
            
            while (currentOffset < content.length) {
              // Find a safe break point (newline or space) near CHUNK_SIZE
              let endOffset = currentOffset + Math.floor(content.length * (CHUNK_SIZE / byteLength));
              if (endOffset > content.length) endOffset = content.length;
              
              // Try to find a newline roughly at this point
              if (endOffset < content.length) {
                const nextNewline = content.indexOf('\n', endOffset - 1000);
                if (nextNewline !== -1 && nextNewline < endOffset + 5000) {
                  endOffset = nextNewline + 1;
                }
              }

              const chunkContent = content.substring(currentOffset, endOffset);
              processedFiles.push({
                id: `${baseId}-p${partNumber}`,
                name: partNumber === 1 ? file.name! : `${file.name} (Part ${partNumber})`,
                content: chunkContent,
                type,
                lastUpdated: file.modifiedTime || new Date().toISOString(),
                sourceUrl: `https://drive.google.com/file/d/${file.id}/view`
              });

              currentOffset = endOffset;
              partNumber++;
              if (partNumber > 20) break; // Hard safety limit
            }
          }
        } catch (fileErr: any) {
          console.error(`[Drive Sync API] Error processing ${file.name}:`, fileErr.message);
        }
      }

      res.json({ files: processedFiles, totalFound: allFiles.length });
    } catch (err: any) {
      console.error("[Drive Sync API Error]:", err.message);
      res.status(500).json({ error: "Failed to fetch Drive contents", details: err.message });
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/debug/firebase", apiLimiter, requireAuth, async (req, res) => {
    try {
      await db.collection('test').doc('ping').set({ time: new Date().toISOString() });
      const snap = await db.collection('test').doc('ping').get();
      res.json({
        ok: true,
        project: firebaseConfig.projectId,
        database: firebaseConfig.firestoreDatabaseId,
        testDoc: snap.data(),
        startupError
      });
    } catch (err: any) {
      res.status(500).json({
        ok: false,
        error: err.message,
        code: err.code,
        startupError
      });
    }
  });

  // Startup Connection Test
  try {
    if (db) {
       console.log(`[Startup] Initializing manual write test...`);
       await db.collection('test').doc('connection').set({ 
         timestamp: new Date().toISOString(), 
         connected: true 
       });
       const test = await db.collection('test').doc('connection').get();
       console.log(`[Startup] Firestore connection successful. Test doc exists: ${test.exists}`);
    } else {
       console.warn("[Startup] Admin SDK not available. Skipping write test.");
    }
  } catch (err: any) {
    startupError = { code: err.code, message: err.message };
    if (err.message.includes('PERMISSION_DENIED')) {
      console.warn(`[Startup] Firestore Permission Denied. Background sync features will be limited until a Service Account is provided.`);
    } else {
      console.error(`[Startup] Firestore Connection Failed:`, startupError);
    }
  }

  // Global Sync Trigger (for crons or manual refreshes of all folder-bound gems)
  app.post("/api/sync-all", syncLimiter, requireAuth, async (req, res) => {
    try {
      const contextsSnap = await db.collection('contexts').get();
      const results: any[] = [];
      
      for (const doc of contextsSnap.docs) {
        const data = doc.data();
        if (data.folderId) {
          console.log(`[Auto-Sync] Triggering sync for ${doc.id} (folder: ${data.folderId})`);
          await syncGoogleDriveFolder(doc.id, data.folderId);
          results.push({ gemId: doc.id, folderId: data.folderId, status: 'synced' });
        }
      }
      
      res.json({ success: true, results });
    } catch (err) {
      console.error("[Auto-Sync Error]:", err);
      res.status(500).json({ error: "Failed to trigger global sync" });
    }
  });

  // Get current context for a specific Gem
  app.get("/api/context/:gemId", async (req, res) => {
    const { gemId } = req.params;
    try {
        const context = await getGemContext(gemId);
        res.json(context);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load context" });
    }
  });

  // Update tuning/custom instructions
  app.post("/api/context/:gemId/tuning", apiLimiter, requireAuth, async (req, res) => {
    const { gemId } = req.params;
    const { instructions, description } = req.body;
    try {
      console.log(`[Admin] Updating tuning for ${gemId}...`);
      await db.collection('contexts').doc(gemId).set({
        customInstructions: instructions,
        customDescription: description,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      const updatedContext = await getGemContext(gemId);
      res.json({ success: true, context: updatedContext });
    } catch (err: any) {
      console.error(`[Admin Error] Failed to update tuning for ${gemId}:`, err);
      res.status(500).json({ 
        error: "Failed to update tuning", 
        details: err.message,
        code: err.code 
      });
    }
  });

  // Upload/Update a specific file context
  app.post("/api/context/:gemId/upload", syncLimiter, requireAuth, async (req: any, res) => {
    const { gemId } = req.params;
    const { type, name } = req.body;
    
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    const uploadedFile = req.files.file as UploadedFile;
    let content = "";

    try {
      if (type === 'pdf') {
        const data = await pdf(uploadedFile.data);
        content = data.text;
      } else {
        content = uploadedFile.data.toString('utf8');
      }

      const fileId = Math.random().toString(36).substr(2, 9);
      const newFile = {
        name: name || uploadedFile.name,
        content,
        type: type || 'csv',
        lastUpdated: new Date().toISOString()
      };

      await saveFileToContext(gemId, { ...newFile, id: fileId });
      
      const updatedContext = await getGemContext(gemId);
      res.json({ success: true, context: updatedContext });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to process file upload" });
    }
  });

  // Automation endpoint
  app.post("/api/context/:gemId", apiLimiter, requireAuth, async (req, res) => {
    const { gemId } = req.params;
    const { content, filename = 'Auto-Sync Data' } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    try {
        const fileId = `sync-${filename.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
        const newFile = {
            id: fileId,
            name: filename,
            content,
            type: 'csv',
            lastUpdated: new Date().toISOString()
        };

        await saveFileToContext(gemId, newFile);
        res.json({ success: true, lastUpdated: new Date().toISOString() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to sync data" });
    }
  });

  // Delete a specific file
  app.delete("/api/context/:gemId/file/:fileId", apiLimiter, requireAuth, async (req, res) => {
    const { gemId, fileId } = req.params;
    try {
        await deleteFileFromContext(gemId, fileId);
        const updatedContext = await getGemContext(gemId);
        res.json({ success: true, context: updatedContext });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Fetch from URL (for Google Drive Hooks)
  app.post("/api/context/:gemId/fetch", syncLimiter, requireAuth, async (req, res) => {
    const { gemId } = req.params;
    const { url, name = "GDrive Sync" } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      // Check if this is a folder URL
      const folderMatch = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      if (folderMatch) {
        const folderId = folderMatch[1];
        // Save folder ID to the gem context for automated refreshes
        await db.collection('contexts').doc(gemId).set({ folderId }, { merge: true });
        await syncGoogleDriveFolder(gemId, folderId);
        return res.json({ success: true, isFolder: true, lastUpdated: new Date().toISOString() });
      }

      // Validate URL before fetching (SSRF prevention)
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return res.status(400).json({ error: "Invalid URL" });
      }
      if (parsedUrl.protocol !== 'https:') {
        return res.status(400).json({ error: "Only HTTPS URLs are allowed" });
      }
      if (!ALLOWED_FETCH_HOSTNAMES.has(parsedUrl.hostname)) {
        return res.status(400).json({ error: "URL hostname is not permitted. Allowed: drive.google.com, docs.google.com, sheets.googleapis.com, storage.googleapis.com" });
      }

      // Handle single file fetch
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch data from URL");
      
      const content = await response.text();
      // Generate a reproducible ID based on the name to allow updates but prevent collisions
      const fileId = name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'gdrive-hook';
      
      const newFile = {
        id: fileId,
        name: name,
        content,
        type: 'link-sheet',
        lastUpdated: new Date().toISOString(),
        sourceUrl: url
      };

      await saveFileToContext(gemId, newFile);
      res.json({ success: true, lastUpdated: new Date().toISOString() });
    } catch (err: any) {
      console.error(`[Fetch Sync Error for ${gemId}]:`, err.message || err);
      res.status(500).json({ error: "Failed to fetch and sync from the provided URL", details: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
