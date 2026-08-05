import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { ShieldAlert, Clock, AlertTriangle } from 'lucide-react';

export const ProctoringTelemetry: React.FC = () => {
    const [flagRate, setFlagRate] = useState<number | null>(null);
    const [openEscrow, setOpenEscrow] = useState<number>(0);
    const [slaTime, setSlaTime] = useState<string>('N/A');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTelemetry = async () => {
            try {
                // 1. AI Flag Rate
                const resultsSnap = await getDocs(collectionGroup(db, 'exam_results'));
                let totalExams = 0;
                let flaggedExams = 0;
                resultsSnap.forEach(doc => {
                    totalExams++;
                    if (doc.data().cheatViolations && doc.data().cheatViolations.length > 0) {
                        flaggedExams++;
                    }
                });
                setFlagRate(totalExams > 0 ? (flaggedExams / totalExams) * 100 : 0);

                // 2. Dispute Telemetry
                const q = query(collection(db, 'disputes'), where('status', '==', 'Under Review'));
                const disputesSnap = await getDocs(q);
                let totalEscrow = 0;
                let totalTimeMs = 0;
                const now = Date.now();

                disputesSnap.forEach(doc => {
                    const data = doc.data();
                    totalEscrow += (data.amount || 0);
                    if (data.createdAt) {
                        const createdTime = data.createdAt.toMillis ? data.createdAt.toMillis() : data.createdAt;
                        totalTimeMs += (now - createdTime);
                    }
                });

                setOpenEscrow(totalEscrow);
                
                if (disputesSnap.size > 0) {
                    const avgHours = (totalTimeMs / disputesSnap.size) / (1000 * 60 * 60);
                    setSlaTime(`${avgHours.toFixed(1)} hrs`);
                }

            } catch (error) {
                console.error("Error fetching proctoring telemetry:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTelemetry();
    }, []);

    const formatINR = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    if (loading) {
        return <div className="animate-pulse bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-32"></div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TelemetryCard 
                title="AI Flag Rate" 
                value={flagRate !== null ? `${flagRate.toFixed(1)}%` : '0%'} 
                icon={<ShieldAlert size={20} className="text-rose-500" />} 
                bgClass="bg-rose-50"
            />
            <TelemetryCard 
                title="Dispute SLA (Avg Time)" 
                value={slaTime} 
                icon={<Clock size={20} className="text-amber-500" />} 
                bgClass="bg-amber-50"
            />
            <TelemetryCard 
                title="Open Escrow Liability" 
                value={formatINR(openEscrow)} 
                icon={<AlertTriangle size={20} className="text-red-500" />} 
                bgClass="bg-red-50"
            />
        </div>
    );
};

const TelemetryCard = ({ title, value, icon, bgClass }: any) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
        <div className={`p-4 rounded-full ${bgClass}`}>
            {icon}
        </div>
        <div>
            <h3 className="text-gray-500 font-semibold text-xs uppercase tracking-wider mb-1">{title}</h3>
            <div className="text-2xl font-black text-gray-900 tracking-tight">{value}</div>
        </div>
    </div>
);
