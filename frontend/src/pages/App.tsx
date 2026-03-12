import { useState } from 'react';
import ChatWindow from '../components/ChatWindow';
import EmojiPicker from '../components/EmojiPicker';
import VideoCall from '../components/VideoCall';
import VoiceCall from '../components/VoiceCall';
import ScreenShare from '../components/ScreenShare';
import { useChatStore } from '../store/chatStore';

export default function App() {
  const [token, setToken] = useState('');
  const [input, setInput] = useState('');
  const [screenShare, setScreenShare] = useState(false);
  const addMessage = useChatStore((s) => s.addMessage);
  const dark = useChatStore((s) => s.darkMode);
  const setDark = useChatStore((s) => s.setDarkMode);

  if (!token) {
    return <div className="h-screen flex items-center justify-center"><div className="bg-gray-800 p-6 rounded"><h1 className="mb-2">Login</h1><input className="text-black px-2" placeholder="JWT" onChange={(e) => setToken(e.target.value)} /></div></div>;
  }

  return (
    <div className={dark ? 'h-screen flex bg-gray-900 text-white' : 'h-screen flex bg-white text-black'}>
      <aside className="w-72 border-r border-gray-700 p-3">
        <h2 className="font-bold mb-2">Contacts</h2>
        <div className="mb-2">General</div>
        <div>Engineering</div>
        <button className="mt-4 text-xs underline" onClick={() => setDark(!dark)}>Toggle dark mode</button>
      </aside>
      <main className="flex-1 flex flex-col">
        <div className="p-3 border-b border-gray-700">Group Chat Panel</div>
        <ChatWindow />
        <div className="p-3 border-t border-gray-700 flex gap-2 items-center">
          <EmojiPicker onPick={(e) => setInput((s) => s + e)} />
          <input className="flex-1 text-black px-2" value={input} onChange={(e) => setInput(e.target.value)} />
          <input type="file" />
          <button onClick={() => addMessage({ id: crypto.randomUUID(), conversationId: 'c1', senderId: 'u1', content: input, contentType: input.includes('```') ? 'code' : 'text', createdAt: new Date().toISOString() })}>Send</button>
          <button onClick={() => setScreenShare(!screenShare)}>Share Screen</button>
        </div>
        <div className="p-2"><VideoCall /></div>
        <div className="p-2"><ScreenShare active={screenShare} /></div>
      </main>
      <VoiceCall />
    </div>
  );
}
