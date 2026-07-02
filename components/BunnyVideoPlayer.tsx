import React, { useEffect, useRef } from 'react';

interface BunnyVideoPlayerProps {
    videoId: string;
    title: string;
    onComplete: () => void;
}

export const BunnyVideoPlayer: React.FC<BunnyVideoPlayerProps> = ({ videoId, title, onComplete }) => {
    const LIBRARY_ID = '628013';
    const iframeUrl = `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}?autoplay=true&preload=true`;
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const completedRef = useRef(false);
    const playerRef = useRef<any>(null);

    const triggerComplete = () => {
        if (completedRef.current) return;
        completedRef.current = true;
        console.log('[BunnyPlayer] Marking video as completed!');
        onComplete();
    };

    const attachPlayerEvents = () => {
        if (!(window as any).playerjs || !iframeRef.current) return;

        try {
            const player = new (window as any).playerjs.Player(iframeRef.current);
            playerRef.current = player;

            player.on('ready', () => {
                console.log('[BunnyPlayer] Player ready — attaching events');

                // Primary: ended event
                player.on('ended', () => {
                    console.log('[BunnyPlayer] "ended" event fired');
                    triggerComplete();
                });

                // Fallback: timeupdate — fires when ≥97% of video is watched
                player.on('timeupdate', (data: { seconds: number; duration: number }) => {
                    if (data && data.duration > 0 && !completedRef.current) {
                        const progress = data.seconds / data.duration;
                        if (progress >= 0.97) {
                            console.log('[BunnyPlayer] 97% reached via timeupdate — completing');
                            triggerComplete();
                        }
                    }
                });
            });
        } catch (err) {
            console.warn('[BunnyPlayer] Player init error:', err);
        }
    };

    const handleIframeLoad = () => {
        console.log('[BunnyPlayer] iframe loaded');
        if ((window as any).playerjs) {
            attachPlayerEvents();
        } else {
            // Script still loading — poll until available
            let attempts = 0;
            const poll = setInterval(() => {
                if ((window as any).playerjs) {
                    clearInterval(poll);
                    attachPlayerEvents();
                } else if (++attempts > 25) {
                    clearInterval(poll);
                    console.warn('[BunnyPlayer] player.js never became available');
                }
            }, 200);
        }
    };

    useEffect(() => {
        // Inject Player.js script once
        if (!document.getElementById('bunny-player-js')) {
            const script = document.createElement('script');
            script.id = 'bunny-player-js';
            script.src = 'https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js';
            script.async = true;
            document.body.appendChild(script);
        }

        return () => {
            try {
                if (playerRef.current?.off) {
                    playerRef.current.off('ended');
                    playerRef.current.off('ready');
                    playerRef.current.off('timeupdate');
                }
            } catch (_) {}
        };
    }, []);

    return (
        <div className="w-full max-w-full aspect-video rounded-[2rem] overflow-hidden bg-black shadow-2xl">
            <iframe
                ref={iframeRef}
                src={iframeUrl}
                loading="lazy"
                onLoad={handleIframeLoad}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                referrerPolicy="no-referrer"
                className="w-full h-full border-none"
                title={title}
            />
        </div>
    );
};