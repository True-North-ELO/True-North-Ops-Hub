import "dotenv/config";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdf = require("pdf-parse");
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const folderId = '1XRiZp3jFeKK61BpSeBDRLKVQLK-0fGas';

async function fullSyncTest() {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    console.log('--- Google Drive Connectivity Test ---');
    console.log('Folder ID:', folderId);
    
    const drive = google.drive({ version: 'v3', auth: apiKey });

    try {
        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType)',
        });

        const files = res.data.files || [];
        console.log(`Found ${files.length} files in Drive folder.`);

        const sampleFile = files.find(f => f.mimeType === 'text/csv' || f.name.endsWith('.csv'));
        if (sampleFile) {
            console.log(`\n--- Sampling File: ${sampleFile.name} ---`);
            const download = await drive.files.get({
                fileId: sampleFile.id!,
                alt: 'media',
            }, { responseType: 'arraybuffer' });
            
            const content = Buffer.from(download.data as ArrayBuffer).toString('utf8');
            console.log('Content Preview (100 chars):', content.substring(0, 100).replace(/\n/g, ' '));
            console.log('✅ Drive Download SUCCESS');
        }

        console.log('\n--- Firestore Persistence Test ---');
        admin.initializeApp({ 
            projectId: firebaseConfig.projectId,
            credential: admin.credential.applicationDefault() 
        });
        const db = getFirestore(admin.apps[0], firebaseConfig.firestoreDatabaseId);

        console.log('Attempting to save sync status to contexts/rcm...');
        await db.collection('contexts').doc('rcm').set({
            folderId: folderId,
            lastSyncTest: new Date().toISOString(),
            syncStatus: 'Development Test'
        }, { merge: true });
        console.log('✅ Firestore Write SUCCESS');

    } catch (err: any) {
        console.error('\n❌ TEST FAILED');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        if (err.details) console.error('Details:', err.details);
    }
}

fullSyncTest();
