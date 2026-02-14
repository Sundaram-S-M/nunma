import React from 'react';
import { Radio, Clock, CheckCircle2 } from 'lucide-react';

interface LiveSessionStatusProps {
    status: 'live' | 'scheduled' | 'ended';
    startTime?: string;
    date?: string;
    time?: string;
    className?: string;
}

const LiveSessionStatus: React.FC<LiveSessionStatusProps> = ({ status, startTime, date, time, className = "" }) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'live':
                return {
                    color: 'text-red-500',
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-100',
                    icon: <Radio size={14} className="animate-pulse" />,
                    label: 'Live Broadcast Active'
                };
            case 'scheduled':
                return {
                    color: 'text-indigo-600',
                    bgColor: 'bg-indigo-50',
                    borderColor: 'border-indigo-100',
                    icon: <Clock size={14} />,
                    label: startTime ? new Date(startTime).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : (date && time ? `${date} @ ${time}` : 'Scheduled Session')
                };
            case 'ended':
                return {
                    color: 'text-gray-400',
                    bgColor: 'bg-gray-50',
                    borderColor: 'border-gray-100',
                    icon: <CheckCircle2 size={14} />,
                    label: 'Session Concluded'
                };
            default:
                return {
                    color: 'text-gray-400',
                    bgColor: 'bg-gray-50',
                    borderColor: 'border-gray-100',
                    icon: <Clock size={14} />,
                    label: 'Unknown Status'
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border ${config.bgColor} ${config.borderColor} ${config.color} ${className}`}>
            <div className="shrink-0">{config.icon}</div>
            <span className="text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap">
                {config.label}
            </span>
        </div>
    );
};

export default LiveSessionStatus;
