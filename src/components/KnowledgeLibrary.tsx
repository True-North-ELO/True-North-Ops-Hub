import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, ExternalLink, FileText, FileSpreadsheet, Search, Clock, ArrowUpRight, X } from 'lucide-react';
import { GemFile } from '../types';
import { cn } from '../lib/utils';

interface KnowledgeLibraryProps {
  files: GemFile[];
  onClose: () => void;
  onReference: (fileName: string) => void;
  onOpenFile: (file: GemFile) => void;
}

export default function KnowledgeLibrary({ files, onClose, onReference, onOpenFile }: KnowledgeLibraryProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.type.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    if (a.name.toLowerCase().includes('true north scribe library')) return -1;
    if (b.name.toLowerCase().includes('true north scribe library')) return 1;
    return a.name.localeCompare(b.name);
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText size={18} className="text-red-500" />;
      case 'csv': return <FileSpreadsheet size={18} className="text-green-600" />;
      case 'link-sheet': return <ArrowUpRight size={18} className="text-blue-500" />;
      default: return <BookOpen size={18} className="text-stone-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 border-l border-stone-100 w-80 shrink-0 shadow-2xl relative z-30">
      <div className="p-6 border-b border-stone-200 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sage/10 rounded-lg text-sage">
              <BookOpen size={18} />
            </div>
            <h3 className="font-display font-bold text-stone-800 tracking-tight">SOP Library</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={14} />
          <input 
            type="text" 
            placeholder="Search procedure..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-sage/20 transition-all font-medium"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12 px-4 italic text-stone-400 text-xs">
            No matching SOPs found in the knowledge base.
          </div>
        ) : (
          filteredFiles.map((f) => (
            <motion.div 
              key={f.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={() => onOpenFile(f)}
              className="bg-white border border-stone-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-sage/20 transition-all group cursor-pointer"
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="p-2.5 bg-stone-50 rounded-xl group-hover:bg-sage/5 transition-colors">
                  {getIcon(f.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[13px] text-orange-600 leading-tight mb-1 truncate">{f.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-stone-300 uppercase tracking-widest">{f.type}</span>
                    <span className="w-1 h-1 bg-stone-200 rounded-full"></span>
                    <div className="flex items-center gap-1 text-[9px] text-stone-400 font-medium">
                      <Clock size={8} />
                      {new Date(f.lastUpdated).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-stone-50">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFile(f);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-stone-900 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-stone-800 transition-all shadow-md shadow-stone-200"
                >
                  <FileText size={10} />
                  Open Preview
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onReference(f.name);
                  }}
                  className="flex-1 py-1.5 bg-white border border-stone-100 text-stone-500 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-stone-50 transition-all active:scale-95"
                >
                  Reference
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="p-6 bg-white border-t border-stone-100 text-center">
        <p className="text-[10px] text-stone-400 font-medium">
          Source Material Verified by RCM Admin
        </p>
      </div>
    </div>
  );
}
