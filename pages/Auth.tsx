
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Sparkles,
  KeyRound
} from 'lucide-react';

const Auth: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'signup');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // New OTP Flow State
  const [step, setStep] = useState<'info' | 'otp' | 'password'>('info');
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);

  const { login, signup, requestOTP, verifyOTP, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSignUpInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await requestOTP(email);
      setStep('otp');
      // Start 60-second resend cooldown
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error("OTP Request error:", error);
      alert(`Request Failed: ${error.message || "Failed to send verification code."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0 || isResending) return;
    try {
      setIsResending(true);
      setOtp('');
      await requestOTP(email);
      setResendCooldown(60);
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
      alert(`A new verification code has been sent to ${email}.`);
    } catch (error: any) {
      console.error("Resend OTP error:", error);
      alert(`Resend Failed: ${error.message || "Could not resend verification code."}`);
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const result: any = await verifyOTP(email, otp, { name, role });

      if (result?.verified) {
        setStep('password');
      } else {
        // If result has customToken, verifyOTP would have already signed in
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error("OTP Verification error:", error);
      alert(`Verification Failed: ${error.message || "Invalid or expired code."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await verifyOTP(email, otp, { name, role }, password);
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Finalize Sign-Up error:", error);
      alert(`Setup Failed: ${error.message || "Failed to create account."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await loginWithGoogle(role);
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      alert(`Google Sign-In Failed: ${error.message || "Authentication cancelled."}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (error: any) {
      console.error("Login error:", error);
      alert(`Access Denied: ${error.message || "Please verify your credentials and configuration."}`);
    } finally {
      setIsLoading(false);
    }
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
                  {/* Google Login Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-5 bg-white border-2 border-gray-100 text-[#040457] rounded-[1.75rem] font-bold text-sm hover:border-[#c2f575] hover:bg-gray-50 transition-all flex items-center justify-center gap-3 mb-8 shadow-sm"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                    Continue with Google
                  </button>

                  <div className="relative flex items-center gap-4 mb-8">
                    <div className="flex-1 h-[1px] bg-gray-100"></div>
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">or email access</span>
                    <div className="flex-1 h-[1px] bg-gray-100"></div>
                  </div>

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

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-6 bg-[#040457] text-white rounded-[1.75rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl shadow-[#040457]/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Validating..." : "Sign In"} <ArrowRight size={20} className="text-[#c2f575]" />
                  </button>
                </form>
              </div>
            ) : (
              /* SIGNUP FLOW */
              <div className="animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="mb-14">
                  <h2 className="text-5xl font-black text-[#040457] tracking-tighter mb-4">Join Ecosystem</h2>
                  <p className="text-gray-400 font-medium text-lg">
                    {step === 'info' && "Initialize your professional profile."}
                    {step === 'otp' && "Enter the verification code sent to your email."}
                    {step === 'password' && "Create a secure password for your account."}
                  </p>
                </div>

                {step === 'info' && (
                  <form onSubmit={handleSignUpInfoSubmit} className="space-y-6">
                    {/* Google Signup Button */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      className="w-full py-5 bg-white border-2 border-gray-100 text-[#040457] rounded-[1.75rem] font-bold text-sm hover:border-[#c2f575] hover:bg-gray-50 transition-all flex items-center justify-center gap-3 mb-8 shadow-sm"
                    >
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                      Sign up with Google
                    </button>

                    <div className="relative flex items-center gap-4 mb-8">
                      <div className="flex-1 h-[1px] bg-gray-100"></div>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">or use email</span>
                      <div className="flex-1 h-[1px] bg-gray-100"></div>
                    </div>

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
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">Identity (Email)</label>
                      <div className="relative group">
                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#040457]" size={20} />
                        <input
                          type="email" required placeholder="name@domain.com"
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-[1.75rem] pl-16 pr-8 py-5 font-bold text-[#040457] outline-none transition-all"
                          value={email} onChange={(e) => setEmail(e.target.value)}
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

                    <button type="submit" disabled={isLoading} className="w-full py-6 bg-[#040457] text-white rounded-[1.75rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 mt-8 disabled:opacity-50">
                      {isLoading ? "Sending Code..." : "Send Verification Code"} <ArrowRight size={18} className="text-[#c2f575]" />
                    </button>
                  </form>
                )}

                {step === 'otp' && (
                  <form onSubmit={handleVerifyOTP} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">6-Digit Verification Code</label>
                      <div className="relative group">
                        <KeyRound className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#040457]" size={20} />
                        <input
                          type="text" required placeholder="••••••" maxLength={6}
                          className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-[1.75rem] pl-16 pr-8 py-5 font-black text-[#040457] outline-none transition-all text-2xl tracking-[0.5em]"
                          value={otp} onChange={(e) => setOtp(e.target.value)}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 font-medium ml-1">
                        Code sent to <span className="text-[#040457] font-bold">{email}</span>.
                        <button type="button" onClick={() => setStep('info')} className="ml-1 text-[#040457] font-black uppercase tracking-tighter hover:underline">Change</button>
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium ml-1 mt-1">
                        Didn&apos;t receive it? Check your spam folder, or{' '}
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          disabled={resendCooldown > 0 || isResending}
                          className="text-[#040457] font-black uppercase tracking-tighter hover:underline disabled:text-gray-300 disabled:cursor-not-allowed"
                        >
                          {isResending ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                        </button>
                      </p>
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full py-6 bg-[#040457] text-white rounded-[1.75rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 mt-8 disabled:opacity-50">
                      {isLoading ? "Verifying..." : "Verify Code"} <ArrowRight size={18} className="text-[#c2f575]" />
                    </button>
                  </form>
                )}

                {step === 'password' && (
                  <form onSubmit={handleFinalizeSignUp} className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] ml-1">Create Access Key</label>
                      <div className="relative group">
                        <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#040457]" size={20} />
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
                      <p className="text-[10px] text-gray-400 font-medium ml-1">
                        Use at least 8 characters with numbers and symbols.
                      </p>
                    </div>

                    <button type="submit" disabled={isLoading} className="w-full py-6 bg-[#040457] text-white rounded-[1.75rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4 mt-8 disabled:opacity-50">
                      {isLoading ? "Finalizing..." : "Initialize Dashboard"} <Sparkles size={18} className="text-[#c2f575]" />
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="mt-16 pt-10 border-t border-gray-100 text-center">
              <p className="text-sm font-medium text-gray-400">
                {isLogin ? "New to the ecosystem?" : "Identity already verified?"}{' '}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setStep('info');
                  }}
                  className="text-[#040457] font-black uppercase text-[10px] tracking-[0.25em] hover:text-[#c2f575] transition-colors ml-2"
                >
                  {isLogin ? 'Create Profile' : 'Sign In'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};

export default Auth;
