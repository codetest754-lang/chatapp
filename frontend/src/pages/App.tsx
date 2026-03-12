import { useEffect, useRef, useState } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import ChatWindow from '../components/ChatWindow';
import EmojiPicker from '../components/EmojiPicker';
import VideoCall from '../components/VideoCall';
import VoiceCall from '../components/VoiceCall';
import ScreenShare from '../components/ScreenShare';
import { useChatStore } from '../store/chatStore';
import { createCallConnection, createChatConnection } from '../services/signalr';

export default function App() {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [conversationId, setConversationId] = useState('');
  const [chatTitle, setChatTitle] = useState('Global Chat');
  const [email, setEmail] = useState('demo@chatapp.local');
  const [password, setPassword] = useState('demo');
  const [registerMode, setRegisterMode] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; username: string; email: string; avatar_url?: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [input, setInput] = useState('');
  const [screenShare, setScreenShare] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video' | null>(null);
  const [callConversationId, setCallConversationId] = useState('');
  const [incomingCall, setIncomingCall] = useState<{ from: string; conversationId: string; callType: 'voice' | 'video' } | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [muted, setMuted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const addMessage = useChatStore((s) => s.addMessage);
  const setMessages = useChatStore((s) => s.setMessages);
  const dark = useChatStore((s) => s.darkMode);
  const setDark = useChatStore((s) => s.setDarkMode);
  const chatConnectionRef = useRef<ReturnType<typeof createChatConnection> | null>(null);
  const callConnectionRef = useRef<ReturnType<typeof createCallConnection> | null>(null);
  const peersRef = useRef<Record<string, RTCPeerConnection>>({});
  const originalVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const callStateRef = useRef({
    callConversationId: '',
    callType: null as 'voice' | 'video' | null,
    callActive: false,
    userId: ''
  });
  const activeConversationRef = useRef<string>('');
  const sessionKey = 'chatapp.session';

  useEffect(() => {
    callStateRef.current = {
      callConversationId,
      callType,
      callActive,
      userId
    };
  }, [callConversationId, callType, callActive, userId]);

  useEffect(() => {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as {
        token: string;
        userId: string;
        conversationId: string;
        chatTitle?: string;
      };
      if (data?.token && data?.userId && data?.conversationId) {
        setToken(data.token);
        setUserId(data.userId);
        setConversationId(data.conversationId);
        setChatTitle(data.chatTitle ?? 'Global Chat');
      }
    } catch {
      // ignore corrupted session
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    localStorage.setItem(sessionKey, JSON.stringify({ token, userId, conversationId, chatTitle }));
  }, [token, userId, conversationId, chatTitle]);

  useEffect(() => {
    if (!token || !conversationId) return;

    let stopped = false;
    const connect = async () => {
      setError('');
      if (chatConnectionRef.current) {
        await chatConnectionRef.current.stop();
      }

      const conn = createChatConnection(token, userId);
      chatConnectionRef.current = conn;

      conn.on('ReceiveMessage', (msg: any) => {
        addMessage({
          id: msg?.messageId ?? msg?.id ?? crypto.randomUUID(),
          conversationId: msg?.conversationId ?? conversationId,
          senderId: msg?.userId ?? userId ?? 'unknown',
          content: msg?.content ?? '',
          contentType: msg?.contentType ?? 'text',
          createdAt: msg?.createdAt ?? new Date().toISOString()
        });
      });

      conn.onclose(() => setConnected(false));
      conn.onreconnecting(() => setConnected(false));
      conn.onreconnected(() => setConnected(true));

      await conn.start();
      if (activeConversationRef.current && activeConversationRef.current !== conversationId) {
        await conn.invoke('LeaveConversation', activeConversationRef.current);
      }
      await conn.invoke('JoinConversation', conversationId);
      activeConversationRef.current = conversationId;
      if (!stopped) setConnected(true);
    };

    connect().catch((err) => {
      setConnected(false);
      setError(err?.message ?? 'Failed to connect to chat');
    });

    return () => {
      stopped = true;
      const conn = chatConnectionRef.current;
      if (conn) {
        conn.off('ReceiveMessage');
        conn.stop().catch(() => {});
      }
    };
  }, [token, conversationId, userId, addMessage]);

  useEffect(() => {
    if (!token || !userId) return;

    let stopped = false;
    const connect = async () => {
      if (callConnectionRef.current) {
        await callConnectionRef.current.stop();
      }

      const conn = createCallConnection(token, userId);
      callConnectionRef.current = conn;

      conn.on('CallInvite', (payload: any) => {
        if (payload?.from === callStateRef.current.userId) return;
        setIncomingCall({
          from: payload?.from,
          conversationId: payload?.conversationId,
          callType: payload?.callType === 'video' ? 'video' : 'voice'
        });
      });

      conn.on('CallJoin', async (payload: any) => {
        if (payload?.conversationId !== callStateRef.current.callConversationId) return;
        if (!callStateRef.current.callType) return;
        const remoteId = payload?.userId;
        if (!remoteId || remoteId === callStateRef.current.userId) return;
        setParticipants((prev) => (prev.includes(remoteId) ? prev : [...prev, remoteId]));
        const pc = ensurePeer(remoteId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await conn.invoke('CallOffer', callStateRef.current.callConversationId, remoteId, offer.sdp ?? '', callStateRef.current.callType ?? 'voice');
      });

      conn.on('CallOffer', async (payload: any) => {
        if (payload?.targetUserId && payload.targetUserId !== callStateRef.current.userId) return;
        const remoteId = payload?.from;
        if (!remoteId || remoteId === callStateRef.current.userId) return;
        setParticipants((prev) => (prev.includes(remoteId) ? prev : [...prev, remoteId]));
        const convId = payload?.conversationId;
        const type = payload?.callType === 'video' ? 'video' : 'voice';
        if (!callStateRef.current.callActive) {
          await startCall(type, convId, true);
        }
        const pc = ensurePeer(remoteId);
        await pc.setRemoteDescription({ type: 'offer', sdp: payload?.offerSdp ?? '' });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await conn.invoke('CallAnswer', convId, remoteId, answer.sdp ?? '');
      });

      conn.on('CallAnswer', async (payload: any) => {
        if (payload?.targetUserId && payload.targetUserId !== callStateRef.current.userId) return;
        const remoteId = payload?.from;
        if (!remoteId) return;
        const pc = peersRef.current[remoteId];
        if (!pc) return;
        await pc.setRemoteDescription({ type: 'answer', sdp: payload?.answerSdp ?? '' });
      });

      conn.on('CallIce', async (payload: any) => {
        if (payload?.targetUserId && payload.targetUserId !== callStateRef.current.userId) return;
        const remoteId = payload?.from;
        const candidate = payload?.candidate;
        if (!remoteId || !candidate) return;
        const pc = peersRef.current[remoteId];
        if (!pc) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
        } catch {
          // ignore
        }
      });

      conn.on('CallLeave', (payload: any) => {
        const remoteId = payload?.userId;
        if (!remoteId || remoteId === callStateRef.current.userId) return;
        removePeer(remoteId);
      });

      await conn.start();
      if (!stopped && callStateRef.current.callConversationId) {
        await conn.invoke('JoinCallRoom', callStateRef.current.callConversationId);
      }
    };

    connect().catch(() => {});

    return () => {
      stopped = true;
      const conn = callConnectionRef.current;
      if (conn) {
        conn.off('CallInvite');
        conn.off('CallJoin');
        conn.off('CallOffer');
        conn.off('CallAnswer');
        conn.off('CallIce');
        conn.off('CallLeave');
        conn.stop().catch(() => {});
      }
    };
  }, [token, userId]);

  const ensureLocalStream = async (type: 'voice' | 'video') => {
    if (localStream) return localStream;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video'
    });
    if (muted) {
      stream.getAudioTracks().forEach((t) => (t.enabled = false));
    }
    setLocalStream(stream);
    Object.values(peersRef.current).forEach((pc) => {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    });
    return stream;
  };

  const ensureCallConnection = async () => {
    let conn = callConnectionRef.current;
    if (!conn && token && userId) {
      conn = createCallConnection(token, userId);
      callConnectionRef.current = conn;
    }
    if (!conn) return null;
    if (conn.state !== HubConnectionState.Connected) {
      await conn.start();
    }
    return conn;
  };

  const ensurePeer = (remoteId: string) => {
    if (peersRef.current[remoteId]) return peersRef.current[remoteId];
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peersRef.current[remoteId] = pc;

    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate || !callConversationId) return;
      callConnectionRef.current?.invoke('CallIce', callConversationId, remoteId, JSON.stringify(event.candidate));
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (!stream) return;
      setRemoteStreams((prev) => ({ ...prev, [remoteId]: stream }));
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        removePeer(remoteId);
      }
    };

    return pc;
  };

  const removePeer = (remoteId: string) => {
    const pc = peersRef.current[remoteId];
    if (pc) pc.close();
    delete peersRef.current[remoteId];
    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[remoteId];
      return next;
    });
    setParticipants((prev) => prev.filter((id) => id !== remoteId));
  };

  const startCall = async (type: 'voice' | 'video', convId?: string, silentInvite?: boolean) => {
    const conversation = convId ?? conversationId;
    if (!conversation) return;
    setCallActive(true);
    setCallType(type);
    setCallConversationId(conversation);
    setParticipants((prev) => (prev.includes(userId) ? prev : [userId, ...prev]));
    setIncomingCall(null);
    setRemoteStreams({});

    await ensureLocalStream(type);
    const conn = await ensureCallConnection();
    if (!conn) return;
    await conn.invoke('JoinCallRoom', conversation);
    await conn.invoke('CallJoin', conversation);

    if (!silentInvite && selectedUserId) {
      await conn.invoke('CallInvite', conversation, selectedUserId, type);
    }
  };

  const endCall = async () => {
    const conn = await ensureCallConnection();
    if (conn && callConversationId) {
      await conn.invoke('CallLeave', callConversationId);
      await conn.invoke('LeaveCallRoom', callConversationId);
    }
    Object.keys(peersRef.current).forEach((id) => removePeer(id));
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setScreenStream(null);
    setScreenShare(false);
    setCallActive(false);
    setCallType(null);
    setCallConversationId('');
    setParticipants([]);
  };

  const toggleMute = () => {
    if (!localStream) return;
    const next = !muted;
    localStream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;
    await startCall(incomingCall.callType, incomingCall.conversationId, true);
  };

  const rejectIncomingCall = async () => {
    if (incomingCall?.from) {
      const conn = await ensureCallConnection();
      if (conn) {
        await conn.invoke('RejectCall', incomingCall.from);
      }
    }
    setIncomingCall(null);
  };

  const inviteUserToCall = async (targetUserId: string) => {
    if (!callActive || !callType || !callConversationId) return;
    const conn = await ensureCallConnection();
    if (!conn) return;
    await conn.invoke('CallInvite', callConversationId, targetUserId, callType);
  };

  const replaceVideoTrack = (track: MediaStreamTrack) => {
    Object.values(peersRef.current).forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(track);
      else pc.addTrack(track, new MediaStream([track]));
    });
  };

  const startScreenShare = async () => {
    if (screenStream) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(stream);
      setScreenShare(true);
      const track = stream.getVideoTracks()[0];
      if (track) {
        if (!originalVideoTrackRef.current && localStream) {
          originalVideoTrackRef.current = localStream.getVideoTracks()[0] ?? null;
        }
        replaceVideoTrack(track);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Screen share failed');
    }
  };

  const stopScreenShare = () => {
    if (!screenStream) return;
    screenStream.getTracks().forEach((t) => t.stop());
    setScreenStream(null);
    setScreenShare(false);
    const original = originalVideoTrackRef.current;
    if (original) {
      replaceVideoTrack(original);
      originalVideoTrackRef.current = null;
    }
  };

  const login = async () => {
    setLoading(true);
    setError('');
    try {
      const endpoint = registerMode ? '/api/auth/register' : '/api/auth/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Login failed (${res.status})`);
      }
      const data = (await res.json()) as {
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        userId: string;
        conversationId: string;
      };
      setToken(data.accessToken);
      setUserId(data.userId);
      setConversationId(data.conversationId);
      setChatTitle('Global Chat');
      setRegisterMode(false);
    } catch (err: any) {
      setError(err?.message ?? (registerMode ? 'Registration failed' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    const conn = chatConnectionRef.current;
    if (conn) {
      conn.stop().catch(() => {});
    }
    endCall().catch(() => {});
    const callConn = callConnectionRef.current;
    if (callConn) {
      callConn.stop().catch(() => {});
    }
    activeConversationRef.current = '';
    setToken('');
    setUserId('');
    setConversationId('');
    setChatTitle('Global Chat');
    setSelectedUserId('');
    setMessages([]);
    localStorage.removeItem(sessionKey);
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) return;
      const data = (await res.json()) as Array<{ id: string; username: string; email: string; avatar_url?: string }>;
      setUsers(data);
    } catch {
      // ignore for demo
    }
  };

  useEffect(() => {
    if (!token) return;
    loadUsers();
    const t = setInterval(loadUsers, 10000);
    return () => clearInterval(t);
  }, [token]);

  useEffect(() => {
    if (!token || !conversationId) return;
    const loadMessages = async () => {
      try {
        setMessages([]);
        const res = await fetch(`/api/chat/messages/${conversationId}?page=0&pageSize=50`);
        if (!res.ok) return;
        const data = (await res.json()) as Array<{
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          content_type: string;
          created_at: string;
        }>;
        const mapped = data.map((m) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          content: m.content,
          contentType: (m.content_type as 'text' | 'code' | 'file') ?? 'text',
          createdAt: m.created_at
        }));
        setMessages(mapped);
      } catch {
        // ignore for demo
      }
    };

    loadMessages();
  }, [token, conversationId, setMessages]);

  const selectUser = async (u: { id: string; username: string; email: string }) => {
    if (u.id === userId) return;
    setError('');
    try {
      const res = await fetch('/api/chat/conversations/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, otherUserId: u.id })
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to open chat');
      }
      const data = (await res.json()) as { conversationId: string };
      setSelectedUserId(u.id);
      setConversationId(data.conversationId);
      setChatTitle(`Direct: ${u.username || u.email}`);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to open chat');
    }
  };

  const send = async () => {
    if (!input.trim() || !conversationId) return;
    const contentType = input.includes('```') ? 'code' : 'text';
    setError('');
    try {
      await chatConnectionRef.current?.invoke('SendMessage', conversationId, input, contentType);
    } catch (err: any) {
      setError(err?.message ?? 'Send failed');
    }

    try {
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          conversationId,
          senderId: userId,
          content: input,
          contentType
        })
      });
    } catch {
      // Non-fatal for demo; SignalR already broadcasts to clients.
    }

    setInput('');
  };

  const handleFileUpload = async (file: File) => {
    if (!conversationId) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: form
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Upload failed');
      }
      const data = (await res.json()) as { id: string; objectKey: string; url?: string };
      const url = data.url ?? `http://localhost:9000/chatapp/${data.objectKey}`;
      const content = url;
      await chatConnectionRef.current?.invoke('SendMessage', conversationId, content, 'file');
      await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          conversationId,
          senderId: userId,
          content,
          contentType: 'file'
        })
      });
    } catch (err: any) {
      setError(err?.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (!token) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="bg-gray-800 p-6 rounded w-80">
          <h1 className="mb-4 text-lg">{registerMode ? 'Register' : 'Login'}</h1>
          <div className="space-y-2">
            <input
              className="text-black px-2 py-1 w-full"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="text-black px-2 py-1 w-full"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="w-full bg-blue-600 py-1 rounded"
              onClick={login}
              disabled={loading}
            >
              {loading ? 'Please wait...' : registerMode ? 'Create account' : 'Sign in'}
            </button>
            <button
              className="w-full text-xs underline"
              onClick={() => setRegisterMode((v) => !v)}
              disabled={loading}
            >
              {registerMode ? 'Have an account? Sign in' : 'New user? Register'}
            </button>
            {error && <div className="text-red-400 text-sm">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={dark ? 'h-screen flex bg-gray-900 text-white' : 'h-screen flex bg-white text-black'}>
      <aside className="w-72 border-r border-gray-700 p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-bold">Contacts</h2>
          <button className="text-xs underline" onClick={logout}>Logout</button>
        </div>
        <div className="space-y-2 overflow-y-auto max-h-[70vh]">
          {users.length === 0 && <div className="text-sm text-gray-400">No users yet</div>}
          {users
            .filter((u) => u.id !== userId)
            .map((u) => (
              <button
                key={u.id}
                className={selectedUserId === u.id ? 'text-sm text-left w-full underline' : 'text-sm text-left w-full'}
                onClick={() => selectUser(u)}
              >
                {u.username || u.email}
              </button>
            ))}
        </div>
        <button className="mt-4 text-xs underline" onClick={() => setDark(!dark)}>Toggle dark mode</button>
      </aside>
      <main className="flex-1 flex flex-col">
        {incomingCall && (
          <div className="p-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
            <div className="text-sm">
              Incoming {incomingCall.callType} call from {incomingCall.from}
            </div>
            <div className="flex gap-2">
              <button className="text-xs underline" onClick={acceptIncomingCall}>Accept</button>
              <button className="text-xs underline" onClick={rejectIncomingCall}>Reject</button>
            </div>
          </div>
        )}
        <div className="p-3 border-b border-gray-700 flex items-center justify-between">
          <div>{chatTitle}</div>
          <div className="flex items-center gap-2">
            <button className="text-xs underline" onClick={() => startCall('voice')} disabled={callActive}>Voice Call</button>
            <button className="text-xs underline" onClick={() => startCall('video')} disabled={callActive}>Video Call</button>
            {callActive && (
              <select
                className="text-xs text-black px-1"
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) inviteUserToCall(id);
                  e.currentTarget.value = '';
                }}
              >
                <option value="">Add user</option>
                {users.filter((u) => u.id !== userId).map((u) => (
                  <option key={u.id} value={u.id}>{u.username || u.email}</option>
                ))}
              </select>
            )}
            <div className={connected ? 'text-green-400 text-xs' : 'text-yellow-400 text-xs'}>
              {connected ? 'Connected' : 'Connecting...'}
            </div>
          </div>
        </div>
        <ChatWindow />
        <div className="p-3 border-t border-gray-700 flex gap-2 items-center">
          <EmojiPicker onPick={(e) => setInput((s) => s + e)} onPickMany={(e) => setInput((s) => s + e)} />
          <input className="flex-1 text-black px-2" value={input} onChange={(e) => setInput(e.target.value)} />
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.currentTarget.value = '';
            }}
            disabled={uploading}
          />
          <button onClick={send} disabled={!connected || !input.trim()}>Send</button>
          <button onClick={screenShare ? stopScreenShare : startScreenShare}>
            {screenShare ? 'Stop Share' : 'Share Screen'}
          </button>
        </div>
        {error && <div className="p-2 text-red-400 text-sm">{error}</div>}
        <div className="p-2">
          <VideoCall
            active={callActive && (callType === 'video' || screenShare)}
            localStream={screenShare && screenStream ? screenStream : localStream}
            remoteStreams={remoteStreams}
          />
        </div>
        <div className="p-2">
          <ScreenShare active={screenShare} stream={screenStream} onStop={stopScreenShare} />
        </div>
      </main>
      <VoiceCall
        active={callActive}
        muted={muted}
        participants={participants.length || 1}
        remoteStreams={remoteStreams}
        onToggleMute={toggleMute}
        onHangup={() => {
          endCall().catch(() => {});
        }}
        onAddUser={() => {
          const candidate = users.find((u) => u.id !== userId && u.id !== selectedUserId);
          if (candidate) inviteUserToCall(candidate.id);
        }}
      />
    </div>
  );
}
