/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Activity, 
  Settings, 
  LayoutDashboard, 
  ChevronRight, 
  MessageSquare,
  ShieldCheck,
  Compass,
  ArrowRight,
  User
} from 'lucide-react';
import { cn } from './lib/utils';
import { GemId, GemConfig, GemContext, GemFile } from './types';
import ChatInterface from './components/ChatInterface';
import AdminPanel from './components/AdminPanel';
import TrueNorthLogo from './components/TrueNorthLogo';
import FileViewer from './components/FileViewer';

const GEM_CONFIGS: Record<GemId, GemConfig> = {
  sop: {
    id: 'sop',
    name: 'SOP Assistant',
    description: 'Your portal to the True North procedure library for PDF walkthroughs and direct Scribe guides.',
    systemInstruction: `You are the SOP Assistant — a clear, professional, and accurate guide for team members 
seeking standard operating procedures. Your role is to locate, retrieve, and present 
SOPs from Google Drive and Scribe SOP links stored in a Google Sheet, 
ensuring team members always have the correct, up-to-date procedures at their fingertips.

Your tone is professional, patient, and direct. You focus on accuracy, clarity, 
and efficiency. You do not simplify unless asked.

---

## 🔧 CONNECTED RESOURCES

You have access to the following via the department knowledge base context:

1. **PDF SOPs** — When a user asks about a specific SOP, search the available files for the relevant PDF and retrieve or link it directly.

2. **Scribe SOP Links Sheet** — a link-sheet containing a list of SOP names and their associated Scribe links. When a user asks for a Scribe SOP or a step-by-step visual guide, locate the correct entry/link and return the direct Scribe link.

---

## 🚀 SESSION START

At the start of every session (or when first greeting), greet the user with:

"Welcome to the SOP Assistant. I can help you locate PDF SOPs from Google Drive 
or pull up Scribe step-by-step guides from our SOP links sheet. 
Just tell me the name of the SOP or process you're looking for and I'll retrieve it."

---

## 📋 HOW TO HANDLE REQUESTS

**When a user asks for an SOP:**
1. Search the knowledge base for a PDF matching the SOP name or topic.
2. Retrieve and present the document details or a direct link to it.
3. If a matching PDF is not found, check for a Scribe SOP link in the knowledge base.
4. If found, return the Scribe link with the SOP name and a brief description if available.
5. If neither is found, let the user know and suggest they check with their lead or that the SOP may need to be added to the library.

**When a user asks for a Scribe link specifically:**
1. Locate the entry for the requested SOP name or topic.
2. Return the direct Scribe link along with the SOP name.

**When a user asks to browse or list available SOPs:**
1. Provide a complete, clean, organized list based on the knowledge base.
2. Offer to retrieve any specific SOP the user selects.

---

## ⚠️ IMPORTANT GUIDELINES

- Always use the documents provided in the context to ensure you are using the correct version.
- Do not paraphrase or summarize SOP content as a replacement for the actual document — always provide access to the source links.
- If a user describes a process but doesn't know the SOP name, help them identify the correct SOP by asking one or two clarifying questions.
- SOURCE LINKS (CRITICAL):
   - You MUST conclude your answer with a "Resources Used" section listing document names and their SOURCE_URL as clickable links.
   - Format: [Document Name](URL)
- At the end of every SOP retrieval, include this reminder:
  "📌 If any step in this SOP is unclear or doesn't match what you're seeing in the system, please stop and check with your lead before proceeding."

---

## ❌ OUT OF SCOPE

- Do not make up SOP steps or procedures.
- Do not guess at process details if the document is unavailable.
- Do not blend steps from different SOPs unless the source documents explicitly instruct you to do so.`,
  },
  rcm: {
    id: 'rcm',
    name: 'RCM Ops Hub',
    description: 'Real-time operational intelligence for custom payer assignments, office provider NPis/Tax IDs, and RCM roles.',
    systemInstruction: `Purpose

You are the RCM Ops Assistant for True North Holdings.

Your purpose is to act as a quick-reference operational hub for RCM operations, payers, employees, and BrightStar provider offices using only the most current approved data sources from the Google Drive folder: RCM Ops Hub.

You respond in a neutral, operational tone. You prioritize accuracy, structured routing, fuzzy matching, and explicit sourcing. If information is missing or not found, state that plainly. Never infer missing assignments.


Authoritative Data Sources (Follow in Order) (File names with column assignments below)

1) Payer Profiles – RCM Ops Hub.csv (Primary Payer File)
·        B: Common_Payer_Name (fuzzy match)
·        C: TN_Tag (derive Segment)
·        D: Timely_Filing
·        L: Submit_To
·        U: CollectionTerms
·        W: Collector

2) Payer Alias – RCM Ops Hub.csv
·        C: Common_Payer_Name (fuzzy match)
·        D: Biller
·        E: Collector
·        H: Manager
·        J: Payer_Tag (= TN_Tag)
·        P: FirstLook_Manager


3) RCM Provider Data - Master Sheet.csv (Authoritative Source for Locations)
·        A: Location Name(fuzzy match)
·        B: Database ID
·        C: Service Tier
·        D: Service Offering Definition
·        E: CSM
·        F: Invoice Creation
·        H: Legal Name
·        I: Address
·        M: Tax ID
·        N: NPI
·        Note: This source SUPERSEDES the legacy TN BrightStar Providers.csv file. If data exists in both, use the RCM Provider Database.


4) RP Location Roles – RCM Ops Hub.csv (Authoritative RP Role File)
·        A: DatabaseID
·        B: Name (fuzzy match)
·        C: Data_Analyst
·        D: Data_Controller
·        E: RCM (Yes/No)
·        “Controller” = RP Data Controller.
·        “Analyst” = RP Data Analyst.


5) TN Employee.csv
·        B: User_ID
·        E: Full_Name
·        G: Email (only if explicitly requested)
·        NEVER display a User_ID.
·        Always map User_ID → Full_Name.
·        If email requested and not stored, derive as firstname.lastname@truenorthllp.com (lowercase).


When mapping User_ID to Full_Name:
- Require exact User_ID match.
- If no match found, return: “User_ID not found in TN Employee.csv.”
- Do NOT infer employee names from similar strings.


Biller & Collector Display Override
- When a user asks for a payer’s biller or collector, you MUST check and display results from BOTH of the following sources:
  1) Payer Profiles – RCM Ops Hub.csv (Collector found in Column W)
  2) Payer Alias – RCM Ops Hub.csv (Biller found in Column D, Collector found in Column E)
- Clearly label the data from each file in your response. Do not collapse the results or prioritize one file over the other; if data exists in both, show both.


When matching payer or provider names:
1. Attempt exact match first (case-insensitive).
2. If no exact match, apply fuzzy matching.
3. If multiple fuzzy matches exceed the threshold, stop and request clarification.
4. Do NOT auto-select a best guess.


Output Rules
- Use bullet points by default.
- Tables only if explicitly requested.
- Cite file names and column letters.
- Treat exact filename matches as canonical.


DATA VERIFICATION FOOTER:
- Reference the RCM Ops Hub in Google Drive for the latest refresh information. Use the file's Date Modified metadata from Google Drive as the authoritative timestamp.
- Format: "Data Source: [File Name] | Last Modified: [Date Modified from Google Drive]."
- Always prioritize the most recently modified file when multiple versions are present. If the Date Modified appears outdated or cannot be retrieved, alert me immediately.
- Only show timestamps for files actively referenced in the response.

Example Questions
·        Who is the collector for Accredo?
·        Who is the RP Data Controller for AL - Birmingham?
·        Who is the CSM for TX- Flower Mound?`,
  },
  admin: {
    id: 'admin',
    name: 'System Admin',
    description: 'Hub Administration',
    systemInstruction: ''
  }
};

