
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, ShieldCheck, Zap, Check } from 'lucide-react';

const Payment: React.FC = () => {
    const { zoneId } = useParams();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayment = () => {
        setIsProcessing(true);
        setTimeout(() => {
            localStorage.setItem(`nunma_paid_${zoneId}`, 'true');
            setIsProcessing(false);
            navigate(`/classroom/zone/${zoneId}`);
        }, 2000);
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
                                    <p className="text-lg font-bold">Pollards Masterclass</p>
                                </div>
                            </div>
                            <div className="flex justify-between items-center p-5">
                                <span className="text-indigo-200 font-bold">Total Amount</span>
                                <span className="text-3xl font-black text-[#c1e60d]">$49.00</span>
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
