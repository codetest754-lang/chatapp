import { useChatStore } from '../store/chatStore';
import MessageBubble from './MessageBubble';

export default function ChatWindow() {
  const messages = useChatStore((s) => s.messages);
  return <div className="flex-1 p-4 overflow-y-auto space-y-2">{messages.map((m) => <MessageBubble key={m.id} content={m.content} contentType={m.contentType} />)}</div>;
}
