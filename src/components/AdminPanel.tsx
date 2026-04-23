import React, { useState } from 'react';
import { Upload, CheckCircle2, AlertCircle, Terminal, Copy, Save, FileSpreadsheet, ShieldCheck, LayoutDashboard, FileText, Link as LinkIcon, RefreshCw, Trash2, File as FileIcon, LogIn, LogOut, UserCheck, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GemId, GemContext, GemFile, FeedbackData } from '../types';
import { cn } from '../lib/utils';
import { useFirebase } from './FirebaseProvider';
import TrueNorthLogo from './TrueNorthLogo';
import Papa from 'papaparse';

import { setDoc, doc, writeBatch, collection, getDocs, deleteDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AdminPanelProps {
  contexts: Record<GemId, GemContext>;
  onUpdate: (id: GemId, context: GemContext) => void;
}

export default function AdminPanel({ contexts, onUpdate }: AdminPanelProps) {
  const { user, login, logout, isDbReady } = useFirebase();
  const [isUpdating, setIsUpdating] = useState<GemId | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [previewFile, setPreviewFile] = useState<GemFile | null>(null);
  const [urlHook, setUrlHook] = useState({ url: '', name: '' });
  const [tuningText, setTuningText] = useState<Record<GemId, string>>({
    sop: contexts.sop?.customInstructions || '',
    rcm: contexts.rcm?.customInstructions || '',
    admin: ''
  });
  const [descriptionText, setDescriptionText] = useState<Record<GemId, string>>({
    sop: contexts.sop?.customDescription || '',
    rcm: contexts.rcm?.customDescription || '',
    admin: ''
  });
  const [folderIdText, setFolderIdText] = useState<Record<GemId, string>>({
    sop: contexts.sop?.folderId || '',
    rcm: contexts.rcm?.folderId || '',
    admin: ''
  });
  const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);

  const isAdmin = user?.email === "aaron.bombich@truenorthllp.com";

  // Fetch feedback
  React.useEffect(() => {
    async function fetchFeedback() {
      if (!isDbReady || !isAdmin) return;
      try {
        const q = query(collection(db, 'feedback'), orderBy('timestamp', 'desc'), limit(50));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as FeedbackData));
        setFeedbacks(data);
      } catch (err) {
        console.error("Failed to fetch feedback:", err);
      }
    }
    fetchFeedback();
  }, [isDbReady, isAdmin]);

  // Load from contexts prop on change
  React.useEffect(() => {
    setTuningText({
      sop: contexts.sop?.customInstructions || '',
      rcm: contexts.rcm?.customInstructions || '',
      admin: ''
    });
    setDescriptionText({
      sop: contexts.sop?.customDescription || '',
      rcm: contexts.rcm?.customDescription || '',
      admin: ''
    });
    setFolderIdText({
      sop: contexts.sop?.folderId || '',
      rcm: contexts.rcm?.folderId || '',
      admin: ''
    });
  }, [contexts]);

  const handleSyncDrive = async (gemId: GemId) => {
    const folderId = folderIdText[gemId];
    if (!folderId) {
      setMessage({ type: 'error', text: 'Please enter a Folder ID first.' });
      return;
    }

    setIsUpdating(gemId);
    setMessage({ type: 'success', text: 'Fetching Drive contents...' });

    try {
      // 1. Fetch processed contents from server (server has GDrive API Key)
      const res = await fetch(`/api/drive-contents/${folderId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch Drive contents");
      }
      const { files, totalFound } = await res.json();

      if (!files || files.length === 0) {
        if (totalFound === 0) {
          throw new Error("No files found in Drive folder. Ensure the folder is not empty and the Service Account has been invited to it.");
        } else {
          throw new Error(`Found ${totalFound} items, but none are compatible (must be PDF, CSV, Excel, or Google Doc).`);
        }
      }

      setMessage({ type: 'success', text: `Found ${files.length} files. Wiping prior knowledge base...` });

      // 2. Diff-based Sync Optimization (Save Quota)
      const filesColRef = collection(db, 'contexts', gemId, 'files');
      let existingSnap = await getDocs(filesColRef);
      const existingFilesMap = new Map(existingSnap.docs.map(d => [d.id, d.data()]));
      const incomingFilesMap = new Map(files.map((f: any) => [f.id, f]));
      
      // Calculate changes
      const deletions = existingSnap.docs
        .filter(d => !incomingFilesMap.has(d.id))
        .map(d => ({ type: 'delete', ref: d.ref }));

      const updates = files
        .filter((f: any) => {
          const existing: any = existingFilesMap.get(f.id);
          // Only sync if file is missing OR has a different timestamp/content footprint
          return !existing || existing.lastUpdated !== f.lastUpdated;
        })
        .map((f: any) => ({ type: 'set_file', ref: doc(db, 'contexts', gemId, 'files', f.id), data: f }));

      const allOperations = [
        ...deletions,
        { type: 'set_meta', ref: doc(db, 'contexts', gemId), data: { lastUpdated: new Date().toISOString(), folderId }, options: { merge: true } },
        ...updates
      ];

      if (deletions.length === 0 && updates.length === 0) {
        // Even if no files changed, update the metadata to show a check was performed
        const metaRef = doc(db, 'contexts', gemId);
        await setDoc(metaRef, { lastUpdated: new Date().toISOString(), folderId }, { merge: true });
        
        // Refresh local state to show updated time
        const refreshGemRes = await fetch(`/api/context/${gemId}?t=${Date.now()}`); 
        if (refreshGemRes.ok) onUpdate(gemId, await refreshGemRes.json());
        if (gemId !== 'rcm') {
          const refreshRcmRes = await fetch(`/api/context/rcm?t=${Date.now()}`);
          if (refreshRcmRes.ok) onUpdate('rcm', await refreshRcmRes.json());
        }

        setMessage({ type: 'success', text: "Knowledge base verified. Metadata updated." });
        setIsUpdating(null);
        return;
      }

      // Chunk operations into batches of 400
      const CHUNK_SIZE = 400;
      const totalSteps = Math.ceil(allOperations.length / CHUNK_SIZE);
      
      for (let i = 0; i < allOperations.length; i += CHUNK_SIZE) {
        const step = Math.floor(i / CHUNK_SIZE) + 1;
        setMessage({ type: 'success', text: `Syncing: Batch ${step}/${totalSteps} (${allOperations.length} total operations)...` });
        
        const chunk = allOperations.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        chunk.forEach(op => {
          if (op.type === 'delete' && op.ref) batch.delete(op.ref);
          else if ((op.type === 'set_meta' || op.type === 'set_file') && op.ref) batch.set(op.ref, op.data, op.options || {});
        });
        await batch.commit();
      }

      // Verification Step
      setMessage({ type: 'success', text: `Sync complete. Verifying records...` });
      const finalSnap = await getDocs(filesColRef);
      console.log(`[Sync Verify] Knowledge base now has ${finalSnap.size} records.`);

      // Refresh local state to show new files
      const refreshGemRes = await fetch(`/api/context/${gemId}?t=${Date.now()}`); // Cache bust
      if (refreshGemRes.ok) {
        const updatedContext = await refreshGemRes.json();
        onUpdate(gemId, updatedContext);
      }

      // If we synced something else, also refresh RCM context to ensure the Global Refresh time remains accurate
      if (gemId !== 'rcm') {
        const refreshRcmRes = await fetch(`/api/context/rcm?t=${Date.now()}`);
        if (refreshRcmRes.ok) {
          const rcmContext = await refreshRcmRes.json();
          onUpdate('rcm', rcmContext);
        }
      }

      setMessage({ type: 'success', text: `Successfully synced. Knowledge base now has ${finalSnap.size} documents.` });
    } catch (err: any) {
      console.error(err);
      let errorMsg = err.message || 'Drive Sync failed.';
      
      if (errorMsg.includes('resource-exhausted') || errorMsg.includes('Quota exceeded')) {
        errorMsg = "Firestore Daily Quota Reached (20k writes). This usually resets at midnight Pacific Time. I have optimized the sync to prevent this in the future, but you may need to wait for the reset.";
      }
      
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleUrlSync = async (gemId: GemId) => {
    if (!urlHook.url.includes('google.com')) {
      setMessage({ type: 'error', text: 'Please provide a valid Google Sheets CSV export link.' });
      return;
    }

    if (!urlHook.name) {
      setMessage({ type: 'error', text: 'Please provide a name for this source.' });
      return;
    }

    setIsUpdating(gemId);
    try {
      const response = await fetch(`/api/context/${gemId}/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlHook.url, name: urlHook.name })
      });

      if (!response.ok) throw new Error("Sync failed");
      
      // Update global context metadata via Web SDK for immediate UI feedback
      await setDoc(doc(db, 'contexts', gemId), { lastUpdated: new Date().toISOString() }, { merge: true });

      const updatedContext = await (await fetch(`/api/context/${gemId}`)).json();
      onUpdate(gemId, updatedContext);
      setMessage({ type: 'success', text: `${urlHook.name} synced successfully!` });
      setUrlHook({ url: '', name: '' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to sync. Ensure link is "Anyone with link".' });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleFileUpload = async (gemId: GemId, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdating(gemId);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', file.type === 'application/pdf' ? 'pdf' : 'csv');
    formData.append('name', file.name);

    try {
      const response = await fetch(`/api/context/${gemId}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error("Upload failed");
      
      const data = await response.json();
      onUpdate(gemId, data.context);
      setMessage({ type: 'success', text: `Added ${file.name} to Knowledge Base` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to upload document.' });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteFile = async (gemId: GemId, fileId: string) => {
    try {
      if (!isDbReady) {
         setMessage({ type: 'error', text: 'Database not ready.' });
         return;
      }

      // Delete directly via Web SDK to bypass server permission issues
      const fileRef = doc(db, 'contexts', gemId, 'files', fileId);
      await deleteDoc(fileRef);
      
      // Update global context metadata
      await setDoc(doc(db, 'contexts', gemId), { lastUpdated: new Date().toISOString() }, { merge: true });

      // Refresh local state
      const response = await fetch(`/api/context/${gemId}`);
      if (response.ok) {
        const data = await response.json();
        onUpdate(gemId, data);
      }
      
      setMessage({ type: 'success', text: 'File removed from knowledge base' });
    } catch (err: any) {
      console.error("Delete error:", err);
      setMessage({ type: 'error', text: `Failed to remove file: ${err.message}` });
    }
  };

  const handleSaveTuning = async (gemId: GemId) => {
    if (!isDbReady) {
      setMessage({ type: 'error', text: 'Database is not ready. Please refresh.' });
      return;
    }
    
    setIsUpdating(gemId);
    try {
      // 1. Write DIRECTLY to Firestore via Web SDK (authorized by rules + user auth)
      const contextRef = doc(db, 'contexts', gemId);
      const updateData = {
        customInstructions: tuningText[gemId],
        customDescription: descriptionText[gemId],
        folderId: folderIdText[gemId],
        lastUpdated: new Date().toISOString()
      };

      await setDoc(contextRef, updateData, { merge: true });
      
      // 2. Local update for UI responsiveness
      onUpdate(gemId, {
        ...contexts[gemId],
        ...updateData
      });

      setMessage({ type: 'success', text: `Saved custom instructions for ${gemId === 'sop' ? 'SOP Assistant' : 'RCM Ops Hub'}` });
    } catch (err: any) {
      console.error("Save failure:", err);
      setMessage({ type: 'error', text: `Failed to save: ${err.message}` });
    } finally {
      setIsUpdating(null);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
        <TrueNorthLogo className="transform scale-150 mb-4" />
        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl font-bold text-stone-800 tracking-tight">Admin Authentication Required</h2>
          <p className="text-stone-500 max-w-xs mx-auto text-sm leading-relaxed">
            Access to data management and sync controls requires a verified True North administrative account.
          </p>
        </div>
        <button 
          onClick={login}
          className="flex items-center gap-2 px-8 py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-200"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="w-20 h-20 bg-rose-50 rounded-[2.5rem] flex items-center justify-center text-rose-500">
          <AlertCircle size={40} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="font-display text-2xl font-bold text-stone-800">Access Restricted</h2>
          <p className="text-stone-500 max-w-xs mx-auto text-sm">
            Logged in as <span className="font-bold text-stone-800">{user.email}</span>. Only Aaron Bombich has permission to modify the Hub knowledge base.
          </p>
        </div>
        <button 
          onClick={logout}
          className="text-stone-400 font-bold uppercase tracking-widest text-[10px] hover:text-stone-600 underline"
        >
          Switch Account
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 p-8 relative">
      {/* Header bar with user profile */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-full border border-orange-100 shadow-sm">
             <UserCheck size={14} />
             <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Verified Admin: Aaron Bombich</span>
          </div>

          <div className="flex items-center gap-2 px-4 py-2 bg-stone-50 border border-stone-100 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
            </span>
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest leading-none">
              Last Hub Sync: {contexts.rcm?.lastUpdated ? new Date(contexts.rcm?.lastUpdated).toLocaleString() : 'Pending'}
            </span>
          </div>
        </div>

        <button 
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <LogOut size={14} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Sign Out</span>
        </button>
      </div>

      {/* Stat Bar */}
      <div className="flex gap-4 mb-8">
        <div className="flex-1 bg-white p-4 rounded-2xl border border-stone-100 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-sage/10 flex items-center justify-center text-sage">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Enterprise Context</p>
            <p className="text-sm font-bold text-stone-700 leading-none mt-1">Multi-Doc Knowledge Base</p>
          </div>
        </div>
        <div className="flex-1 bg-white p-4 rounded-2xl border border-stone-100 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <LayoutDashboard size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Data Streams</p>
            <p className="text-sm font-bold text-stone-700 leading-none mt-1">PDFs, CSVs & Sheets</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {(['sop', 'rcm'] as GemId[]).map((id) => (
          <div key={id} className="card-natural p-6 flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl",
                  id === 'sop' ? "bg-stone-50 text-stone-600" : "bg-moss/40 text-sage"
                )}>
                  {id === 'sop' ? <FileIcon size={20} /> : <FileSpreadsheet size={20} />}
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-stone-800">{id === 'sop' ? 'SOP Assistant' : 'RCM Ops Hub'}</h3>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] text-stone-500 font-medium">Knowledge Base Control</p>
                    {contexts[id]?.folderId && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-50 text-[8px] font-bold text-orange-600 rounded border border-orange-100 uppercase tracking-tighter">
                        <RefreshCw size={8} className="animate-spin-slow" />
                        Daily Auto-Refresh
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-sage/10 text-sage border border-sage/20">
                {contexts[id]?.files?.length || 0} Docs
              </div>
            </div>

            <div className="mb-6 p-4 bg-stone-50 rounded-2xl border border-stone-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                  <LinkIcon size={12} />
                  <span>Google Drive Folder (Auto-Sync)</span>
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  placeholder="Paste Folder ID (from URL)..." 
                  className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none"
                  value={folderIdText[id]}
                  onChange={(e) => setFolderIdText(prev => ({ ...prev, [id]: e.target.value }))}
                />
                <button 
                  onClick={() => handleSaveTuning(id)}
                  disabled={isUpdating === id}
                  className="px-3 py-1 bg-stone-900 text-white text-[9px] font-bold rounded-lg hover:bg-stone-800 transition-colors uppercase tracking-widest disabled:opacity-50"
                >
                  Set Folder
                </button>
                <button 
                  onClick={() => handleSyncDrive(id)}
                  disabled={isUpdating === id || !folderIdText[id]}
                  className="px-3 py-1 bg-sage text-white text-[9px] font-bold rounded-lg hover:bg-sage/80 transition-colors uppercase tracking-widest disabled:opacity-50 flex items-center gap-1"
                >
                  <RefreshCw size={10} className={isUpdating === id ? 'animate-spin' : ''} />
                  <span>Sync Now</span>
                </button>
              </div>
              
              <div className="flex items-center gap-2 mb-2 text-[9px] font-bold text-stone-400 uppercase tracking-widest pt-2 border-t border-stone-100">
                <FileSpreadsheet size={12} />
                <span>One-Time Drive Import (CSV Hook)</span>
              </div>
              <div className="space-y-2">
                <input 
                  type="text" 
                  placeholder="Source Name (e.g. Master Tracker)" 
                  className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none"
                  value={isUpdating === id ? '' : (urlHook.name)}
                  onChange={(e) => setUrlHook(prev => ({ ...prev, name: e.target.value }))}
                />
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Paste GDrive CSV Hook..." 
                    className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs outline-none"
                    value={isUpdating === id ? '' : (urlHook.url)}
                    onChange={(e) => setUrlHook(prev => ({ ...prev, url: e.target.value }))}
                  />
                  <button 
                    onClick={() => handleUrlSync(id)}
                    disabled={isUpdating === id || !urlHook.url || !urlHook.name}
                    className="p-2 bg-sage text-white rounded-lg disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={isUpdating === id ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 mb-6 overflow-y-auto max-h-[300px] pr-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] text-stone-400 font-bold uppercase tracking-widest italic">Current Documents</p>
                <button 
                  onClick={async () => {
                    if (!confirm('Are you sure you want to permanently delete all documents in this knowledge base?')) return;
                    setIsUpdating(id);
                    try {
                      const snap = await getDocs(collection(db, 'contexts', id, 'files'));
                      if (snap.size === 0) {
                        setMessage({ type: 'success', text: 'Knowledge base is already empty.' });
                        return;
                      }
                      const batch = writeBatch(db);
                      snap.docs.forEach(d => batch.delete(d.ref));
                      await batch.commit();
                      
                      // Refresh
                      const refreshRes = await fetch(`/api/context/${id}`);
                      if (refreshRes.ok) onUpdate(id, await refreshRes.json());
                      
                      setMessage({ type: 'success', text: `Successfully wiped ${snap.size} documents.` });
                    } catch (err: any) {
                      setMessage({ type: 'error', text: err.message });
                    } finally {
                      setIsUpdating(null);
                    }
                  }}
                  className="text-[9px] text-red-400 hover:text-red-500 font-bold uppercase tracking-widest underline decoration-dotted"
                  disabled={isUpdating === id}
                >
                  Wipe All
                </button>
              </div>
              {(!contexts[id]?.files || contexts[id].files.length === 0) ? (
                <div className="text-center py-8 text-stone-300 italic text-xs">No files added yet</div>
              ) : (
                contexts[id].files.map(file => (
                  <div key={file.id} className="p-3 bg-white border border-stone-100 rounded-xl flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      {file.type === 'pdf' ? <FileIcon size={16} className="text-rose-400" /> : <FileSpreadsheet size={16} className="text-sage" />}
                      <div>
                        <p className="text-[11px] font-bold text-stone-700 truncate max-w-[120px]">{file.name}</p>
                        <p className="text-[9px] text-stone-400">{new Date(file.lastUpdated).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setPreviewFile(file)}
                        className="p-1.5 hover:bg-stone-50 rounded text-stone-400 hover:text-stone-700"
                      >
                        <FileText size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteFile(id, file.id)}
                        className="p-1.5 hover:bg-rose-50 rounded text-stone-300 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <label className={cn(
              "flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed transition-all cursor-pointer text-[10px] font-bold uppercase tracking-widest mb-6",
              isUpdating === id 
                ? "bg-stone-50 border-stone-200 opacity-50 cursor-wait" 
                : "bg-stone-900 text-white border-stone-900 hover:bg-stone-800 shadow-lg"
            )}>
              <input 
                type="file" 
                accept={id === 'sop' ? ".pdf,.csv" : ".csv"} 
                className="hidden" 
                onChange={(e) => handleFileUpload(id, e)}
                disabled={isUpdating === id}
              />
              <Upload size={14} className={isUpdating === id ? 'animate-bounce' : ''} />
              <span>Add Document</span>
            </label>

            <div className="pt-6 border-t border-stone-100 space-y-6">
               <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                      <Terminal size={12} />
                      <span>Agent Overview (Public Description)</span>
                    </div>
                  </div>
                  <textarea 
                    className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3 text-[11px] leading-relaxed outline-none focus:ring-2 focus:ring-sage/20 min-h-[60px] resize-none"
                    placeholder="Briefly describe what this agent does..."
                    value={descriptionText[id]}
                    onChange={(e) => setDescriptionText(prev => ({ ...prev, [id]: e.target.value }))}
                  />
               </div>

               <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                      <Terminal size={12} />
                      <span>Agent Instructions & Tuning</span>
                    </div>
                    <button 
                      onClick={() => handleSaveTuning(id)}
                      disabled={isUpdating === id}
                      className="flex items-center gap-1.5 px-3 py-1 bg-sage/10 text-sage text-[9px] font-bold rounded-lg hover:bg-sage/20 transition-colors uppercase tracking-widest disabled:opacity-50"
                    >
                      <Save size={10} />
                      Save Settings
                    </button>
                </div>
                <textarea 
                    className="w-full bg-stone-50 border border-stone-100 rounded-xl p-3 text-[11px] font-mono leading-relaxed outline-none focus:ring-2 focus:ring-sage/20 min-h-[300px] resize-y"
                    placeholder={id === 'rcm' 
                      ? "Example: When asked about collector assignment, prioritize the 'Primary Collector' column from the RP Roles file..." 
                      : "Example: Focus on extracted text from TN Scribe Library for link lookups..."
                    }
                    value={tuningText[id]}
                    onChange={(e) => setTuningText(prev => ({ ...prev, [id]: e.target.value }))}
                />
                <p className="mt-2 text-[9px] text-stone-400 italic">
                  Provide specific corrections or "golden rules" to improve the assistant's accuracy for this department.
                </p>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-sage/10 text-sage rounded-lg">
                      {previewFile.type === 'pdf' ? <FileIcon size={20} /> : <FileSpreadsheet size={20} />}
                   </div>
                   <div>
                     <h3 className="font-display text-lg font-bold">{previewFile.name}</h3>
                     <p className="text-[10px] text-stone-400">{previewFile.type.toUpperCase()} • Extracted Context</p>
                   </div>
                </div>
                <button 
                  onClick={() => setPreviewFile(null)}
                  className="p-2 hover:bg-stone-100 rounded-full"
                >
                  <AlertCircle className="rotate-45" size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-8 font-mono text-[11px] bg-stone-50 text-stone-600 leading-relaxed whitespace-pre-wrap">
                {previewFile.content}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Feedback Toast */}
      {message && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 border",
            message.type === 'success' ? "bg-stone-900 text-white border-stone-800" : "bg-rose-900 text-white border-rose-800"
          )}
        >
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold">{message.text}</span>
        </motion.div>
      )}

      {/* Accuracy Guide */}
      <div className="card-natural p-8 border-l-4 border-l-sage mb-8">
        <div className="flex items-start gap-4 mb-6">
          <Terminal className="text-sage shrink-0 mt-1" size={24} />
          <div>
            <h3 className="text-xl font-bold font-display">Python Automation Bridge</h3>
            <p className="text-stone-500 mt-1 text-sm leading-relaxed">
              Maintain high accuracy by using the True North data pipeline. 
              Configure your OneDrive python script to push CSV updates directly to the knowledge base.
            </p>
          </div>
        </div>

        <div className="bg-stone-900 rounded-2xl p-6 overflow-x-auto relative group">
          <div className="absolute right-4 top-4 px-3 py-1 rounded-full text-[8px] font-bold bg-white/10 text-white/40 uppercase tracking-widest">Setup Guide</div>
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-4">Automation & Folders</p>
          <div className="space-y-4 text-stone-300 text-[11px] leading-relaxed">
            <p>
              <strong className="text-white">To Sync Folders:</strong> This Hub can now crawl entire Google Drive folders! 
              To enable this, you must provide a Google Drive API Key or Service Account in the <strong className="text-white">Settings</strong> menu.
            </p>
            <ul className="list-disc pl-4 space-y-2 text-stone-400">
              <li>Open Google Cloud Console and enable the <code className="text-orange-400">Google Drive API</code>.</li>
              <li>Create an <code className="text-orange-400">API Key</code> and paste it into <code className="text-white">GOOGLE_DRIVE_API_KEY</code>.</li>
              <li>Ensure your GDrive folder is set to <code className="text-white">"Anyone with the link can view"</code>.</li>
              <li>For private folders, create a Service Account, download the JSON, and paste it into <code className="text-white">GOOGLE_SERVICE_ACCOUNT_JSON</code>.</li>
            </ul>
          </div>
        </div>
      </div>
      {/* User Feedback Section */}
      {isAdmin && feedbacks.length > 0 && (
        <div className="card-natural p-10 mb-8 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-display font-bold text-stone-800">User Correction Feed</h3>
              <p className="text-sm text-stone-400 mt-1">Direct feedback from coworkers to improve agent accuracy.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-stone-50 rounded-xl border border-stone-100">
               <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total Reports: {feedbacks.length}</span>
            </div>
          </div>

          <div className="space-y-6">
            {feedbacks.map((f) => (
              <div key={f.id} className={cn(
                "p-6 rounded-2xl border transition-all",
                f.type === 'down' ? "bg-rose-50/30 border-rose-100" : "bg-sage/5 border-sage/10"
              )}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      f.type === 'down' ? "bg-rose-100 text-rose-600" : "bg-sage/20 text-sage"
                    )}>
                      {f.type === 'down' ? <ThumbsDown size={14} /> : <ThumbsUp size={14} />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-stone-800 uppercase tracking-wide">{f.gemId.toUpperCase()} Agent Feedback</div>
                      <div className="text-[10px] text-stone-400">{f.userEmail} • {new Date(f.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {f.comment && (
                  <div className="mb-4 p-4 bg-white rounded-xl border border-stone-100 shadow-sm italic text-sm text-stone-600 flex items-start gap-3">
                    <MessageSquare size={14} className="text-stone-300 shrink-0 mt-0.5" />
                    "{f.comment}"
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">User Asked</p>
                    <p className="text-xs text-stone-500 line-clamp-2 italic">"{f.prompt}"</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Agent Answered</p>
                    <p className="text-xs text-stone-500 line-clamp-2">"{f.response}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
