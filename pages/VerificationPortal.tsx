
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Award, User, CheckCircle2, Share2, ArrowRight, ExternalLink, Zap, Globe } from 'lucide-react';

const VerificationPortal: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // Simulate ZK Verification Proof Check
    const timer = setTimeout(() => {
      setIsVerified(true);
      setIsVerifying(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, [id]);

  return (
    <div className="min-h-screen bg-[#fbfbfb] flex flex-col items-center justify-center p-6 md:p-12">
      <div className="w-full max-w-4xl bg-white rounded-[5rem] border border-gray-100 shadow-[0_60px_150px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col lg:flex-row animate-in fade-in slide-in-from-bottom-12 duration-1000">

        {/* Verification Status Banner */}
        <div className={`w-full lg:w-2/5 p-16 flex flex-col justify-between relative overflow-hidden transition-colors duration-1000 ${isVerifying ? 'bg-indigo-900' : isVerified ? 'bg-[#c1e60d]' : 'bg-red-500'}`}>
          <div className="relative z-10">
            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl transition-all duration-700 ${isVerifying ? 'bg-white/10 text-white animate-pulse' : 'bg-indigo-900 text-white scale-110'}`}>
              {isVerifying ? <ShieldCheck size={40} /> : isVerified ? <ShieldCheck size={40} /> : <ShieldAlert size={40} />}
            </div>
            <h1 className={`text-5xl font-black tracking-tighter mb-4 leading-none ${isVerifying ? 'text-white' : 'text-indigo-900'}`}>
              {isVerifying ? 'Verifying...' : isVerified ? 'Verified Accuracy' : 'Invalid Proof'}
            </h1>
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${isVerifying ? 'text-indigo-200' : 'text-indigo-900/60'}`}>
              {isVerifying ? 'Computing ZK Proof' : 'W3C Standard Compliant'}
            </p>
          </div>

          {!isVerifying && isVerified && (
            <div className="relative z-10 p-6 bg-indigo-900/5 rounded-3xl border border-indigo-900/10 mt-12 animate-in slide-in-from-bottom-4">
              <p className="text-indigo-900 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                <ShieldCheck size={12} /> Privacy Layer
              </p>
              <p className="text-indigo-900/80 text-[11px] font-medium leading-relaxed italic">
                Zero-Knowledge Proof successful. The student's specific grade resides in an encrypted enclave, verifying only "Achievement Mastery" to external requests.
              </p>
            </div>
          )}

          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-[100px]"></div>
        </div>

        {/* Achievement Details */}
        <div className="w-full lg:w-3/5 p-16 space-y-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4 text-gray-300 font-bold text-[10px] uppercase tracking-[0.4em]">
              <Award size={18} /> Verifiable Credential
            </div>
            <h2 className="text-5xl font-black text-indigo-900 tracking-tighter leading-tight"> Precision Logistics <br /><span className="text-[#c1e60d] drop-shadow-sm">& Supply Chain Mastery</span></h2>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col gap-4">
              <div className="p-3 bg-white w-fit rounded-xl shadow-sm text-indigo-900"><User size={20} /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Holder</p>
                <p className="text-lg font-black text-indigo-900">Sundaram S M</p>
                <p className="text-[9px] font-mono text-gray-300 truncate">did:nunma:student:sm93...xf01</p>
              </div>
            </div>
            <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-gray-100 flex flex-col gap-4">
              <div className="p-3 bg-white w-fit rounded-xl shadow-sm text-indigo-900"><ExternalLink size={20} /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Issuer</p>
                <p className="text-lg font-black text-indigo-900">Nunma Academy</p>
                <p className="text-[9px] font-mono text-gray-300">did:web:nunma.io</p>
              </div>
            </div>
          </div>

          <div className="p-10 bg-[#faffdf] rounded-[3rem] border border-[#c1e60d]/20 flex items-center justify-between">
            <div>
              <p className="text-indigo-900 font-black text-xl tracking-tight">Status: MASTERY GRANTED</p>
              <p className="text-indigo-900/40 text-[10px] font-bold uppercase tracking-widest mt-1">Proof: selective-disclosure-v1</p>
            </div>
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-900 shadow-xl border border-[#c1e60d]/20">
              <ShieldCheck size={32} />
            </div>
          </div>

          <div className="pt-10 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="text-[11px] font-black text-indigo-900 uppercase tracking-[0.25em] flex items-center gap-3 hover:translate-x-2 transition-transform"
            >
              Nunma Main Engine <ArrowRight size={18} />
            </button>
            <div className="flex gap-4">
              <button className="p-4 bg-gray-50 rounded-2xl text-gray-400 hover:text-indigo-900 hover:bg-white hover:shadow-xl transition-all">
                <Share2 size={24} />
              </button>
            </div>
          </div>
        </div>

      </div>

      <p className="mt-12 text-gray-300 text-[9px] font-bold uppercase tracking-[0.5em] text-center max-w-xs leading-relaxed">
        SECURED BY NUNMA CRYPTOGRAPHIC RESEARCH UNIT <br /> OPENBADGES 3.0 / W3C VCs
      </p>
    </div>
  );
};

export default VerificationPortal;
