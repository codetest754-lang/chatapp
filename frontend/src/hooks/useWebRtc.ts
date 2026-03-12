import { useRef } from 'react';

export function useWebRtc() {
  const peerRef = useRef<RTCPeerConnection | null>(null);

  const createPeer = () => {
    peerRef.current = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    return peerRef.current;
  };

  const shareScreen = async () => navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

  return { peerRef, createPeer, shareScreen };
}
