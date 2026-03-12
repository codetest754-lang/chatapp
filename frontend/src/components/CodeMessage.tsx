import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import { useMemo, useState } from 'react';

export default function CodeMessage({ code }: { code: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const highlighted = useMemo(() => Prism.highlight(code, Prism.languages.typescript, 'typescript'), [code]);
  return (
    <div className="bg-gray-800 rounded p-2">
      <div className="flex justify-between text-xs mb-2"><button onClick={() => navigator.clipboard.writeText(code)}>Copy</button><button onClick={() => setCollapsed(!collapsed)}>{collapsed ? 'Expand' : 'Collapse'}</button></div>
      {!collapsed && <pre className="overflow-x-auto"><code dangerouslySetInnerHTML={{ __html: highlighted }} /></pre>}
    </div>
  );
}
