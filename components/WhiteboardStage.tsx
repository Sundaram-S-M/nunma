import React from 'react';
import { Editor, Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const WhiteboardStage: React.FC = () => {
    const { user } = useAuth();
    const isTutor = user?.role === UserRole.THALA;

    const handleMount = (editor: Editor) => {
        editor.updateInstanceState({ isReadonly: !isTutor });
    };

    return (
        <div className="w-full h-full bg-[#fbfbfb] relative z-10">
            <Tldraw className="w-full h-full" onMount={handleMount} hideUi={!isTutor} />
        </div>
    );
};

export default WhiteboardStage;

