import React, { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type?: ToastType;
    duration?: number;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 5000, onClose }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for fade-out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle className="text-green-500" size={20} />,
        error: <AlertCircle className="text-red-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />,
        warning: <AlertTriangle className="text-yellow-500" size={20} />,
    };

    const colors = {
        success: 'bg-green-50 border-green-100 text-green-800',
        error: 'bg-red-50 border-red-100 text-red-800',
        info: 'bg-blue-50 border-blue-100 text-blue-800',
        warning: 'bg-yellow-50 border-yellow-100 text-yellow-800',
    };

    return (
        <div
            className={`fixed top-6 right-6 z-[600] flex items-center gap-4 px-6 py-4 rounded-2xl border shadow-2xl transition-all duration-300 transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
                } ${colors[type]}`}
        >
            <div className="shrink-0">{icons[type]}</div>
            <p className="text-sm font-black tracking-tight">{message}</p>
            <button
                onClick={() => {
                    setIsVisible(false);
                    setTimeout(onClose, 300);
                }}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default Toast;
