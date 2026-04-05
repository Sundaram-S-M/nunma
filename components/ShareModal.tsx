import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ShieldAlert, Share2, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';
import { toast } from 'react-hot-toast';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    zoneId: string;
    zoneTitle: string;
    activeInvite: {
        inviteToken: string;
        expiresAt: number;
    } | null;
    onRevoke: () => void;
    onGenerate: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ 
    isOpen, 
    onClose, 
    zoneId, 
    zoneTitle,
    activeInvite,
    onRevoke,
    onGenerate
}) => {
    const [isCopying, setIsCopying] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);

    if (!isOpen) return null;

    const inviteUrl = activeInvite 
        ? `${window.location.origin}/#/classroom/zone/${zoneId}?invite=${activeInvite.inviteToken}`
        : '';

    const handleCopy = async () => {
        if (!inviteUrl) return;
        try {
            await navigator.clipboard.writeText(inviteUrl);
            setIsCopying(true);
            toast.success('Invite link copied!', {
                style: {
                    background: '#040457',
                    color: '#c2f575',
                    fontWeight: 'bold',
                    borderRadius: '1rem',
                }
            });
            setTimeout(() => setIsCopying(false), 2000);
        } catch (err) {
            toast.error('Failed to copy link');
        }
    };

    const handleRevokeClick = async () => {
        if (!activeInvite) return;
        if (!window.confirm('Are you sure you want to revoke this invite? Any student with this link will no longer be able to join.')) return;

        try {
            setIsRevoking(true);
            const revokeFunc = httpsCallable(functions, 'revokeZoneInvite');
            await revokeFunc({ zoneId, inviteToken: activeInvite.inviteToken });
            toast.success('Invite revoked successfully');
            onRevoke();
        } catch (err: any) {
            console.error('Revocation failed:', err);
            toast.error(err.message || 'Failed to revoke invite');
        } finally {
            setIsRevoking(false);
        }
    };

    const getTimeRemaining = (expiresAt: number) => {
        const remaining = expiresAt - Date.now();
        if (remaining <= 0) return 'Expired';
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m left`;
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-[#040457]/80 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[4rem] w-full max-w-xl shadow-3xl overflow-hidden p-12 animate-in zoom-in-95 duration-500 relative">
                {/* Header */}
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 bg-[#040457] text-[#c2f575] rounded-2xl flex items-center justify-center shadow-lg">
                                <Share2 size={24} />
                            </div>
                            <h3 className="text-4xl font-black text-[#040457] tracking-tighter">Share Zone</h3>
                        </div>
                        <p className="text-sm text-gray-400 font-medium ml-1">Invite students to <span className="text-[#040457] font-black">{zoneTitle}</span></p>
                    </div>
                    <button onClick={onClose} className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </div>

                {!activeInvite ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-700">
                        <div className="w-24 h-24 bg-gray-50 text-gray-300 rounded-[2.5rem] flex items-center justify-center">
                            <LinkIcon size={40} />
                        </div>
                        <div className="space-y-3">
                            <p className="text-xl font-bold text-[#040457]">No Active Invite Token</p>
                            <p className="text-sm text-gray-400 max-w-xs mx-auto">Generate a new 48-hour secure link to start inviting students directly.</p>
                        </div>
                        <button 
                            onClick={onGenerate}
                            className="px-12 py-6 bg-[#040457] text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                        >
                            <RefreshCw size={20} className="text-[#c2f575]" /> Generate Link
                        </button>
                    </div>
                ) : (
                    <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
                        {/* QR Code Section */}
                        <div className="flex flex-col items-center justify-center space-y-6">
                            <div className="bg-[#040457] p-8 rounded-[3.5rem] shadow-2xl transform hover:scale-[1.02] transition-transform cursor-pointer group relative">
                                <div className="bg-white p-6 rounded-[2.5rem]">
                                    <QRCodeSVG value={inviteUrl} size={180} fgColor="#040457" level="H" includeMargin />
                                </div>
                                <div className="absolute inset-0 bg-[#040457] opacity-0 group-hover:opacity-10 transition-opacity rounded-[3.5rem]"></div>
                            </div>
                            <div className="text-center">
                                <span className="px-5 py-2 bg-[#c2f575]/20 text-[#040457] rounded-full text-[10px] font-black uppercase tracking-widest border border-[#c2f575]">
                                    {getTimeRemaining(activeInvite.expiresAt)}
                                </span>
                            </div>
                        </div>

                        {/* Link & Actions */}
                        <div className="space-y-6">
                            <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#040457]">
                                    <LinkIcon size={18} />
                                </div>
                                <input 
                                    readOnly 
                                    value={inviteUrl} 
                                    className="w-full bg-gray-50 border-2 border-transparent rounded-[1.75rem] pl-16 pr-8 py-5 font-bold text-[#040457] text-sm outline-none shadow-inner"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={handleCopy}
                                    className={`py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${
                                        isCopying ? 'bg-[#c2f575] text-[#040457]' : 'bg-[#040457] text-white hover:scale-[1.02]'
                                    }`}
                                >
                                    {isCopying ? <Check size={16} /> : <Copy size={16} className="text-[#c2f575]" />}
                                    {isCopying ? 'Copied!' : 'Copy Link'}
                                </button>
                                <button 
                                    onClick={handleRevokeClick}
                                    disabled={isRevoking}
                                    className="py-5 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isRevoking ? <RefreshCw size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
                                    Revoke Link
                                </button>
                            </div>
                        </div>

                        <p className="text-[10px] text-gray-400 font-bold text-center uppercase tracking-widest px-8 leading-relaxed italic">
                            This link bypasses payment. Be careful who you share it with.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