export default function App() {
  const [activeGem, setActiveGem] = useState<GemId | 'admin'>('sop');
  const [selectedFile, setSelectedFile] = useState<GemFile | null>(null);
  const [contexts, setContexts] = useState<Record<GemId, GemContext>>({
    sop: { files: [], lastUpdated: null },
    rcm: { files: [], lastUpdated: null },
    admin: { files: [], lastUpdated: null }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchContexts() {
      try {
        const [sopRes, rcmRes] = await Promise.all([
          fetch('/api/context/sop'),
          fetch('/api/context/rcm')
        ]);
        const sopData = sopRes.ok ? await sopRes.json() : { files: [], lastUpdated: null };
        const rcmData = rcmRes.ok ? await rcmRes.json() : { files: [], lastUpdated: null };
        
        setContexts({ 
          sop: sopData || { files: [], lastUpdated: null }, 
          rcm: rcmData || { files: [], lastUpdated: null },
          admin: { files: [], lastUpdated: null }
        });
      } catch (err) {
        console.error("Failed to fetch contexts", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchContexts();
  }, []);

  const handleUpdateContext = (id: GemId, newContext: GemContext) => {
    setContexts(prev => ({ ...prev, [id]: newContext }));
  };

  return (
    <div className="flex h-screen bg-cream overflow-hidden text-earth font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-cream p-6 flex flex-col gap-6 z-20">
        <div className="p-6 bg-stone-900 rounded-3xl text-white shadow-xl shadow-stone-200/50">
          <TrueNorthLogo className="mb-2" />
          <p className="text-[9px] text-white/50 font-bold uppercase tracking-[0.2em] mt-3">Enterprise Deployment Hub</p>
        </div>

        <nav className="flex-1 flex flex-col gap-2 overflow-y-auto">
          <div className="px-4 mb-1">
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.15em]">Active Deployment</p>
          </div>
          
          <SidebarItem 
            icon={<FileText size={18} />} 
            label="SOP Assistant" 
            active={activeGem === 'sop'} 
            onClick={() => setActiveGem('sop')}
            badge="Policy Walkthroughs"
          />
          <SidebarItem 
            icon={<Activity size={18} />} 
            label="RCM Ops Hub" 
            active={activeGem === 'rcm'} 
            onClick={() => setActiveGem('rcm')}
            badge="Answer Hub"
          />

          <div className="pt-4 px-4 mb-1">
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.15em]">Management</p>
          </div>
          <SidebarItem 
            icon={<Settings size={18} />} 
            label="Admin Settings" 
            active={activeGem === 'admin'} 
            onClick={() => setActiveGem('admin')}
          />
        </nav>

        <div className="p-6 bg-white rounded-3xl border border-stone-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400">Data Pipeline Status</span>
            <span className="dot-sync bg-sage"></span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-1 bg-sage h-8 rounded-full"></div>
              <div>
                <div className="text-xs font-bold">CSV Refreshed</div>
                <div className="text-[10px] text-stone-400">Caspio ⮕ OneDrive ⮕ GDrive</div>
                {contexts.rcm?.lastUpdated && (
                  <div className="text-[9px] font-bold text-orange-600 uppercase tracking-tight mt-1">
                    Last Hub Refresh: {new Date(contexts.rcm.lastUpdated).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col gap-6 p-6 pl-0 overflow-y-auto">
        {/* Header */}
        <header className="h-20 glass rounded-3xl px-8 flex items-center justify-between shadow-sm z-10">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-medium text-stone-800">
                {activeGem === 'admin' ? "System Administration" : GEM_CONFIGS[activeGem].name}
              </h2>
              {activeGem !== 'admin' && <span className="text-stone-400 italic font-light text-sm">v2.4.1</span>}
            </div>
            <p className="text-xs text-stone-500 font-medium">
              {activeGem === 'admin' 
                ? "Manage data feeds and accuracy settings." 
                : (contexts[activeGem]?.customDescription || GEM_CONFIGS[activeGem].description)
              }
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {activeGem !== 'admin' && contexts[activeGem].lastUpdated && (
              <div className="hidden md:block">
                <span className="text-[10px] font-bold text-sage uppercase tracking-wider bg-white px-3 py-1.5 rounded-full border border-stone-100 shadow-sm">
                  Daily Sync: {new Date(contexts[activeGem].lastUpdated!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            <button className="bg-sage text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-sage/20 hover:opacity-90 transition-all flex items-center gap-2">
              <MessageSquare size={14} />
              <span>Share Access</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-stone-100 flex-shrink-0 min-h-[600px] relative overflow-hidden">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="flex flex-col items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <TrueNorthLogo showLogoOnly={true} className="scale-150 mb-4" />
                  </motion.div>
                  <p className="text-sm font-medium text-stone-500 animate-pulse tracking-wide">Initializing True North Hub...</p>
                </div>
              </motion.div>
            ) : activeGem === 'admin' ? (
              <motion.div
                key="admin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto w-full h-full"
              >
                <AdminPanel 
                  contexts={contexts} 
                  onUpdate={handleUpdateContext} 
                />
              </motion.div>
            ) : (
              <motion.div
                key={activeGem}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="max-w-5xl mx-auto w-full h-full flex flex-col"
              >
                <ChatInterface 
                  config={GEM_CONFIGS[activeGem]} 
                  context={contexts[activeGem]} 
                  onOpenFile={setSelectedFile}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <FileViewer 
        file={selectedFile} 
        onClose={() => setSelectedFile(null)} 
      />
    </div>
  );
}

function SidebarItem({ 
  icon, 
  label, 
  active, 
  onClick, 
  badge 
}: { 
  icon: React.ReactNode; 
  label: string; 
  active: boolean; 
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all group relative border",
        active 
          ? "bg-white border-stone-100 shadow-sm text-stone-700" 
          : "bg-moss/40 border-transparent text-stone-500 hover:bg-white hover:shadow-sm"
      )}
    >
      <div className={cn(
        "h-3 w-3 rounded-full shrink-0 transition-colors",
        active ? "bg-sage" : "bg-stone-300 group-hover:bg-sage"
      )} />
      <div className="flex-1 text-left">
        <div className="font-bold leading-none">{label}</div>
        {badge && (
          <div className="text-[10px] text-stone-400 mt-1 italic leading-none">{badge}</div>
        )}
      </div>
    </button>
  );
}
