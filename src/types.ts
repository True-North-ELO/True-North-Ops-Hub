export type GemId = 'sop' | 'rcm' | 'admin';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  feedback?: 'up' | 'down';
}

export interface FeedbackData {
  id: string;
  messageId: string;
  gemId: GemId;
  userEmail: string;
  type: 'up' | 'down';
  comment?: string;
  prompt: string;
  response: string;
  timestamp: string;
}

export interface GemFile {
  id: string;
  name: string;
  content: string;
  type: 'csv' | 'pdf' | 'link-sheet';
  lastUpdated: string;
  sourceUrl?: string;
}

export interface GemContext {
  files: GemFile[];
  lastUpdated: string | null;
  folderId?: string;
  sourceUrl?: string;
  customInstructions?: string;
  customDescription?: string;
}

export interface GemConfig {
  id: GemId;
  name: string;
  description: string;
  systemInstruction: string;
}
