import React, { useState, useEffect } from 'react';
import { Users, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../utils/firebase';

interface ZoneCapacityMeterProps {
    zoneId: string; // Kept for backward compatibility, but calculation is now global
}

const ZoneCapacityMeter: React.FC<ZoneCapacityMeterProps> = ({ zoneId }) => {
    const { user } = useAuth();
    const [currentStudents, setCurrentStudents] = useState<number>(0);
    const [showTooltip, setShowTooltip] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Calculate dynamic limit based on plan + addons
    const currentTier = (user as any)?.current_tier?.toLowerCase() || 'starter';
    const baseLimits: Record<string, number> = {
        'starter': 100,
        'standard': 250,
        'premium': 1000
    };

    const baseLimit = baseLimits[currentTier] || 100;
    const addonBlocks = (user as any)?.subscription_entitlements?.studentAddonBlocks || 0;

    // Explicit override if studentLimitRaw is set manually, otherwise calculate dynamically
    const studentLimitRaw = (user as any)?.subscription_entitlements?.studentLimit || (baseLimit + (addonBlocks * 50));

    useEffect(() => {
        let active = true;
        const fetchCumulativeCount = async () => {
            if (!user?.uid || !db) return;
            try {
                // 1. Fetch all zones owned by the tutor
                const zonesQuery = query(collection(db, 'zones'), where('tutorId', '==', user.uid));
                const zonesSnapshot = await getDocs(zonesQuery);

                const uniqueStudents = new Set<string>();

                // 2. For each zone, fetch students and add to unique Set
                // Using Promise.all for parallel fetching to improve speed
                const studentPromises = zonesSnapshot.docs.map(async (zoneDoc) => {
                    const studentsQuery = query(collection(db, 'zones', zoneDoc.id, 'students'));
                    const studentsSnapshot = await getDocs(studentsQuery);

                    studentsSnapshot.forEach((studentDoc) => {
                        const data = studentDoc.data();
                        // Use email as unique identifier, fallback to ID if no email
                        const identifier = data.email?.toLowerCase() || studentDoc.id;
                        uniqueStudents.add(identifier);
                    });
                });

                await Promise.all(studentPromises);

                if (active) {
                    setCurrentStudents(uniqueStudents.size);
                    setIsLoading(false);
                }
            } catch (e) {
                console.error("Failed to fetch cumulative student count:", e);
                setIsLoading(false);
            }
        };
        fetchCumulativeCount();
        return () => { active = false; };
    }, [user?.uid]);

    return (
        <div className="relative group">
            <button
                className="bg-white border border-gray-100 text-[#040457] font-bold px-4 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
                onClick={() => setShowTooltip(!showTooltip)}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <div className="flex items-center gap-2 bg-[#f8fafc] px-2 py-1 rounded-xl">
                    <Users size={16} className="text-[#040457]" />
                    <span className="text-xs">
                        {isLoading ? '...' : currentStudents} / {studentLimitRaw} Students
                    </span>
                </div>
            </button>

            {showTooltip && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max bg-[#1A1A4E] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl z-50 flex flex-col items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2">
                        <Info size={14} className="text-[#c2f575]" />
                        <span>Cumulative capacity across all your zones</span>
                    </div>
                    {addonBlocks > 0 && (
                        <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">
                            Base: {baseLimit} • Add-ons: {addonBlocks * 50}
                        </div>
                    )}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-x-8 border-b-8 border-transparent border-b-[#1A1A4E]"></div>
                </div>
            )}
        </div>
    );
};

export default ZoneCapacityMeter;
