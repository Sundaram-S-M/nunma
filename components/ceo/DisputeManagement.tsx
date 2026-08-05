import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../utils/firebase';
import { ShieldAlert, RefreshCcw, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const DisputeManagement: React.FC = () => {
    const [disputes, setDisputes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDisputes = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'disputes'), where('status', '==', 'Under Review'));
            const snap = await getDocs(q);
            setDisputes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Error fetching disputes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDisputes();
    }, []);

    const handleApproveRefund = async (disputeId: string) => {
        const approveRefund = httpsCallable(functions, 'approveRefund');
        try {
            await approveRefund({ disputeId });
            toast.success("Refund approved");
            fetchDisputes();
        } catch (error: any) {
            toast.error(error.message || "Failed to approve refund");
        }
    };

    const handleDenyUnfreeze = async (disputeId: string) => {
        const denyAndUnfreeze = httpsCallable(functions, 'denyAndUnfreeze');
        try {
            await denyAndUnfreeze({ disputeId });
            toast.success("Dispute denied, funds unfrozen");
            fetchDisputes();
        } catch (error: any) {
            toast.error(error.message || "Failed to deny dispute");
        }
    };

    const formatINR = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    if (loading) {
        return <div className="animate-pulse bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-64"></div>;
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                    <ShieldAlert className="text-red-500" />
                    <div>
                        <h2 className="text-lg font-black text-gray-900">Escrow & Disputes</h2>
                        <p className="text-xs text-gray-500">48-hour Safe-Guard Escrow Window</p>
                    </div>
                </div>
                <button onClick={fetchDisputes} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors">
                    <RefreshCcw size={18} />
                </button>
            </div>
            
            <div className="p-0 overflow-y-auto max-h-[500px]">
                {disputes.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                        {disputes.map((dispute) => (
                            <div key={dispute.id} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <span className="font-bold text-gray-900">{formatINR(dispute.amount || 0)}</span>
                                        <span className="text-xs text-gray-500 ml-2">Transaction: {dispute.transactionId || 'N/A'}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleApproveRefund(dispute.id)} className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold transition-colors">
                                            <CheckCircle size={14} /> Refund
                                        </button>
                                        <button onClick={() => handleDenyUnfreeze(dispute.id)} className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-bold transition-colors">
                                            <XCircle size={14} /> Deny
                                        </button>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-100">{dispute.reason}</p>
                                {dispute.evidenceUrl && (
                                    <a href={dispute.evidenceUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mt-2 inline-block">View Evidence</a>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <ShieldAlert size={48} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-xl font-bold text-gray-400 mb-1">No Active Disputes</h3>
                        <p className="text-sm text-gray-400">Escrow queue is empty.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
