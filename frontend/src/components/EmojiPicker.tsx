const emojis = ['😀', '🔥', '❤️', '🎉', '👍'];
export default function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  return <div className="flex gap-2">{emojis.map((e) => <button key={e} onClick={() => onPick(e)}>{e}</button>)}</div>;
}
