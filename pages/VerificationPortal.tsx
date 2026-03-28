import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, Award, User, Share2, ArrowRight, ExternalLink, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

const VerificationPortal: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [certData, setCertData] = useState<any>(null);

  useEffect(() => {
    const fetchCertificate = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'certificates', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setCertData({ id: docSnap.id, ...docSnap.data() });
          setIsVerified(true);
        } else {
          setIsVerified(false);
        }
      } catch (error) {
        console.error("Error fetching certificate:", error);
        setIsVerified(false);
      } finally {
        setIsVerifying(false);
      }
    };

    const timer = setTimeout(() => {
      fetchCertificate();
    }, 1500);

    return () => clearTimeout(timer);
  }, [id]);

  const verifyUrl = `https://nunma.in/verify/${id}`;

  const handlePrint = () => {
    window.print();
  };

  const payload = certData?.payload;
  const studentName = payload?.credentialSubject?.name || "Student";
  const courseName = payload?.credentialSubject?.achievement?.name || "Course Completion";
  const issueDate = payload?.issuanceDate ? new Date(payload.issuanceDate).toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <>
      <style>
        {`
          @media print {
            body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .cert-container { 
              width: 100% !important; max-width: 100% !important; 
              margin: 0 !important; padding: 20px !important;
              box-shadow: none !important; border: 2px solid #e5e7eb !important;
              border-radius: 20px !important;
              flex-direction: column !important;
            }
            .cert-left, .cert-right { width: 100% !important; padding: 20px !important; }
            .cert-left { background-color: #312e81 !important; color: white !important; border-bottom-left-radius: 0 !important; border-top-right-radius: 20px !important; }
            .cert-left p { color: white !important; }
            .cert-left h1 { color: white !important; }
            .qr-code-box, .shield-box { background: white !important; color: #312e81 !important; }
          }
        `}
      </style>

      <div className="min-h-screen bg-[#fbfbfb] flex flex-col items-center justify-center p-6 md:p-12 print:p-0 print:bg-white">
        <div className="cert-container w-full max-w-5xl bg-white rounded-[4rem] border border-gray-100 shadow-[0_40px_100px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col lg:flex-row animate-in fade-in slide-in-from-bottom-12 duration-1000 print:rounded-none mt-20 md:mt-0">

          {/* Verification Status Banner */}
          <div className={`cert-left w-full lg:w-2/5 p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden transition-colors duration-1000 ${isVerifying ? 'bg-indigo-900' : isVerified ? 'bg-[#c2f575]' : 'bg-red-500'}`}>
            <div className="relative z-10">
              <div className={`shield-box w-20 h-20 rounded-[2rem] flex items-center justify-center mb-10 shadow-2xl transition-all duration-700 ${isVerifying ? 'bg-white/10 text-white animate-pulse' : 'bg-indigo-900 text-white scale-110'}`}>
                {isVerifying ? <ShieldCheck size={40} /> : isVerified ? <ShieldCheck size={40} /> : <ShieldAlert size={40} />}
              </div>
              <h1 className={`text-4xl lg:text-5xl font-black tracking-tighter mb-4 leading-none ${isVerifying ? 'text-white' : 'text-indigo-900'}`}>
                {isVerifying ? 'Verifying...' : isVerified ? 'Verified Accuracy' : 'Invalid Proof'}
              </h1>
              <p className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] ${isVerifying ? 'text-indigo-200' : 'text-indigo-900/60'}`}>
                {isVerifying ? 'Computing ZK Proof' : isVerified ? 'W3C OpenBadges 3.0 Compliant' : 'Credential Not Found'}
              </p>
            </div>

            {!isVerifying && isVerified && (
              <div className="relative z-10 mt-12 flex flex-col items-start gap-6">
                <div className="p-4 sm:p-6 bg-white rounded-3xl border border-indigo-900/10 shadow-sm qr-code-box w-fit">
                  <QRCodeSVG value={verifyUrl} size={100} level="M" />
                </div>
                <div className="p-4 sm:p-6 bg-indigo-900/5 rounded-3xl border border-indigo-900/10 w-full">
                  <p className="text-indigo-900 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ShieldCheck size={12} /> Scan to Verify
                  </p>
                  <p className="text-indigo-900/80 text-[10px] sm:text-[11px] font-medium leading-relaxed italic break-all">
                    {verifyUrl}
                  </p>
                </div>
              </div>
            )}

            <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] pointer-events-none"></div>
          </div>

          {/* Achievement Details */}
          <div className="cert-right w-full lg:w-3/5 p-8 lg:p-16 space-y-10 lg:space-y-12">
            {!isVerifying && !isVerified && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-400 font-medium text-center">The requested credential does not exist or has been revoked.</p>
              </div>
            )}

            {!isVerifying && isVerified && (
              <>
                <div className="space-y-4 lg:space-y-6">
                  <div className="flex items-center gap-4 text-gray-400 font-bold text-[9px] lg:text-[10px] uppercase tracking-[0.3em] lg:tracking-[0.4em]">
                    <Award size={18} className="shrink-0" /> Verifiable Credential
                  </div>
                  <h2 className="text-4xl lg:text-5xl font-black text-indigo-900 tracking-tighter leading-tight break-words">
                    {courseName.split(' ').slice(0, 2).join(' ')} <br className="hidden lg:block"/>
                    <span className="text-[#c2f575] drop-shadow-sm">{courseName.split(' ').slice(2).join(' ')}</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
                  <div className="p-6 lg:p-8 bg-gray-50 rounded-[2rem] lg:rounded-[2.5rem] border border-gray-100 flex flex-col gap-4">
                    <div className="p-3 bg-white w-fit rounded-xl shadow-sm text-indigo-900"><User size={20} /></div>
                    <div>
                      <p className="text-[9px] lg:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Holder</p>
                      <p className="text-lg lg:text-xl font-black text-indigo-900 break-words">{studentName}</p>
                      <p className="text-[9px] font-mono text-gray-400">Issued: {issueDate}</p>
                    </div>
                  </div>
                  <div className="p-6 lg:p-8 bg-gray-50 rounded-[2rem] lg:rounded-[2.5rem] border border-gray-100 flex flex-col gap-4">
                    <div className="p-3 bg-white w-fit rounded-xl shadow-sm text-indigo-900"><ExternalLink size={20} /></div>
                    <div>
                      <p className="text-[9px] lg:text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Issuer</p>
                      <p className="text-lg lg:text-xl font-black text-indigo-900">Nunma Academy</p>
                      <p className="text-[9px] font-mono text-gray-400 break-words">{payload?.issuer?.id}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 lg:p-10 bg-[#faffdf] rounded-[2rem] lg:rounded-[3rem] border border-[#c2f575]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-0">
                  <div>
                    <p className="text-indigo-900 font-black text-lg lg:text-xl tracking-tight">Status: MASTERY GRANTED</p>
                    <p className="text-indigo-900/60 text-[9px] lg:text-[10px] font-bold uppercase tracking-widest mt-1">Nunma Verified Seal</p>
                  </div>
                  <div className="w-14 h-14 lg:w-16 lg:h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-900 shadow-xl border border-[#c2f575]/40 shrink-0">
                    <ShieldCheck size={28} className="lg:scale-125" />
                  </div>
                </div>

                <div className="pt-8 lg:pt-10 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-0 no-print">
                  <button
                    onClick={() => navigate('/')}
                    className="text-[10px] lg:text-[11px] font-black text-indigo-900 uppercase tracking-[0.2em] lg:tracking-[0.25em] flex items-center gap-3 hover:translate-x-2 transition-transform w-full sm:w-auto justify-center sm:justify-start"
                  >
                    Nunma Main Engine <ArrowRight size={18} />
                  </button>
                  <div className="flex gap-4 w-full sm:w-auto">
                    <button 
                      onClick={handlePrint}
                      className="flex-1 sm:flex-none p-4 bg-indigo-900 rounded-2xl text-white hover:bg-indigo-800 hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
                    >
                      <Download size={20} className="group-hover:-translate-y-1 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Download PDF</span>
                    </button>
                    <button className="p-4 bg-gray-50 rounded-2xl text-gray-400 hover:text-indigo-900 hover:bg-white hover:shadow-xl transition-all shrink-0 border border-gray-100">
                      <Share2 size={20} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

        <p className="mt-12 text-gray-400 text-[8px] lg:text-[9px] font-bold uppercase tracking-[0.4em] lg:tracking-[0.5em] text-center max-w-xs leading-relaxed no-print">
          SECURED BY NUNMA CRYPTOGRAPHIC RESEARCH UNIT <br /> OPENBADGES 3.0 / W3C VCs
        </p>
      </div>
    </>
  );
};

export default VerificationPortal;
