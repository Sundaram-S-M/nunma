
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
  Gem,
  Crown,
  Clock
} from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { functions } from '../utils/firebase';
import { httpsCallable } from 'firebase/functions';

const COUNTRIES = [
  { name: 'United Kingdom', code: '+44', banks: ['HSBC UK', 'Barclays', 'NatWest', 'Lloyds Bank', 'Standard Chartered'] },
  { name: 'United States', code: '+1', banks: ['JPMorgan Chase', 'Bank of America', 'Wells Fargo', 'Citigroup', 'Goldman Sachs'] },
  { name: 'India', code: '+91', banks: ['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank'] },
  { name: 'Canada', code: '+1', banks: ['Royal Bank of Canada', 'Toronto-Dominion Bank', 'Scotiabank', 'Bank of Montreal'] },
  { name: 'Germany', code: '+49', banks: ['Deutsche Bank', 'Commerzbank', 'DZ Bank', 'KfW'] },
  { name: 'Australia', code: '+61', banks: ['Commonwealth Bank', 'Westpac', 'ANZ', 'NAB'] },
  { name: 'Singapore', code: '+65', banks: ['DBS Bank', 'OCBC Bank', 'UOB'] },
];

// ProfileSettings component removed as editing now happens directly on the profile page.


const PREFERENCE_OPTIONS = [
  'Web Development', 'Mobile App Development', 'Cloud Computing', 'Data Science', 
  'Machine Learning', 'Artificial Intelligence', 'Cybersecurity', 'DevOps',
  'UI/UX Design', 'Digital Marketing', 'Business Strategy', 'Product Management',
  'Graphic Design', 'Video Editing', 'Content Writing', 'Soft Skills'
];

