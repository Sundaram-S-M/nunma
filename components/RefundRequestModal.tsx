import React, { useState } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RefundRequestModalProps {
    transactionId: string;
    bookingId?: string;
    refundCutoffTime: Date;
    amount: string;
    currency: string;
    onClose: () => void;
    onSuccess: () => void;
}

const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
    transactionId,
    bookingId,
    refundCutoffTime,
    amount,
    currency,
    onClose,
    onSuccess
}) => {
    const { user } = useAuth();
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isPastDeadline = new Date() > refundCutoffTime;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isPastDeadline) {
            setError("The refund deadline has passed. You cannot request a refund for this session.");
            return;
        }

        if (!reason || !details) {
            setError("Please fill in all required fields.");
            return;
        }

        if (!user) {
            setError("You must be logged in to request a refund.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // 2. Create dispute document
            const disputeRef = await addDoc(collection(db, 'disputes'), {
                transactionId,
                bookingId: bookingId || null,
                userId: user.uid,
                userEmail: user.email,
                amount,
                currency,
                reason,
                details,
                status: 'Under Review',
                request_timestamp: serverTimestamp(),
                refund_cutoff_time: refundCutoffTime.toISOString()
            });

            // 3. Update the original transaction/booking to REFUND_PENDING
            // Assuming we have a 'transactions' collection tracking the payment.
            // If the schema uses 'bookings', we update that as well.
            if (transactionId) {
                try {
                    await updateDoc(doc(db, 'transactions', transactionId), {
                        status: 'REFUND_PENDING',
                        disputeId: disputeRef.id
                    });
                } catch (txError) {
                    console.warn("Could not update transactions collection, might not exist:", txError);
                }
            }

            if (bookingId) {
                try {
                    await updateDoc(doc(db, 'bookings', bookingId), {
                        status: 'disputed',
                        disputeId: disputeRef.id
                    });
                } catch (bkError) {
                    console.warn("Could not update bookings collection, might not exist:", bkError);
                }
            }

            onSuccess();
        } catch (err: any) {
            console.error("Error submitting refund request:", err);
            setError(err.message || "Failed to submit refund request. Please try again.");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-[#040457]/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden p-10 relative">
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all"
                >
                    <X size={20} />
                </button>

                <div className="mb-8">
                    <h3 className="text-3xl font-black text-[#040457] tracking-tighter mb-2">Request Refund</h3>
                    <p className="text-sm text-gray-400 font-medium">Safe-Guard Dispute Resolution for Transaction <span className="text-[#040457] font-bold">{transactionId.substring(0, 8)}...</span></p>
                </div>

                {isPastDeadline ? (
                    <div className="p-8 bg-red-50 border border-red-100 rounded-3xl text-center space-y-4">
                        <AlertCircle size={48} className="text-red-400 mx-auto" />
                        <h4 className="text-red-600 font-black text-xl">Deadline Passed</h4>
                        <p className="text-red-500/80 text-sm">
                            The Safe-Guard refund window for this session closed on {refundCutoffTime.toLocaleString()}. Refunds are no longer automatically available.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="p-6 bg-[#c2f575]/10 border border-[#c2f575]/20 rounded-3xl flex items-start gap-4">
                            <CheckCircle2 size={24} className="text-[#658525] shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-[#3d5214]">Safe-Guard Protection Active</p>
                                <p className="text-xs text-[#526b1f] mt-1">You are submitting this request before the deadline ({refundCutoffTime.toLocaleString()}). Funds are currently held in escrow.</p>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold flex items-center gap-3">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Dispute Reason *</label>
                                <select
                                    className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-[#040457] outline-none transition-all appearance-none"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Select a categorized reason...</option>
                                    <option value="Tutor No Show">Tutor did not attend the session</option>
                                    <option value="Technical Issues">Severe technical issues prevented learning</option>
                                    <option value="Content Mismatch">Course content drastically didn't match description</option>
                                    <option value="Quality Concern">Subpar quality or unprofessional behavior</option>
                                    <option value="Accidental Purchase">Purchased by mistake (Instant processing)</option>
                                    <option value="Other">Other (Please specify below)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block ml-1 mb-2">Detailed Explanation *</label>
                                <textarea
                                    className="w-full h-32 bg-gray-50 border-2 border-transparent focus:border-[#c2f575] rounded-2xl px-6 py-4 font-bold text-[#040457] outline-none transition-all resize-none custom-scrollbar"
                                    placeholder="Provide a clear, detailed explanation for the dispute..."
                                    value={details}
                                    onChange={(e) => setDetails(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-6 mt-4 bg-[#040457] text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-[#040457]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:hover:scale-100"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                "Freeze Escrow & Submit Dispute"
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default RefundRequestModal;
