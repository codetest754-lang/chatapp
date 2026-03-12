import { useEffect, useRef } from 'react';

function AudioTile({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay />;
}

export default function VoiceCall({
  active,
  muted,
  participants,
  remoteStreams,
  onToggleMute,
  onHangup,
  onAddUser
}: {
  active: boolean;
  muted: boolean;
  participants: number;
  remoteStreams: Record<string, MediaStream>;
  onToggleMute: () => void;
  onHangup: () => void;
  onAddUser: () => void;
}) {
  if (!active) return null;
  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 p-3 rounded flex items-center gap-3">
      <div className="text-sm">Call • {participants} participant{participants === 1 ? '' : 's'}</div>
      <button className="text-xs underline" onClick={onToggleMute}>{muted ? 'Unmute' : 'Mute'}</button>
      <button className="text-xs underline" onClick={onAddUser}>Add User</button>
      <button className="text-xs underline text-red-300" onClick={onHangup}>Hang Up</button>
      <div className="hidden">
        {Object.values(remoteStreams).map((stream, idx) => (
          <AudioTile key={idx} stream={stream} />
        ))}
      </div>
    </div>
  );
}
