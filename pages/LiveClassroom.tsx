import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MessageCircle, X, Loader2 } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';
import VideoStage from '../components/VideoStage';
import WhiteboardStage from '../components/WhiteboardStage';
import EngagementSidebar from '../components/EngagementSidebar';

const LiveClassroom: React.FC = () => {
    const { zoneId, sessionId } = useParams<{ zoneId: string, sessionId: string }>();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'camera' | 'whiteboard'>('camera');
    
    const [token, setToken] = useState<string | null>(null);
    const [serverUrl, setServerUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const toggleSidebar = () => setIsSidebarOpen(prev => !prev);

    useEffect(() => {
        const fetchToken = async () => {
            if (!zoneId || !sessionId) return;
            setIsLoading(true);
            try {
                const getLiveToken = httpsCallable<any, { token: string, serverUrl: string }>(functions, 'generateLiveToken');
                const result = await getLiveToken({ zoneId, sessionId });
                setToken(result.data.token);
                setServerUrl(result.data.serverUrl);
            } catch (err: any) {
                console.error("Token fetch failed:", err);
                setError(err.message || "Failed to join session");
            } finally {
                setIsLoading(false);
            }
        };

        fetchToken();
    }, [zoneId, sessionId]);

    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 text-[#c2f575] animate-spin" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Initializing Secure Link...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen w-screen bg-gray-950 flex flex-col items-center justify-center gap-4 text-center p-6">
                <div className="text-red-500 font-black text-2xl uppercase tracking-tighter">Connection Error</div>
                <p className="text-gray-400 max-w-md">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-8 py-3 bg-[#c2f575] text-[#1A1A4E] font-bold rounded-2xl hover:scale-105 transition-transform"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="relative w-[100vw] h-[100vh] bg-gray-950 overflow-hidden">
            {/* Main Stage */}
            <main className="absolute inset-0 z-0">
                {viewMode === 'camera' ? (
                    <VideoStage token={token!} serverUrl={serverUrl!} />
                ) : (
                    <WhiteboardStage />
                )}
            </main>

            {/* Temporary View Toggle for testing */}
            <div className="absolute top-4 left-4 z-40 bg-black/50 p-2 rounded-lg flex gap-2">
                <button 
                    onClick={() => setViewMode('camera')}
                    className={`px-4 py-2 rounded ${viewMode === 'camera' ? 'bg-[#c2f575] text-[#1A1A4E] font-bold' : 'bg-gray-800 text-white'}`}
                >
                    Camera
                </button>
                <button 
                    onClick={() => setViewMode('whiteboard')}
                    className={`px-4 py-2 rounded ${viewMode === 'whiteboard' ? 'bg-[#c2f575] text-[#1A1A4E] font-bold' : 'bg-gray-800 text-white'}`}
                >
                    Whiteboard
                </button>
            </div>

            {/* Engagement Drawer */}
            <div 
                className={`absolute right-0 top-0 h-full w-80 bg-gray-900 z-50 shadow-2xl transition-transform duration-300 ease-in-out ${
                    isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <EngagementSidebar />
            </div>

            {/* Floating Action Button */}
            <button
                onClick={toggleSidebar}
                className="absolute bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-[#c2f575] to-[#6ee7b7] rounded-full shadow-lg flex items-center justify-center text-[#1A1A4E] hover:scale-105 transition-transform"
            >
                {isSidebarOpen ? <X size={28} /> : <MessageCircle size={28} />}
            </button>
        </div>
    );
};

export default LiveClassroom;
