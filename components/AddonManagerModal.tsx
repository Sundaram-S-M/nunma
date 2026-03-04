import React, { useState } from 'react';
import { X, Users, HardDrive, AlertCircle, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AddonManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AddonType = 'student' | 'storage';

export const AddonManagerModal: React.FC<AddonManagerModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<AddonType>('student');
    const [blockCount, setBlockCount] = useState(1);

    if (!isOpen) return null;

    const currentTier = (user as any)?.current_tier || 'STARTER';
    const isStarter = currentTier === 'STARTER';

    // Math Logic (Tiered Pricing Preview)
    const calculateTieredPrice = (type: AddonType, quantity: number) => {
        let total = 0;
        let originalTotal = 0;

        if (type === 'student') {
            originalTotal = quantity * 999;
            for (let i = 1; i <= quantity; i++) {
                if (i === 1) total += 999;
                else if (i === 2) total += 899;
                else total += 799;
            }
        } else {
            originalTotal = quantity * 499;
            for (let i = 1; i <= quantity; i++) {
                if (i === 1) total += 499;
                else if (i === 2) total += 419;
                else total += 359;
            }
        }

        return {
            total,
            originalTotal,
            isDiscounted: quantity > 1
        };
    };

    const handleIncrement = () => {
        if (!isStarter) {
            setBlockCount(prev => prev + 1);
        }
    };

    const handleDecrement = () => {
        if (!isStarter && blockCount > 1) {
            setBlockCount(prev => prev - 1);
        }
    };

    const handleTabChange = (type: AddonType) => {
        setActiveTab(type);
        setBlockCount(1); // Reset quantity when switching tabs
    };

    const handleCheckout = () => {
        const addonCode = activeTab === 'student' ? 'ADDON_STUDENT_50' : 'ADDON_STORAGE_50';
        window.open(`https://billing.zoho.in/subscribe/${addonCode}?quantity=${blockCount}`, '_blank');
        onClose();
    };

    const handleUpgrade = () => {
        window.open('/billing', '_blank'); // Or use navigate('/billing') if preferred, but window.open is used in PricingPage
        onClose();
    }


    const pricing = calculateTieredPrice(activeTab, blockCount);

    // Display values
    const unitsPerBlock = 50;
    const totalUnitsGained = blockCount * unitsPerBlock;
    const unitLabel = activeTab === 'student' ? 'Students' : 'GB Storage';
    const addonTitle = activeTab === 'student' ? 'Student Capacity' : 'Persistent Storage';


    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header & Close Button */}
                <div className="px-8 pt-8 pb-4 relative z-10 shrink-0 bg-white">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-[#040457] transition-colors rounded-full hover:bg-gray-100">
                        <X size={20} />
                    </button>
                    <h3 className="text-2xl font-black text-[#040457]">Manage Add-ons</h3>
                    <p className="text-gray-500 text-sm font-medium mt-1">
                        Instantly expand your platform limits.
                    </p>
                </div>

                {/* Tabs */}
                <div className="px-8 shrink-0 bg-white border-b border-gray-100">
                    <div className="flex space-x-2 p-1 bg-gray-50 rounded-2xl">
                        <button
                            onClick={() => handleTabChange('student')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'student'
                                    ? 'bg-white text-[#040457] shadow-sm ring-1 ring-gray-200'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <Users size={16} /> Students
                        </button>
                        <button
                            onClick={() => handleTabChange('storage')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'storage'
                                    ? 'bg-white text-[#040457] shadow-sm ring-1 ring-gray-200'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <HardDrive size={16} /> Storage
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-gray-50/30">

                    {/* Blocker Alert */}
                    {isStarter && (
                        <div className="mb-6 bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3 text-amber-800">
                            <AlertCircle className="shrink-0 mt-0.5" size={20} />
                            <div>
                                <h4 className="font-bold text-sm">Add-ons Unavailable</h4>
                                <p className="text-xs text-amber-700 opacity-90 mt-1">
                                    Starter tier accounts cannot purchase individual add-ons. Please upgrade to Standard or Premium to unlock this feature.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Details Card */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm mb-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -z-10 blur-2xl"></div>

                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h4 className="text-lg font-black text-[#040457]">{addonTitle}</h4>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">1 Block = {unitsPerBlock} {unitLabel}</div>
                            </div>

                            <div className="flex items-center gap-4 bg-gray-50 rounded-2xl p-1.5 border border-gray-100">
                                <button
                                    onClick={handleDecrement}
                                    disabled={isStarter || blockCount <= 1}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-gray-500 hover:bg-white hover:text-[#040457] hover:shadow disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                                >
                                    -
                                </button>
                                <span className="w-6 text-center font-black text-[#040457] select-none text-lg">
                                    {blockCount}
                                </span>
                                <button
                                    onClick={handleIncrement}
                                    disabled={isStarter}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-gray-500 hover:bg-white hover:text-[#040457] hover:shadow disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#c2f575]/10 border border-[#c2f575]/30 rounded-2xl p-4 flex items-center justify-center">
                            <span className="text-2xl font-black text-[#040457]">+ {totalUnitsGained} <span className="text-lg text-[#040457]/70 ml-1">{unitLabel}</span></span>
                        </div>
                    </div>

                    {/* Math Logic / Pricing */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                        <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Pricing Summary</h5>

                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 font-medium">Quantity</span>
                                <span className="font-bold text-[#040457]">{blockCount} {blockCount === 1 ? 'Block' : 'Blocks'}</span>
                            </div>

                            {pricing.isDiscounted && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500 font-medium">Original Price</span>
                                    <span className="font-bold text-gray-400 line-through">₹{pricing.originalTotal}</span>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                            <div>
                                <span className="block text-gray-500 text-xs font-medium mb-1">Total Due Today</span>
                                {pricing.isDiscounted && (
                                    <span className="inline-block bg-[#c2f575] text-[#040457] text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-1">
                                        Tiered Discount Applied!
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                <span className={`text-3xl font-black tracking-tight ${pricing.isDiscounted ? 'text-green-600' : 'text-[#040457]'}`}>
                                    ₹{pricing.total}
                                </span>
                                <span className="block text-gray-400 text-xs font-medium mt-1">/ month</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className="px-8 py-5 border-t border-gray-100 bg-white shrink-0">
                    {isStarter ? (
                        <button
                            onClick={handleUpgrade}
                            className="w-full py-4 bg-[#040457] text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#1A1A4E] shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                        >
                            Upgrade to Standard to Unlock Add-ons
                        </button>
                    ) : (
                        <button
                            onClick={handleCheckout}
                            className="w-full py-4 bg-[#c2f575] text-[#040457] rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#b0eb54] shadow-xl hover:shadow-[#c2f575]/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                        >
                            <ShoppingCart size={18} />
                            Proceed to Payment
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
};
