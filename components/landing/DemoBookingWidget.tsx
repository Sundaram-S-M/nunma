import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../utils/firebase';
import { Mail, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type WidgetState = 'initial' | 'submitting' | 'calendar';

const DemoBookingWidget: React.FC = () => {
  const [widgetState, setWidgetState] = useState<WidgetState>('initial');
  const [email, setEmail] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      toast.error('Please enter a valid work email.');
      return;
    }

    setWidgetState('submitting');

    try {
      // Write to leads collection in Firestore
      await addDoc(collection(db, 'leads'), {
        email,
        source: 'landing_demo_unlock',
        status: 'new',
        createdAt: serverTimestamp(),
      });
      
      // Reveal the calendar iframe
      setWidgetState('calendar');
      toast.success('Demo unlocked! Choose a time below.');
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('Failed to unlock demo. Please try again.');
      setWidgetState('initial');
    }
  };

  return (
    <div className="w-full bg-white relative">
      <div className="p-8 md:p-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">Book your Demo</h3>
            <p className="text-slate-500 font-medium text-sm">See the platform in action. No pressure.</p>
          </div>
        </div>

        {/* State 1: Enter Email to Unlock */}
        {widgetState === 'initial' || widgetState === 'submitting' ? (
          <div className="max-w-md animate-fade-in">
            <form onSubmit={handleUnlock} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2">
                  Work Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all sm:text-sm bg-slate-50"
                    placeholder="founder@empire.com"
                    disabled={widgetState === 'submitting'}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={widgetState === 'submitting'}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 border border-transparent rounded-2xl shadow-sm text-base font-bold text-white bg-slate-900 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed group hover:-translate-y-0.5"
              >
                {widgetState === 'submitting' ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Unlocking...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock Scheduler</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              <p className="text-xs text-center text-slate-500">
                We respect your inbox. No spam, ever.
              </p>
            </form>
          </div>
        ) : null}

        {/* State 2: Calendly Iframe Revealed */}
        {widgetState === 'calendar' ? (
          <div className="h-[650px] w-full rounded-2xl overflow-hidden border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-slate-50 relative">
             {/* Loading Skeleton underneath */}
            <div className="absolute inset-0 flex items-center justify-center flex-col animate-pulse -z-10">
              <div className="h-10 bg-slate-200 rounded w-64 mb-6"></div>
              <div className="h-6 bg-slate-200 rounded w-96 mb-16"></div>
              <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                <div className="h-12 bg-slate-200 rounded"></div>
                <div className="h-12 bg-slate-200 rounded"></div>
             </div>
            </div>
            
            {/* Calendly Inline Widget */}
            <iframe 
              src={`https://calendly.com/sundaramsm?email=${encodeURIComponent(email)}&hide_event_type_details=1&hide_gdpr_banner=1`} 
              width="100%" 
              height="100%" 
              frameBorder="0" 
              className="relative z-10 bg-transparent"
              title="Schedule Demo"
            ></iframe>
          </div>
        ) : null}

      </div>
    </div>
  );
};

export default DemoBookingWidget;
