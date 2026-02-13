
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    X,
    Clock,
    Briefcase,
    Linkedin,
    Rocket,
    CheckCircle2,
    Sparkles,
    Calendar,
    MessageSquare,
    Video,
    Target,
    ArrowRight
} from 'lucide-react';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';

const EXPERTISE_OPTIONS = [
    'Software Development', 'Product Management', 'Design', 'Marketing',
    'Finance', 'Law', 'Content & Branding', 'Data Science',
    'Cybersecurity', 'HR', 'Astrology', 'Mental Health', 'Others'
];

const SUGGESTED_SERVICES = [
    { id: 'quick-chat', title: 'Quick chat', icon: <MessageSquare size={18} /> },
    { id: '1-1-consult', title: '1:1 Consultation', icon: <Video size={18} /> },
    { id: 'mentorship', title: '1:1 Mentorship', icon: <Target size={18} /> },
    { id: 'doubt-session', title: 'Doubt session', icon: <Sparkles size={18} /> },
    { id: 'discovery-call', title: 'Discovery Call', icon: <ArrowRight size={18} /> },
    { id: 'linkedin-branding', title: 'LinkedIn branding', icon: <Linkedin size={18} /> },
    { id: 'content-creation', title: 'Content creation', icon: <Plus size={18} /> }
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ListProductFlow: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Step 1: Expertise & LinkedIn
    const [linkedinId, setLinkedinId] = useState('');
    const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
    const [customLink, setCustomLink] = useState('');

    // Step 2: Availability
    const [schedule, setSchedule] = useState<any[]>(
        DAYS.map(day => ({ day, active: false, slots: [{ id: '1', start: '09:00', end: '17:00' }] }))
    );

    // Step 3: Services
    const [selectedServices, setSelectedServices] = useState<string[]>([]);

    useEffect(() => {
        if (user) {
            setCustomLink(user.name?.toLowerCase().replace(/\s+/g, '_') || '');
        }
    }, [user]);

    const handleNext = () => setStep(prev => prev + 1);
    const handleBack = () => setStep(prev => prev - 1);

    const toggleExpertise = (tag: string) => {
        setSelectedExpertise(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const toggleService = (id: string) => {
        setSelectedServices(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleLaunch = async () => {
        if (!user) return;
        setIsLoading(true);

        try {
            // 1. Update user profile with expertise and LinkedIn
            await updateDoc(doc(db, 'users', user.uid), {
                expertise: selectedExpertise,
                linkedin: linkedinId,
                availability: schedule,
                onboardingCompleted: true
            });

            // 2. Add selected services as products
            for (const serviceId of selectedServices) {
                const service = SUGGESTED_SERVICES.find(s => s.id === serviceId);
                if (service) {
                    await addDoc(collection(db, 'products'), {
                        tutorId: user.uid,
                        title: service.title,
                        type: 'service',
                        price: '500', // Default price
                        currency: 'INR',
                        createdAt: serverTimestamp()
                    });
                }
            }

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

                {renderProgressBar()}

                <main className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {step === 1 && (
                        <div className="space-y-12">
                            <div className="text-center space-y-4">
                                <h1 className="text-5xl font-black text-[#040457] tracking-tighter">Hello there!</h1>
                                <p className="text-gray-400 font-medium">In a few moments you will be ready to share your expertise & time</p>
                            </div>

                            <div className="bg-white p-12 rounded-[3.5rem] border border-gray-100 shadow-[0_40px_100px_rgba(0,0,0,0.02)] space-y-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                                        <Linkedin size={14} className="text-[#0077B5]" /> Connect your LinkedIn
                                    </label>
                                    <div className="flex items-center bg-gray-50 border-2 border-transparent focus-within:border-[#c2f575] focus-within:bg-white rounded-2xl px-6 py-4 transition-all group">
                                        <span className="text-gray-300 font-bold mr-2">linkedin.com/in/</span>
                                        <input
                                            type="text"
                                            placeholder="username"
                                            value={linkedinId}
                                            onChange={(e) => setLinkedinId(e.target.value)}
                                            className="flex-1 bg-transparent font-bold text-[#040457] outline-none placeholder:text-gray-200"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Your Nunma page link</label>
                                    <div className="flex items-center bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4 opacity-60">
                                        <span className="text-gray-300 font-bold mr-2">nunma.io/</span>
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
                                {schedule.map((day, idx) => (
                                    <div key={day.day} className={`p-6 rounded-[2rem] border transition-all ${day.active ? 'bg-gray-50/50 border-[#c2f575]/20' : 'bg-transparent border-transparent'}`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-6">
                                                <button
                                                    onClick={() => {
                                                        const newSched = [...schedule];
                                                        newSched[idx].active = !newSched[idx].active;
                                                        setSchedule(newSched);
                                                    }}
                                                    className={`w-12 h-6 rounded-full p-1 transition-all ${day.active ? 'bg-[#040457]' : 'bg-gray-200'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded-full bg-white transition-all ${day.active ? 'translate-x-6' : ''}`}></div>
                                                </button>
                                                <span className={`text-lg font-black tracking-tight ${day.active ? 'text-[#040457]' : 'text-gray-300'}`}>{day.day}</span>
                                            </div>

                                            {day.active ? (
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="time"
                                                        value={day.slots[0].start}
                                                        className="bg-white border border-gray-100 rounded-xl px-4 py-2 font-bold text-[#040457] outline-none"
                                                        onChange={(e) => {
                                                            const newSched = [...schedule];
                                                            newSched[idx].slots[0].start = e.target.value;
                                                            setSchedule(newSched);
                                                        }}
                                                    />
                                                    <span className="text-gray-300 font-black">—</span>
                                                    <input
                                                        type="time"
                                                        value={day.slots[0].end}
                                                        className="bg-white border border-gray-100 rounded-xl px-4 py-2 font-bold text-[#040457] outline-none"
                                                        onChange={(e) => {
                                                            const newSched = [...schedule];
                                                            newSched[idx].slots[0].end = e.target.value;
                                                            setSchedule(newSched);
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black text-gray-200 uppercase tracking-widest">Unavailable</span>
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
                                <h1 className="text-5xl font-black text-[#040457] tracking-tighter">Add some services</h1>
                                <p className="text-gray-400 font-medium">We'll help you get set up based on your expertise</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {SUGGESTED_SERVICES.map(service => (
                                    <button
                                        key={service.id}
                                        onClick={() => toggleService(service.id)}
                                        className={`p-8 rounded-[2.5rem] border-2 text-left transition-all flex items-center gap-6 group ${selectedServices.includes(service.id)
                                            ? 'bg-[#040457] border-[#040457] text-white shadow-xl translate-y-[-4px]'
                                            : 'bg-white border-gray-50 text-[#040457] hover:border-[#c2f575]'
                                            }`}
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${selectedServices.includes(service.id) ? 'bg-white/20 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-[#c2f575]/20 group-hover:text-[#040457]'
                                            }`}>
                                            {service.icon}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xl font-black tracking-tight">{service.title}</h4>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${selectedServices.includes(service.id) ? 'text-white/60' : 'text-gray-300'
                                                }`}>Professional Service</p>
                                        </div>
                                        {selectedServices.includes(service.id) && <CheckCircle2 size={24} className="text-[#c2f575]" />}
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-between pt-8">
                                <button onClick={handleBack} className="text-[#040457] font-black uppercase text-[12px] tracking-widest px-8 py-5 flex items-center gap-4">
                                    <ChevronLeft size={20} /> Back
                                </button>
                                <button
                                    onClick={handleLaunch}
                                    disabled={isLoading}
                                    className="bg-[#c2f575] text-[#040457] font-black uppercase text-[12px] tracking-widest px-12 py-5 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 shadow-[#c2f575]/40"
                                >
                                    {isLoading ? 'Creating Workplace...' : <>Launch your page <Rocket size={20} /></>}
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
                                <p className="text-xl text-gray-400 font-medium">Your professional profile and services are now live.</p>
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
