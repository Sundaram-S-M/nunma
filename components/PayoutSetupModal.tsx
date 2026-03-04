import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Building2, ChevronDown, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

const COUNTRIES = [
    { name: 'United Kingdom', code: '+44', banks: ['HSBC UK', 'Barclays', 'NatWest', 'Lloyds Bank', 'Standard Chartered'] },
    { name: 'United States', code: '+1', banks: ['JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citigroup', 'Goldman Sachs'] },
    { name: 'India', code: '+91', banks: ['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank'] },
    { name: 'Canada', code: '+1', banks: ['Royal Bank of Canada', 'Toronto-Dominion Bank', 'Scotiabank', 'Bank of Montreal'] },
    { name: 'Germany', code: '+49', banks: ['Deutsche Bank', 'Commerzbank', 'DZ Bank', 'KfW'] },
    { name: 'Australia', code: '+61', banks: ['Commonwealth Bank', 'Westpac', 'ANZ', 'NAB'] },
    { name: 'Singapore', code: '+65', banks: ['DBS Bank', 'OCBC Bank', 'UOB'] },
];

interface PayoutSetupModalProps {
    onClose: () => void;
    onComplete: () => void;
}

const PayoutSetupModal: React.FC<PayoutSetupModalProps> = ({ onClose, onComplete }) => {
    const { updateProfile } = useAuth();

    const [accountHolder, setAccountHolder] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifsc, setIfsc] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [countrySearch, setCountrySearch] = useState('');
    const [selectedCountry, setSelectedCountry] = useState<typeof COUNTRIES[0] | null>(null);
    const [showCountryResults, setShowCountryResults] = useState(false);

    const [bankSearch, setBankSearch] = useState('');
    const [showBankResults, setShowBankResults] = useState(false);

    const countryRef = useRef<HTMLDivElement>(null);
    const bankRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (countryRef.current && !countryRef.current.contains(e.target as Node)) setShowCountryResults(false);
            if (bankRef.current && !bankRef.current.contains(e.target as Node)) setShowBankResults(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredCountries = useMemo(() => {
        if (!countrySearch) return COUNTRIES;
        return COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()));
    }, [countrySearch]);

    const filteredBanks = useMemo(() => {
        if (!selectedCountry) return [];
        if (!bankSearch) return selectedCountry.banks;
        return selectedCountry.banks.filter(b => b.toLowerCase().includes(bankSearch.toLowerCase()));
    }, [bankSearch, selectedCountry]);

    const handlePhoneChange = (val: string) => {
        let cleaned = val.replace(/[^\d+]/g, '');

        if (cleaned.length > 0 && !cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }

        let digitsOnly = cleaned.replace(/\s+/g, '');
        let formatted = digitsOnly;

        if (digitsOnly.length > 3) {
            let ccLength = 3;
            if (digitsOnly.startsWith('+1')) ccLength = 2;

            if (digitsOnly.length > ccLength) {
                const cc = digitsOnly.substring(0, ccLength);
                const rest = digitsOnly.substring(ccLength);

                formatted = cc + ' ' + rest;

                if (rest.length > 5) {
                    formatted = cc + ' ' + rest.substring(0, 5) + ' ' + rest.substring(5);
                }
            }
        }

        setPhoneNumber(formatted);
    };

    const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
        setSelectedCountry(country);
        setCountrySearch(country.name);
        setPhoneNumber(country.code);
        setBankSearch('');
        setShowCountryResults(false);
    };

    const handleSubmit = async () => {
        if (!accountHolder || !accountNumber || !selectedCountry || !bankSearch || !ifsc) {
            alert("Please fill in all banking details to proceed.");
            return;
        }

        setIsSubmitting(true);
        try {
            await updateProfile({ bankingDetailsProvided: true });
            onComplete(); // Triggers the role switch and navigation
        } catch (e) {
            console.error("Failed to update payout details:", e);
            alert("An error occurred while saving. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-8 border-b border-gray-50 flex justify-between items-start bg-gray-50/30 shrink-0">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-[#eef2ff] rounded-[2rem] flex items-center justify-center text-[#1A1A4E] shadow-sm">
                            <Building2 size={32} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-[#1A1A4E] tracking-tight">Revenue Payout</h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Provide Bank Details to Switch to Tutor Role</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-gray-400 hover:text-red-500 transition-all shadow-sm">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Form Area */}
                <div className="p-8 pl-10 pr-10 overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                        {/* Account Holder Name */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">ACCOUNT HOLDER NAME</label>
                            <input
                                type="text"
                                value={accountHolder}
                                onChange={(e) => setAccountHolder(e.target.value)}
                                className="w-full bg-[#f8fafc] border border-gray-100 rounded-2xl px-8 py-5 font-bold text-[#1A1A4E] placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-indigo-900/5 transition-all"
                                placeholder="Full name as per bank"
                            />
                        </div>

                        {/* Account Number */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">ACCOUNT NUMBER</label>
                            <input
                                type="text"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                className="w-full bg-[#f8fafc] border border-gray-100 rounded-2xl px-8 py-5 font-bold text-[#1A1A4E] placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-indigo-900/5 transition-all"
                                placeholder="••••••••••••"
                            />
                        </div>

                        {/* Country with Search & Phone Prefix Logic */}
                        <div className="space-y-3 relative" ref={countryRef}>
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">COUNTRY</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={countrySearch}
                                    onChange={(e) => {
                                        setCountrySearch(e.target.value);
                                        setShowCountryResults(true);
                                        if (selectedCountry) setSelectedCountry(null);
                                    }}
                                    onFocus={() => setShowCountryResults(true)}
                                    className="w-full bg-[#f8fafc] border border-gray-100 rounded-2xl px-8 py-5 font-bold text-[#1A1A4E] placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-indigo-900/5 transition-all"
                                    placeholder="Search country..."
                                />
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={20} />

                                {showCountryResults && (
                                    <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 p-2 max-h-60 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2">
                                        {filteredCountries.map(country => (
                                            <button
                                                key={country.name}
                                                onClick={() => handleCountrySelect(country)}
                                                className="w-full text-left px-6 py-4 rounded-2xl hover:bg-gray-50 text-indigo-900 font-bold text-sm flex items-center justify-between group transition-all"
                                            >
                                                {country.name}
                                                <Check size={16} className={`text-[#c1e60d] transition-opacity ${selectedCountry?.name === country.name ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                            </button>
                                        ))}
                                        {filteredCountries.length === 0 && (
                                            <div className="p-6 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No results</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bank Name with Contextual Search */}
                        <div className="space-y-3 relative" ref={bankRef}>
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">BANK NAME</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={bankSearch}
                                    onChange={(e) => { setBankSearch(e.target.value); setShowBankResults(true); }}
                                    onFocus={() => setShowBankResults(true)}
                                    disabled={!selectedCountry}
                                    className="w-full bg-[#f8fafc] border border-gray-100 rounded-2xl px-8 py-5 font-bold text-[#1A1A4E] placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-indigo-900/5 transition-all disabled:opacity-40"
                                    placeholder={selectedCountry ? `Search banks in ${selectedCountry.name}` : "Select country first..."}
                                />
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" size={20} />

                                {showBankResults && selectedCountry && (
                                    <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 p-2 max-h-60 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2">
                                        {filteredBanks.map(bank => (
                                            <button
                                                key={bank}
                                                onClick={() => { setBankSearch(bank); setShowBankResults(false); }}
                                                className="w-full text-left px-6 py-4 rounded-2xl hover:bg-gray-50 text-indigo-900 font-bold text-sm flex items-center justify-between group transition-all"
                                            >
                                                {bank}
                                                <Check size={16} className={`text-[#c1e60d] transition-opacity ${bankSearch === bank ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                                            </button>
                                        ))}
                                        {filteredBanks.length === 0 && (
                                            <div className="p-6 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No results</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Phone Number - Numeric Only */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">PHONE NUMBER</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={phoneNumber}
                                    onChange={(e) => handlePhoneChange(e.target.value)}
                                    className="w-full bg-[#f8fafc] border border-gray-100 rounded-2xl px-8 py-5 font-bold text-[#1A1A4E] placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-indigo-900/5 transition-all"
                                    placeholder="+1 ..."
                                />
                            </div>
                        </div>

                        {/* IFSC / SWIFT CODE */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">IFSC / SWIFT CODE</label>
                            <input
                                type="text"
                                value={ifsc}
                                onChange={(e) => setIfsc(e.target.value)}
                                className="w-full bg-[#f8fafc] border border-gray-100 rounded-2xl px-8 py-5 font-bold text-[#1A1A4E] placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-indigo-900/5 transition-all uppercase"
                                placeholder="HDFC0001234"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-gray-100 bg-gray-50 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-12 py-5 bg-white border border-gray-100 rounded-2xl font-black text-[11px] text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-16 py-5 bg-[#2D2D70] text-white rounded-[1.75rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-[#1A1A4E] transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-70"
                    >
                        {isSubmitting ? "SAVING..." : "COMPLETE SETUP & SWITCH"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PayoutSetupModal;
