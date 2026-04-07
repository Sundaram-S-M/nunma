import React, { useState, useEffect, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';
import { Loader2 } from 'lucide-react';

interface BunnyVideoPlayerProps {
    videoId: string;
    title: string;
    onComplete: () => void;
}

export const BunnyVideoPlayer: React.FC<BunnyVideoPlayerProps> = ({ videoId, title, onComplete }) => {
    const [tokenData, setTokenData] = useState<{ token: string; expires: number; libraryId: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const getTokenFn = httpsCallable(functions, 'generateBunnyToken');
                const result = await getTokenFn({ videoId });
                setTokenData(result.data as any);
            } catch (err: any) {
                console.error("Failed to fetch Bunny token", err);
                setError(err.message || 'Failed to initialize video player');
            }
        };

        if (videoId) {
            fetchToken();
        }
    }, [videoId]);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            // Bunny sends player events via postMessage
            // Format is { type: "player:ended" } or similar
            if (e.data === 'ended' || e.data?.type === 'player:ended' || e.data?.event === 'ended') {
                onComplete();
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onComplete]);

    if (error) {
        return (
            <div className="w-full h-full aspect-video flex items-center justify-center bg-gray-50 rounded-[3rem] text-red-500 font-bold p-6 text-center">
                {error}
            </div>
        );
    }

    if (!tokenData) {
        return (
            <div className="w-full h-full aspect-video flex flex-col items-center justify-center bg-gray-50 rounded-[3rem] text-indigo-900">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="font-bold">Loading secure video player...</p>
            </div>
        );
    }

    const { token, expires, libraryId } = tokenData;
    // URL Format based on Bunny token authentication
    const iframeUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}&autoplay=true`;

    return (
        <div className="w-full max-w-full aspect-video rounded-[3rem] overflow-hidden bg-black shadow-2xl relative flex flex-col items-center justify-center">
            <iframe
                ref={iframeRef}
                src={iframeUrl}
                loading="lazy"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-none object-cover"
                title={title}
            />
            {/* Absolute positioning to prevent right-clicks outside of player context if needed */}
        </div>
    );
};
