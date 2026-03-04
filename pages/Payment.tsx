
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, ShieldCheck, Zap, Check, Globe, Video, Clock } from 'lucide-react';
import { usePPPPrice } from '../hooks/usePPPPrice';
import { collection, query, where, getDocs, limit, updateDoc, doc, arrayUnion, setDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';

const Payment: React.FC = () => {
    const { user } = useAuth();
    const { zoneId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const isMentorship = searchParams.get('type') === 'mentorship';
    const bookingDate = searchParams.get('date');
    const slotId = searchParams.get('slotId');
    const tutorId = searchParams.get('tutorId');
    const bookingTime = searchParams.get('time');

    const [isProcessing, setIsProcessing] = useState(false);
    const [item, setItem] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const getRefundDeadline = () => {
        let startDate = new Date(); // Fallback
        if (bookingDate) {
            startDate = new Date(`${bookingDate}T${bookingTime || '00:00:00'}`);
        } else if (item?.startDate) {
            startDate = new Date(item.startDate);
        } else {
            // For instant access without a start date, standard 24 hour refund window from now
            startDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
        }

        // 24 hours before start time
        return new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    };

    const refundDeadline = item ? getRefundDeadline() : null;

    useEffect(() => {
        const fetchItem = async () => {
            if (!zoneId || !db) return;
            try {
                const collectionName = isMentorship ? 'products' : 'zones';
                const docRef = doc(db, collectionName, zoneId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setItem({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (e) {
                console.error("Error fetching item:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchItem();
    }, [zoneId, isMentorship]);

    const basePrice = item ? item.priceUSD || item.price || '0' : '0';
    const basePriceINR = item ? item.priceINR || item.price || '0' : '0';

    // We update usePPP logic purely for display here, and let backend do real final auth check.
    const { price, currency, isPPPApplied, originalPrice, countryCode, isLoading } = usePPPPrice(basePrice);

    // For mentorship specifically, we know distinct tiers exist:
    const displayPrice = isMentorship && countryCode === 'IN' && basePriceINR ? basePriceINR : price;
    const displayCurrency = isMentorship && countryCode === 'IN' && basePriceINR ? 'INR' : currency;
    const finalOriginalPrice = isMentorship && countryCode === 'IN' && basePriceINR ? null : originalPrice;


    const handlePayment = async () => {
        if (!termsAccepted) {
            alert("Please scroll down and agree to the Refund Policy to continue.");
            return;
        }
        if (!user || !zoneId || !item) return;
        setIsProcessing(true);

        try {
            if (!functions) throw new Error("Functions not initialized");

            const createZohoCheckoutSession = httpsCallable(functions, 'createZohoCheckoutSession');

            const returnUrl = `${window.location.origin}${isMentorship ? '/dashboard' : `/classroom/zone/${zoneId}`}`;

            const result = await createZohoCheckoutSession({
                productId: zoneId,
                title: item.title,
                amount: displayPrice,
                currency: displayCurrency,
                returnUrl: returnUrl,
                refund_cutoff_time: refundDeadline?.toISOString()
            });

            const data = result.data as any;

            if (data.success && data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            } else {
                throw new Error(data.message || "Failed to retrieve checkout URL");
            }
        } catch (error) {
            console.error("Payment failed:", error);
            setIsProcessing(false);
            alert("Payment initiation failed. Please try again.");
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
                        <p className="text-indigo-200 text-lg font-medium opacity-80 mb-12">Finalize your {isMentorship ? 'mentorship session' : 'enrollment'} to get started.</p>

                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-5 bg-white/5 rounded-3xl border border-white/10">
                                <div className="w-12 h-12 bg-[#c1e60d] rounded-2xl flex items-center justify-center text-indigo-900">
                                    {isMentorship ? <Video size={24} fill="currentColor" /> : <Zap size={24} fill="currentColor" />}
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">{isMentorship ? 'Mentorship Session' : 'Selected Zone'}</p>
                                    <p className="text-lg font-bold">{item ? item.title : 'Loading...'}</p>
                                </div>
                            </div>

                            {isMentorship && bookingDate && (
                                <div className="flex items-center gap-4 p-5 bg-white/5 rounded-3xl border border-white/10">
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-[#c2f575]">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Scheduled For</p>
                                        <p className="text-lg font-bold">{new Date(bookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between items-center p-5">
                                <span className="text-indigo-200 font-bold">Total Amount</span>
                                <div className="text-right">
                                    {isLoading ? (
                                        <span className="text-white/50 text-sm">Calculating regional price...</span>
                                    ) : (
                                        <>
                                            {isPPPApplied && finalOriginalPrice && (
                                                <span className="block text-sm text-gray-400 line-through font-bold">
                                                    ${finalOriginalPrice}
                                                </span>
                                            )}
                                            <span className="text-3xl font-black text-[#c1e60d]">
                                                {displayCurrency === 'USD' ? '$' : displayCurrency === 'INR' ? '₹' : displayCurrency} {displayPrice}
                                            </span>
                                            {(isPPPApplied || (isMentorship && countryCode === 'IN')) && (
                                                <div className="flex items-center gap-1 justify-end mt-1 text-[#c1e60d] text-[10px] uppercase font-black tracking-widest">
                                                    <Globe size={12} />
                                                    <span>PPP Applied ({countryCode})</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            {refundDeadline && (
                                <div className="mt-8 p-6 bg-red-500/10 border border-red-500/20 rounded-3xl">
                                    <h4 className="text-red-400 font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <ShieldCheck size={16} /> Safe-Guard Policy
                                    </h4>
                                    <p className="text-sm text-indigo-100 font-medium">
                                        Refunds available until:<br />
                                        <span className="text-white font-bold text-base bg-red-500/20 px-3 py-1 rounded-lg inline-block mt-2">
                                            {refundDeadline.toLocaleDateString()} {refundDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </p>
                                </div>
                            )}
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

                    <div className="bg-gray-50 border border-gray-100 rounded-3xl p-6">
                        <label className="flex items-start gap-4 cursor-pointer group">
                            <div className="relative flex items-center justify-center mt-0.5">
                                <input
                                    type="checkbox"
                                    className="appearance-none w-6 h-6 border-2 border-indigo-900 rounded-lg checked:bg-[#c1e60d] checked:border-[#c1e60d] transition-colors peer"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                />
                                <Check size={14} className="absolute text-indigo-900 opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-indigo-900">I agree to the Terms of Service & Refund Policy.</p>
                                <p className="text-xs text-gray-500 mt-1">I acknowledge that if I dispute or request a refund after the deadline ({refundDeadline?.toLocaleDateString()}), it may be denied.</p>
                            </div>
                        </label>
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
