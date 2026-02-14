
import React, { useState, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    ShoppingBag,
    Clock,
    Plus,
    Trash2,
    Edit,
    Save,
    X,
    ChevronLeft,
    ChevronRight,
    User,
    Video,
    ExternalLink,
    CheckCircle2,
    Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    getDocs,
    deleteDoc,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../utils/firebase';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const ProductManagement: React.FC = () => {
    const { user, updateProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<'calendar' | 'products' | 'availability'>('calendar');

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<number | null>(new Date().getDate());
    const [meetings, setMeetings] = useState<any[]>([]);

    // Products State
    const [products, setProducts] = useState<any[]>([]);
    const [editingProduct, setEditingProduct] = useState<any>(null);

    // Availability State
    const [availability, setAvailability] = useState<any[]>(user?.availability || []);

    useEffect(() => {
        if (!user) return;

        // Fetch Products
        const qProducts = query(collection(db, 'products'), where('tutorId', '==', user.uid));
        const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // Fetch Bookings (Meetings)
        // For now, let's assume a 'bookings' top-level collection
        const qBookings = query(collection(db, 'bookings'), where('tutorId', '==', user.uid));
        const unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
            setMeetings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubscribeProducts();
            unsubscribeBookings();
        };
    }, [user]);

    // --- Calendar Helpers ---
    const monthName = currentMonth.toLocaleString('default', { month: 'long' }).toUpperCase();
    const year = currentMonth.getFullYear();
    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
    const daysCount = getDaysInMonth(year, currentMonth.getMonth());
    const firstDay = getFirstDayOfMonth(year, currentMonth.getMonth());

    const meetingsOnDate = (day: number) => {
        return meetings.filter(m => {
            const d = new Date(m.date);
            return d.getDate() === day && d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
        });
    };

    // --- Availability Handlers ---
    const saveAvailability = async () => {
        if (!user) return;
        try {
            await updateProfile({ availability });
            alert("Availability updated successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to update availability.");
        }
    };

    const addSlot = (dayIdx: number) => {
        const newSched = [...availability];
        if (!newSched[dayIdx].slots) newSched[dayIdx].slots = [];
        newSched[dayIdx].slots.push({ id: Date.now().toString(), start: '09:00', end: '17:00' });
        setAvailability(newSched);
    };

    const removeSlot = (dayIdx: number, slotIdx: number) => {
        const newSched = [...availability];
        newSched[dayIdx].slots.splice(slotIdx, 1);
        setAvailability(newSched);
    };

    const updateSlot = (dayIdx: number, slotIdx: number, field: 'start' | 'end', value: string) => {
        const newSched = [...availability];
        newSched[dayIdx].slots[slotIdx][field] = value;
        setAvailability(newSched);
    };

    // --- Product Handlers ---
    const handleDeleteProduct = async (id: string) => {
        if (confirm("Are you sure you want to delete this product?")) {
            await deleteDoc(doc(db, 'products', id));
        }
    };

    const handleUpdateProduct = async () => {
        if (!editingProduct) return;
        const { id, ...data } = editingProduct;
        await updateDoc(doc(db, 'products', id), data);
        setEditingProduct(null);
    };

    return (
        <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-[#040457] tracking-tighter mb-2">Product Management</h1>
                    <p className="text-gray-400 font-medium">Manage your offerings, availability, and bookings.</p>
                </div>
                <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                    {[
                        { id: 'calendar', label: 'Bookings', icon: <CalendarIcon size={16} /> },
                        { id: 'products', label: 'My Products', icon: <ShoppingBag size={16} /> },
                        { id: 'availability', label: 'Availability', icon: <Clock size={16} /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2
                ${activeTab === tab.id ? 'bg-[#040457] text-white shadow-lg' : 'text-gray-400 hover:text-[#040457] hover:bg-gray-50'}
              `}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.03)] overflow-hidden min-h-[600px]">
                <div className="p-10">
                    {activeTab === 'calendar' && (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Calendar Column */}
                            <div className="xl:col-span-7 space-y-8">
                                <div className="flex items-center justify-between px-4">
                                    <h3 className="text-2xl font-black text-[#040457] tracking-tight">{monthName} {year}</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCurrentMonth(new Date(year, currentMonth.getMonth() - 1, 1))} className="p-3 bg-gray-50 hover:bg-[#c2f575] rounded-2xl transition-all"><ChevronLeft size={20} /></button>
                                        <button onClick={() => setCurrentMonth(new Date(year, currentMonth.getMonth() + 1, 1))} className="p-3 bg-gray-50 hover:bg-[#c2f575] rounded-2xl transition-all"><ChevronRight size={20} /></button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-7 gap-px bg-gray-50 rounded-[2.5rem] overflow-hidden border border-gray-100 p-8">
                                    {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                                        <div key={day} className="text-[10px] font-black text-gray-300 uppercase tracking-widest py-4 text-center">{day}</div>
                                    ))}
                                    {Array.from({ length: firstDay }, (_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
                                    {Array.from({ length: daysCount }, (_, i) => {
                                        const dayNum = i + 1;
                                        const hasMeeting = meetingsOnDate(dayNum).length > 0;
                                        const isSelected = selectedDate === dayNum;
                                        return (
                                            <button
                                                key={dayNum}
                                                onClick={() => setSelectedDate(dayNum)}
                                                className={`aspect-square flex flex-col items-center justify-center rounded-2xl transition-all relative group
                          ${isSelected ? 'bg-[#040457] text-white shadow-xl' : 'hover:bg-[#c2f575]/10 text-gray-600'}
                        `}
                                            >
                                                <span className="text-sm font-bold">{dayNum}</span>
                                                {hasMeeting && (
                                                    <div className={`absolute bottom-3 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#c2f575]' : 'bg-[#040457]'}`} />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Details Column */}
                            <div className="xl:col-span-5 space-y-8">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 bg-[#c2f575] rounded-[1.25rem] flex items-center justify-center text-[#040457] shadow-lg shadow-[#c2f575]/20">
                                        <Clock size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-[#040457]">Agenda</h4>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{monthName} {selectedDate}, {year}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {selectedDate && meetingsOnDate(selectedDate).length > 0 ? meetingsOnDate(selectedDate).map(meeting => (
                                        <div key={meeting.id} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-xl transition-all group">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black text-[#c2f575] uppercase tracking-widest">{meeting.time}</p>
                                                    <h5 className="text-lg font-black text-[#040457]">{meeting.studentName || 'Student'}</h5>
                                                </div>
                                                <button className="p-2 bg-indigo-50 text-indigo-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><Video size={18} /></button>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                                                <ShoppingBag size={14} />
                                                <span>{meeting.productTitle}</span>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-20 text-center space-y-4 opacity-20">
                                            <CalendarIcon size={48} className="mx-auto" />
                                            <p className="font-black uppercase tracking-widest text-[10px]">No bookings for this day</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {products.length > 0 ? products.map(product => (
                                    <div key={product.id} className="bg-gray-50 p-8 rounded-[2.5rem] border border-gray-100 hover:bg-white hover:shadow-2xl transition-all group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-[#040457] shadow-sm group-hover:bg-[#c2f575] transition-colors">
                                                <ShoppingBag size={28} />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingProduct(product)} className="p-2 text-gray-300 hover:text-indigo-600 transition-colors"><Edit size={18} /></button>
                                                <button onClick={() => handleDeleteProduct(product.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                                            </div>
                                        </div>
                                        <h4 className="text-xl font-black text-[#040457] mb-2">{product.title}</h4>
                                        <p className="text-[10px] font-black text-[#c2f575] uppercase tracking-widest mb-6">{product.type}</p>
                                        <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                                            <p className="text-2xl font-black text-[#040457]">{product.price} {product.currency}</p>
                                            <button className="p-2 text-gray-300 hover:text-[#040457] transition-all"><ExternalLink size={18} /></button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="col-span-full py-32 text-center space-y-6 opacity-20">
                                        <ShoppingBag size={64} className="mx-auto" />
                                        <p className="font-black uppercase tracking-widest">You haven't listed any products yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'availability' && (
                        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-[#040457] tracking-tight">Weekly Schedule</h3>
                                    <p className="text-sm text-gray-400 font-medium">Set your standard working hours for mentorship sessions.</p>
                                </div>
                                <button
                                    onClick={saveAvailability}
                                    className="bg-[#040457] text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-3"
                                >
                                    <Save size={16} /> Save Changes
                                </button>
                            </div>

                            <div className="space-y-4">
                                {availability.map((day, dIdx) => (
                                    <div key={day.day} className={`p-8 rounded-[2rem] border transition-all ${day.active ? 'bg-gray-50/50 border-[#c2f575]/20' : 'bg-transparent border-transparent'}`}>
                                        <div className="flex flex-col gap-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-6">
                                                    <button
                                                        onClick={() => {
                                                            const newSched = [...availability];
                                                            newSched[dIdx].active = !newSched[dIdx].active;
                                                            setAvailability(newSched);
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
                                                    {day.slots?.map((slot: any, sIdx: number) => (
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
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Product Modal */}
            {editingProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-500">
                        <div className="px-12 py-10 border-b border-gray-50 flex justify-between items-center bg-white">
                            <h3 className="text-3xl font-black text-[#040457] tracking-tight">Edit Product</h3>
                            <button onClick={() => setEditingProduct(null)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"><X size={24} /></button>
                        </div>
                        <div className="p-12 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Title</label>
                                <input type="text" value={editingProduct.title} onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })} className="w-full bg-gray-50 border border-transparent rounded-2xl px-8 py-5 font-bold text-[#040457] outline-none focus:bg-white focus:border-[#c2f575] transition-all" />
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price</label>
                                    <input type="text" value={editingProduct.price} onChange={e => setEditingProduct({ ...editingProduct, price: e.target.value })} className="w-full bg-gray-50 border border-transparent rounded-2xl px-8 py-5 font-bold text-[#040457] outline-none focus:bg-white focus:border-[#c2f575] transition-all" />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Currency</label>
                                    <select value={editingProduct.currency} onChange={e => setEditingProduct({ ...editingProduct, currency: e.target.value as any })} className="w-full bg-gray-50 border border-transparent rounded-2xl px-8 py-5 font-bold text-[#040457] outline-none focus:bg-white focus:border-[#c2f575] transition-all appearance-none cursor-pointer">
                                        <option value="INR">INR</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                                <textarea rows={4} value={editingProduct.description} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full bg-gray-50 border border-transparent rounded-2xl px-8 py-5 font-bold text-[#040457] outline-none focus:bg-white focus:border-[#c2f575] transition-all resize-none" />
                            </div>
                            <button onClick={handleUpdateProduct} className="w-full py-7 bg-[#040457] text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-4">
                                Update Product <Save size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManagement;
