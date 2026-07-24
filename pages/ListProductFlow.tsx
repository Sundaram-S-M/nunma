import React, { useState, useEffect, useRef } from 'react';
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
    Info,
    File as FileIcon,
    Upload,
    DollarSign,
    IndianRupee,
    Euro
} from 'lucide-react';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';
import { getAuth } from 'firebase/auth';

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
    const [productType, setProductType] = useState<'mentorship' | 'material'>('mentorship');
    const [productTitle, setProductTitle] = useState('');
    const [zonePrice, setZonePrice] = useState('');
    const [zoneCurrency, setZoneCurrency] = useState<'USD' | 'INR' | 'EUR'>('INR');
    const [productDescription, setProductDescription] = useState('');
    const [productDuration, setProductDuration] = useState('60');
    const [faqs, setFaqs] = useState<{ q: string, a: string }[]>([{ q: '', a: '' }]);
    const [file, setFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) validateAndSetFile(e.dataTransfer.files[0]);
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) validateAndSetFile(e.target.files[0]);
    };
    const validateAndSetFile = (selectedFile: File) => {
        const isValid = ['.pdf', '.doc', '.docx', '.zip', '.xls', '.xlsx'].some(ext => selectedFile.name.toLowerCase().endsWith(ext));
        if (!isValid) { alert('Invalid file. Use PDF, DOC, DOCX, XLS, XLSX or ZIP.'); return; }
        setFile(selectedFile);
    };

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
        if (!productTitle || !zonePrice) {
            alert("Please fill in the product title and price.");
            return;
        }

        if (productType === 'material') {
            if (!file) {
                alert("Please upload a file for your material.");
                return;
            }

            const usedBytes = (user as any)?.usedStorageBytes || (user as any)?.storage_used_bytes || user?.subscription_entitlements?.storageUsed || 0;
            const limitBytes = user?.subscription_entitlements?.storageLimit || 3221225472; // Default 3GB
            
            if (usedBytes + file.size > limitBytes) {
                if (window.confirm("This file exceeds your current plan's storage limit. Please upgrade your plan to continue uploading. Click OK to view plans.")) {
                    navigate('/settings/pricing');
                }
                return;
            }
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

            // 2. Handle File Upload if Material
            let uploadedFileUrl = '';
            let uploadedFileSize = 0;

            if (productType === 'material' && file) {
                const idToken = await getAuth().currentUser?.getIdToken();
                const formData = new FormData();
                formData.append('file', file);
                formData.append('folder', `users/${user.uid}/materials`);

                const region = 'us-central1';
                const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
                const uploadUrl = `https://${region}-${projectId}.cloudfunctions.net/uploadFileToBunny`;

                const xhr = new XMLHttpRequest();
                
                await new Promise((resolve, reject) => {
                    xhr.open('POST', uploadUrl, true);
                    xhr.setRequestHeader('Authorization', `Bearer ${idToken}`);

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            setUploadProgress((event.loaded / event.total) * 100);
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status === 200) {
                            try {
                                const response = JSON.parse(xhr.responseText);
                                uploadedFileUrl = response.fileUrl;
                                uploadedFileSize = response.size || file.size;
                                resolve(true);
                            } catch (err) {
                                reject('Failed to parse final upload response.');
                            }
                        } else {
                            reject(`Upload failed with status ${xhr.status}`);
                        }
                    };

                    xhr.onerror = () => reject('Network error during upload.');
                    xhr.send(formData);
                });
            }

            // 3. Add product
            const productData: any = {
                tutorId: user.uid,
                title: productTitle,
                price: zonePrice,
                currency: zoneCurrency,
                description: productDescription,
                type: productType,
                createdAt: serverTimestamp()
            };

            if (productType === 'mentorship') {
                productData.duration = productDuration;
                productData.faqs = faqs.filter(f => f.q && f.a);
            } else if (productType === 'material') {
                productData.fileUrl = uploadedFileUrl;
                productData.fileSize = uploadedFileSize;
                productData.fileName = file?.name;
            }

            await addDoc(collection(db, 'products'), productData);

            navigate('/workplace');
        } catch (error) {
            console.error("Error launching page:", error);
            alert(typeof error === 'string' ? error : "Something went wrong. Please try again.");
            setIsLoading(false);
        }
    };

    const renderProgressBar = () => (
        <div className="max-w-xl mx-auto mb-16 relative py-4">
            <div className="h-1 bg-gray-100 rounded-full w-full absolute top-1/2 -translate-y-1/2"></div>
            <div
                className="h-1 bg-[#c2f575] rounded-full absolute top-1/2 -translate-y-1/2 transition-all duration-700 shadow-[0_0_15px_rgba(194,245,117,0.5)]"
                style={{ width: `${((step - 1) / 2) * 100}%` }}
            ></div>
            <div className="flex justify-between relative z-10">
                {[1, 2, 3].map((s) => (
                    <div
                        key={s}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-4 ${step >= s
                            ? 'bg-nunma-forest border-[#c2f575] text-[#c2f575] scale-110 shadow-lg'
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
        <div className="min-h-screen bg-[#fbfbfb] py-6 md:py-12 px-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-12">
                    <button onClick={() => navigate('/workplace')} className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-nunma-forest transition-all">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="h-8 w-px bg-gray-200 mx-2"></div>
                    <h2 className="text-xl font-black text-nunma-forest tracking-tight uppercase tracking-widest text-[12px]">Workplace Setup</h2>
                </div>

                {renderProgressBar()}

                <main className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {step === 1 && (
                        <div className="space-y-12">
                            <div className="text-center space-y-4">
                                <h1 className="text-4xl md:text-5xl font-black text-nunma-forest tracking-tighter">Hello there!</h1>
                                <p className="text-gray-400 font-medium">In a few moments you will be ready to share your expertise & time</p>
                            </div>

                            <div className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-gray-100 shadow-[0_40px_100px_rgba(0,0,0,0.02)] space-y-10">


                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Your Nunma page link</label>
                                    <div className="flex items-center bg-gray-50 border-2 border-transparent rounded-2xl px-6 py-4">
                                        <span className="text-gray-300 font-bold mr-2">nunma.in/</span>
                                        <span className="font-bold text-nunma-forest">{customLink}</span>
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
                                                    ? 'bg-nunma-forest border-nunma-forest text-white shadow-lg'
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
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none transition-all resize-none h-32"
                                    />
                                    <p className="text-[10px] text-gray-400 font-medium ml-2">{bio.length}/200</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Experience</label>
                                        <button onClick={addExp} className="p-3 bg-nunma-forest text-[#c2f575] rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                                            <Plus size={14} /> Add Experience
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {experience.map((exp, idx) => (
                                            <div key={idx} className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4 relative group">
                                                <button onClick={() => removeExp(idx)} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <input value={exp.title} onChange={(e) => updateExp(idx, 'title', e.target.value)} placeholder="Job Title" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-nunma-forest outline-none" />
                                                    <input value={exp.company} onChange={(e) => updateExp(idx, 'company', e.target.value)} placeholder="Company" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-nunma-forest outline-none" />
                                                    <input type="text" onFocus={(e) => e.target.type = 'date'} onBlur={(e) => e.target.type = e.target.value ? 'date' : 'text'} value={exp.startDate} onChange={(e) => updateExp(idx, 'startDate', e.target.value)} placeholder="Start Date" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-nunma-forest outline-none w-full" />
                                                    <div className="flex flex-col gap-2 w-full">
                                                        <input type="text" onFocus={(e) => { if (exp.endDate !== 'Present') e.target.type = 'date' }} onBlur={(e) => e.target.type = (e.target.value && e.target.value !== 'Present') ? 'date' : 'text'} value={exp.endDate === 'Present' ? '' : exp.endDate} disabled={exp.endDate === 'Present'} onChange={(e) => updateExp(idx, 'endDate', e.target.value)} placeholder="End Date" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-nunma-forest outline-none w-full disabled:opacity-50 disabled:cursor-not-allowed" />
                                                        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-400 cursor-pointer ml-1">
                                                            <input type="checkbox" checked={exp.endDate === 'Present'} onChange={(e) => updateExp(idx, 'endDate', e.target.checked ? 'Present' : '')} className="accent-[#052E16] w-3 h-3" />
                                                            Present
                                                        </label>
                                                    </div>
                                                </div>
                                                <textarea value={exp.description} onChange={(e) => updateExp(idx, 'description', e.target.value)} placeholder="Describe your role..." className="w-full bg-white border-none rounded-xl px-4 py-3 text-sm font-medium text-gray-500 outline-none resize-none h-24" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Education</label>
                                        <button onClick={addEdu} className="p-3 bg-nunma-forest text-[#c2f575] rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                                            <Plus size={14} /> Add Education
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        {education.map((edu, idx) => (
                                            <div key={idx} className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4 relative group">
                                                <button onClick={() => removeEdu(idx)} className="absolute top-6 right-6 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <input value={edu.school} onChange={(e) => updateEdu(idx, 'school', e.target.value)} placeholder="School/University" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-nunma-forest outline-none" />
                                                    <input value={edu.degree} onChange={(e) => updateEdu(idx, 'degree', e.target.value)} placeholder="Degree/Course" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-nunma-forest outline-none" />
                                                    <input type="text" onFocus={(e) => e.target.type = 'date'} onBlur={(e) => e.target.type = e.target.value ? 'date' : 'text'} value={edu.startDate} onChange={(e) => updateEdu(idx, 'startDate', e.target.value)} placeholder="Start Date" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-nunma-forest outline-none w-full" />
                                                    <input type="text" onFocus={(e) => e.target.type = 'date'} onBlur={(e) => e.target.type = e.target.value ? 'date' : 'text'} value={edu.endDate} onChange={(e) => updateEdu(idx, 'endDate', e.target.value)} placeholder="End Date" className="bg-white border-none rounded-xl px-4 py-3 font-bold text-nunma-forest outline-none w-full" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-8">
                                <button
                                    onClick={handleNext}
                                    className="bg-nunma-forest text-white font-black uppercase text-[12px] tracking-widest px-6 md:px-12 py-5 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                                >
                                    Next step <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-12">
                            <div className="text-center space-y-4">
                                <h1 className="text-4xl md:text-5xl font-black text-nunma-forest tracking-tighter">Set your availability</h1>
                                <p className="text-gray-400 font-medium">Let your audience know when you're available. You can edit this later.</p>
                            </div>

                            <div className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-gray-100 shadow-[0_40px_100px_rgba(0,0,0,0.02)] space-y-6">
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
                                                        className={`w-12 h-6 rounded-full p-1 transition-all ${day.active ? 'bg-nunma-forest' : 'bg-gray-200'}`}
                                                    >
                                                        <div className={`w-4 h-4 rounded-full bg-white transition-all ${day.active ? 'translate-x-6' : ''}`}></div>
                                                    </button>
                                                    <span className={`text-lg font-black tracking-tight ${day.active ? 'text-nunma-forest' : 'text-gray-300'}`}>{day.day}</span>
                                                </div>

                                                {day.active && (
                                                    <button
                                                        onClick={() => addSlot(dIdx)}
                                                        className="p-2 bg-[#c2f575] text-nunma-forest rounded-xl hover:scale-105 transition-all shadow-sm"
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
                                                                    className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 font-bold text-nunma-forest focus:ring-2 focus:ring-[#c2f575]"
                                                                    onChange={(e) => updateSlot(dIdx, sIdx, 'start', e.target.value)}
                                                                />
                                                                <span className="text-gray-300 font-black">—</span>
                                                                <input
                                                                    type="time"
                                                                    value={slot.end}
                                                                    className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 font-bold text-nunma-forest focus:ring-2 focus:ring-[#c2f575]"
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
                                <button onClick={handleBack} className="text-nunma-forest font-black uppercase text-[12px] tracking-widest px-8 py-5 flex items-center gap-4">
                                    <ChevronLeft size={20} /> Back
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="bg-nunma-forest text-white font-black uppercase text-[12px] tracking-widest px-6 md:px-12 py-5 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4"
                                >
                                    Next step <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-12">
                            <div className="text-center space-y-4">
                                <h1 className="text-4xl md:text-5xl font-black text-nunma-forest tracking-tighter">Create your product</h1>
                                <p className="text-gray-400 font-medium">Describe what you are offering to your audience</p>
                            </div>

                            <div className="bg-white p-6 md:p-12 rounded-[2rem] md:rounded-[3.5rem] border border-gray-100 shadow-[0_40px_100px_rgba(0,0,0,0.02)] space-y-10">
                                {/* Type Selector */}
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block ml-2">What are you offering?</label>
                                    <div className="flex gap-4">
                                        {(['mentorship', 'material'] as const).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setProductType(t)}
                                                className={`flex-1 p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center gap-4 ${productType === t ? 'bg-nunma-forest border-nunma-forest text-white shadow-xl scale-[1.02]' : 'bg-gray-50 border-gray-100 text-nunma-forest hover:border-[#c2f575]'}`}
                                            >
                                                {t === 'mentorship' ? <Video size={32} /> : <FileIcon size={32} />}
                                                <span className="font-black text-lg capitalize">{t}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Title */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Product Title</label>
                                    <input
                                        type="text"
                                        placeholder={productType === 'mentorship' ? "e.g. 1:1 Career Mentorship" : "e.g. Complete System Design PDF"}
                                        value={productTitle}
                                        onChange={(e) => setProductTitle(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none transition-all"
                                    />
                                </div>

                                {/* File Upload for Materials */}
                                {productType === 'material' && (
                                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center justify-between">
                                            <span>Upload File <span className="text-[9px] text-nunma-forest bg-[#c2f575] px-2 py-0.5 rounded-full ml-2">Mandatory</span></span>
                                        </label>
                                        <div 
                                            className={`border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${file ? 'border-[#c2f575] bg-[#c2f575]/10' : 'border-gray-200 hover:border-[#c2f575] bg-gray-50'}`}
                                            onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}>
                                            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.zip" onChange={handleFileChange} />
                                            {file ? (
                                                <>
                                                    <FileIcon size={48} className="text-[#658525] mb-4" />
                                                    <p className="font-black text-nunma-forest text-lg">{file.name}</p>
                                                    <p className="text-sm font-bold text-gray-400 mt-2">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={48} className="text-gray-300 mb-4" />
                                                    <p className="font-black text-nunma-forest text-lg">Click or drag your material here</p>
                                                    <p className="text-sm font-bold text-gray-400 mt-2">PDF, DOC, XLS, ZIP</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Price and Currency */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block ml-2">Access Fee</label>
                                        <div className="relative">
                                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300">
                                            {zoneCurrency === 'USD' && <DollarSign size={20} />}
                                            {zoneCurrency === 'INR' && <IndianRupee size={20} />}
                                            {zoneCurrency === 'EUR' && <Euro size={20} />}
                                            </div>
                                            <input
                                            type="number" min="0"
                                            placeholder="0.00"
                                            value={zonePrice}
                                            onChange={e => setZonePrice(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-3 py-4 font-black text-xl text-nunma-forest outline-none shadow-sm focus:ring-4 focus:ring-[#c1e60d]/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block ml-2">Currency</label>
                                        <select
                                            value={zoneCurrency}
                                            onChange={e => setZoneCurrency(e.target.value as any)}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-8 py-5 font-black text-xl text-nunma-forest outline-none shadow-sm focus:ring-4 focus:ring-[#c1e60d]/20 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="INR">INR (₹)</option>
                                            <option value="USD" disabled>USD ($) - Coming Soon</option>
                                            <option value="EUR" disabled>EUR (€) - Coming Soon</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Fee Breakdown & Net Payout calculation */}
                                {(() => {
                                    const priceVal = parseFloat(zonePrice) || 0;
                                    const currencySymbol = zoneCurrency === 'INR' ? '₹' : zoneCurrency === 'USD' ? '$' : '€';
                                    
                                    const currentTier = (user as any)?.current_tier?.toLowerCase() || 'starter';
                                    const platformFeePercent = currentTier === 'premium' ? 0.02 : currentTier === 'standard' ? 0.05 : 0.10;
                                    
                                    const platformFee = priceVal * platformFeePercent;
                                    const gstFee = priceVal * 0.18;
                                    const netPayout = priceVal - platformFee - gstFee;

                                    return priceVal > 0 ? (
                                    <div className="p-8 bg-gray-50/50 rounded-[2.5rem] border border-gray-100/70 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Price & Fee Breakdown</p>
                                        
                                        <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                                            <span>Access Fee (Student Pays)</span>
                                            <span className="font-bold text-nunma-forest">{currencySymbol}{priceVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                                            <span>Platform Fee ({(platformFeePercent * 100).toFixed(0)}%)</span>
                                            <span className="text-red-500 font-bold">- {currencySymbol}{platformFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                                            <span>GST (18%)</span>
                                            <span className="text-red-500 font-bold">- {currencySymbol}{gstFee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                            <div>
                                            <span className="text-sm font-black text-nunma-forest block">Net Tutor Earnings</span>
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Estimated payout after fees</span>
                                            </div>
                                            <span className="text-2xl font-black text-[#8eb829]">
                                            {currencySymbol}{netPayout.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        </div>
                                    </div>
                                    ) : null;
                                })()}


                                {/* Duration - only for Mentorship */}
                                {productType === 'mentorship' && (
                                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Duration (Minutes)</label>
                                        <div className="flex flex-wrap gap-4">
                                            {['15', '30', '45', '60', '90'].map(min => (
                                                <button
                                                    key={min}
                                                    onClick={() => setProductDuration(min)}
                                                    className={`px-8 py-4 rounded-xl font-bold transition-all border-2 ${productDuration === min ? 'bg-nunma-forest border-nunma-forest text-white shadow-lg' : 'bg-gray-50 border-transparent text-gray-400 hover:border-[#c2f575]'}`}
                                                >
                                                    {min}m
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{productType === 'mentorship' ? 'Service Description' : 'Material Description'}</label>
                                    <textarea
                                        placeholder={productType === 'mentorship' ? "Explain what value the user will get out of this session..." : "Explain what is included in this material..."}
                                        rows={4}
                                        value={productDescription}
                                        onChange={(e) => setProductDescription(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-transparent focus:border-[#c2f575] focus:bg-white rounded-2xl px-6 py-4 font-bold text-nunma-forest outline-none transition-all resize-none"
                                    />
                                </div>

                                {/* FAQs - only for Mentorship */}
                                {productType === 'mentorship' && (
                                    <div className="space-y-6 pt-4 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Commonly Asked Questions ({faqs.length}/5)</label>
                                            {faqs.length < 5 && (
                                                <button onClick={addFaq} className="flex items-center gap-2 text-[10px] font-black text-nunma-forest uppercase tracking-widest bg-[#c2f575] px-4 py-2 rounded-xl hover:scale-105 transition-all">
                                                    <Plus size={14} /> Add FAQ
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-6">
                                            {faqs.map((faq, idx) => (
                                                <div key={idx} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 space-y-4 relative group">
                                                    <div className="flex items-center gap-4">
                                                        <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-black text-nunma-forest shadow-sm">{idx + 1}</span>
                                                        <input
                                                            type="text"
                                                            placeholder="Question"
                                                            value={faq.q}
                                                            onChange={(e) => updateFaq(idx, 'q', e.target.value)}
                                                            className="flex-1 bg-transparent border-none font-bold text-nunma-forest outline-none"
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
                                )}
                            </div>

                            <div className="flex justify-between pt-8 items-center">
                                {!user?.onboardingCompleted && (
                                    <button onClick={handleBack} className="text-nunma-forest font-black uppercase text-[12px] tracking-widest px-8 py-5 flex items-center gap-4">
                                        <ChevronLeft size={20} /> Back
                                    </button>
                                )}
                                <div className="flex-1">
                                    {isLoading && productType === 'material' && uploadProgress > 0 && (
                                        <div className="px-8 flex items-center gap-4">
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-[#c2f575] h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                            </div>
                                            <span className="text-[10px] font-black text-nunma-forest">{Math.round(uploadProgress)}%</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleLaunch}
                                    disabled={isLoading}
                                    className="bg-[#c2f575] text-nunma-forest font-black uppercase text-[12px] tracking-widest px-6 md:px-12 py-5 rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-4 shadow-[#c2f575]/40"
                                >
                                    {isLoading ? (productType === 'material' ? 'Uploading...' : 'Saving...') : <>Complete Setup <Rocket size={20} /></>}
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
