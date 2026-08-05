import React, { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../utils/firebase';
import { TrendingUp, Users, Map, DollarSign, RefreshCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export const NorthStarMetrics: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        const docRef = doc(db, 'platform_stats', 'latest');
        
        // Use onSnapshot to automatically update UI when stats change
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setStats(docSnap.data());
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching platform stats:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        const triggerAggregation = httpsCallable(functions, 'triggerAggregation');
        try {
            await triggerAggregation();
            toast.success("Platform stats synchronized!");
        } catch (error: any) {
            toast.error(error.message || "Failed to sync stats");
        } finally {
            setSyncing(false);
        }
    };

    const formatINR = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    };

    if (loading) {
        return <div className="animate-pulse bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-32"></div>;
    }

    const displayStats = stats || {};
    const tgv = displayStats.tgv || 0;
    const nunmaRevenue = displayStats.nunmaNetRevenue || 0;
    const tutorEarnings = Math.max(0, tgv - nunmaRevenue);
    const thalaCount = displayStats.activeUserCount?.THALA || 0;
    const studentCount = displayStats.activeUserCount?.STUDENT || 0;
    const totalUsers = displayStats.activeUserCount?.TOTAL || (thalaCount + studentCount);

    return (
        <div className="relative">
            <div className="absolute -top-10 right-2">
                <button 
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                    <RefreshCcw size={14} className={syncing ? 'animate-spin' : ''} />
                    {syncing ? 'Syncing...' : 'Sync Data Now'}
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                <MetricCard 
                    title="Total Gross Volume (Escrow)" 
                    value={formatINR(tgv)} 
                    icon={<DollarSign size={24} className="text-emerald-500" />} 
                    bgClass="bg-emerald-50"
                />
                <MetricCard 
                    title="Tutor Earnings" 
                    value={formatINR(tutorEarnings)} 
                    icon={<TrendingUp size={24} className="text-teal-500" />} 
                    bgClass="bg-teal-50"
                />
                <MetricCard 
                    title="Nunma Net Revenue" 
                    value={formatINR(nunmaRevenue)} 
                    icon={<TrendingUp size={24} className="text-indigo-500" />} 
                    bgClass="bg-indigo-50"
                />
                <MetricCard 
                    title="Total Users" 
                    value={totalUsers}
                    subtext={`Tutors: ${thalaCount} | Students: ${studentCount}`}
                    icon={<Users size={24} className="text-blue-500" />} 
                    bgClass="bg-blue-50"
                />
            </div>
        </div>
    );
};

const MetricCard = ({ title, value, subtext, icon, bgClass }: any) => (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-2xl ${bgClass}`}>
                {icon}
            </div>
        </div>
        <div>
            <h3 className="text-gray-500 font-medium text-sm mb-1">{title}</h3>
            <div className="text-3xl font-black text-gray-900 tracking-tight">{value}</div>
            {subtext && <div className="text-xs text-gray-400 mt-2 font-medium">{subtext}</div>}
        </div>
    </div>
);
