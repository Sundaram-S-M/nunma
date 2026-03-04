import React from 'react';
import { CreditCard, Tag, CheckCircle2 } from 'lucide-react';

interface BillingSummaryProps {
    basePrice: number;
    fullAddonPrice: number;
    proratedDiscount: number;
    totalToPayNow: number;
    currencySymbol?: string;
    nextBillingDate?: string;
    nextBillingAmount?: number;
}

const BillingSummary: React.FC<BillingSummaryProps> = ({
    basePrice,
    fullAddonPrice,
    proratedDiscount,
    totalToPayNow,
    currencySymbol = '$',
    nextBillingDate,
    nextBillingAmount
}) => {
    return (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden animate-in fade-in duration-500">
            <div className="bg-[#1A1A4E] text-white p-8 relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="text-2xl font-black tracking-tight mb-2">Billing Summary</h3>
                    <p className="text-indigo-200 font-medium text-sm">Review your prorated charges for this billing cycle.</p>
                </div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#c1e60d]/20 rounded-full blur-3xl"></div>
            </div>

            <div className="p-8 space-y-6">
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-gray-500">
                        <span className="font-bold text-sm">Base Plan</span>
                        <span className="font-black text-indigo-900">{currencySymbol}{basePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-500">
                        <span className="font-bold text-sm">Add-on (Full Price)</span>
                        <span className="font-black text-indigo-900">{currencySymbol}{fullAddonPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[#7cc142] bg-[#c1e60d]/10 px-4 py-3 rounded-2xl">
                        <div className="flex items-center gap-2 font-bold text-sm">
                            <Tag size={16} /> Prorated Discount (Current Month)
                        </div>
                        <span className="font-black">-{currencySymbol}{proratedDiscount.toFixed(2)}</span>
                    </div>
                </div>

                <div className="border-t border-gray-100 pt-6">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Total Due Now</span>
                        <span className="text-4xl font-black text-[#c1e60d]">{currencySymbol}{totalToPayNow.toFixed(2)}</span>
                    </div>

                    <button className="w-full py-5 bg-[#c1e60d] text-[#1A1A4E] rounded-[1.75rem] font-black uppercase text-xs tracking-[0.2em] shadow-lg shadow-[#c1e60d]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                        <CreditCard size={18} /> Confirm & Pay
                    </button>
                </div>
            </div>

            {nextBillingDate && nextBillingAmount && (
                <div className="bg-gray-50 p-6 border-t border-gray-100 flex gap-4">
                    <div className="text-indigo-900 mt-1">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Next Billing Cycle</p>
                        <p className="text-sm text-indigo-900 font-bold">
                            Your next charge of {currencySymbol}{nextBillingAmount.toFixed(2)} will be on {new Date(nextBillingDate).toLocaleDateString()}.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillingSummary;
