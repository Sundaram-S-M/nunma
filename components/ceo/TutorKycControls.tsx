import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../utils/firebase';
import { UserCheck, Edit3, Link, ShieldOff } from 'lucide-react';
import toast from 'react-hot-toast';

export const TutorKycControls: React.FC = () => {
    const [tutors, setTutors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTutors = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), where('role', '==', 'THALA'));
            const snap = await getDocs(q);
            setTutors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (error) {
            console.error("Error fetching tutors:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTutors();
    }, []);

    const handleUpdateStatus = async (userId: string, newStatus: string) => {
        const updateKycStatus = httpsCallable(functions, 'updateKycStatus');
        try {
            await updateKycStatus({ userId, status: newStatus });
            toast.success(`KYC status updated to ${newStatus}`);
            fetchTutors();
        } catch (error: any) {
            toast.error(error.message || "Failed to update KYC status");
        }
    };

    const handleCreateLinkedAccount = async (userId: string) => {
        const createAccount = httpsCallable(functions, 'createTutorLinkedAccount');
        try {
            await createAccount({ userId });
            toast.success("Linked account creation triggered");
            fetchTutors();
        } catch (error: any) {
            toast.error(error.message || "Failed to create linked account");
        }
    };

    if (loading) {
        return <div className="animate-pulse bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-64"></div>;
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-3">
                    <UserCheck className="text-indigo-500" />
                    <h2 className="text-lg font-black text-gray-900">Tutor KYC & Onboarding</h2>
                </div>
            </div>
            
            <div className="p-0 overflow-y-auto max-h-[500px]">
                <table className="w-full text-left text-sm text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                        <tr>
                            <th className="px-6 py-3">Tutor</th>
                            <th className="px-6 py-3">KYC Status</th>
                            <th className="px-6 py-3">Financials</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tutors.map((tutor) => (
                            <tr key={tutor.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{tutor.name || 'Unknown'}</div>
                                    <div className="text-xs">{tutor.email}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                        tutor.kycStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                                        tutor.kycStatus === 'FAILED' ? 'bg-red-100 text-red-700' :
                                        'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {tutor.kycStatus || 'PENDING'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs font-medium">
                                    <div>PAN: {tutor.pan || 'N/A'}</div>
                                    <div>Acct: {tutor.bankAccountLast4 ? `*${tutor.bankAccountLast4}` : 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    {tutor.kycStatus !== 'VERIFIED' && (
                                        <button onClick={() => handleUpdateStatus(tutor.id, 'VERIFIED')} className="p-2 text-green-600 hover:bg-green-50 rounded-lg tooltip" title="Approve KYC">
                                            <Edit3 size={16} />
                                        </button>
                                    )}
                                    {tutor.kycStatus !== 'FAILED' && (
                                        <button onClick={() => handleUpdateStatus(tutor.id, 'FAILED')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg tooltip" title="Reject KYC">
                                            <ShieldOff size={16} />
                                        </button>
                                    )}
                                    {!tutor.razorpay_account_id && tutor.kycStatus === 'VERIFIED' && (
                                        <button onClick={() => handleCreateLinkedAccount(tutor.id)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg tooltip" title="Create Linked Account">
                                            <Link size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {tutors.length === 0 && (
                    <div className="p-8 text-center text-gray-400">No tutors found.</div>
                )}
            </div>
        </div>
    );
};
