import CodeMessage from './CodeMessage';
import FileMessage from './FileMessage';

export default function MessageBubble({ content, contentType }: { content: string; contentType: string }) {
  if (contentType === 'code') return <CodeMessage code={content} />;
  if (contentType === 'file') return <FileMessage name="Attachment" url={content} />;
  return <div className="bg-gray-700 rounded px-3 py-2">{content}</div>;
}
