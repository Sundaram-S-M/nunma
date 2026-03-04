import React, { useRef } from 'react';
import {
    HMSRoomProvider,
    useHMSActions,
    useHMSStore,
    selectPeers,
    selectIsConnectedToRoom,
    useVideo,
    HMSPeer,
} from '@100mslive/react-sdk';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';
import { Radio, LogOut, Video, VideoOff, Loader } from 'lucide-react';

// ─── Peer Video Tile ───────────────────────────────────────────────────────────

interface PeerProps {
    peer: HMSPeer;
}

const Peer: React.FC<PeerProps> = ({ peer }) => {
    const { videoRef } = useVideo({ trackId: peer.videoTrack });

    return (
        <div className="relative bg-[#0a0a2e] rounded-2xl overflow-hidden border border-white/10 aspect-video flex items-center justify-center group">
            {peer.videoTrack ? (
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    muted={peer.isLocal}
                    playsInline
                />
            ) : (
                <div className="flex flex-col items-center gap-3">
                    <div
                        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-[#1A1A4E]"
                        style={{ background: 'linear-gradient(135deg, #c2f575, #6ee7b7)' }}
                    >
                        {peer.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <VideoOff size={16} className="text-gray-500" />
                </div>
            )}

            {/* Name badge */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg flex items-center gap-2">
                {peer.isLocal && (
                    <span className="w-1.5 h-1.5 bg-[#c2f575] rounded-full animate-pulse" />
                )}
                <span className="text-white text-[10px] font-bold tracking-wide truncate max-w-[140px]">
                    {peer.name}{peer.isLocal ? ' (You)' : ''}
                </span>
            </div>
        </div>
    );
};

// ─── Inner Room UI ─────────────────────────────────────────────────────────────

const SandboxRoom: React.FC = () => {
    const hmsActions = useHMSActions();
    const peers = useHMSStore(selectPeers as any) as HMSPeer[];
    const isConnected = useHMSStore(selectIsConnectedToRoom);
    const [isJoining, setIsJoining] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const handleJoin = async () => {
        setIsJoining(true);
        setError(null);
        try {
            const getToken = httpsCallable<unknown, { token: string }>(functions, 'get100msToken');
            const result = await getToken({});
            const { token } = result.data;

            await hmsActions.join({
                authToken: token,
                userName: 'Tutor Test',
                settings: {
                    isAudioMuted: false,
                    isVideoMuted: false,
                },
            });
        } catch (err: any) {
            console.error('[SandboxLive] Join failed:', err);
            setError(err?.message || 'Failed to join room. Ensure HMS secrets are configured.');
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeave = async () => {
        await hmsActions.leave();
    };

    // ── Pre-join screen ────────────────────────────────────────────────────────
    if (!isConnected) {
        return (
            <div className="min-h-screen bg-[#040413] flex items-center justify-center p-6">
                {/* Ambient glow */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#c2f575]/5 rounded-full blur-3xl" />
                </div>

                <div className="relative bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-12 max-w-md w-full text-center shadow-2xl">
                    {/* Icon */}
                    <div className="w-20 h-20 mx-auto mb-8 rounded-[1.5rem] bg-gradient-to-br from-[#c2f575] to-[#6ee7b7] flex items-center justify-center shadow-xl shadow-[#c2f575]/20">
                        <Radio size={36} className="text-[#1A1A4E]" />
                    </div>

                    <h1 className="text-white text-3xl font-black mb-2 tracking-tight">
                        100ms Sandbox
                    </h1>
                    <p className="text-gray-400 text-sm mb-10 leading-relaxed">
                        Live class infrastructure sandbox environment.{' '}
                        <span className="text-[#c2f575]">100ms.live</span> powered.
                    </p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-left">
                            <p className="text-red-400 text-xs font-semibold leading-relaxed">{error}</p>
                        </div>
                    )}

                    <button
                        id="sandbox-join-btn"
                        onClick={handleJoin}
                        disabled={isJoining}
                        className="w-full py-4 rounded-2xl font-black uppercase tracking-[0.15em] text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        style={{
                            background: isJoining
                                ? 'rgba(194,245,117,0.4)'
                                : 'linear-gradient(135deg, #c2f575, #6ee7b7)',
                            color: '#1A1A4E',
                            boxShadow: isJoining ? 'none' : '0 8px 32px rgba(194,245,117,0.25)',
                        }}
                    >
                        {isJoining ? (
                            <>
                                <Loader size={16} className="animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                <Radio size={16} />
                                Join Sandbox
                            </>
                        )}
                    </button>

                    <p className="mt-6 text-[10px] text-gray-600 uppercase tracking-widest">
                        Sandbox · Not for production use
                    </p>
                </div>
            </div>
        );
    }

    // ── In-room screen ─────────────────────────────────────────────────────────
    return (
        <div className="h-screen bg-[#040413] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="h-16 bg-[#0a0a2e] border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#c2f575] to-[#6ee7b7] flex items-center justify-center">
                        <Radio size={14} className="text-[#1A1A4E]" />
                    </div>
                    <div>
                        <h1 className="text-white font-black text-sm tracking-tight">100ms Sandbox</h1>
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-[#c2f575] rounded-full animate-pulse" />
                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                Live · {peers.length} participant{peers.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                </div>

                <button
                    id="sandbox-leave-btn"
                    onClick={handleLeave}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black uppercase tracking-[0.15em] text-[10px] transition-all active:scale-95 shadow-lg shadow-red-600/20"
                >
                    <LogOut size={14} />
                    Leave Room
                </button>
            </div>

            {/* Video Grid */}
            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {peers.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-4 text-center">
                        <div className="w-16 h-16 border-2 border-[#c2f575]/30 border-t-[#c2f575] rounded-full animate-spin" />
                        <p className="text-gray-400 text-sm">Waiting for participants...</p>
                    </div>
                ) : (
                    <div
                        className={`grid gap-4 h-full ${peers.length === 1
                            ? 'grid-cols-1 max-w-2xl mx-auto'
                            : peers.length <= 4
                                ? 'grid-cols-2'
                                : 'grid-cols-3'
                            }`}
                    >
                        {peers.map((peer) => (
                            <Peer key={peer.id} peer={peer} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

// ─── Root Export — wrapped in HMSRoomProvider ──────────────────────────────────

const SandboxLive: React.FC = () => (
    <HMSRoomProvider>
        <SandboxRoom />
    </HMSRoomProvider>
);

export default SandboxLive;
