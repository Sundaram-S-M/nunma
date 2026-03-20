import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Confetti from 'react-confetti';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { BookOpen, GraduationCap, ChevronRight, CheckCircle2, ShieldCheck, ArrowRight, X } from 'lucide-react';

// Zod Schemas
const studentSchema = z.object({
    phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
    educationLevel: z.string().min(1, "Please select an education level"),
    primaryInterests: z.array(z.string()).min(1, "Please select at least one interest"),
});

const tutorSchema = z.object({
    phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
    businessType: z.enum(["individual", "registered"]),
    legalName: z.string().min(2, "Legal name must be at least 2 characters"),
    expertise: z.array(z.string()).max(3, "Maximum 3 areas of expertise allowed"),
    academyName: z.string().min(1, "Academy name is required"),
    payoutInfo: z.object({
        accountHolderName: z.string().min(1, "Account holder name is required"),
        bankIdentifier: z.string().min(1, "Bank identifier is required"),
    }),
});

type StudentFormValues = z.infer<typeof studentSchema>;
type TutorFormValues = z.infer<typeof tutorSchema>;

const OnboardingSystem: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const requestedRole = searchParams.get('role');
    const { user, updateProfile, toggleRole } = useAuth();

    const [step, setStep] = useState<number>(requestedRole ? 2 : 1);
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(
        requestedRole === 'tutor' ? UserRole.TUTOR :
            requestedRole === 'student' ? UserRole.STUDENT :
                (user?.role || null)
    );
    const [showConfetti, setShowConfetti] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tagInput, setTagInput] = useState('');

    // Define forms
    const studentForm = useForm<StudentFormValues>({
        resolver: zodResolver(studentSchema),
        defaultValues: {
            phoneNumber: '',
            educationLevel: '',
            primaryInterests: [],
        }
    });

    const tutorForm = useForm<TutorFormValues>({
        resolver: zodResolver(tutorSchema),
        defaultValues: {
            phoneNumber: '',
            businessType: 'individual',
            legalName: '',
            expertise: [],
            academyName: '',
            payoutInfo: {
                accountHolderName: '',
                bankIdentifier: '',
            }
        }
    });

    useEffect(() => {
        // If we have a user and they've requested a specific role, ensure their profile matches
        if (requestedRole && user) {
            const targetRole = requestedRole.toUpperCase() as UserRole;
            if (user.role !== targetRole) {
                setSelectedRole(targetRole);
            }
        }
    }, [requestedRole, user]);

    const onSelectRole = async (role: UserRole) => {
        setSelectedRole(role);
        if (user?.role !== role) {
            await updateProfile({ role });
        }
        setStep(2);
    };

    const onSubmitStudent = async (data: StudentFormValues) => {
        setIsSubmitting(true);
        try {
            await updateProfile({
                studentProfile: {
                    isComplete: true,
                    ...data
                }
            });
            setShowConfetti(true);
            toast.success("Welcome to Nunma, Mana.", {
                icon: '🎓',
                style: { borderRadius: '10px', background: '#333', color: '#fff' }
            });
            setTimeout(() => {
                navigate('/explore');
            }, 3000);
        } catch (err) {
            toast.error('Failed to complete onboarding. Please try again.');
            setIsSubmitting(false);
        }
    };

    const onSubmitTutor = async (data: TutorFormValues) => {
        setIsSubmitting(true);
        try {
            await updateProfile({
                tutorProfile: {
                    isComplete: true,
                    phoneNumber: data.phoneNumber,
                    academyName: data.academyName,
                    payoutInfo: data.payoutInfo,
                },
                taxDetails: {
                    businessType: data.businessType,
                    legalName: data.legalName,
                },
                expertise: data.expertise
            });
            
            toast.loading("Initiating Razorpay Verification...", { id: 'rzp' });
            const { httpsCallable } = await import('firebase/functions');
            const { functions } = await import('../utils/firebase');
            
            const initAccount = httpsCallable<{businessType: string, legalName: string}, {onboardingUrl: string}>(functions, 'createTutorLinkedAccount');
            const res = await initAccount({ businessType: data.businessType, legalName: data.legalName });
            
            if (res.data?.onboardingUrl) {
                toast.success("Redirecting to Razorpay...", { id: 'rzp' });
                window.location.href = res.data.onboardingUrl;
            } else {
                toast.dismiss('rzp');
                toast.error("Account created, but no onboarding URL returned.");
                navigate('/workplace');
            }
        } catch (err) {
            toast.dismiss('rzp');
            toast.error('Failed to complete onboarding. Please try again.');
            setIsSubmitting(false);
        }
    };

    if (!user) return null;

    return (
        <div className="relative min-h-[100dvh] bg-[#fbfbfb] flex flex-col items-center justify-center p-4 selection:bg-[#c2f575] selection:text-[#040457]">
            <Toaster position="top-center" />
            {showConfetti && <Confetti recycle={false} numberOfPieces={500} />}

            {/* Top Left Branding */}
            <div className="absolute top-8 left-8 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#040457] rounded-xl flex items-center justify-center shadow-lg">
                    <img src="/assets/logo-icon.png" alt="Logo" className="w-6 h-6 object-contain filter brightness-0 invert" />
                </div>
                <span className="text-xl font-black tracking-tighter text-[#040457]">nunma</span>
            </div>

            <div className="w-full max-w-2xl bg-white border border-gray-100 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] p-8 md:p-12 animate-in fade-in zoom-in-95 duration-700">

                {/* Step 1: Role Selector */}
                {step === 1 && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-500">
                        <div className="text-center space-y-4">
                            <div className="inline-flex items-center gap-2 bg-[#c2f575]/20 text-[#040457] text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-2">
                                <span className="w-2 h-2 rounded-full bg-[#040457] animate-pulse"></span>
                                Ecosystem Initialization
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-[#040457] tracking-tight">Choose your path.</h1>
                            <p className="text-gray-500 text-lg">Select how you want to interact within the Nunma network today.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <button
                                onClick={() => onSelectRole(UserRole.STUDENT)}
                                className="group relative flex flex-col items-start p-8 rounded-[2rem] border-2 border-transparent bg-gray-50 hover:bg-white hover:border-[#c2f575] hover:shadow-2xl hover:shadow-[#c2f575]/20 hover:-translate-y-1 transition-all text-left overflow-hidden z-10"
                            >
                                <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#c2f575]/30 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 -z-10"></div>
                                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 text-[#040457]">
                                    <BookOpen strokeWidth={2.5} size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-[#040457] mb-2 tracking-tight group-hover:text-[#040457] transition-colors">I want to Learn</h3>
                                <p className="text-gray-500 font-medium">Join as a <span className="text-[#040457] font-black">Mana</span> and connect with world-class experts.</p>
                                <div className="mt-8 flex items-center gap-2 text-[#040457] font-bold text-sm tracking-widest uppercase opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                    Select Mana <ArrowRight size={16} />
                                </div>
                            </button>

                            <button
                                onClick={() => onSelectRole(UserRole.TUTOR)}
                                className="group relative flex flex-col items-start p-8 rounded-[2rem] border-2 border-transparent bg-[#040457] hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#040457]/40 transition-all text-left overflow-hidden z-10"
                            >
                                <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700 -z-10"></div>
                                <div className="w-16 h-16 bg-[#c2f575] rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 text-[#040457]">
                                    <GraduationCap strokeWidth={2.5} size={32} />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2 tracking-tight group-hover:text-[#c2f575] transition-colors">I want to Teach</h3>
                                <p className="text-indigo-200 font-medium">Join as a <span className="text-white font-black">Thala</span> and build your digital academy.</p>
                                <div className="mt-8 flex items-center gap-2 text-[#c2f575] font-bold text-sm tracking-widest uppercase opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                                    Select Thala <ArrowRight size={16} />
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Student Form */}
                {step === 2 && selectedRole === UserRole.STUDENT && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <div className="mb-10 flex items-start justify-between">
                            <div>
                                <h2 className="text-3xl font-black text-[#040457] tracking-tight mb-2">Mana Profile</h2>
                                <p className="text-gray-500">Complete your profile to discover personalized content.</p>
                            </div>
                            <div className="w-12 h-12 bg-[#c2f575]/20 rounded-xl flex items-center justify-center text-[#040457]">
                                <BookOpen size={24} />
                            </div>
                        </div>

                        <form onSubmit={studentForm.handleSubmit(onSubmitStudent)} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Phone Number</label>
                                <input
                                    type="text"
                                    maxLength={10}
                                    placeholder="10-digit number"
                                    {...studentForm.register('phoneNumber')}
                                    className={`w-full bg-gray-50 border-2 focus:bg-white rounded-[1.25rem] px-5 py-4 font-bold text-[#040457] outline-none transition-all ${studentForm.formState.errors.phoneNumber ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-[#c2f575]'}`}
                                />
                                {studentForm.formState.errors.phoneNumber && (
                                    <p className="text-red-500 text-xs font-bold pl-2">{studentForm.formState.errors.phoneNumber.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Education Level</label>
                                <select
                                    {...studentForm.register('educationLevel')}
                                    className={`w-full bg-gray-50 border-2 focus:bg-white rounded-[1.25rem] px-5 py-4 font-bold text-[#040457] outline-none transition-all appearance-none cursor-pointer ${studentForm.formState.errors.educationLevel ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-[#c2f575]'}`}
                                >
                                    <option value="" disabled>Select your level</option>
                                    <option value="K-12">K-12 Schooling</option>
                                    <option value="College">College / University</option>
                                    <option value="Working Professional">Working Professional</option>
                                    <option value="Lifelong Learner">Lifelong Learner</option>
                                </select>
                                {studentForm.formState.errors.educationLevel && (
                                    <p className="text-red-500 text-xs font-bold pl-2">{studentForm.formState.errors.educationLevel.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Primary Interests</label>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    {['Coding', 'Math', 'Languages', 'Design', 'Business', 'Science'].map((interest) => (
                                        <label key={interest} className="relative cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                value={interest}
                                                className="peer sr-only"
                                                {...studentForm.register('primaryInterests')}
                                            />
                                            <div className="py-3 px-4 text-center rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-500 font-bold text-sm transition-all peer-checked:bg-[#c2f575] peer-checked:border-[#c2f575] peer-checked:text-[#040457]">
                                                {interest}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {studentForm.formState.errors.primaryInterests && (
                                    <p className="text-red-500 text-xs font-bold pl-2">{studentForm.formState.errors.primaryInterests.message}</p>
                                )}
                            </div>

                            <div className="pt-6 mt-6 flex gap-4 border-t border-gray-100">
                                {!requestedRole && (
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-shrink-0 px-6 py-4 rounded-2xl bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-colors"
                                    >
                                        Back
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-4 bg-[#040457] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#040457]/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#040457]/40 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:filter-none disabled:transform-none"
                                >
                                    {isSubmitting ? 'Finalizing Profile...' : 'Complete Profile'} <CheckCircle2 size={20} className="text-[#c2f575]" />
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Step 2: Tutor Form */}
                {step === 2 && selectedRole === UserRole.TUTOR && (
                    <div className="animate-in slide-in-from-right-8 duration-500">
                        <div className="mb-8 flex items-start justify-between">
                            <div>
                                <h2 className="text-3xl font-black text-[#040457] tracking-tight mb-2">Thala Profile</h2>
                                <p className="text-gray-500">Set up your academy and payout details to get started.</p>
                            </div>
                            <div className="w-12 h-12 bg-[#040457] rounded-xl flex items-center justify-center text-[#c2f575]">
                                <GraduationCap size={24} />
                            </div>
                        </div>

                        <form onSubmit={tutorForm.handleSubmit(onSubmitTutor)} className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Business Type</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className={`cursor-pointer border-2 rounded-2xl p-4 flex items-center gap-3 transition-all ${tutorForm.watch("businessType") === "individual" ? "border-[#c2f575] bg-[#c2f575]/10" : "border-gray-100 bg-white hover:border-gray-200"}`}>
                                        <input type="radio" value="individual" {...tutorForm.register("businessType")} className="w-5 h-5 text-[#040457] border-gray-300 focus:ring-[#c2f575]" />
                                        <span className="font-bold text-[#040457] text-sm">Individual Tutor (PAN)</span>
                                    </label>
                                    <label className={`cursor-pointer border-2 rounded-2xl p-4 flex items-center gap-3 transition-all ${tutorForm.watch("businessType") === "registered" ? "border-[#c2f575] bg-[#c2f575]/10" : "border-gray-100 bg-white hover:border-gray-200"}`}>
                                        <input type="radio" value="registered" {...tutorForm.register("businessType")} className="w-5 h-5 text-[#040457] border-gray-300 focus:ring-[#c2f575]" />
                                        <span className="font-bold text-[#040457] text-sm">Registered Academy (GST)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Academy Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Meta Scholars"
                                        {...tutorForm.register('academyName')}
                                        className={`w-full bg-gray-50 border-2 focus:bg-white rounded-[1.25rem] px-5 py-4 font-bold text-[#040457] outline-none transition-all ${tutorForm.formState.errors.academyName ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-[#c2f575]'}`}
                                    />
                                    {tutorForm.formState.errors.academyName && <p className="text-red-500 text-xs font-bold pl-2">{tutorForm.formState.errors.academyName.message}</p>}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">
                                        {tutorForm.watch("businessType") === "individual" ? "Full Name (As per PAN)" : "Registered Business Name (As per GST)"}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Legal Name"
                                        {...tutorForm.register('legalName')}
                                        className={`w-full bg-gray-50 border-2 focus:bg-white rounded-[1.25rem] px-5 py-4 font-bold text-[#040457] outline-none transition-all ${tutorForm.formState.errors.legalName ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-[#c2f575]'}`}
                                    />
                                    {tutorForm.formState.errors.legalName && <p className="text-red-500 text-xs font-bold pl-2">{tutorForm.formState.errors.legalName.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Areas of Expertise (Max 3)</label>
                                <div className={`flex flex-wrap items-center gap-2 w-full bg-gray-50 border-2 focus-within:bg-white rounded-[1.25rem] px-4 py-3 min-h-[60px] transition-all ${tutorForm.formState.errors.expertise ? 'border-red-400' : 'border-transparent focus-within:border-[#c2f575]'}`}>
                                    {tutorForm.watch("expertise").map((tag, i) => (
                                        <div key={i} className="flex items-center gap-1 bg-[#040457] text-white px-3 py-1.5 rounded-full text-xs font-bold">
                                            {tag}
                                            <button type="button" onClick={() => {
                                                const current = tutorForm.getValues("expertise");
                                                tutorForm.setValue("expertise", current.filter((_, idx) => idx !== i));
                                            }} className="hover:text-red-400"><X size={14}/></button>
                                        </div>
                                    ))}
                                    {tutorForm.watch("expertise").length < 3 && (
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if(e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (tagInput.trim()) {
                                                        const current = tutorForm.getValues("expertise");
                                                        if (current.length < 3 && !current.includes(tagInput.trim())) {
                                                            tutorForm.setValue("expertise", [...current, tagInput.trim()]);
                                                            setTagInput('');
                                                        }
                                                    }
                                                }
                                            }}
                                            placeholder={tutorForm.watch("expertise").length === 0 ? "Type and press Enter (e.g. Calculus)" : "Add another..."}
                                            className="flex-1 bg-transparent min-w-[150px] outline-none text-[#040457] font-bold text-sm"
                                        />
                                    )}
                                </div>
                                {tutorForm.formState.errors.expertise && <p className="text-red-500 text-xs font-bold pl-2">{tutorForm.formState.errors.expertise.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Phone Number</label>
                                <input
                                    type="text"
                                    maxLength={10}
                                    placeholder="10-digit number"
                                    {...tutorForm.register('phoneNumber')}
                                    className={`w-full bg-gray-50 border-2 focus:bg-white rounded-[1.25rem] px-5 py-4 font-bold text-[#040457] outline-none transition-all ${tutorForm.formState.errors.phoneNumber ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-[#c2f575]'}`}
                                />
                                {tutorForm.formState.errors.phoneNumber && <p className="text-red-500 text-xs font-bold pl-2">{tutorForm.formState.errors.phoneNumber.message}</p>}
                            </div>

                            <div className="bg-[#fcfdfa] border-2 border-[#c2f575]/30 rounded-3xl p-6 relative overflow-hidden">
                                <div className="absolute right-0 top-0 w-32 h-32 bg-[#c2f575]/20 blur-3xl rounded-full"></div>
                                <div className="flex items-center gap-3 mb-6 relative z-10">
                                    <ShieldCheck className="text-[#040457]" size={24} />
                                    <div>
                                        <h4 className="font-black text-[#040457] text-lg">Payout Details</h4>
                                        <p className="text-xs text-gray-500 font-medium">We need this to securely process your earnings.</p>
                                    </div>
                                </div>

                                <div className="space-y-5 relative z-10">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Account Holder Name</label>
                                        <input
                                            type="text"
                                            placeholder="Name exactly as on bank account"
                                            {...tutorForm.register('payoutInfo.accountHolderName')}
                                            className={`w-full bg-white border-2 focus:bg-white rounded-xl px-4 py-3 font-bold text-[#040457] outline-none transition-all ${tutorForm.formState.errors.payoutInfo?.accountHolderName ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-[#040457]'}`}
                                        />
                                        {tutorForm.formState.errors.payoutInfo?.accountHolderName && <p className="text-red-500 text-xs font-bold pl-2">{tutorForm.formState.errors.payoutInfo.accountHolderName.message}</p>}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Bank Identifier / IFSC</label>
                                        <input
                                            type="text"
                                            placeholder="Bank routing code"
                                            {...tutorForm.register('payoutInfo.bankIdentifier')}
                                            className={`w-full bg-white border-2 focus:bg-white rounded-xl px-4 py-3 font-bold text-[#040457] outline-none transition-all ${tutorForm.formState.errors.payoutInfo?.bankIdentifier ? 'border-red-400 focus:border-red-400' : 'border-transparent focus:border-[#040457]'}`}
                                        />
                                        {tutorForm.formState.errors.payoutInfo?.bankIdentifier && <p className="text-red-500 text-xs font-bold pl-2">{tutorForm.formState.errors.payoutInfo.bankIdentifier.message}</p>}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 mt-6 flex gap-4">
                                {!requestedRole && (
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex-shrink-0 px-6 py-4 rounded-2xl bg-gray-100 text-gray-500 font-bold hover:bg-gray-200 transition-colors"
                                    >
                                        Back
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-4 bg-[#c2f575] text-[#040457] border-2 border-transparent focus:border-[#040457] rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#c2f575]/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#c2f575]/40 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:transform-none"
                                >
                                    {isSubmitting ? 'Creating Academy...' : 'Launch Academy'} <ChevronRight size={20} strokeWidth={3} />
                                </button>
                            </div>
                        </form>
                    </div>
                )}

            </div>
        </div>
    );
};

export default OnboardingSystem;
