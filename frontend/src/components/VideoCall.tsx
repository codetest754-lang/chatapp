import { useEffect, useRef } from 'react';

function VideoTile({ stream, muted }: { stream: MediaStream | null; muted?: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.srcObject = stream ?? null;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className="w-full h-full object-cover rounded bg-gray-900" />;
}

export default function VideoCall({
  active,
  localStream,
  remoteStreams
}: {
  active: boolean;
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
}) {
  if (!active) return null;
  const remotes = Object.values(remoteStreams);
  return (
    <div className="grid grid-cols-2 gap-2 h-64 bg-black rounded p-2">
      <VideoTile stream={localStream} muted />
      {remotes.length === 0 && <div className="bg-gray-900 rounded" />}
      {remotes.map((s, idx) => (
        <VideoTile key={idx} stream={s} />
      ))}
    </div>
  );
}