const Preferences = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(
    user?.expertise || user?.studentProfile?.primaryInterests || []
  );
  const [isSaving, setIsSaving] = useState(false);

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest) 
        ? prev.filter(i => i !== interest) 
        : [...prev, interest]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: any = {};
      if (user?.role === UserRole.TUTOR) {
        updates.expertise = selectedInterests;
      } else {
        updates.studentProfile = {
          ...user?.studentProfile,
          primaryInterests: selectedInterests
        };
      }
      await updateProfile(updates);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save preferences:", error);
      alert("Failed to save preferences. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm animate-in fade-in duration-500">
      <div className="flex justify-between items-start mb-12">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-indigo-900">Preferences</h3>
          <p className="text-sm text-gray-400 font-medium">Select the topics and fields you are most interested in.</p>
        </div>
        {!isEditing ? (
          <button 
            onClick={() => setIsEditing(true)}
            className="bg-[#c1e60d] text-indigo-900 font-bold px-6 py-2 rounded-xl flex items-center gap-2 text-sm shadow-sm hover:shadow-md transition-all active:scale-95"
          >
            <Edit2 size={16} /> Edit
          </button>
        ) : (
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setSelectedInterests(user?.expertise || user?.studentProfile?.primaryInterests || []);
                setIsEditing(false);
              }}
              disabled={isSaving}
              className="bg-gray-100 text-gray-500 font-bold px-6 py-2 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="bg-indigo-900 text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2 text-sm shadow-sm hover:bg-black transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        )}
      </div>
      
      <div className="space-y-8">
        <div>
          <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Available Fields</h5>
          <div className="flex gap-3 flex-wrap">
            {isEditing ? (
              PREFERENCE_OPTIONS.map(interest => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-5 py-3 rounded-2xl text-xs font-bold transition-all border-2 ${
                    selectedInterests.includes(interest)
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105'
                      : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-100 hover:text-indigo-900'
                  }`}
                >
                  {interest}
                </button>
              ))
            ) : (
              selectedInterests.length > 0 ? (
                selectedInterests.map(interest => (
                  <span key={interest} className="px-5 py-3 bg-indigo-50 text-indigo-900 rounded-2xl text-xs font-bold border border-indigo-100">
                    {interest}
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-400 italic">No preferences selected yet. Click edit to add some.</p>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


const Security = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handlePasswordUpdate = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      alert("Passwords do not match or are empty.");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    setIsUpdating(true);
    try {
      const { updatePassword, getAuth } = await import('firebase/auth');
      const authInstance = getAuth();
      if (authInstance.currentUser) {
        await updatePassword(authInstance.currentUser, newPassword);
        alert("Password updated successfully!");
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      console.error("Password update error:", error);
      if (error.code === 'auth/requires-recent-login') {
        alert("This operation is sensitive and requires recent authentication. Please log out and log back in to change your password.");
      } else {
        alert("Failed to update password: " + error.message);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount');
      await deleteUserAccount();
      alert("Your account has been permanently deleted.");
      await logout();
      navigate('/');
    } catch (error: any) {
      console.error("Account deletion error:", error);
      alert("Failed to delete account: " + error.message);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
        <h3 className="text-xl font-bold mb-8 text-indigo-900">Password & Authentication</h3>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">New Password</label>
              <input 
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-6 py-2 h-[44px] min-h-[48px] md:min-h-[44px] bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-indigo-900 placeholder-slate-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Confirm New Password</label>
              <input 
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-6 py-2 h-[44px] min-h-[48px] md:min-h-[44px] bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-indigo-900 placeholder-slate-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              onClick={handlePasswordUpdate}
              disabled={isUpdating || !newPassword}
              className="flex items-center gap-2 bg-indigo-900 text-white px-8 py-4 rounded-2xl font-black text-xs tracking-widest uppercase shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : <><RotateCw size={16} className="text-[#c1e60d]" /> Update Password</>}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-red-50 rounded-[2.5rem] p-10 border border-red-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-red-900">Danger Zone</h3>
            <p className="text-sm text-red-700/60 font-medium">Permanently delete your account and all associated data.</p>
          </div>
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="px-8 py-4 bg-white border-2 border-red-100 text-red-600 rounded-2xl font-black text-xs tracking-widest uppercase hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95 shadow-sm"
          >
            Delete My Account
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-[#040457]/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden p-12 text-center relative">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-600 mx-auto mb-8">
              <ShieldCheck size={40} />
            </div>
            <h3 className="text-3xl font-black text-[#040457] tracking-tighter mb-4">Are you sure?</h3>
            <p className="text-gray-500 font-medium mb-10 leading-relaxed">
              This action is <span className="text-red-600 font-bold uppercase">permanent</span>. You will lose access to all your videos, PDFs, and courses. There is no way to recover your data.
            </p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-red-200 hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting Everything...' : 'Yes, Delete My Account'}
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="w-full py-5 bg-gray-50 text-gray-500 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


const PricingPlans = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentTier = (user as any)?.current_tier?.toUpperCase() || 'STARTER';

  const STRIPE_STANDARD_URL = '#';
  const STRIPE_PREMIUM_URL = '#';

  const tiers = [
    {
      id: 'STARTER',
      name: 'Starter',
      badge: 'The Trojan Horse',
      price: '₹0',
      period: '/ month',
      description: 'Get hooked on the platform. Perfect for trying out the core features.',
      icon: <ShieldCheck className="w-6 h-6 text-gray-400" />,
      color: 'gray',
      features: [
        { name: '10% Platform Fee per transaction', included: true, highlight: true },
        { name: 'Max 100 Students', included: true },
        { name: '10 Streams / month (Up to 150 hours!)', included: true },
        { name: '3 GB Persistent Storage', included: true },
        { name: 'Add-ons Available', included: false },
      ],
      buttonText: currentTier === 'STARTER' ? 'Current Plan' : 'Downgrade',
      buttonAction: () => navigate('/dashboard'),
      buttonVariant: currentTier === 'STARTER' ? 'outline' : 'outline',
    },
    {
      id: 'STANDARD',
      name: 'Standard',
      badge: 'The Profit Engine',
      price: '₹1,499',
      period: '/ month',
      description: 'The sweet spot for the serious, everyday tutor.',
      icon: <Zap className="w-6 h-6 text-[#c2f575]" />,
      color: 'lime',
      popular: true,
      features: [
        { name: '5% Platform Fee per transaction', included: true, highlight: true },
        { name: 'Max 250 Students', included: true },
        { name: '25 Streams / month (Up to 375 hours!)', included: true },
        { name: '15 GB Persistent Storage', included: true },
        { name: 'Add-ons Available', included: true },
      ],
      buttonText: currentTier === 'STANDARD' ? 'Current Plan' : 'Upgrade to Standard',
      buttonAction: () => window.open(STRIPE_STANDARD_URL, '_blank'),
      buttonVariant: currentTier === 'STANDARD' ? 'outline' : 'primary',
    },
    {
      id: 'PREMIUM',
      name: 'Premium',
      badge: 'The Heavyweight',
      price: '₹4,999',
      period: '/ month',
      description: 'For established coaching centers running daily batches.',
      icon: <Crown className="w-6 h-6 text-purple-400" />,
      color: 'purple',
      features: [
        { name: '2% Platform Fee per transaction', included: true, highlight: true },
        { name: 'Max 1,000 Students', included: true },
        { name: '60 Streams / month (Up to 900 hours!)', included: true },
        { name: '30 GB Persistent Storage', included: true },
        { name: 'Add-ons Available', included: true },
      ],
      buttonText: currentTier === 'PREMIUM' ? 'Current Plan' : 'Upgrade to Premium',
      buttonAction: () => window.open(STRIPE_PREMIUM_URL, '_blank'),
      buttonVariant: currentTier === 'PREMIUM' ? 'outline' : 'dark',
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h2 className="text-[#c2f575] font-black tracking-widest uppercase text-sm mb-4">Pricing Plans</h2>
        <h1 className="text-4xl md:text-6xl font-black text-[#040457] tracking-tighter mb-6">
          Scale Your Teaching Empire
        </h1>
        <p className="text-xl text-gray-500 font-medium">
          Choose the perfect plan to grow your audience and maximize your earnings.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className={`
      relative flex flex-col rounded-[2.5rem] bg-white p-8 
      ${tier.popular && currentTier !== tier.id ? 'border-2 border-[#c2f575] shadow-2xl scale-105 z-10' : 'border border-gray-100 shadow-xl'}
      hover:shadow-2xl transition-all duration-300
    `}
          >
            {tier.popular && currentTier !== tier.id && (
              <div className="absolute top-0 right-10 -translate-y-1/2">
                <span className="bg-[#c2f575] text-[#040457] text-xs font-black uppercase tracking-widest py-2 px-4 rounded-full shadow-lg">
                  Most Popular
                </span>
              </div>
            )}
            {currentTier === tier.id && (
              <div className="absolute top-0 right-10 -translate-y-1/2">
                <span className="bg-gray-100 text-gray-500 text-xs font-black uppercase tracking-widest py-2 px-4 rounded-full shadow-sm">
                  Current Plan
                </span>
              </div>
            )}

            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-black text-[#040457]">{tier.name}</h3>
                <div className={`
          w-12 h-12 rounded-2xl flex items-center justify-center
          ${tier.color === 'lime' ? 'bg-[#c2f575]/20' :
                    tier.color === 'purple' ? 'bg-purple-100' : 'bg-gray-100'}
        `}>
                  {tier.icon}
                </div>
              </div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                "{tier.badge}"
              </div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-5xl font-black text-[#040457] tracking-tight">{tier.price}</span>
                <span className="text-gray-400 font-medium">{tier.period}</span>
              </div>
              <p className="text-sm text-gray-500 font-medium min-h-[40px]">
                {tier.description}
              </p>
            </div>

            <div className="flex-1 space-y-4 mb-8">
              {tier.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className={`mt-1 shrink-0 ${feature.included ? 'text-green-500' : 'text-gray-300'}`}>
                    {feature.included ? <Check size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}
                  </div>
                  <span className={`text-sm ${feature.included ? 'text-gray-700 font-medium' : 'text-gray-400 line-through'} ${feature.highlight ? 'font-black text-[#040457]' : ''}`}>
                    {feature.name}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={tier.buttonAction}
              disabled={currentTier === tier.id}
              className={`
        w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all
        ${currentTier === tier.id ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
                  tier.buttonVariant === 'primary' ? 'bg-[#c2f575] text-[#040457] hover:bg-[#b0eb54] shadow-xl hover:shadow-[#c2f575]/40 hover:-translate-y-1' :
                    tier.buttonVariant === 'dark' ? 'bg-[#040457] text-white hover:bg-black shadow-xl hover:shadow-[#040457]/40 hover:-translate-y-1' :
                      'bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'}
      `}
            >
              {tier.buttonText}
              {tier.buttonVariant !== 'outline' && currentTier !== tier.id && <ArrowRight size={16} />}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-20 max-w-4xl mx-auto bg-indigo-50/50 rounded-[3rem] p-10 text-center border border-indigo-100">
        <h3 className="text-2xl font-black text-[#040457] mb-4">Need more resources?</h3>
        <p className="text-gray-600 font-medium mb-8 max-w-2xl mx-auto">
          Standard and Premium users can easily purchase add-ons at any time to expand their limits without jumping to the next tier.
        </p>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1">
            <h4 className="font-black text-[#040457] mb-2">Extra Storage Block</h4>
            <p className="text-lg font-bold text-[#c2f575] mb-2">₹499 <span className="text-xs text-gray-400 font-normal">/ month</span></p>
            <p className="text-sm text-gray-500">+50 GB Persistent Storage</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex-1">
            <h4 className="font-black text-[#040457] mb-2">Extra Student Block</h4>
            <p className="text-lg font-bold text-[#c2f575] mb-2">₹999 <span className="text-xs text-gray-400 font-normal">/ month</span></p>
            <p className="text-sm text-gray-500">+50 Student Slots</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Billings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State for form fields to ensure they are fully clearable
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [downloadingTx, setDownloadingTx] = useState<string | null>(null);
  const [agreedToServiceTerms, setAgreedToServiceTerms] = useState(false);

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

  // Format phone to +XX XXXXX XXXXX
  const handlePhoneChange = (val: string) => {
    // Only allow digits and plus sign
    let cleaned = val.replace(/[^\d+]/g, '');

    // Ensure it starts with +
    if (cleaned.length > 0 && !cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    // Extract country code (assuming +XX) and the rest
    // A more robust implementation would parse the specific country's code length, 
    // but we'll use a simple format based on the prompt: +91 89023 59125

    // Remove spaces for processing
    let digitsOnly = cleaned.replace(/\s+/g, '');

    let formatted = digitsOnly;

    // Format: +CC NNNNN NNNNN
    if (digitsOnly.length > 3) {
      // Find where the country code ends (usually after 2-3 chars incl '+')
      // Let's assume the user typed a country code from the dropdown (+1, +44, +91)
      // For simplicity, we'll put a space after the country code if it matches one
      let ccLength = 3; // default for +XX
      if (digitsOnly.startsWith('+1')) ccLength = 2; // +1

      if (digitsOnly.length > ccLength) {
        const cc = digitsOnly.substring(0, ccLength);
        const rest = digitsOnly.substring(ccLength);

        formatted = cc + ' ' + rest;

        // Add second space after 5 digits of the actual number
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

  const handleDownloadInvoice = async (transaction: any) => {
    setDownloadingTx(transaction.id);
    try {
      const getInvoice = httpsCallable(functions, 'downloadInvoice');
      const response: any = await getInvoice({
        transactionId: transaction.id,
        amount: transaction.amount,
        service: transaction.service,
        date: transaction.date,
        status: transaction.status
      });

      if (response.data.success) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(response.data.html);
          printWindow.document.close();
        } else {
          alert('Please allow popups to view your invoice.');
        }
      }
    } catch (e: any) {
      console.error('Invoice download failed:', e);
      alert('Failed to generate invoice.');
    } finally {
      setDownloadingTx(null);
    }
  };

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

          {(user?.kycStatus === 'VERIFIED' && (user as any)?.razorpay_account_id) || user?.isDevBypass ? (
            <div className="bg-[#f8fafc] border border-gray-100 rounded-3xl p-8 flex flex-col sm:flex-row items-center gap-8 shadow-inner">
              <div className="flex items-center gap-6 flex-1">
                <div className="w-16 h-16 bg-[#c2f575]/20 rounded-full flex items-center justify-center text-[#7cc142] shrink-0 border border-[#c2f575]/30">
                  <Check size={32} />
                </div>
                <div>
                  <h4 className="text-xl font-black text-indigo-900 leading-tight">{user?.isDevBypass && user?.kycStatus !== 'VERIFIED' ? 'Developer Bypass Active' : 'KYC Verified & Active'}</h4>
                  <p className="text-sm font-medium text-gray-500 mt-2 max-w-sm">
                    {user?.isDevBypass && user?.kycStatus !== 'VERIFIED' ? 'KYC Gating Overridden for development.' : 'Your account is securely linked. You are ready to receive direct automated bank payouts.'}
                  </p>
                </div>
              </div>

              <div className="sm:ml-auto w-full sm:w-auto shrink-0">
                <button
                  onClick={() => {
                    alert('Bank capabilities are securely linked via Razorpay API. If you need to update bank details, please contact Nunma Support.');
                  }}
                  className="text-[11px] font-black text-indigo-900 uppercase tracking-[0.1em] hover:text-[#c2f575] bg-white border-2 border-indigo-50 hover:border-indigo-900 hover:bg-indigo-900 transition-all px-8 py-4 rounded-2xl shadow-sm hover:shadow-xl w-full sm:w-auto active:scale-95 disabled:opacity-50"
                >
                  MANAGE ON RAZORPAY
                </button>
              </div>
            </div>
          ) : user?.kycStatus === 'PENDING' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-amber-900">Verification in Progress</h4>
                  <p className="text-sm font-medium text-amber-700/80 mt-1">
                    Razorpay is currently reviewing your identity and bank details. Payouts will be enabled once verified.
                  </p>
                </div>
              </div>
              
              <button
                disabled
                className="w-full md:w-auto px-8 py-4 bg-amber-200 text-amber-900 rounded-2xl font-black uppercase text-[11px] tracking-widest opacity-50 cursor-not-allowed"
              >
                PENDING APPROVAL
              </button>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shrink-0">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-orange-900">{user?.kycStatus === 'FAILED' ? 'KYC Verification Failed' : 'Action Required: Complete your KYC'}</h4>
                  <p className="text-sm font-medium text-orange-700/80 mt-1">
                    {user?.kycStatus === 'FAILED' 
                      ? 'Please re-submit your verification details. Razorpay could not verify the information provided.' 
                      : 'Complete your KYC to receive payouts and publish paid zones. Verification is securely handled by Razorpay.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-6 w-full md:w-auto">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center mt-1">
                    <input
                      type="checkbox"
                      checked={agreedToServiceTerms}
                      onChange={(e) => setAgreedToServiceTerms(e.target.checked)}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-orange-300 bg-white checked:bg-orange-500 checked:border-orange-500 transition-all hover:bg-orange-50"
                    />
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                      <Check size={14} />
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-orange-900 uppercase tracking-widest leading-relaxed">
                    I accept the dynamic commission structure and automated 0.1% TDS / 0.5% TCS deductions.
                  </span>
                </label>

                <button
                  disabled={!agreedToServiceTerms}
                  onClick={() => {
                    navigate('/onboarding?role=tutor');
                  }}
                  className="w-full md:w-auto px-8 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-orange-500/20 hover:bg-orange-600 transition-all whitespace-nowrap active:scale-95 disabled:opacity-50 disabled:grayscale"
                >
                  {user?.kycStatus === 'FAILED' ? 'RE-VERIFY IDENTITY' : 'VERIFY IDENTITY & BANK DETAILS'}
                </button>
              </div>
            </div>
          )}
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
              <div className="text-right flex flex-col items-end gap-2">
                <div>
                  <p className={`text-2xl font-black ${t.amount.startsWith('+') ? 'text-[#7cc142]' : 'text-indigo-900'}`}>{t.amount}</p>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{t.status}</p>
                </div>
                <button
                  onClick={() => handleDownloadInvoice(t)}
                  disabled={downloadingTx === t.id}
                  className="px-4 py-2 mt-2 bg-indigo-50 text-indigo-900 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#c1e60d] hover:text-[#1A1A4E] transition-all disabled:opacity-50"
                  title="Download Invoice"
                >
                  <Download size={12} />
                  {downloadingTx === t.id ? 'Generating...' : 'Invoice'}
                </button>
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
                target={tab.label === 'MY PROFILE' ? '_self' : undefined}
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
            <Route path="/" element={<Navigate to="preferences" replace />} />
            <Route path="profile" element={<Navigate to="/profile/me" replace />} />
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
