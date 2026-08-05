import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { AlertCircle, Activity, UserX } from 'lucide-react';

export const SystemAnomaliesFeed: React.FC = () => {
    const [failedKyc, setFailedKyc] = useState<any[]>([]);
    const [apiErrors, setApiErrors] = useState<any[]>([]); // Mocked or fetched from a real logs collection
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnomalies = async () => {
            try {
                // 1. Failed KYC
                const q = query(collection(db, 'users'), where('kycStatus', '==', 'FAILED'));
                const kycSnap = await getDocs(q);
                setFailedKyc(kycSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                // 2. Mock API Errors (In real scenario, fetch from a logs collection)
                // Assuming no actual API error collection for now
                setApiErrors([]); 

            } catch (error) {
                console.error("Error fetching anomalies:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAnomalies();
    }, []);

    if (loading) {
        return <div className="animate-pulse bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-48"></div>;
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 bg-red-50 flex items-center gap-3">
                <Activity className="text-red-500 animate-pulse" />
                <h2 className="text-lg font-black text-red-900">System Anomalies (Panic Feed)</h2>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto max-h-[400px]">
                {failedKyc.length === 0 && apiErrors.length === 0 ? (
                    <div className="text-center py-8">
                        <AlertCircle className="mx-auto text-gray-300 mb-2" size={32} />
                        <p className="text-gray-400 font-medium text-sm">No critical anomalies detected.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {failedKyc.map((user, idx) => (
                            <div key={idx} className="p-4 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-3">
                                <UserX className="text-orange-500 shrink-0 mt-0.5" size={18} />
                                <div>
                                    <div className="font-bold text-orange-900 text-sm">Failed KYC Payout</div>
                                    <div className="text-xs text-orange-700 mt-1">
                                        Tutor <span className="font-semibold">{user.name || user.email}</span> ({user.id}) has failed KYC.
                                    </div>
                                </div>
                            </div>
                        ))}
                        {apiErrors.map((err, idx) => (
                            <div key={`api-${idx}`} className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                                <div>
                                    <div className="font-bold text-red-900 text-sm">API Exhaustion</div>
                                    <div className="text-xs text-red-700 mt-1">{err.message}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
