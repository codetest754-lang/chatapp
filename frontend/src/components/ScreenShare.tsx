import { useEffect, useRef } from 'react';

export default function ScreenShare({
  active,
  stream,
  onStop
}: {
  active: boolean;
  stream: MediaStream | null;
  onStop: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream ?? null;
  }, [stream]);

  useEffect(() => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const handleEnded = () => onStop();
    track.addEventListener('ended', handleEnded);
    return () => track.removeEventListener('ended', handleEnded);
  }, [stream, onStop]);

  return (
    <div className="bg-gray-800 rounded p-2">
      <div className="text-sm mb-2">Screen share: {active ? 'Active' : 'Stopped'}</div>
      {active && <video ref={videoRef} autoPlay playsInline muted className="w-full rounded bg-black" />}
    </div>
  );
}
