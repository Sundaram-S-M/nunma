
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, ShieldCheck, Zap, Check, Globe } from 'lucide-react';
import { usePPPPrice } from '../hooks/usePPPPrice';
import { collection, query, where, getDocs, limit, updateDoc, doc, arrayUnion, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';

const Payment: React.FC = () => {
    const { user } = useAuth();
    const { zoneId } = useParams();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);

    const [zone, setZone] = useState<any>(null);
    const [loadingZone, setLoadingZone] = useState(true);

    useEffect(() => {
        const fetchZone = async () => {
            if (!zoneId || !db) return;
            try {
                const docRef = doc(db, 'zones', zoneId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setZone({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (e) {
                console.error("Error fetching zone:", e);
            } finally {
                setLoadingZone(false);
            }
        };
        fetchZone();
    }, [zoneId]);

    const basePrice = zone ? zone.price : '0';
    const { price, currency, isPPPApplied, originalPrice, countryCode, isLoading } = usePPPPrice(basePrice);

    const handlePayment = async () => {
        if (!user || !zoneId || !zone) return;
        setIsProcessing(true);

        try {
            if (db) {
                // 1. Add to Zone Students
                const studentData = {
                    id: user.uid,
                    name: user.name || 'Student',
                    email: user.email,
                    avatar: user.avatar || '',
                    joinedAt: new Date().toISOString(),
                    status: 'Active',
                    engagementScore: 0,
                    attendanceHistory: []
                };
                await setDoc(doc(db, 'zones', zoneId, 'students', user.uid), studentData);

                // 2. Add to User Enrollments (for quick access)
                await setDoc(doc(db, 'users', user.uid, 'enrollments', zoneId), {
                    zoneId: zoneId,
                    enrolledAt: new Date().toISOString(),
                    role: 'student'
                });

                // 3. Add to Conversation
                const q = query(collection(db, 'conversations'), where('zoneId', '==', zoneId), limit(1));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const convId = snapshot.docs[0].id;
                    await updateDoc(doc(db, 'conversations', convId), {
                        participants: arrayUnion(user.uid)
                    });
                } else {
                    // Create conversation if missing? (Zone creation handles this usually)
                }
            } else {
                console.warn("Database not initialized");
            }

            setIsProcessing(false);
            navigate(`/classroom/zone/${zoneId}`);
        } catch (error) {
            console.error("Payment failed:", error);
            setIsProcessing(false);
            alert("Payment confirmation failed. Please try again.");
        }
    };

    return (
        <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-6 bg-gradient-to-br from-white to-[#c1e60d]/5">
            <div className="bg-white rounded-[4rem] shadow-2xl border border-gray-100 w-full max-w-5xl flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-500">

                {/* Left Side: Summary */}
                <div className="w-full md:w-5/12 bg-indigo-900 p-16 text-white flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <button onClick={() => navigate(-1)} className="mb-12 p-4 bg-white/10 rounded-2xl text-white hover:bg-white/20 transition-all">
                            <ArrowLeft size={24} />
                        </button>
                        <h2 className="text-5xl font-black tracking-tighter mb-6 leading-tight">Secure <br /><span className="text-[#c1e60d]">Checkout</span></h2>
                        <p className="text-indigo-200 text-lg font-medium opacity-80 mb-12">Finalize your enrollment to unlock the full curriculum and live sessions.</p>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-5 bg-white/5 rounded-3xl border border-white/10">
                                <div className="w-12 h-12 bg-[#c1e60d] rounded-2xl flex items-center justify-center text-indigo-900">
                                    <Zap size={24} fill="currentColor" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Selected Zone</p>
                                    <p className="text-lg font-bold">{zone ? zone.title : 'Loading...'}</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-5">
                                <span className="text-indigo-200 font-bold">Total Amount</span>
                                <div className="text-right">
                                    {isLoading ? (
                                        <span className="text-white/50 text-sm">Calculating regional price...</span>
                                    ) : (
                                        <>
                                            {isPPPApplied && (
                                                <span className="block text-sm text-gray-400 line-through font-bold">
                                                    ${originalPrice}
                                                </span>
                                            )}
                                            <span className="text-3xl font-black text-[#c1e60d]">
                                                {currency === 'USD' ? '$' : currency === 'INR' ? '₹' : currency} {price}
                                            </span>
                                            {isPPPApplied && (
                                                <div className="flex items-center gap-1 justify-end mt-1 text-[#c1e60d] text-[10px] uppercase font-black tracking-widest">
                                                    <Globe size={12} />
                                                    <span>PPP Applied ({countryCode})</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#c1e60d]/10 rounded-full blur-[80px]"></div>
                </div>

                {/* Right Side: Form */}
                <div className="w-full md:w-7/12 p-16 flex flex-col justify-center space-y-12 bg-white">
                    <div className="space-y-4">
                        <h3 className="text-3xl font-black text-indigo-900 tracking-tight">Payment Method</h3>
                        <p className="text-gray-400 font-medium text-sm">Select your preferred way to pay securely.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="p-8 border-2 border-[#1A1A4E] rounded-3xl flex items-center justify-between bg-indigo-50/30 group">
                            <div className="flex items-center gap-6">
                                <CreditCard size={32} className="text-indigo-900" />
                                <div>
                                    <p className="font-black text-indigo-900">Credit or Debit Card</p>
                                    <p className="text-xs text-gray-400 font-bold">Visa, Mastercard, AMEX</p>
                                </div>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-indigo-900 flex items-center justify-center">
                                <Check size={14} className="text-white" />
                            </div>
                        </div>

                        <div className="p-8 border border-gray-100 rounded-3xl flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer">
                            <div className="flex items-center gap-6">
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">P</div>
                                <p className="font-black text-gray-400">PayPal Checkout</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handlePayment}
                        disabled={isProcessing}
                        className="w-full py-6 bg-indigo-900 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-indigo-900/40 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-4"
                    >
                        {isProcessing ? (
                            <div className="w-6 h-6 border-4 border-[#c1e60d] border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <ShieldCheck size={20} /> Complete Payment
                            </>
                        )}
                    </button>

                    <div className="flex items-center justify-center gap-4 text-gray-300">
                        <ShieldCheck size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Bank-level 256-bit encryption</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Payment;
