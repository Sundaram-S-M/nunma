
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  ArrowRight,
  Mail,
  Lock,
  User,
  Globe,
  ShieldCheck,
  Eye,
  EyeOff,
  ChevronRight,
  MapPin,
  Calendar,
  Sparkles,
  Check
} from 'lucide-react';

const COMMON_CITIES = [
  "London", "New York", "San Francisco", "Mumbai", "Berlin", "Paris", "Tokyo", "Singapore", "Toronto", "Sydney", "Dubai", "Amsterdam", "Austin", "Seattle", "Bengaluru", "Chennai", "Delhi", "Hyderabad"
];

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);

  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleInitialSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingStep(1);
  };

  const handleCompleteSignUp = async () => {
    await signup({
      name,
      email,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || 'default'}`,
      role,
      location: citySearch,
    }, password);
    navigate('/dashboard');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    navigate('/dashboard');
  };

  const branding = {
    [UserRole.STUDENT]: {
      title: "Empower Your",
      highlight: "Learning Path.",
      description: "The professional ecosystem built for creators, experts, and lifelong achievers."
    },
    [UserRole.TUTOR]: {
      title: "Scale Your",
      highlight: "Global Expertise.",
      description: "Transform your knowledge into a sustainable professional stream and reach thousands of learners."
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#fcfcfc] flex items-center justify-center p-4 md:p-10 lg:p-12">
      <div className="w-full max-w-[1280px] min-h-[700px] grid grid-cols-1 lg:grid-cols-[1.1fr,1fr] bg-white rounded-[3rem] lg:rounded-[4.5rem] shadow-[0_80px_160px_rgba(0,0,0,0.06)] overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-1000">

        {/* Left Side: Branding */}
        <div className="hidden lg:flex bg-[#040457] p-24 text-white flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-24">
              <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center shadow-2xl rotate-3 overflow-hidden bg-[#040457]">
                <img src="/assets/logo-icon.png" alt="Nunma Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-4xl font-black tracking-tighter">nunma</span>
            </div>

            <div className="animate-in fade-in slide-in-from-left-8 duration-1000">
              <h1 className="text-7xl xl:text-[6rem] font-black tracking-tighter leading-[0.9] mb-12">
                {branding[role].title} <br />
                <span className="text-[#c2f575]">{branding[role].highlight}</span>
              </h1>
              <p className="text-indigo-200/60 text-xl xl:text-2xl font-medium leading-relaxed max-w-lg">
                {branding[role].description}
              </p>
            </div>
          </div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-6 bg-white/5 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-[#c2f575] flex items-center justify-center text-[#040457] shrink-0">
                <ShieldCheck size={28} strokeWidth={3} />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-[#c2f575] mb-1.5">Enterprise Grade Security</p>
                <p className="text-sm text-indigo-100/40 leading-relaxed font-bold">
                  Encrypted protocols for verified knowledge streams.
                </p>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-40 -right-40 w-[800px] h-[800px] bg-[#c2f575]/5 rounded-full blur-[160px]"></div>
        </div>

        {/* Right Side: Form */}
        <div className="p-10 md:p-16 lg:p-24 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            <div className="lg:hidden flex items-center gap-3 mb-16">
              <div className="w-10 h-10 bg-[#040457] rounded-xl flex items-center justify-center text-[#c2f575]">
                <Globe size={20} strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-black tracking-tighter text-[#040457]">nunma</span>
            </div>

            {isLogin ? (
              <div className="animate-in fade-in duration-700">
                <div className="mb-14">
                  <h2 className="text-5xl font-black text-[#040457] tracking-tighter mb-4">Welcome Back</h2>
                  <p className="text-gray-400 font-medium text-lg">Enter your access token to enter the hub.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">Identity (Email)</label>
                    <div className="relative group">
                      <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#040457] transition-colors" size={20} />
                      <input
                        type="email" required placeholder="name@domain.com"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-[1.75rem] pl-16 pr-8 py-5 font-bold text-[#040457] outline-none transition-all shadow-sm"
                        value={email} onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Access Key</label>
                      <button type="button" className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-[#040457]">Recovery</button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#040457] transition-colors" size={20} />
                      <input
                        type={showPassword ? "text" : "password"} required placeholder="••••••••"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-[1.75rem] pl-16 pr-16 py-5 font-bold text-[#040457] outline-none transition-all shadow-sm"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300 hover:text-[#040457] transition-colors"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button type="submit" className="w-full py-6 bg-[#040457] text-white rounded-[1.75rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl shadow-[#040457]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 mt-8">
                    Sign In <ArrowRight size={20} className="text-[#c2f575]" />
                  </button>
                </form>
              </div>
            ) : (
              /* SIGNUP FLOW */
              onboardingStep === 0 ? (
                <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                  <div className="mb-14">
                    <h2 className="text-5xl font-black text-[#040457] tracking-tighter mb-4">Join Ecosystem</h2>
                    <p className="text-gray-400 font-medium text-lg">Initialize your professional profile.</p>
                  </div>

                  <form onSubmit={handleInitialSignUp} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">Full Name</label>
                      <div className="relative group">
                        <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#040457]" size={20} />
                        <input
                          type="text" required placeholder="Legal full name"
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-[1.75rem] pl-16 pr-8 py-5 font-bold text-[#040457] outline-none transition-all"
                          value={name} onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">Operational Mode</label>
                      <div className="flex p-2 bg-gray-50 rounded-[1.5rem] border border-gray-100 gap-2">
                        <button
                          type="button" onClick={() => setRole(UserRole.STUDENT)}
                          className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${role === UserRole.STUDENT ? 'bg-white text-[#040457] shadow-xl border border-gray-100' : 'text-gray-400'}`}
                        >
                          Learner
                        </button>
                        <button
                          type="button" onClick={() => setRole(UserRole.TUTOR)}
                          className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${role === UserRole.TUTOR ? 'bg-white text-[#040457] shadow-xl border border-gray-100' : 'text-gray-400'}`}
                        >
                          Expert
                        </button>
                      </div>
                    </div>

                    <button type="submit" className="w-full py-6 bg-[#040457] text-white rounded-[1.75rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 mt-8">
                      Continue <ArrowRight size={20} className="text-[#c2f575]" />
                    </button>
                  </form>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                  <div className="mb-14">
                    <p className="text-[#c2f575] text-[11px] font-black uppercase tracking-[0.4em] mb-4">Finalizing</p>
                    <h2 className="text-5xl font-black text-[#040457] tracking-tighter mb-4">The Last Wave</h2>
                    <p className="text-gray-400 font-medium text-lg">Establish your presence in the network.</p>
                  </div>
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">Date of Origin (DOB)</label>
                      <input
                        type="date"
                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-[1.75rem] px-8 py-5 font-black text-xl text-[#040457] outline-none transition-all shadow-inner"
                        value={dob} onChange={(e) => setDob(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => setOnboardingStep(0)} className="flex-1 py-5 bg-gray-50 text-gray-400 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest hover:bg-gray-100">Back</button>
                      <button onClick={handleCompleteSignUp} className="flex-[2.5] py-5 bg-[#040457] text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4">
                        Initialize Dashboard <Sparkles size={18} className="text-[#c2f575]" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}

            <div className="mt-16 pt-10 border-t border-gray-100 text-center">
              <p className="text-sm font-medium text-gray-400">
                {isLogin ? "New to the ecosystem?" : "Identity already verified?"}{' '}
                <button
                  onClick={() => { setIsLogin(!isLogin); setOnboardingStep(0); }}
                  className="text-[#040457] font-black uppercase text-[10px] tracking-[0.25em] hover:text-[#c2f575] transition-colors ml-2"
                >
                  {isLogin ? 'Create Profile' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
