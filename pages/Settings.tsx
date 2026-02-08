
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import {
  Edit2,
  ShieldCheck,
  CreditCard,
  User as UserIcon,
  Sliders,
  RotateCw,
  ChevronLeft,
  Camera,
  Save,
  LogOut,
  Receipt,
  Download,
  Wallet,
  TrendingUp,
  Zap,
  Check,
  Building,
  Building2,
  CreditCard as CardIcon,
  Plus,
  ArrowRight,
  ChevronDown,
  Search,
  X,
  Gem
} from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

const COUNTRIES = [
  { name: 'United Kingdom', code: '+44', banks: ['HSBC UK', 'Barclays', 'NatWest', 'Lloyds Bank', 'Standard Chartered'] },
  { name: 'United States', code: '+1', banks: ['JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citigroup', 'Goldman Sachs'] },
  { name: 'India', code: '+91', banks: ['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank'] },
  { name: 'Canada', code: '+1', banks: ['Royal Bank of Canada', 'Toronto-Dominion Bank', 'Scotiabank', 'Bank of Montreal'] },
  { name: 'Germany', code: '+49', banks: ['Deutsche Bank', 'Commerzbank', 'DZ Bank', 'KfW'] },
  { name: 'Australia', code: '+61', banks: ['Commonwealth Bank', 'Westpac', 'ANZ', 'NAB'] },
  { name: 'Singapore', code: '+65', banks: ['DBS Bank', 'OCBC Bank', 'UOB'] },
];

