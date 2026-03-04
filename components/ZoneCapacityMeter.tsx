import React, { useState, useEffect } from 'react';
import { Users, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, getCountFromServer } from 'firebase/firestore';
import { db } from '../utils/firebase';

interface ZoneCapacityMeterProps {
    zoneId: string;
}

const ZoneCapacityMeter: React.FC<ZoneCapacityMeterProps> = ({ zoneId }) => {
    const { user } = useAuth();
    const [currentStudents, setCurrentStudents] = useState<number>(0);
    const [showTooltip, setShowTooltip] = useState(false);

    const studentLimitRaw = user?.subscription_entitlements?.studentLimit || 100;

    useEffect(() => {
        let active = true;
        const fetchCount = async () => {
            if (!zoneId || !db) return;
            try {
                const q = query(collection(db, 'zones', zoneId, 'students'));
                const snapshot = await getCountFromServer(q);
                if (active) {
                    setCurrentStudents(snapshot.data().count);
                }
            } catch (e) {
                console.error("Failed to fetch student count:", e);
            }
        };
        fetchCount();
        return () => { active = false; };
    }, [zoneId]);

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
                    <span className="text-xs">{currentStudents}/{studentLimitRaw} Students</span>
                </div>
            </button>

            {showTooltip && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max bg-[#1A1A4E] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
                    <Info size={14} className="text-[#c2f575]" />
                    <span>Prorated Cost to Add 50 More Students</span>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-x-8 border-b-8 border-transparent border-b-[#1A1A4E]"></div>
                </div>
            )}
        </div>
    );
};

export default ZoneCapacityMeter;
