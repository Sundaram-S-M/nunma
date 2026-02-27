
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
    ChevronLeft,
    Calendar as CalendarIcon,
    Clock,
    Video,
    ShieldCheck,
    Globe,
    ArrowRight,
    HelpCircle,
    AlertCircle
} from 'lucide-react';
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useAuth } from '../context/AuthContext';

const BookingPage: React.FC = () => {
    const { productId } = useParams();
    const [searchParams] = useSearchParams();
    const tutorId = searchParams.get('tutorId');
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [product, setProduct] = useState<any>(null);
    const [tutor, setTutor] = useState<any>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [bookedSlots, setBookedSlots] = useState<string[]>([]);
    const [availability, setAvailability] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            if (!productId || !tutorId || !db) return;
            setLoading(true);
            try {
                const productSnap = await getDoc(doc(db, 'products', productId));
                const tutorSnap = await getDoc(doc(db, 'users', tutorId));

                if (productSnap.exists()) {
                    setProduct({ id: productSnap.id, ...productSnap.data() });
                }
                if (tutorSnap.exists()) {
                    const tutorData = tutorSnap.data();
                    setTutor({ id: tutorSnap.id, ...tutorData });
                    setAvailability(tutorData.availability || []);
                }

                // Fetch bookings for this tutor on selected date
                await fetchBookings(new Date());

            } catch (e) {
                console.error("Error fetching booking data:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [productId, tutorId]);

    const fetchBookings = async (date: Date) => {
        if (!tutorId || !db) return;
        const dateStr = date.toISOString().split('T')[0];
        const q = query(
            collection(db, 'bookings'),
            where('tutorId', '==', tutorId),
            where('date', '==', dateStr)
        );
        const snap = await getDocs(q);
        setBookedSlots(snap.docs.map(d => d.data().slotId));
    };

    const handleDateChange = (date: Date) => {
        setSelectedDate(date);
        setSelectedSlot(null);
        fetchBookings(date);
    };

    const getDayName = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'long' });
    };

    const getAvailableSlotsForDay = () => {
        const dayName = getDayName(selectedDate);
        const dayConfig = availability.find(d => d.day === dayName && d.active);
        if (!dayConfig || !dayConfig.slots) return [];

        let durationMinutes = parseInt(product?.duration) || 30;

        const generatedSlots: any[] = [];

        dayConfig.slots.forEach((block: any, idx: number) => {
            let current = new Date(`1970-01-01T${block.start}:00`);
            const end = new Date(`1970-01-01T${block.end}:00`);

            let slotIndex = 0;
            while (current < end) {
                const next = new Date(current.getTime() + durationMinutes * 60000);
                if (next > end) break; // Don't overflow the block

                const startStr = current.toTimeString().slice(0, 5);
                const endStr = next.toTimeString().slice(0, 5);

                generatedSlots.push({
                    id: `${block.id}-${idx}-${slotIndex}`,
                    start: startStr,
                    end: endStr
                });

                current = next;
                slotIndex++;
            }
        });

        return generatedSlots;
    };

    const handleContinue = () => {
        if (!selectedSlot || !product) return;
        const dateStr = selectedDate.toISOString().split('T')[0];
        const timeStr = `${selectedSlot.start} — ${selectedSlot.end}`;
        navigate(`/payment/${productId}?type=mentorship&date=${dateStr}&slotId=${selectedSlot.id}&tutorId=${tutorId}&time=${encodeURIComponent(timeStr)}`);
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-[#fbfbfb]">
            <div className="w-12 h-12 border-4 border-indigo-900 border-t-[#c2f575] rounded-full animate-spin"></div>
        </div>
    );

    if (!product || !tutor) return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#fbfbfb] p-10 text-center">
            <AlertCircle size={64} className="text-red-500 mb-6" />
            <h2 className="text-3xl font-black text-indigo-900 mb-4">Booking Not Found</h2>
            <button onClick={() => navigate(-1)} className="px-8 py-4 bg-indigo-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs">Go Back</button>
        </div>
    );

    const slots = getAvailableSlotsForDay();
    const nextDays = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    });

    return (
        <div className="min-h-screen bg-[#fbfbfb] pb-32 pt-10 px-6 md:px-10 max-w-7xl mx-auto animate-in fade-in duration-700">
            <div className="flex flex-col lg:flex-row gap-16">
                {/* Left Side: Product Info */}
                <div className="lg:w-5/12 space-y-12">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-3 text-indigo-900/40 hover:text-indigo-900 font-black uppercase tracking-[0.2em] text-[10px] transition-all group">
                        <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back to Profile
                    </button>

                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-3 bg-[#c2f575] text-indigo-900 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                            <Video size={14} /> {product.duration || '30'} Min Session
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter leading-tight text-indigo-900">{product.title}</h1>
                        <p className="text-3xl font-black text-indigo-900/30">
                            {product.priceINR ? `₹${product.priceINR} / $${product.priceUSD}` : `${product.price} ${product.currency}`}
                        </p>
                    </div>

                    <div className="p-10 bg-white rounded-[3rem] border border-indigo-900/5 shadow-sm">
                        <h3 className="text-[10px] font-black text-indigo-900/20 uppercase tracking-[0.3em] mb-6">About this session</h3>
                        <p className="text-lg text-indigo-900/70 font-medium leading-relaxed italic">{product.description || 'No description provided.'}</p>
                    </div>

                    {product.faqs && product.faqs.length > 0 && (
                        <div className="space-y-8">
                            <h3 className="text-xl font-black text-indigo-900 flex items-center gap-3">
                                <HelpCircle size={22} className="text-[#c2f575]" /> Common Questions
                            </h3>
                            <div className="space-y-4">
                                {product.faqs.map((faq: any, idx: number) => (
                                    <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-indigo-900/5 shadow-sm">
                                        <p className="text-base font-black text-indigo-900 mb-3">{faq.q}</p>
                                        <p className="text-sm text-indigo-900/50 leading-relaxed">{faq.a}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side: Step Selection */}
                <div className="lg:w-7/12 space-y-12">
                    {/* Date Selection */}
                    <div className="space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-4">
                                <CalendarIcon size={24} className="text-[#c2f575]" /> When should we meet?
                            </h3>
                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-900/30 uppercase tracking-widest">
                                <Globe size={14} /> {Intl.DateTimeFormat().resolvedOptions().timeZone}
                            </div>
                        </div>

                        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-2 px-2">
                            {nextDays.map((date, idx) => {
                                const isSelected = selectedDate.toDateString() === date.toDateString();
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleDateChange(date)}
                                        className={`shrink-0 w-24 h-28 rounded-3xl flex flex-col items-center justify-center gap-2 transition-all
                      ${isSelected ? 'bg-indigo-900 text-white shadow-2xl scale-105' : 'bg-white text-indigo-900 border border-gray-100 hover:border-indigo-900/20'}
                    `}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                                        <span className="text-2xl font-black">{date.getDate()}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">{date.toLocaleDateString('en-US', { month: 'short' })}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time Slot Selection */}
                    <div className="space-y-8">
                        <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-4">
                            <Clock size={24} className="text-[#c2f575]" /> Select time of day
                        </h3>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {slots.length > 0 ? slots.map((slot: any) => {
                                const isBooked = bookedSlots.includes(slot.id);
                                const isSelected = selectedSlot?.id === slot.id;
                                return (
                                    <button
                                        key={slot.id}
                                        disabled={isBooked}
                                        onClick={() => setSelectedSlot(slot)}
                                        className={`py-5 rounded-2xl font-black text-sm tracking-tight transition-all flex flex-col items-center justify-center gap-1
                      ${isBooked ? 'bg-gray-100 text-gray-300 cursor-not-allowed border-transparent' :
                                                isSelected ? 'bg-[#c2f575] text-indigo-900 shadow-xl border-transparent scale-[1.02]' :
                                                    'bg-white text-indigo-900 border border-gray-100 hover:border-indigo-900/20'}
                    `}
                                    >
                                        <span>{slot.start}</span>
                                        <span className="text-[10px] font-bold opacity-50 uppercase">{slot.end}</span>
                                    </button>
                                );
                            }) : (
                                <div className="col-span-full py-16 text-center bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                                    <p className="text-indigo-900/30 font-black uppercase tracking-widest text-xs">No availability for this day</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Continue Button */}
                    <div className="pt-10">
                        <button
                            onClick={handleContinue}
                            disabled={!selectedSlot}
                            className={`w-full py-8 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] transition-all flex items-center justify-center gap-4
                ${selectedSlot ? 'bg-indigo-900 text-white shadow-2xl hover:brightness-110 active:scale-[0.98]' : 'bg-gray-200 text-white cursor-not-allowed'}
              `}
                        >
                            Continue to Payment <ArrowRight size={20} className={selectedSlot ? "text-[#c2f575]" : ""} />
                        </button>
                        <p className="text-center text-[10px] font-black text-indigo-900/20 uppercase tracking-[0.2em] mt-8 flex items-center justify-center gap-3">
                            <ShieldCheck size={14} /> Secure Booking • Instant Confirmation
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingPage;