const ProfileSettings = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    location: user?.location || ''
  });

  const handleSave = () => {
    updateProfile(formData);
    setIsEditing(false);
  };

  if (!user) return null;

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-start mb-12">
          <h3 className="text-xl font-bold text-indigo-900">Profile Information</h3>
          {isEditing ? (
            <button onClick={handleSave} className="bg-[#1A1A4E] text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2 text-sm shadow-xl transition-all">
              <Save size={16} /> Save Changes
            </button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="bg-[#c1e60d] text-indigo-900 font-bold px-6 py-2 rounded-xl flex items-center gap-2 text-sm shadow-sm hover:shadow-md transition-all">
              <Edit2 size={16} /> Edit
            </button>
          )}
        </div>

        <div className="flex items-center gap-6 mb-12">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-indigo-50 border-4 border-white shadow-lg overflow-hidden ring-1 ring-gray-100">
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <button className="absolute bottom-0 right-0 bg-black text-white p-2 rounded-full text-[10px] font-bold uppercase ring-2 ring-white">
              <Camera size={12} />
            </button>
          </div>
          <div>
            <h4 className="text-2xl font-black text-gray-900">{user.name}</h4>
            <span className="inline-block mt-1 px-3 py-1 bg-[#c1e60d]/20 text-indigo-900 text-[10px] font-black uppercase rounded-full tracking-wider">
              {user.role} Pro
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
          <div className="space-y-8">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Personal Details</h5>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Display Name</p>
                {isEditing ? (
                  <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold text-indigo-900 focus:outline-none" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                ) : <p className="font-bold text-indigo-900">{user.name}</p>}
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Email</p>
                {isEditing ? (
                  <input type="email" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold text-indigo-900 focus:outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                ) : <p className="font-bold text-indigo-900">{user.email}</p>}
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Bio</p>
                {isEditing ? (
                  <textarea className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-medium text-indigo-900 focus:outline-none" rows={3} value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} />
                ) : <p className="text-gray-500 font-medium italic">{user.bio || 'No bio provided'}</p>}
              </div>
            </div>
          </div>
          <div className="space-y-8">
            <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Professional</h5>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Location</p>
                {isEditing ? (
                  <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 font-bold text-indigo-900 focus:outline-none" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                ) : <p className="font-bold text-indigo-900">{user.location || 'Not set'}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Preferences = () => (
  <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm animate-in fade-in duration-500">
    <div className="flex justify-between items-start mb-12">
      <h3 className="text-xl font-bold text-indigo-900">Preferences</h3>
      <button className="bg-[#c1e60d] text-indigo-900 font-bold px-6 py-2 rounded-xl flex items-center gap-2 text-sm shadow-sm hover:shadow-md transition-all">
        <Edit2 size={16} /> Edit
      </button>
    </div>
    <div className="space-y-8">
      <div>
        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Selected Fields</h5>
        <div className="flex gap-2 flex-wrap">
          <span className="px-4 py-2 bg-indigo-50 text-indigo-900 rounded-lg text-xs font-bold border border-indigo-100">
            Project Management Tools
          </span>
          <span className="px-4 py-2 bg-indigo-50 text-indigo-900 rounded-lg text-xs font-bold border border-indigo-100">
            Product Design
          </span>
        </div>
      </div>
    </div>
  </div>
);

const Security = () => (
  <div className="space-y-8 animate-in fade-in duration-500">
    <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
      <h3 className="text-xl font-bold mb-8 text-indigo-900">Password & Authentication</h3>
      <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-100">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Security</span>
          <span className="text-sm font-bold text-indigo-900">Change Password</span>
        </div>
        <button className="flex items-center gap-2 bg-white border border-gray-100 px-6 py-2 rounded-xl text-indigo-900 font-bold text-sm shadow-sm">
          <RotateCw size={16} className="text-[#c1e60d]" /> Update
        </button>
      </div>
    </div>
  </div>
);

const PricingPlans = () => {
  const [currentPlan, setCurrentPlan] = useState('Pro');

  const plans = [
    {
      name: 'Starter',
      price: '$0',
      period: 'Forever',
      features: ['Unlimited Students', 'Basic Analytics', '3 Active Zones', '5% Platform Fee'],
      recommended: false
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/ month',
      features: ['Everything in Starter', 'Advanced Analytics', 'Unlimited Zones', 'Certificates', '0% Platform Fee'],
      recommended: true
    },
    {
      name: 'Elite',
      price: '$99',
      period: '/ month',
      features: ['Everything in Pro', 'White-label Domain', 'Priority Support', 'API Access', 'Custom Branding'],
      recommended: false
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-3xl font-black text-[#1A1A4E] mb-2">Upgrade Your Teaching Impact</h2>
        <p className="text-gray-400 font-medium">Choose the plan that fits your growth stage.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <div key={plan.name} className={`relative p-8 rounded-[2.5rem] border-2 flex flex-col ${plan.recommended ? 'bg-[#1A1A4E] text-white border-[#1A1A4E] shadow-2xl scale-105 z-10' : 'bg-white border-gray-100 text-[#1A1A4E] hover:border-[#1A1A4E]/20 transition-all'}`}>
            {plan.recommended && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#c1e60d] text-[#1A1A4E] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">
                Recommended
              </div>
            )}
            <h3 className="text-xl font-black mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-8">
              <span className={`text-4xl font-black ${plan.recommended ? 'text-[#c1e60d]' : 'text-[#1A1A4E]'}`}>{plan.price}</span>
              <span className="text-xs font-bold opacity-60">{plan.period}</span>
            </div>
            <div className="space-y-4 mb-8 flex-1">
              {plan.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${plan.recommended ? 'bg-white/10 text-[#c1e60d]' : 'bg-gray-100 text-[#1A1A4E]'}`}>
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-xs font-bold opacity-80">{feature}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setCurrentPlan(plan.name)}
              className={`w-full py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${plan.name === currentPlan ? 'bg-gray-100 text-gray-400 cursor-default' : plan.recommended ? 'bg-[#c1e60d] text-[#1A1A4E] hover:scale-105' : 'bg-[#1A1A4E] text-white hover:bg-black'}`}
            >
              {plan.name === currentPlan ? 'Current Plan' : 'Upgrade'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const Billings = () => {
  const { user } = useAuth();

  // State for form fields to ensure they are fully clearable
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Country search and selection
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<typeof COUNTRIES[0] | null>(null);
  const [showCountryResults, setShowCountryResults] = useState(false);

  // Bank search and selection
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

  // Restrict phone to digits and leading +
  const handlePhoneChange = (val: string) => {
    const cleaned = val.replace(/[^\d+]/g, '');
    setPhoneNumber(cleaned);
  };

  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    setSelectedCountry(country);
    setCountrySearch(country.name);
    setPhoneNumber(country.code); // Auto-prefix phone number
    setBankSearch(''); // Reset bank when country changes
    setShowCountryResults(false);
  };

  const transactions = [
    { id: 'T-8392', date: 'Oct 12, 2025', amount: '+$150.00', status: 'Completed', service: 'Earnings: Mentorship (Sachin S)', type: 'inbound' },
    { id: 'S-201', date: 'Oct 01, 2025', amount: '-$29.00', status: 'Completed', service: 'Nunma Pro Subscription', type: 'outbound' },
    { id: 'T-8341', date: 'Sep 28, 2025', amount: '+$49.00', status: 'Completed', service: 'Earnings: Zone Access (User Alpha)', type: 'inbound' },
    { id: 'P-990', date: 'Sep 20, 2025', amount: '-$121.00', status: 'Completed', service: 'Payout to Bank (Domestic)', type: 'payout' },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1A1A4E] rounded-[2.5rem] p-10 text-white shadow-xl relative overflow-hidden flex flex-col justify-center min-h-[160px]">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">TOTAL EARNINGS</p>
          <p className="text-5xl font-black text-[#c1e60d] tracking-tighter">$1,240.50</p>
          <Wallet className="absolute -bottom-4 -right-4 w-24 h-24 opacity-5" />
        </div>
        <div className="bg-gray-100 rounded-[2.5rem] p-10 border border-gray-200/50 shadow-sm flex flex-col justify-center min-h-[160px]">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">PENDING PAYOUT</p>
          <p className="text-5xl font-black text-indigo-900 tracking-tighter">$320.00</p>
        </div>
        <div className="bg-gray-100 rounded-[2.5rem] p-10 border border-gray-200/50 shadow-sm relative group flex flex-col justify-center min-h-[160px]">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">NUNMA PLAN</p>
              <p className="text-2xl font-black text-indigo-900">Pro Streamer</p>
            </div>
            <div className="bg-white p-2 rounded-xl text-indigo-900 shadow-sm">
              <Zap size={20} fill="currentColor" />
            </div>
          </div>
          <Link to="/settings/pricing" className="text-[10px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-900 mt-2 text-left">MANAGE SUBSCRIPTION</Link>
        </div>
      </div>

      {/* Revenue Payout Section - Only for Tutors */}
      {user?.role === UserRole.TUTOR && (
        <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-[0_20px_50px_rgba(0,0,0,0.03)] p-12">
          <div className="flex items-center gap-6 mb-12">
            <div className="w-16 h-16 bg-[#eef2ff] rounded-[2rem] flex items-center justify-center text-[#1A1A4E] shadow-sm">
              <Building2 size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-black text-[#1A1A4E] tracking-tight">Revenue Payout</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">BANK DETAILS FOR YOUR EARNINGS</p>
            </div>
          </div>

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
              <div className="relative group">
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
                        <Check size={16} className="text-[#c1e60d] opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                    {filteredCountries.length === 0 && (
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
                        <Check size={16} className="text-[#c1e60d] opacity-0 group-hover:opacity-100" />
                      </button>
                    ))}
                    {filteredBanks.length === 0 && (
                      <div className="p-6 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No results</div>
                    )}
                  </div>
                )}
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

          <div className="mt-14 flex flex-col sm:flex-row justify-between items-center gap-6">
            <button
              onClick={() => {
                setAccountHolder(''); setAccountNumber(''); setIfsc(''); setPhoneNumber(''); setCountrySearch(''); setBankSearch(''); setSelectedCountry(null);
              }}
              className="w-full sm:w-auto px-12 py-5 bg-white border border-gray-100 rounded-2xl font-black text-[11px] text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95"
            >
              CANCEL
            </button>
            <button className="w-full sm:w-auto px-16 py-6 bg-[#2D2D70] text-white rounded-[1.75rem] font-black uppercase text-[11px] tracking-[0.2em] shadow-xl hover:bg-[#1A1A4E] transition-all flex items-center justify-center gap-3 active:scale-95">
              SECURELY SAVE ACCOUNT
            </button>
          </div>
        </div>
      )}

      {/* Subscription Billing Details */}
      <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-sm p-12 space-y-12">
        <div>
          <h3 className="text-2xl font-black text-indigo-900 tracking-tighter">Subscription Billing</h3>
          <p className="text-sm text-gray-400 mt-1 font-medium">Manage how you pay for your Nunma Pro subscription.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-6">
            <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex items-center justify-between shadow-sm group hover:border-indigo-100 transition-all">
              <div className="flex items-center gap-6">
                <div className="w-16 h-10 bg-indigo-900 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                  <CardIcon size={24} />
                </div>
                <div>
                  <p className="font-black text-indigo-900">Visa ending in 4242</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Expires 12/28</p>
                </div>
              </div>
              <button className="text-[10px] font-black text-indigo-900 uppercase tracking-widest hover:text-indigo-600 active:scale-95 transition-all">UPDATE</button>
            </div>
            <button className="w-full py-5 border-2 border-dashed border-gray-200 rounded-[2.5rem] text-gray-400 font-black uppercase text-[10px] tracking-widest hover:border-indigo-900 hover:text-indigo-900 transition-all flex items-center justify-center gap-2">
              <Plus size={16} /> ADD BACKUP PAYMENT METHOD
            </button>
          </div>
          <div className="bg-indigo-50/50 p-10 rounded-[3rem] border border-indigo-100 flex flex-col justify-center relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-900 shadow-sm">
                <Receipt size={20} />
              </div>
              <p className="text-lg font-black text-indigo-900">Next billing cycle</p>
            </div>
            <p className="text-indigo-900/60 font-medium leading-relaxed relative z-10">
              Your next payment of <span className="font-black text-indigo-900">$29.00</span> will be automatically charged on <span className="font-black text-indigo-900">Nov 01, 2025</span>.
            </p>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-900/5 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>

      {/* Transaction Registry */}
      <div className="bg-white rounded-[3.5rem] p-12 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h3 className="text-2xl font-black text-indigo-900 tracking-tighter">Transaction Registry</h3>
            <p className="text-sm text-gray-400 mt-1 font-medium">Inclusive ledger of earnings, payouts, and platform subscriptions.</p>
          </div>
          <button className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-2 px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white transition-all shadow-sm active:scale-95">
            <Download size={14} className="text-[#c1e60d]" /> EXPORT STATEMENT
          </button>
        </div>
        <div className="space-y-4">
          {transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 group hover:bg-indigo-50/30 transition-all hover:translate-x-1">
              <div className="flex items-center gap-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${t.type === 'inbound' ? 'bg-[#c1e60d]/20 text-[#7cc142]' : t.type === 'outbound' ? 'bg-[#1A1A4E] text-white' : 'bg-orange-50 text-orange-500'}`}>
                  {t.type === 'inbound' ? <TrendingUp size={24} /> : t.type === 'outbound' ? <Zap size={24} /> : <CreditCard size={24} />}
                </div>
                <div>
                  <p className="text-lg font-black text-indigo-900">{t.service}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t.id} • {t.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-black ${t.amount.startsWith('+') ? 'text-[#7cc142]' : 'text-indigo-900'}`}>{t.amount}</p>
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t.status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Settings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (!user) return <Navigate to="/auth" />;

  const tabs = [
    { label: 'MY PROFILE', path: '/settings/profile', icon: <UserIcon size={14} /> },
    { label: 'PREFERENCES', path: '/settings/preferences', icon: <Sliders size={14} /> },
    { label: 'SECURITY OPTIONS', path: '/settings/security', icon: <ShieldCheck size={14} /> },
    ...(user.role === UserRole.TUTOR ? [
      { label: 'BILLINGS', path: '/settings/billing', icon: <CreditCard size={14} /> },
      { label: 'PRICING', path: '/settings/pricing', icon: <Gem size={14} /> },
    ] : [])
  ];

  return (
    <div className="max-w-[1400px] mx-auto animate-in fade-in duration-700 pb-20 pt-4">
      <div className="space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-2">
            <h1 className="text-6xl font-black text-[#1A1A4E] tracking-tighter flex items-center gap-6">
              <button onClick={() => navigate('/dashboard')} className="p-4 bg-white border border-gray-100 rounded-2xl text-indigo-900 hover:shadow-xl transition-all shadow-sm active:scale-90">
                <ChevronLeft size={28} />
              </button>
              Settings
            </h1>
            <p className="text-gray-400 font-medium text-lg pl-2">Configure your personal and professional identity on Nunma.</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center md:justify-start">
          <div className="bg-[#f2f4f7] p-2 rounded-[2.5rem] border border-gray-200/50 shadow-inner flex overflow-x-auto no-scrollbar whitespace-nowrap gap-2">
            {tabs.map(tab => (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center gap-3 py-4 px-10 text-[10px] font-black uppercase tracking-[0.25em] rounded-[1.75rem] transition-all
                  ${location.pathname === tab.path
                    ? 'bg-white text-indigo-900 shadow-lg border border-gray-100 translate-y-[-1px]'
                    : 'text-gray-400 hover:text-indigo-900'
                  }`}
              >
                <span className={location.pathname === tab.path ? 'text-indigo-900' : 'text-gray-300'}>{tab.icon}</span>
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="pt-4 max-w-7xl">
          <Routes>
            <Route path="/" element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="preferences" element={<Preferences />} />
            <Route path="security" element={<Security />} />
            <Route path="billing" element={<Billings />} />
            <Route path="pricing" element={<PricingPlans />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Settings;
