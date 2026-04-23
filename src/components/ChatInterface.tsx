import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Bot, Loader2, Info, BookOpen, ThumbsUp, ThumbsDown, MessageSquare, X, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { ChatMessage, GemConfig, GemContext, FeedbackData } from '../types';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useFirebase } from './FirebaseProvider';
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import KnowledgeLibrary from './KnowledgeLibrary';

interface ChatInterfaceProps {
  config: GemConfig;
  context: GemContext;
  onOpenFile: (file: any) => void;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function ChatInterface({ config, context, onOpenFile }: ChatInterfaceProps) {
  const { user } = useFirebase();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState<{ messageId: string, comment: string } | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessageId = Math.random().toString(36).substring(7);
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { id: userMessageId, role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      // Build Knowledge Context with source link awareness
      const knowledgeContext = (context.files?.length || 0) > 0 
        ? context.files.map(f => {
            let sectionContent = f.content;
            const sourceInfo = f.sourceUrl ? `\nSOURCE_URL: ${f.sourceUrl}` : "";
            
            if (f.type === 'csv' || f.name.endsWith('.csv')) {
              sectionContent = `TABLE HEADERS: ${f.content.split('\n')[0]}\nDATA SAMPLE:\n${f.content.split('\n').slice(0, 1000).join('\n')}`;
            }
            return `DOCUMENT: ${f.name}\nTYPE: ${f.type}${sourceInfo}\n---CONTENT START---\n${sectionContent}\n---CONTENT END---`;
          }).join('\n\n')
        : "No knowledge base documents available yet.";

      const customTuning = context.customInstructions 
        ? `\nAGENT CUSTOM TUNING (Overrides & Rules):\n${context.customInstructions}\n`
        : "";

      const fullSystemInstruction = `
        ${config.systemInstruction}
        
        ${customTuning}
        
        DEPARTMENT KNOWLEDGE BASE (Multi-Source):
        This includes PDF SOPs, daily refreshed CSVs, and Scribe link directories.
        
        ${knowledgeContext}
        
        Strict Application Rules:
        1. Base your answer strictly on the provided knowledge base.
        2. If custom tuning rules conflict with standard logic, FOLLOW THE TUNING RULES.
        3. For collector assignments or roles, carefully analyze the headers provided in the docs.
        
        4. SOURCE LINKS (CRITICAL):
           - If you use information from a document, you MUST conclude your answer with a "Resources Used" section.
           - List each relevant document name and its SOURCE_URL (if provided) as a clickable link.
           - Format: [Document Name](URL)
           - If it's a Scribe link from a link-sheet or spreadsheet, highlight it specifically.

        5. SOP LISTING:
           - If requested to "list SOPs" or "show available SOPs", provide a complete bulleted list of ALL available documents from the Knowledge Base section above.
           - Include their source links if available.

        6. TONE: Analytical, thorough, and highly accurate.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          ...messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: fullSystemInstruction,
          temperature: 0.1,
        }
      });

      const modelResponse = response.text || "I'm sorry, I couldn't generate a response.";
      const modelMessageId = Math.random().toString(36).substring(7);
      setMessages(prev => [...prev, { id: modelMessageId, role: 'model', content: modelResponse }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { id: 'err-' + Date.now(), role: 'model', content: "System connection error. Please verify your knowledge base status in the Admin panel." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFeedback = async (messageId: string, type: 'up' | 'down') => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, feedback: type } : m));
    
    // Automatically open comment box for downvotes
    if (type === 'down') {
      setFeedbackComment({ messageId, comment: '' });
    } else {
      // Save positive feedback immediately
      await submitFeedback(messageId, 'up');
    }
  };

  const submitFeedback = async (messageId: string, type: 'up' | 'down', comment?: string) => {
    const message = messages.find(m => m.id === messageId);
    const prompt = messages[messages.indexOf(message!) - 1]?.content || '';
    
    try {
      await addDoc(collection(db, 'feedback'), {
        messageId,
        gemId: config.id,
        userEmail: user?.email || 'anonymous',
        type,
        comment: comment || '',
        prompt,
        response: message?.content || '',
        timestamp: new Date().toISOString()
      });
      console.log("Feedback submitted successfully");
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-white relative">
      <div className="flex-1 flex flex-col h-full relative overflow-hidden p-8">
        {/* Context info bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {config.id === 'sop' && (
              <button 
                onClick={() => setIsLibraryOpen(true)}
                className="flex items-center gap-2 px-4 py-1.5 bg-sage text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-md shadow-sage/20"
              >
                <BookOpen size={12} />
                Browse SOP Library
              </button>
            )}
            <div className="flex flex-wrap gap-2">
            {(context.files || []).slice(0, 3).map(f => (
               <div key={f.id} className="flex items-center gap-1.5 px-3 py-1 bg-sage/5 border border-sage/10 rounded-full text-[9px] font-bold text-sage uppercase tracking-widest">
                  <BookOpen size={10} />
                  <span className="truncate max-w-[80px]">{f.name}</span>
               </div>
            ))}
            {context.files && context.files.length > 3 && (
              <div className="px-3 py-1 bg-stone-50 border border-stone-100 rounded-full text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                +{(context.files?.length || 0) - 3} more
              </div>
            )}
          </div>
          {context.lastUpdated && (
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-50/50 border border-orange-100 rounded-full">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-orange-500"></span>
              </span>
              <span className="text-[9px] font-bold text-orange-600 uppercase tracking-widest leading-none">
                Live Data Synchronized: {context.lastUpdated ? new Date(context.lastUpdated).toLocaleString() : 'Sync Pending'}
              </span>
            </div>
          )}
        </div>
        <div className="text-[9px] font-bold text-stone-300 uppercase tracking-[0.2em]">
          Engine: Gemini 3 Flash
        </div>
      </div>

      {/* Chat History */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-8 pr-4 mb-6 custom-scrollbar"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-6"
            >
              <div className="w-20 h-20 bg-sage/5 rounded-[2rem] flex items-center justify-center text-sage">
                 <Bot size={40} />
              </div>
              <div className="space-y-4">
                <h3 className="font-display text-4xl font-bold text-stone-800">{config.name}</h3>
                <p className="text-stone-500 max-w-xl mx-auto text-[15px] leading-relaxed">
                  {config.id === 'sop' 
                    ? "I am your portal to the True North procedure library. I can walk you through PDF SOPs step-by-step or provide direct Scribe links for visual guides. Ask me how to perform a specific task or browse the library below."
                    : "I provide real-time operational intelligence for RCM payers, employees, and office provider locations. I use daily refreshed data to answer assignment and role-based questions accurately."
                  }
                </p>
              </div>

              {config.id === 'rcm' && (
                <div className="w-full max-w-2xl px-6">
                   <div className="flex items-center gap-2 mb-4">
                    <div className="h-[1px] flex-1 bg-stone-100"></div>
                    <span className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em]">Try a Sample Question</span>
                    <div className="h-[1px] flex-1 bg-stone-100"></div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "Who is the collector for Accredo Health?",
                      "Who is the RP data controller for CO - Greeley?",
                      "What is the NPI for NC - Cary?",
                      "Who is the CSM for NE - Omaha?",
                      "What is the Tax ID for AL - Birmingham?"
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => setInput(q)}
                        className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-600 hover:bg-sage/10 hover:border-sage/30 hover:text-sage transition-all active:scale-95 shadow-sm"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {config.id === 'sop' && context.files && context.files.length > 0 && (
                <div className="w-full max-w-2xl px-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-[1px] flex-1 bg-stone-100"></div>
                    <span className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em]">Available SOPs</span>
                    <div className="h-[1px] flex-1 bg-stone-100"></div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar p-1">
                    {[...(context.files || [])].sort((a, b) => {
                      if (a.name.toLowerCase().includes('true north scribe library')) return -1;
                      if (b.name.toLowerCase().includes('true north scribe library')) return 1;
                      return a.name.localeCompare(b.name);
                    }).map((file) => (
                      <button
                        key={file.id}
                        onClick={() => {
                          onOpenFile(file);
                        }}
                        className="p-4 bg-white border border-stone-100 rounded-2xl text-left hover:border-sage/30 hover:shadow-sm transition-all group h-full"
                      >
                        <div className="p-2 bg-stone-50 rounded-lg w-fit mb-3 group-hover:bg-sage/5 transition-colors">
                          <FileText size={14} className="text-stone-400 group-hover:text-sage" />
                        </div>
                        <div className="text-[11px] font-bold text-orange-600 line-clamp-2 leading-tight">
                          {file.name}
                        </div>
                        <div className="text-[9px] text-stone-400 mt-2 font-bold uppercase tracking-widest">
                          {file.type}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {messages.map((message, index) => (
            <motion.div
              key={message.id || index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-6 max-w-[90%]",
                message.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border",
                message.role === 'user' ? "bg-white border-stone-100 text-stone-400" : "bg-sage border-sage text-white"
              )}>
                {message.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className="flex flex-col gap-2 max-w-full">
                <div className={cn(
                  "p-7 rounded-[2rem] text-[15px] leading-relaxed shadow-sm border relative group",
                  message.role === 'user' 
                    ? "bg-stone-50/50 text-stone-700 rounded-tr-none border-stone-100" 
                    : "bg-white text-stone-800 rounded-tl-none border-stone-50"
                )}>
                  <div className="markdown-body">
                    <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                  </div>

                  {/* Feedback UI */}
                  {message.role === 'model' && (
                    <div className="absolute -bottom-4 right-8 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleFeedback(message.id, 'up')}
                        className={cn(
                          "p-2 rounded-full border shadow-sm transition-all hover:scale-110 active:scale-95",
                          message.feedback === 'up' ? "bg-sage text-white border-sage" : "bg-white text-stone-400 border-stone-100 hover:text-sage"
                        )}
                      >
                        <ThumbsUp size={12} />
                      </button>
                      <button 
                        onClick={() => handleFeedback(message.id, 'down')}
                        className={cn(
                          "p-2 rounded-full border shadow-sm transition-all hover:scale-110 active:scale-95",
                          message.feedback === 'down' ? "bg-red-500 text-white border-red-500" : "bg-white text-stone-400 border-stone-100 hover:text-red-500"
                        )}
                      >
                        <ThumbsDown size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Feedback Comment Form */}
                <AnimatePresence>
                  {feedbackComment?.messageId === message.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-stone-50 rounded-2xl border border-stone-100 p-4 shadow-inner overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                          <MessageSquare size={10} />
                          What's the issue?
                        </span>
                        <button 
                          onClick={() => setFeedbackComment(null)}
                          className="text-stone-300 hover:text-stone-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <textarea
                        value={feedbackComment.comment}
                        onChange={(e) => setFeedbackComment(prev => ({ ...prev!, comment: e.target.value }))}
                        placeholder="Please explain the inaccuracy..."
                        className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-sage/20 resize-none h-20"
                      />
                      <button
                        onClick={() => {
                          submitFeedback(message.id, 'down', feedbackComment.comment);
                          setFeedbackComment(null);
                        }}
                        className="mt-2 w-full bg-stone-800 text-white py-2 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-md shadow-stone-900/20 active:translate-y-0.5 transition-all"
                      >
                        Submit Feedback
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-6 mr-auto"
            >
              <div className="w-12 h-12 rounded-2xl bg-sage border border-sage text-white flex items-center justify-center shadow-sm">
                <Loader2 className="animate-spin" size={20} />
              </div>
              <div className="p-7 bg-white border border-stone-50 text-stone-300 rounded-[2rem] rounded-tl-none flex items-center gap-1.5 shadow-sm">
                <div className="w-1.5 h-1.5 bg-sage/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-sage/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-sage/30 rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="mt-auto border-t border-stone-100/50 pt-8">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${config.name === 'SOP Assistant' ? 'SOPs, PDF guides, or Scribe links' : 'RCM metrics and data'}...`}
            className="w-full bg-stone-50 border border-stone-200 rounded-[1.5rem] px-8 py-5 pr-20 focus:outline-none focus:ring-4 focus:ring-sage/5 transition-all text-[15px]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-4 p-3 bg-sage text-white rounded-2xl shadow-lg shadow-sage/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:scale-100"
          >
            <Send size={20} />
          </button>
        </form>
        <div className="flex items-center justify-between mt-4 px-2">
           <div className="flex items-center gap-4">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                Live Node
              </span>
              <span className="text-[10px] text-stone-300 font-bold uppercase tracking-widest">
                Accuracy: High-Precision Mode
              </span>
           </div>
           <div className="text-[10px] text-stone-300 font-bold uppercase tracking-widest italic leading-none">
             True North Intelligent Hub
           </div>
        </div>
      </div>
      </div>

      <AnimatePresence>
        {isLibraryOpen && (
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="h-full"
          >
            <KnowledgeLibrary 
              files={context.files || []} 
              onClose={() => setIsLibraryOpen(false)}
              onReference={(name) => {
                setInput(`Tell me about the SOP: ${name}`);
                const inputEl = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (inputEl) inputEl.focus();
              }}
              onOpenFile={(file) => {
                onOpenFile(file);
                setIsLibraryOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
