import React, { useState, useEffect } from 'react';
import { LiveKitRoom, VideoConference, RoomAudioRenderer, ControlBar, useLocalParticipant, TrackToggle } from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Mic, MicOff } from 'lucide-react';

interface VideoStageProps {
    token: string;
    serverUrl: string;
}

const StudentMicToggle = () => {
    const { localParticipant } = useLocalParticipant();
    const canPublish = localParticipant.permissions?.canPublish;

    if (!canPublish) return null;

    return (
        <div className="absolute bottom-10 left-10 z-50 animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="bg-[#c2f575] p-1 rounded-2xl shadow-2xl flex items-center gap-3 pr-6 border border-white/20">
                <TrackToggle 
                    source={Track.Source.Microphone} 
                    className="!bg-[#1A1A4E] !text-[#c2f575] !rounded-xl !p-3 hover:!scale-105 transition-transform"
                />
                <div className="flex flex-col">
                    <span className="text-[#1A1A4E] text-[10px] font-black uppercase tracking-widest leading-none">Microphone</span>
                    <span className="text-[#1A1A4E]/60 text-[8px] font-bold uppercase tracking-wider">Tutor unmuted you</span>
                </div>
            </div>
        </div>
    );
};

const VideoStage: React.FC<VideoStageProps> = ({ token, serverUrl }) => {
    const { user } = useAuth();
    const isTutor = user?.role === UserRole.THALA;

    return (
        <div className="w-full h-full bg-[#040413]" data-lk-theme="default">
            <LiveKitRoom
                video={isTutor} // Auto-publish video if tutor
                audio={isTutor} // Auto-publish audio if tutor
                token={token}
                serverUrl={serverUrl}
                connect={true}
                className="h-full flex flex-col"
            >
                <VideoConference />
                <RoomAudioRenderer />
                
                {/* Tutor Controls */}
                {isTutor && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md p-2 rounded-2xl border border-white/10 z-40">
                        <ControlBar controls={{ camera: true, microphone: true, screenShare: true, chat: false, leave: true }} />
                    </div>
                )}

                {/* Student Unmute UI (only shows if student is granted permission) */}
                {!isTutor && <StudentMicToggle />}
            </LiveKitRoom>
        </div>
    );
};

export default VideoStage;

