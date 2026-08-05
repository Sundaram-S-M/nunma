import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, collectionGroup } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { Database, ZapOff, CloudLightning } from 'lucide-react';

export const InfrastructureBurn: React.FC = () => {
    const [storageUsed, setStorageUsed] = useState<number>(0);
    const [webhookFailures, setWebhookFailures] = useState<number>(0);
    const [totalExams, setTotalExams] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const BUNNY_STORAGE_LIMIT_GB = 500; // Example limit

    useEffect(() => {
        const fetchBurn = async () => {
            try {
                // 1. Storage Quota
                const q = query(collection(db, 'users'), where('role', '==', 'THALA'));
                const usersSnap = await getDocs(q);
                let totalBytes = 0;
                usersSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.storage_used_bytes) totalBytes += data.storage_used_bytes;
                });
                setStorageUsed(totalBytes);

                // 2. Webhook Failures
                const whSnap = await getDocs(collection(db, 'webhook_failures'));
                setWebhookFailures(whSnap.size);

                // 3. Total Exams for AI estimation
                const examsSnap = await getDocs(collectionGroup(db, 'exam_results'));
                setTotalExams(examsSnap.size);

            } catch (error) {
                console.error("Error fetching infrastructure burn:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBurn();
    }, []);

    const bytesToGB = (bytes: number) => (bytes / (1024 * 1024 * 1024)).toFixed(2);
    const usedGB = parseFloat(bytesToGB(storageUsed));
    const storagePercent = Math.min((usedGB / BUNNY_STORAGE_LIMIT_GB) * 100, 100);

    // Estimated Costs (Mock calculations)
    const storageCost = usedGB * 0.01; // $0.01 per GB
    const aiCost = totalExams * 0.05; // $0.05 per AI proctored exam
    const totalEstimatedBillUSD = storageCost + aiCost;

    if (loading) {
        return <div className="animate-pulse bg-white p-6 rounded-3xl border border-gray-100 shadow-sm h-32"></div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                    <Database className="text-blue-500" />
                    <h3 className="font-bold text-gray-800">Global Storage (BunnyCDN)</h3>
                </div>
                <div className="flex justify-between items-end mb-2">
                    <span className="text-2xl font-black">{usedGB} GB</span>
                    <span className="text-gray-500 text-sm font-medium">of {BUNNY_STORAGE_LIMIT_GB} GB limit</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 mb-1">
                    <div className={`h-3 rounded-full ${storagePercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${storagePercent}%` }}></div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                    <ZapOff className="text-red-500" />
                    <h3 className="font-bold text-gray-800">Webhook Failure Rate</h3>
                </div>
                <div className="flex items-end gap-3">
                    <span className="text-4xl font-black text-red-500">{webhookFailures}</span>
                    <span className="text-gray-500 text-sm font-medium pb-1">stuck in dead-letter queue</span>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                    <CloudLightning className="text-yellow-500" />
                    <h3 className="font-bold text-gray-800">Estimated Cloud & AI Bill</h3>
                </div>
                <div className="flex justify-between items-end mb-2">
                    <span className="text-4xl font-black text-yellow-600">${totalEstimatedBillUSD.toFixed(2)}</span>
                    <span className="text-gray-500 text-sm font-medium pb-1">MTD</span>
                </div>
                <div className="text-xs text-gray-400 font-medium">
                    AI: ${aiCost.toFixed(2)} | Storage: ${storageCost.toFixed(2)}
                </div>
            </div>
        </div>
    );
};

