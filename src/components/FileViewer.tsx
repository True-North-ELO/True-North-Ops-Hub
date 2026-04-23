import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, FileText, FileSpreadsheet, Search, Filter, Download } from 'lucide-react';
import { GemFile } from '../types';
import { cn } from '../lib/utils';
import Papa from 'papaparse';

interface FileViewerProps {
  file: GemFile | null;
  onClose: () => void;
}

export default function FileViewer({ file, onClose }: FileViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!file) return null;

  const isScribeLibrary = file.name.toLowerCase().includes('true north scribe library');
  const isPdf = file.type === 'pdf';

  // Parse CSV if it's the Scribe Library
  let csvData: any[] = [];
  let headers: string[] = [];

  if (isScribeLibrary && file.content) {
    const results = Papa.parse(file.content, { header: true, skipEmptyLines: true });
    csvData = results.data;
    headers = results.meta.fields || [];
  }

  const filteredData = csvData.filter(row => 
    Object.values(row).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8"
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-stone-200"
        >
          {/* Header */}
          <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-3 rounded-2xl shadow-sm",
                isPdf ? "bg-red-50 text-red-500" : "bg-sage/10 text-sage"
              )}>
                {isPdf ? <FileText size={24} /> : <FileSpreadsheet size={24} />}
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-stone-800 tracking-tight">{file.name}</h3>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-[0.2em] mt-1">
                  {isPdf ? 'Document Preview' : 'Interactive Database View'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {file.sourceUrl && (
                <a 
                  href={file.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
                >
                  <ExternalLink size={14} />
                  Open in Drive
                </a>
              )}
              <button 
                onClick={onClose}
                className="p-3 hover:bg-stone-100 rounded-full text-stone-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isPdf ? (
              <div className="w-full h-full bg-stone-100 p-4">
                {file.sourceUrl ? (
                   <iframe 
                    src={file.sourceUrl.replace('/view', '/preview')} 
                    className="w-full h-full rounded-2xl border-none shadow-inner"
                    title={file.name}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-stone-400 italic">
                    PDF preview not available for this local file.
                  </div>
                )}
              </div>
            ) : isScribeLibrary ? (
              <div className="flex-1 flex flex-col overflow-hidden p-6 gap-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                    <input 
                      type="text"
                      placeholder="Search links, keywords, or topics..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sage/20 transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-stone-50 border border-stone-100 rounded-lg text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      {filteredData.length} Results
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto rounded-2xl border border-stone-100 bg-white custom-scrollbar shadow-inner">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-stone-50 z-10">
                      <tr>
                        {headers.map(h => (
                          <th key={h} className="px-6 py-4 font-bold text-stone-400 uppercase tracking-widest border-b border-stone-100">
                             {h.replace(/_/g, ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {filteredData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-sage/5 transition-colors group">
                          {headers.map(h => {
                            const val = row[h];
                            const isUrl = String(val).startsWith('http');
                            return (
                              <td key={h} className="px-6 py-4 text-stone-600 font-medium">
                                {isUrl ? (
                                  <a 
                                    href={val} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sage hover:underline decoration-sage/30 font-bold"
                                  >
                                    View Guide
                                    <ExternalLink size={10} />
                                  </a>
                                ) : (
                                  val
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredData.length === 0 && (
                    <div className="py-20 text-center text-stone-400 italic">
                      No matching records found.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-8 font-mono text-[11px] bg-stone-50 text-stone-600 leading-relaxed whitespace-pre-wrap">
                {file.content}
              </div>
            )}
          </div>

          <div className="p-4 bg-stone-50/50 border-t border-stone-100 flex justify-between items-center px-8">
            <p className="text-[10px] text-stone-400 font-medium italic">
              Knowledge base source: {file.name}
            </p>
            <p className="text-[10px] text-stone-300 font-bold uppercase tracking-widest leading-none">
              Last Updated: {new Date(file.lastUpdated).toLocaleDateString()}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
