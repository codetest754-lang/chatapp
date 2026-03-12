import { create } from 'zustand';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  contentType: 'text' | 'code' | 'file';
  createdAt: string;
}

interface ChatState {
  darkMode: boolean;
  messages: Message[];
  typingUsers: string[];
  setDarkMode: (v: boolean) => void;
  addMessage: (m: Message) => void;
  setMessages: (m: Message[]) => void;
  setTyping: (users: string[]) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  darkMode: true,
  messages: [],
  typingUsers: [],
  setDarkMode: (v) => set({ darkMode: v }),
  addMessage: (m) => set((s) => ({ messages: [m, ...s.messages] })),
  setMessages: (m) => set({ messages: m }),
  setTyping: (users) => set({ typingUsers: users })
}));
