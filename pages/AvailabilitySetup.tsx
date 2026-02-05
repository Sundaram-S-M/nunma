
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Trash2, 
  Clock, 
  ChevronLeft, 
  Save, 
  Sparkles
} from 'lucide-react';

const AVAILABILITY_KEY = 'nunma_tutor_availability';

interface TimeSlot {
  id: string;
  start: string;
  end: string;
}

interface DaySchedule {
  day: string;
  active: boolean;
  slots: TimeSlot[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AvailabilitySetup: React.FC = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<DaySchedule[]>(
    DAYS.map(day => ({ day, active: false, slots: [] }))
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(AVAILABILITY_KEY);
    if (saved) {
      setSchedule(JSON.parse(saved));
    }
  }, []);

  const toggleDay = (index: number) => {
    setSchedule(prev => prev.map((d, i) => 
      i === index 
        ? { ...d, active: !d.active, slots: !d.active && d.slots.length === 0 ? [{ id: Math.random().toString(), start: '09:00', end: '17:00' }] : d.slots } 
        : d
    ));
  };

  const addSlot = (index: number) => {
    setSchedule(prev => prev.map((d, i) => 
      i === index 
        ? { ...d, slots: [...d.slots, { id: Math.random().toString(), start: '17:00', end: '18:00' }] } 
        : d
    ));
  };

  const removeSlot = (dayIndex: number, slotId: string) => {
    setSchedule(prev => prev.map((d, i) => 
      i === dayIndex 
        ? { ...d, slots: d.slots.filter(s => s.id !== slotId) } 
        : d
    ));
  };

  const updateSlot = (dayIndex: number, slotId: string, field: 'start' | 'end', value: string) => {
    setSchedule(prev => prev.map((d, i) => 
      i === dayIndex 
        ? { ...d, slots: d.slots.map(s => s.id === slotId ? { ...s, [field]: value } : s) } 
        : d
    ));
  };

  const handleSave = () => {
    setIsSaving(true);
    localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(schedule));
    setTimeout(() => {
      setIsSaving(false);
      window.dispatchEvent(new Event('storage'));
      navigate('/workplace');
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/workplace')} className="p-4 bg-white border border-gray-100 rounded-2xl text-[#040457] shadow-sm hover:shadow-xl transition-all">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-4xl font-black text-[#040457] tracking-tighter">Availability Schedule</h1>
            <p className="text-gray-400 font-medium text-sm">Define your working hours for student mentorship.</p>
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#040457] text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl shadow-xl flex items-center gap-3 active:scale-95 transition-all disabled:opacity-50"
        >
          {isSaving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <><Save size={18} className="text-[#c2f575]" /> SAVE SCHEDULE</>}
        </button>
      </div>

      <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-[0_40px_100px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-10 space-y-6">
           <div className="flex items-center gap-4 bg-[#faffdf] p-8 rounded-[2rem] border border-[#c2f575]/20 mb-6">
              <Sparkles size={24} className="text-[#040457]" />
              <div>
                 <p className="text-[10px] font-black text-[#040457] uppercase tracking-widest">GLOBAL AVAILABILITY SETTINGS</p>
                 <p className="text-[9px] font-bold text-[#040457]/40 uppercase tracking-widest mt-0.5">CONFIGURE YOUR PROFESSIONAL TIME BLOCKS.</p>
              </div>
           </div>

           <div className="space-y-4">
              {schedule.map((day, idx) => (
                <div key={day.day} className={`transition-all duration-500 rounded-[2.5rem] border ${day.active ? 'bg-white border-[#040457]/5 shadow-[0_30px_60px_rgba(0,0,0,0.06)]' : 'bg-white border-transparent'}`}>
                  <div className={`p-8 flex items-center justify-between ${day.active ? 'border-b border-gray-50' : ''}`}>
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => toggleDay(idx)}
                        className={`w-14 h-7 rounded-full p-1 transition-all duration-500 shadow-inner flex items-center ${day.active ? 'bg-[#040457]' : 'bg-gray-200'}`}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white transition-transform duration-500 shadow-md ${day.active ? 'translate-x-7' : ''}`} />
                      </button>
                      <span className={`text-xl font-black ${day.active ? 'text-[#040457]' : 'text-gray-300'}`}>{day.day}</span>
                    </div>
                    {day.active && (
                      <button onClick={() => addSlot(idx)} className="text-[9px] font-black uppercase tracking-widest text-[#040457] bg-[#c2f575] px-5 py-2.5 rounded-full flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                        <Plus size={14} strokeWidth={4} /> ADD BLOCK
                      </button>
                    )}
                  </div>

                  {day.active && (
                    <div className="p-8 pt-0 space-y-4 animate-in slide-in-from-top-4 duration-500">
                      {day.slots.map(slot => (
                        <div key={slot.id} className="flex items-center gap-6 p-6 bg-gray-50/50 rounded-[2rem] border border-gray-100/50 group relative">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-gray-200 shadow-sm border border-gray-100">
                             <Clock size={18} />
                          </div>
                          
                          <div className="flex-1 grid grid-cols-2 gap-8 items-end">
                            <div className="space-y-1.5">
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">FROM</p>
                              <div className="bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#c2f575]/50 transition-all">
                                <input 
                                  type="time" value={slot.start} 
                                  onChange={(e) => updateSlot(idx, slot.id, 'start', e.target.value)}
                                  className="w-full bg-transparent font-black text-[#040457] outline-none text-sm"
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-1.5">
                              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">TO</p>
                              <div className="bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-[#c2f575]/50 transition-all">
                                <input 
                                  type="time" value={slot.end} 
                                  onChange={(e) => updateSlot(idx, slot.id, 'end', e.target.value)}
                                  className="w-full bg-transparent font-black text-[#040457] outline-none text-sm"
                                />
                              </div>
                            </div>
                          </div>

                          <button onClick={() => removeSlot(idx, slot.id)} className="w-12 h-12 bg-white text-gray-200 hover:text-red-500 hover:bg-white rounded-2xl transition-all shadow-sm border border-gray-100 flex items-center justify-center">
                            <Trash2 size={18}/>
                          </button>
                        </div>
                      ))}
                      {day.slots.length === 0 && (
                        <div className="py-10 text-center italic text-gray-300 font-medium">No hours scheduled for this day.</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
           </div>
        </div>
      </div>
      
      <p className="text-center text-[10px] font-bold text-gray-300 uppercase tracking-widest italic px-10">
        All times are automatically converted to your local timezone for accuracy.
      </p>
    </div>
  );
};

export default AvailabilitySetup;