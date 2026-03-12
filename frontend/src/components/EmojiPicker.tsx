import { useState } from 'react';

const emojis = [
  '😀', '😄', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤔', '😴', '😡',
  '👍', '👎', '👏', '🙌', '🤝', '🙏', '🔥', '✨', '🎉', '💯', '❤️', '💔',
  '😺', '😸', '😹', '😻', '🤖', '👻', '🎯', '✅', '❌', '⚡', '🌈', '🌟'
];

export default function EmojiPicker({
  onPick,
  onPickMany
}: {
  onPick: (e: string) => void;
  onPickMany?: (e: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const toggleEmoji = (e: string) => {
    if (!onPickMany) {
      onPick(e);
      return;
    }
    setSelected((s) => (s.includes(e) ? s.filter((x) => x !== e) : [...s, e]));
  };

  const insertSelected = () => {
    if (selected.length === 0) return;
    const value = selected.join('');
    if (onPickMany) onPickMany(value);
    else onPick(value);
    setSelected([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button className="px-2" onClick={() => setOpen((v) => !v)}>😊</button>
      {open && (
        <div className="absolute bottom-10 left-0 bg-gray-800 border border-gray-700 rounded p-2 w-64 z-10">
          <div className="grid grid-cols-6 gap-1 mb-2">
            {emojis.map((e) => (
              <button
                key={e}
                className={selected.includes(e) ? 'bg-gray-700 rounded' : ''}
                onClick={() => toggleEmoji(e)}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs">
            <button className="underline" onClick={insertSelected}>Insert</button>
            <button className="underline" onClick={() => setSelected([])}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
