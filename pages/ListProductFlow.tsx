
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Clock,
    Briefcase,
    Rocket,
    CheckCircle2,
    Sparkles,
    Calendar,
    MessageSquare,
    Video,
    Target,
    ArrowRight,
    Trash2,
    HelpCircle,
    Info
} from 'lucide-react';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';

const EXPERTISE_OPTIONS = [
    'Software Development', 'Product Management', 'Design', 'Marketing',
    'Finance', 'Law', 'Content & Branding', 'Data Science',
    'Cybersecurity', 'HR', 'Astrology', 'Mental Health', 'Others'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ListProductFlow: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Expertise
    const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
    const [customLink, setCustomLink] = useState('');
    const [bio, setBio] = useState('');
    const [experience, setExperience] = useState<any[]>([]);
    const [education, setEducation] = useState<any[]>([]);

    // Step 2: Availability
    const [schedule, setSchedule] = useState<any[]>(
        DAYS.map(day => ({ day, active: false, slots: [{ id: Date.now().toString(), start: '09:00', end: '17:00' }] }))
    );

    // Step 3: Product Details
    const [productTitle, setProductTitle] = useState('');
    const [productPriceUSD, setProductPriceUSD] = useState('');
    const [productPriceINR, setProductPriceINR] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [productDuration, setProductDuration] = useState('60');
    const [faqs, setFaqs] = useState<{ q: string, a: string }[]>([{ q: '', a: '' }]);

    useEffect(() => {
        if (user) {
            setCustomLink(user.name?.toLowerCase().replace(/\s+/g, '_') || '');
            if (user.onboardingCompleted) {
                setStep(3); // Go straight to product creation if already onboarded
            }
            if (user.expertise) setSelectedExpertise(user.expertise);
            if (user.availability) setSchedule(user.availability);
            if (user.bio) setBio(user.bio);
            if (user.experience) setExperience(user.experience);
            if (user.education) setEducation(user.education);
        }
    }, [user]);



    useEffect(() => {
        if (step === 4 && user?.uid) {
            const timer = setTimeout(() => {
                navigate(`/u/${user.uid}`);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [step, user, navigate]);

    const handleNext = () => {
        if (step === 1) {
            if (!bio.trim()) {
                alert("Please share a short professional bio.");
                return;
            }
            if (experience.length === 0) {
                alert("Please add at least one experience item.");
                return;
            }
            if (education.length === 0) {
                alert("Please add at least one education item.");
                return;
            }
        }
        setStep(prev => prev + 1);
    };
    const handleBack = () => setStep(prev => prev - 1);

    const toggleExpertise = (tag: string) => {
        setSelectedExpertise(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const addExp = () => setExperience([...experience, { title: '', company: '', location: '', startDate: '', endDate: '', description: '' }]);
    const updateExp = (idx: number, field: string, val: string) => {
        const newEx = [...experience];
        newEx[idx] = { ...newEx[idx], [field]: val };
        setExperience(newEx);
    };
    const removeExp = (idx: number) => setExperience(experience.filter((_, i) => i !== idx));

    const addEdu = () => setEducation([...education, { school: '', degree: '', startDate: '', endDate: '', description: '' }]);
    const updateEdu = (idx: number, field: string, val: string) => {
        const newEd = [...education];
        newEd[idx] = { ...newEd[idx], [field]: val };
        setEducation(newEd);
    };
    const removeEdu = (idx: number) => setEducation(education.filter((_, i) => i !== idx));

    const addSlot = (dayIdx: number) => {
        const newSched = [...schedule];
        newSched[dayIdx].slots.push({ id: Date.now().toString(), start: '09:00', end: '17:00' });
        setSchedule(newSched);
    };

    const removeSlot = (dayIdx: number, slotIdx: number) => {
        const newSched = [...schedule];
        if (newSched[dayIdx].slots.length > 1) {
            newSched[dayIdx].slots.splice(slotIdx, 1);
            setSchedule(newSched);
        }
    };

    const updateSlot = (dayIdx: number, slotIdx: number, field: 'start' | 'end', value: string) => {
        const newSched = [...schedule];
        newSched[dayIdx].slots[slotIdx][field] = value;
        setSchedule(newSched);
    };

    const addFaq = () => {
        if (faqs.length < 5) {
            setFaqs([...faqs, { q: '', a: '' }]);
        }
    };

    const updateFaq = (idx: number, field: 'q' | 'a', value: string) => {
        const newFaqs = [...faqs];
        newFaqs[idx][field] = value;
        setFaqs(newFaqs);
    };

    const removeFaq = (idx: number) => {
        setFaqs(faqs.filter((_, i) => i !== idx));
    };

    const handleLaunch = async () => {
        if (!user) return;
        if (!productTitle || !productPriceUSD || !productPriceINR) {
            alert("Please fill in the product title and distinct tier prices (USD and INR).");
            return;
        }
        setIsLoading(true);

        try {
            // 1. Update user profile
            const profileUpdates: any = {
                expertise: selectedExpertise,
                bio: bio.slice(0, 200),
                experience,
                education,
                availability: schedule,
                onboardingCompleted: true
            };

            if (experience.length > 0) {
                profileUpdates.headline = `${experience[0].title} at ${experience[0].company}`;
            }

            await updateDoc(doc(db, 'users', user.uid), profileUpdates);

            // 2. Add product
            await addDoc(collection(db, 'products'), {
                tutorId: user.uid,
                title: productTitle,
                priceUSD: productPriceUSD,
                priceINR: productPriceINR,
                description: productDescription,
                duration: productDuration,
                faqs: faqs.filter(f => f.q && f.a),
                type: 'mentorship',
                createdAt: serverTimestamp()
            });

            setStep(4);
        } catch (error) {
            console.error("Error launching page:", error);
            alert("Something went wrong. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const renderProgressBar = () => (
        <div className="max-w-xl mx-auto mb-16 relative py-4">
            <div className="h-1 bg-gray-100 rounded-full w-full absolute top-1/2 -translate-y-1/2"></div>
            <div
                className="h-1 bg-[#c2f575] rounded-full absolute top-1/2 -translate-y-1/2 transition-all duration-700 shadow-[0_0_15px_rgba(194,245,117,0.5)]"
                style={{ width: `${((step - 1) / 3) * 100}%` }}
            ></div>
            <div className="flex justify-between relative z-10">
                {[1, 2, 3, 4].map((s) => (
                    <div
                        key={s}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${step >= s
                            ? 'bg-[#040457] border-[#c2f575] text-[#c2f575] scale-110 shadow-lg'
                            : 'bg-white border-gray-100 text-gray-300'
                            }`}
                    >
                        {step > s ? <CheckCircle2 size={18} /> : <span className="text-[10px] font-black">{s}</span>}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fbfbfb] py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-12">
                    <button onClick={() => navigate('/workplace')} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-[#040457] transition-all">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="h-8 w-px bg-gray-200 mx-2"></div>
                    <h2 className="text-xl font-black text-[#040457] tracking-tight uppercase tracking-widest text-[12px]">Workplace Setup</h2>
                </div>

                {step < 4 && renderProgressBar()}

                <main className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {step === 1 && (
                        <div className="space-y-12">
                            <div className="text-center space-y-4">
                                <h1 className="text-5xl font-black text-[#040457] tracking-tighter">Hello there!</h1>
                                <p className="text-gray-400 font-medium">In a few moments you will be ready to share your expertise & time</p>
                            </div>

                            <div className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-[0_40px_100px_rgba(0,0,0,0.02)] space-y-10">


                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Your Nunma page link</label>
                                    <div className="flex items-center bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4">
                                        <span className="text-gray-300 font-bold mr-2">nunma.in/</span>
                                        <span className="font-bold text-[#040457]">{customLink}</span>
                                        <div className="ml-auto text-[#c2f575]"><CheckCircle2 size={18} /></div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Select your expertise</label>
                                    <div className="flex flex-wrap gap-3">
                                        {EXPERTISE_OPTIONS.map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => toggleExpertise(opt)}
                                                className={`px-6 py-3 rounded-xl text-[11px] font-bold transition-all border-2 ${selectedExpertise.includes(opt)
                                                    ? 'bg-[#040457] border-[#040457] text-white shadow-lg'
                                                    : 'bg-white border-gray-100 text-gray-400 hover:border-[#c2f575]'
                                                    }`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Professional Bio</label>
                                    <textarea
                                        placeholder="A short professional summary (max 200 chars)..."
                                        maxLength={200}
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-2xl px-6 py-4 font-bold text-[#040457] outline-none transition-all resize-none h-32"
                                    />
                                    <p className="text-[10px] text-gray-400 font-medium ml-2">{bio.length}/200</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Experience</label>
                                        <button onClick={addExp} className="p-3 bg-[#040457] text-[#c2f575] rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                                            <Plus size={14} /> Add Experience
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {experience.map((exp, idx) => (
                                            <div key={idx} className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4 relative group">
                                                <button onClick={() => removeExp(idx)} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <input value={exp.title} onChange={(e) => updateExp(idx, 'title', e.target.value)} placeholder="Job Title" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-[#040457] outline-none" />
                                                    <input value={exp.company} onChange={(e) => updateExp(idx, 'company', e.target.value)} placeholder="Company" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-[#040457] outline-none" />
                                                    <input value={exp.startDate} onChange={(e) => updateExp(idx, 'startDate', e.target.value)} placeholder="Start Date" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-[#040457] outline-none" />
                                                    <input value={exp.endDate} onChange={(e) => updateExp(idx, 'endDate', e.target.value)} placeholder="End Date" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-[#040457] outline-none" />
                                                </div>
                                                <textarea value={exp.description} onChange={(e) => updateExp(idx, 'description', e.target.value)} placeholder="Describe your role..." className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-medium text-gray-500 outline-none resize-none h-24" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Education</label>
                                        <button onClick={addEdu} className="p-3 bg-[#040457] text-[#c2f575] rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                                            <Plus size={14} /> Add Education
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {education.map((edu, idx) => (
                                            <div key={idx} className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4 relative group">
                                                <button onClick={() => removeEdu(idx)} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <input value={edu.school} onChange={(e) => updateEdu(idx, 'school', e.target.value)} placeholder="School/University" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-[#040457] outline-none" />
                                                    <input value={edu.degree} onChange={(e) => updateEdu(idx, 'degree', e.target.value)} placeholder="Degree/Course" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-[#040457] outline-none" />
                                                    <input value={edu.startDate} onChange={(e) => updateEdu(idx, 'startDate', e.target.value)} placeholder="Start Year" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-[#040457] outline-none" />
                                                    <input value={edu.endDate} onChange={(e) => updateEdu(idx, 'endDate', e.target.value)} placeholder="End Year" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-[#040457] outline-none" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-8">
                                <button
                                    onClick={handleNext}
                                    className="bg-[#040457] text-white font-black uppercase text-[12px] tracking-widest px-12 py-5 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                                >
                                    Next step <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-12">
                            <div className="text-center space-y-4">
                                <h1 className="text-5xl font-black text-[#040457] tracking-tighter">Set your availability</h1>
                                <p className="text-gray-400 font-medium">Let your audience know when you're available. You can edit this later.</p>
                            </div>

                            <div className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-[0_40px_100px_rgba(0,0,0,0.02)] space-y-6">
                                {schedule.map((day, dIdx) => (
                                    <div key={day.day} className={`p-8 rounded-[2rem] border transition-all ${day.active ? 'bg-gray-50/50 border-[#c2f575]/20' : 'bg-transparent border-transparent'}`}>
                                        <div className="flex flex-col gap-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-6">
                                                    <button
                                                        onClick={() => {
                                                            const newSched = [...schedule];
                                                            newSched[dIdx].active = !newSched[dIdx].active;
                                                            setSchedule(newSched);
                                                        }}
                                                        className={`w-12 h-6 rounded-full p-1 transition-all ${day.active ? 'bg-[#040457]' : 'bg-gray-200'}`}
                                                    >
                                                        <div className={`w-4 h-4 rounded-full bg-white transition-all ${day.active ? 'translate-x-6' : ''}`}></div>
                                                    </button>
                                                    <span className={`text-lg font-black tracking-tight ${day.active ? 'text-[#040457]' : 'text-gray-300'}`}>{day.day}</span>
                                                </div>

                                                {day.active && (
                                                    <button
                                                        onClick={() => addSlot(dIdx)}
                                                        className="p-2 bg-[#c2f575] text-[#040457] rounded-xl hover:scale-105 transition-all shadow-sm"
                                                    >
                                                        <Plus size={18} strokeWidth={3} />
                                                    </button>
                                                )}
                                            </div>

                                            {day.active ? (
                                                <div className="space-y-4">
                                                    {day.slots.map((slot: any, sIdx: number) => (
                                                        <div key={slot.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-300">
                                                            <div className="flex items-center gap-4 flex-1">
                                                                <input
                                                                    type="time"
                                                                    value={slot.start}
                                                                    className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 font-bold text-[#040457] focus:ring-2 focus:ring-[#c2f575]"
                                                                    onChange={(e) => updateSlot(dIdx, sIdx, 'start', e.target.value)}
                                                                />
                                                                <span className="text-gray-300 font-black">—</span>
                                                                <input
                                                                    type="time"
                                                                    value={slot.end}
                                                                    className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 font-bold text-[#040457] focus:ring-2 focus:ring-[#c2f575]"
                                                                    onChange={(e) => updateSlot(dIdx, sIdx, 'end', e.target.value)}
                                                                />
                                                            </div>
                                                            {day.slots.length > 1 && (
                                                                <button
                                                                    onClick={() => removeSlot(dIdx, sIdx)}
                                                                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-[10px] font-black text-gray-200 uppercase tracking-widest">Mark as available to set slots</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between pt-8">
                                <button onClick={handleBack} className="text-[#040457] font-black uppercase text-[12px] tracking-widest px-8 py-5 flex items-center gap-4">
                                    <ChevronLeft size={20} /> Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="bg-[#040457] text-white font-black uppercase text-[12px] tracking-widest px-12 py-5 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                                >
                                    Next step <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-12">
                            <div className="text-center space-y-4">
                                <h1 className="text-5xl font-black text-[#040457] tracking-tighter">Create your product</h1>
                                <p className="text-gray-400 font-medium">Describe what you are offering to your audience</p>
                            </div>

                            <div className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-[0_40px_100px_rgba(0,0,0,0.02)] space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Product Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 1:1 Career Mentorship"
                                            value={productTitle}
                                            onChange={(e) => setProductTitle(e.target.value)}
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-2xl px-6 py-4 font-bold text-[#040457] outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Price (USD Tier)</label>
                                        <input
                                            type="number" min="0"
                                            placeholder="10"
                                            value={productPriceUSD}
                                            onChange={(e) => setProductPriceUSD(e.target.value)}
                                            className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-2xl px-6 py-4 font-bold text-[#040457] outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Price (INR Tier)</label>
                                    <input
                                        type="number" min="0"
                                        placeholder="500"
                                        value={productPriceINR}
                                        onChange={(e) => setProductPriceINR(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-2xl px-6 py-4 font-bold text-[#040457] outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Duration (Minutes)</label>
                                    <div className="flex flex-wrap gap-4">
                                        {['15', '30', '45', '60', '90'].map(min => (
                                            <button
                                                key={min}
                                                onClick={() => setProductDuration(min)}
                                                className={`px-8 py-4 rounded-xl font-bold transition-all border-2 ${productDuration === min ? 'bg-[#040457] border-[#040457] text-white shadow-lg' : 'bg-gray-50 border-transparent text-gray-400 hover:border-[#c2f575]'}`}
                                            >
                                                {min}m
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Service Description</label>
                                    <textarea
                                        placeholder="Explain what value the user will get out of this session..."
                                        rows={4}
                                        value={productDescription}
                                        onChange={(e) => setProductDescription(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-2xl px-6 py-4 font-bold text-[#040457] outline-none transition-all resize-none"
                                    />
                                </div>

                                <div className="space-y-6 pt-4">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Commonly Asked Questions ({faqs.length}/5)</label>
                                        {faqs.length < 5 && (
                                            <button onClick={addFaq} className="flex items-center gap-2 text-[10px] font-black text-[#c2f575] uppercase tracking-widest bg-[#040457] px-4 py-2 rounded-xl hover:scale-105 transition-all">
                                                <Plus size={14} /> Add FAQ
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-6">
                                        {faqs.map((faq, idx) => (
                                            <div key={idx} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4 relative group">
                                                <div className="flex items-center gap-4">
                                                    <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-[#040457] shadow-sm">{idx + 1}</span>
                                                    <input
                                                        type="text"
                                                        placeholder="Question"
                                                        value={faq.q}
                                                        onChange={(e) => updateFaq(idx, 'q', e.target.value)}
                                                        className="flex-1 bg-transparent border-none font-bold text-[#040457] outline-none"
                                                    />
                                                    {faqs.length > 1 && (
                                                        <button onClick={() => removeFaq(idx)} className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                                <textarea
                                                    placeholder="Answer"
                                                    rows={2}
                                                    value={faq.a}
                                                    onChange={(e) => updateFaq(idx, 'a', e.target.value)}
                                                    className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-medium text-gray-500 outline-none resize-none"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between pt-8">
                                {!user?.onboardingCompleted && (
                                    <button onClick={handleBack} className="text-[#040457] font-black uppercase text-[12px] tracking-widest px-8 py-5 flex items-center gap-4">
                                        <ChevronLeft size={20} /> Back
                                    </button>
                                )}
                                <div className="flex-1"></div>
                                <button
                                    onClick={handleLaunch}
                                    disabled={isLoading}
                                    className="bg-[#c2f575] text-[#040457] font-black uppercase text-[12px] tracking-widest px-12 py-5 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 shadow-[#c2f575]/40"
                                >
                                    {isLoading ? 'Launching...' : <>Launch your page <Rocket size={20} /></>}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="text-center py-20 space-y-12 bg-white rounded-[4rem] border border-gray-50 shadow-2xl animate-in zoom-in-95 duration-1000">
                            <div className="w-32 h-32 bg-[#c2f575] rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl shadow-[#c2f575]/40 animate-bounce">
                                <Rocket size={64} className="text-[#040457]" />
                            </div>
                            <div className="space-y-4">
                                <h1 className="text-6xl font-black text-[#040457] tracking-tighter">Workspace Ready!</h1>
                                <p className="text-xl text-gray-400 font-medium">Your professional profile and product are now live.</p>
                            </div>

                            <div className="flex flex-col items-center gap-6 pt-8">
                                <button
                                    onClick={() => navigate('/workplace')}
                                    className="bg-[#040457] text-white font-black uppercase text-[12px] tracking-widest px-16 py-6 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                                >
                                    Go to Workplace <ArrowRight size={20} />
                                </button>
                                <button
                                    onClick={() => navigate(`/u/${user?.uid}`)}
                                    className="text-gray-400 font-black uppercase text-[10px] tracking-widest hover:text-[#040457] transition-all"
                                >
                                    View Public Profile
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default ListProductFlow;
