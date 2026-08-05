import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import AdminDisputeRow from '../components/AdminDisputeRow';
import { ShieldAlert, RefreshCcw } from 'lucide-react';

const AdminDisputes: React.FC = () => {
    const { user } = useAuth();
    const [disputes, setDisputes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchDisputes = async () => {
        if (!user || user.email !== 'sundaramsm55@gmail.com') return;
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
    }, [user]);

    if (user?.email !== 'sundaramsm55@gmail.com') {
        return (
            <div className="p-8">
                <div className="bg-red-50 text-red-600 p-6 rounded-2xl">
                    <h2 className="text-xl font-black mb-2">Access Denied</h2>
                    <p>You do not have permission to view this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 md:p-12 max-w-7xl mx-auto min-h-screen">
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-4xl font-black text-nunma-forest tracking-tighter mb-2 flex items-center gap-4">
                        <ShieldAlert size={36} className="text-red-500" />
                        Dispute Resolution Center
                    </h1>
                    <p className="text-gray-500 font-medium">Review and process active refund requests globally.</p>
                </div>
                <button 
                    onClick={fetchDisputes}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    Refresh List
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Loading active disputes...</p>
                </div>
            ) : disputes.length > 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    {disputes.map((dispute, index) => (
                        <div key={dispute.id} className={index !== disputes.length - 1 ? "border-b border-gray-100" : ""}>
                            <AdminDisputeRow dispute={dispute} onUpdate={fetchDisputes} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 border border-gray-100 rounded-3xl p-16 text-center">
                    <ShieldAlert size={64} className="mx-auto text-gray-300 mb-6" />
                    <h3 className="text-2xl font-black text-gray-400 mb-2">No Active Disputes</h3>
                    <p className="text-gray-400">All clear! There are currently no pending refund requests to review.</p>
                </div>
            )}
        </div>
    );
};

export default AdminDisputes;
