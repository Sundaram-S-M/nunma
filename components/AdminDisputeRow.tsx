import React, { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../utils/firebase';
import { Check, X, FileText, Clock, ExternalLink, ShieldAlert } from 'lucide-react';

interface Dispute {
    id: string;
    transactionId: string;
    bookingId: string | null;
    userId: string;
    userEmail: string;
    amount: string;
    currency: string;
    reason: string;
    details: string;
    evidenceUrl: string | null;
    status: 'Under Review' | 'Resolved - Refunded' | 'Resolved - Denied';
    request_timestamp: { seconds: number; nanoseconds: number } | any; // Firestore timestamp
    refund_cutoff_time: string;
}

interface AdminDisputeRowProps {
    dispute: Dispute;
    onUpdate: () => void;
}

const AdminDisputeRow: React.FC<AdminDisputeRowProps> = ({ dispute, onUpdate }) => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [denyReason, setDenyReason] = useState('');
    const [showDenyInput, setShowDenyInput] = useState(false);

    const handleApprove = async () => {
        if (!confirm(`Are you sure you want to approve this refund and return ${dispute.currency} ${dispute.amount} to the student? Funding will be pulled from Escrow.`)) return;
        setIsProcessing(true);
        try {
            // Trigger Zoho refund_transaction via our secure backend
            const processZohoRefund = httpsCallable(functions, 'processZohoRefund');

            const result = await processZohoRefund({
                disputeId: dispute.id,
                transactionId: dispute.transactionId,
                action: 'approve'
            });

            const data = result.data as any;
            if (data.success) {
                alert('Refund processed successfully via Zoho API.');
                onUpdate();
            } else {
                throw new Error(data.message || 'Refund processing failed');
            }
        } catch (error: any) {
            console.error("Refund approval Error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeny = async () => {
        if (!denyReason) {
            alert('Please provide a reason for denying the dispute.');
            return;
        }

        setIsProcessing(true);
        try {
            // Trigger Deny logic (unfreeze funds)
            const processZohoRefund = httpsCallable(functions, 'processZohoRefund');

            const result = await processZohoRefund({
                disputeId: dispute.id,
                transactionId: dispute.transactionId,
                action: 'deny',
                reason: denyReason
            });

            const data = result.data as any;
            if (data.success) {
                alert('Dispute denied. Funds have been unfrozen for the Tutor.');
                setShowDenyInput(false);
                onUpdate();
            } else {
                throw new Error(data.message || 'Denial processing failed');
            }
        } catch (error: any) {
            console.error("Refund denial Error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const requestDate = dispute.request_timestamp?.seconds
        ? new Date(dispute.request_timestamp.seconds * 1000).toLocaleString()
        : 'Unknown Date';

    return (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 mb-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                {/* Audit Trail Info */}
                <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                        <ShieldAlert size={20} className="text-orange-500" />
                        <h4 className="font-black text-[#040457] text-lg">{dispute.reason}</h4>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${dispute.status === 'Under Review' ? 'bg-orange-100 text-orange-600' :
                                dispute.status === 'Resolved - Refunded' ? 'bg-green-100 text-green-600' :
                                    'bg-red-100 text-red-600'
                            }`}>
                            {dispute.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm mt-3">
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Transaction</p>
                            <p className="font-mono font-bold text-[#040457]">{dispute.transactionId}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Amount</p>
                            <p className="font-black text-indigo-600">{dispute.currency} {dispute.amount}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Student Email</p>
                            <p className="font-medium text-gray-700">{dispute.userEmail}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Request Time</p>
                            <p className="font-medium text-gray-700 flex items-center gap-1">
                                <Clock size={12} /> {requestDate}
                            </p>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-2xl mt-4">
                        <p className="text-sm font-medium text-gray-600">"{dispute.details}"</p>
                        {dispute.evidenceUrl && (
                            <a
                                href={dispute.evidenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                <FileText size={14} /> View Attached Evidence <ExternalLink size={12} />
                            </a>
                        )}
                    </div>
                </div>

                {/* Actions */}
                {dispute.status === 'Under Review' && (
                    <div className="flex flex-col gap-3 min-w-[200px]">
                        {!showDenyInput ? (
                            <>
                                <button
                                    onClick={handleApprove}
                                    disabled={isProcessing}
                                    className="w-full py-3 bg-green-500 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-green-500/20 hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <Check size={16} /> Approve Refund
                                </button>
                                <button
                                    onClick={() => setShowDenyInput(true)}
                                    disabled={isProcessing}
                                    className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    <X size={16} /> Deny & Unfreeze
                                </button>
                            </>
                        ) : (
                            <div className="space-y-3 p-4 bg-red-50 rounded-2xl border border-red-100 animate-in fade-in zoom-in-95">
                                <label className="text-[9px] font-black text-red-400 uppercase tracking-widest block">Denial Reason (Logs)</label>
                                <textarea
                                    className="w-full h-20 bg-white border border-red-200 focus:border-red-400 rounded-xl p-2 text-xs font-medium text-gray-700 outline-none resize-none"
                                    placeholder="Explain why the dispute is denied..."
                                    value={denyReason}
                                    onChange={(e) => setDenyReason(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowDenyInput(false)}
                                        className="flex-1 py-2 bg-gray-200 text-gray-600 rounded-lg text-[9px] font-black uppercase tracking-wider"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeny}
                                        disabled={isProcessing || !denyReason}
                                        className="flex-[2] py-2 bg-red-500 text-white rounded-lg text-[9px] font-black uppercase tracking-wider disabled:opacity-50"
                                    >
                                        {isProcessing ? 'Processing...' : 'Confirm Deny'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDisputeRow;
