import React from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const WhiteboardStage: React.FC = () => {
    const { user } = useAuth();
    const isTutor = user?.role === UserRole.THALA;

    return (
        <div className="w-full h-full bg-[#fbfbfb] relative z-10">
            <Excalidraw viewModeEnabled={!isTutor} />
        </div>
    );
};

export default WhiteboardStage;
