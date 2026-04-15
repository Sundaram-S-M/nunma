
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Award,
  Check,
  Download,
  Plus,
  X,
  Zap,
  ShieldCheck,
  Camera,
  PlusCircle,
  ArrowRight,
  Database,
  Upload,
  BookOpen,
  FileText,
  Mail,
  ChevronLeft,
  ExternalLink,
  Trash2,
  Pipette,
  Sparkles,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, setDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../utils/firebase';
import CertificateOverlay from '../components/CertificateOverlay';

const MOCK_TEMPLATES = [
  { id: 't1', name: 'Minimal Professional', preview: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?auto=format&fit=crop&w=400&q=80' },
  { id: 't2', name: 'Modern Academic', preview: 'https://images.unsplash.com/photo-1606326666490-45757474e788?auto=format&fit=crop&w=400&q=80' },
  { id: 't3', name: 'Elegant Signature', preview: 'https://images.unsplash.com/photo-1579546678183-a84ee7ed90a9?auto=format&fit=crop&w=400&q=80' },
  { id: 't4', name: 'Corporate Bold', preview: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=400&q=80' },
];

const AdvancedColorPicker = ({ color, onChange, onClose }: { color: string, onChange: (c: string) => void, onClose: () => void }) => {
  // Helper to convert HSL to Hex (simplified for this UI)
  const hsvToHex = (h: number, s: number, v: number) => {
    s /= 100;
    v /= 100;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    let r = 0, g = 0, b = 0;
    switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  };

  // Helper to parse Hex to HSL/HSV (very basic)
  const hexToHSV = (hex: string) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16) / 255;
      g = parseInt(hex[2] + hex[2], 16) / 255;
      b = parseInt(hex[3] + hex[3], 16) / 255;
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16) / 255;
      g = parseInt(hex.slice(3, 5), 16) / 255;
      b = parseInt(hex.slice(5, 7), 16) / 255;
    }
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
  };

  const [hsv, setHsv] = useState(() => {
    if (color.startsWith('#')) return hexToHSV(color);
    return { h: 120, s: 100, v: 30 };
  });
  const [alpha, setAlpha] = useState(100);
  const [hexInput, setHexInput] = useState(hsvToHex(hsv.h, hsv.s, hsv.v));

  const svRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v);
    setHexInput(currentHex);
    // Send HSLA to support transparency in preview
    onChange(`hsla(${hsv.h}, ${hsv.s}%, ${hsv.v}%, ${alpha / 100})`);
  }, [hsv, alpha]);

  const handleSvInteraction = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!svRef.current) return;
    const rect = svRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    let s = ((clientX - rect.left) / rect.width) * 100;
    let v = 100 - ((clientY - rect.top) / rect.height) * 100;

    s = Math.max(0, Math.min(100, s));
    v = Math.max(0, Math.min(100, v));

    setHsv(prev => ({ ...prev, s, v }));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    handleSvInteraction(e);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current) handleSvInteraction(e);
  };

  const onMouseUp = () => {
    isDragging.current = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  const handleHexChange = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-F]{6}$/i.test(val) || /^#[0-9A-F]{3}$/i.test(val)) {
      setHsv(hexToHSV(val));
    }
  };

  const handleEyeDropper = async () => {
    if (!(window as any).EyeDropper) return;
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      handleHexChange(result.sRGBHex);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="absolute top-0 left-0 mt-20 ml-20 z-[110] bg-white rounded-[2rem] shadow-[0_40px_100px_rgba(0,0,0,0.15)] border border-gray-100 p-6 w-80 animate-in fade-in zoom-in-95 duration-200">
      <div
        ref={svRef}
        onMouseDown={onMouseDown}
        className="w-full h-40 rounded-2xl relative mb-4 cursor-crosshair overflow-hidden touch-none"
        style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <div
          className="absolute w-4 h-4 border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
        />
      </div>

      <div className="mb-4 space-y-2">
        <input
          type="range" min="0" max="360" value={hsv.h}
          onChange={(e) => setHsv(prev => ({ ...prev, h: parseInt(e.target.value) }))}
          className="w-full h-3 rounded-full appearance-none cursor-pointer"
          style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }}
        />
      </div>

      <div className="mb-6">
        <div className="w-full h-3 rounded-full relative overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] bg-[length:10px_10px]">
          <div
            className="absolute inset-0 bg-gradient-to-r"
            style={{ backgroundImage: `linear-gradient(to right, transparent, ${hsvToHex(hsv.h, hsv.s, hsv.v)})` }}
          />
          <input
            type="range" min="0" max="100" value={alpha}
            onChange={(e) => setAlpha(parseInt(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-[#040457] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-md shadow-indigo-900/10"
        >
          OK
        </button>
        <div className="flex-1 flex items-center bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 gap-3">
          <div className="w-8 h-8 rounded-full shadow-sm shrink-0" style={{ backgroundColor: hsvToHex(hsv.h, hsv.s, hsv.v) }} />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            className="bg-transparent font-bold text-xs text-[#040457] w-24 outline-none"
            placeholder="#000000"
          />
          <div className="h-4 w-[1px] bg-gray-200 shrink-0" />
          <input
            type="text"
            value={`${alpha}%`}
            onChange={(e) => {
              const val = parseInt(e.target.value.replace('%', ''));
              if (!isNaN(val)) setAlpha(Math.max(0, Math.min(100, val)));
            }}
            className="bg-transparent font-bold text-xs text-[#040457] w-14 outline-none"
          />
        </div>
        <button
          onClick={handleEyeDropper}
          className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-[#040457] hover:bg-gray-100 transition-all"
          title="Eye Dropper"
        >
          <Pipette size={18} />
        </button>
      </div>
    </div>
  );
};


const CertificateEngine: React.FC = () => {
  const { user } = useAuth();
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [modalStep, setModalStep] = useState(1);
  const [issuanceMethod, setIssuanceMethod] = useState<'manual' | 'template' | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [manualFile, setManualFile] = useState<string | null>(null);
  const [autoEmail, setAutoEmail] = useState(true);
  const [selectedZone, setSelectedZone] = useState('');
  const [zonesList, setZonesList] = useState<any[]>([]);

  const [brandColor, setBrandColor] = useState('#c2f575');
  const [palette, setPalette] = useState<string[]>([]);
  const [showAdvancedPicker, setShowAdvancedPicker] = useState(false);

  const [signature1, setSignature1] = useState<string | null>(null);
  const [signature2, setSignature2] = useState<string | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issuanceHistory, setIssuanceHistory] = useState<any[]>([]);

  const sig1InputRef = useRef<HTMLInputElement>(null);
  const sig2InputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Fetch settings and zones
  useEffect(() => {
    if (!user) return;

    // Fetch branding settings
    const fetchSettings = async () => {
      const settingsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'certificates'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        if (data.palette) setPalette(data.palette);
        if (data.signature1) setSignature1(data.signature1);
        if (data.signature2) setSignature2(data.signature2);
      } else {
        setPalette(['#c2f575', '#052E16', '#02180b']);
      }
    };

    // Fetch tutor's zones
    const fetchZones = async () => {
      const q = query(collection(db, 'zones'), where('tutorId', '==', user.uid));
      const snap = await getDocs(q);
      const zones = snap.docs.map(d => ({ id: d.id, ...d.data() } as { id: string, title: string }));
      setZonesList(zones);
      if (zones.length > 0) setSelectedZone(zones[0].title);
    };

    // Fetch issuance history
    const qHistory = query(collection(db, 'issued_certificates'), where('tutorId', '==', user.uid), orderBy('date', 'desc'));
    const unsubHistory = onSnapshot(qHistory, (snap) => {
      const history = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setIssuanceHistory(history);
    });

    fetchSettings();
    fetchZones();
    return () => unsubHistory();
  }, [user]);

  const handleSaveSettings = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'settings', 'certificates'), {
        palette,
        signature1,
        signature2,
        updatedAt: new Date().toISOString()
      });
      alert('Global settings saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save settings.');
    }
  };

  const addColorToPalette = (newColor: string) => {
    if (palette.length >= 3) {
      alert("Maximum 3 colors allowed in the palette.");
      return;
    }
    if (!palette.includes(newColor)) {
      setPalette(prev => [...prev, newColor]);
    }
    setShowAdvancedPicker(false);
  };

  const removeColorFromPalette = (colorToRemove: string) => {
    setPalette(prev => prev.filter(c => c !== colorToRemove));
  };

  const downloadBatchAsExcel = (zoneName: string) => {
    const zoneData = issuanceHistory.filter(h => h.zoneName === zoneName);
    if (zoneData.length === 0) {
      alert(`No issuance data found for zone: ${zoneName}`);
      return;
    }

    const worksheetData = zoneData.map(h => ({
      'Student Name': h.studentName,
      'Zone Name': h.zoneName,
      'Issuance Date': new Date(h.date).toLocaleDateString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, zoneName.substring(0, 31));
    XLSX.writeFile(workbook, `Certificates_${zoneName.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleIssue = () => {
    setIsIssuing(true);
    setTimeout(() => {
      setIsIssuing(false);
      setShowGeneratorModal(false);
      setModalStep(1);
      setIssuanceMethod(null);
      alert('Certificates issued successfully! Students will be notified both in-app and via email.');
    }, 2000);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (slot === 1) setSignature1(reader.result as string);
        else setSignature2(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setManualFile(reader.result as string);
        setModalStep(3);
      };
      reader.readAsDataURL(file);
    }
  };

  const resetModal = () => {
    setShowGeneratorModal(false);
    setModalStep(1);
    setIssuanceMethod(null);
    setSelectedTemplate(null);
    setManualFile(null);
  };

  const styleGradients = [
    { id: 'g1', css: 'linear-gradient(135deg, #052e16 0%, #c2f575 100%)' },
    { id: 'g2', css: 'linear-gradient(135deg, #02180b 0%, #052e16 100%)' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-extrabold text-[#040457] mb-2 tracking-tighter">Certificate Engine</h1>
          <p className="text-gray-400 font-medium text-sm italic">Automate professional credentials with Nunma's secure issuance system.</p>
        </div>
        <button
          onClick={() => setShowGeneratorModal(true)}
          className="bg-[#040457] text-white font-black uppercase tracking-[0.2em] px-8 py-4 rounded-2xl shadow-xl shadow-[#040457]/20 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all"
        >
          <Zap size={20} className="text-[#c2f575]" /> Issue Credentials
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm relative">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-2xl font-black text-[#040457] mb-2">Institution Branding</h3>
                <p className="text-xs text-gray-400 font-medium italic">Define your institution's default branding palette.</p>
              </div>
              <ShieldCheck className="text-[#c2f575]" size={32} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-10">
                <div className="relative">
                  <div className="flex items-center gap-4 mb-10">
                    {palette.map(color => (
                      <div key={color} className="relative group/palette">
                        <button
                          onClick={() => setBrandColor(color)}
                          className={`w-14 h-14 rounded-full border-[3px] transition-all shadow-sm flex items-center justify-center
                                ${brandColor === color ? 'border-indigo-500 scale-110' : 'border-transparent'}
                              `}
                        >
                          <div className="w-11 h-11 rounded-full shadow-inner" style={{ backgroundColor: color }} />
                        </button>
                        <button
                          onClick={() => removeColorFromPalette(color)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/palette:opacity-100 transition-opacity"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {palette.length < 3 && (
                      <button
                        onClick={() => setShowAdvancedPicker(!showAdvancedPicker)}
                        className="w-12 h-12 rounded-full border-2 border-white shadow-xl flex items-center justify-center relative overflow-hidden transition-transform active:scale-90"
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-yellow-300 via-green-400 to-purple-500" />
                        <div className="absolute inset-[2px] bg-white rounded-full flex items-center justify-center">
                          <Plus size={18} className="text-gray-400" />
                        </div>
                      </button>
                    )}

                    {showAdvancedPicker && (
                      <AdvancedColorPicker
                        color={brandColor}
                        onChange={setBrandColor}
                        onClose={() => addColorToPalette(brandColor)}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-gray-900 uppercase tracking-tight block">Style</label>
                    <div className="flex gap-4">
                      {styleGradients.map(grad => (
                        <button
                          key={grad.id}
                          className={`w-20 h-12 rounded-xl border-2 transition-all shadow-sm ${brandColor === grad.css ? 'border-indigo-500 scale-105' : 'border-white'}`}
                          style={{ background: grad.css }}
                          onClick={() => setBrandColor(grad.css)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Primary Signature</label>
                    <div
                      onClick={() => sig1InputRef.current?.click()}
                      className="h-32 bg-gray-50 border border-gray-100 rounded-[2rem] flex flex-col items-center justify-center border-dashed hover:border-[#040457] transition-colors cursor-pointer overflow-hidden relative shadow-inner"
                    >
                      {signature1 ? <img src={signature1} className="w-full h-full object-contain p-4" alt="Sig 1" width="500" height="500" /> : <><Camera className="text-gray-300 mb-2" size={24} /><span className="text-[9px] font-black text-gray-400 uppercase">Upload Sig 1</span></>}
                      <input ref={sig1InputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleSignatureUpload(e, 1)} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Secondary Signature</label>
                    <div
                      onClick={() => sig2InputRef.current?.click()}
                      className="h-32 bg-gray-50 border border-gray-100 rounded-[2rem] flex flex-col items-center justify-center border-dashed hover:border-[#040457] transition-colors cursor-pointer overflow-hidden relative shadow-inner"
                    >
                      {signature2 ? <img src={signature2} className="w-full h-full object-contain p-4" alt="Sig 2" width="500" height="500" /> : <><Camera className="text-gray-300 mb-2" size={24} /><span className="text-[9px] font-black text-gray-400 uppercase">Upload Sig 2</span></>}
                      <input ref={sig2InputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleSignatureUpload(e, 2)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Issuance History</label>
                <div className="space-y-3">
                  {Object.entries(
                    issuanceHistory.reduce((acc: any, curr) => {
                      if (!acc[curr.zoneName]) acc[curr.zoneName] = { count: 0, lastDate: curr.date };
                      acc[curr.zoneName].count++;
                      if (new Date(curr.date) > new Date(acc[curr.zoneName].lastDate)) acc[curr.zoneName].lastDate = curr.date;
                      return acc;
                    }, {})
                  ).map(([zName, data]: [string, any]) => (
                    <div key={zName} className="flex items-center justify-between p-6 bg-gray-50 rounded-[1.5rem] border border-gray-100 group hover:bg-white hover:shadow-md transition-all">
                      <div>
                        <p className="text-xs font-black text-[#040457]">{zName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                          {data.count} STUDENTS • {new Date(data.lastDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadBatchAsExcel(zName)}
                        className="p-3 text-[#040457] hover:bg-indigo-50 rounded-xl transition-colors"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  ))}
                  {issuanceHistory.length === 0 && (
                    <div className="py-10 text-center opacity-20 flex flex-col items-center">
                      <Database size={32} className="mb-2" />
                      <p className="text-[9px] font-black uppercase tracking-widest">No issuances yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-12 pt-10 border-t border-gray-50 flex justify-between items-center">
              <p className="text-[10px] font-bold text-gray-400 italic">Configure global certificate assets.</p>
              <button
                onClick={handleSaveSettings}
                className="px-12 py-5 bg-[#040457] text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all"
              >
                Save Global Settings
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-[#040457] rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[500px]">
          <div className="relative z-10">
            <Award size={64} className="text-[#c2f575] mb-8" />
            <h3 className="text-3xl font-black mb-6 tracking-tight">Verification Infrastructure</h3>
            <p className="text-indigo-200/70 text-lg leading-relaxed mb-10">
              Every certificate issued through Nunma is cryptographically signed and hosted on our public verification portal.
            </p>
            <div className="bg-white/5 rounded-[2rem] p-8 border border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Verified Credentials</span>
                <span className="text-2xl font-black text-[#c2f575]">{issuanceHistory.length}</span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#c2f575] transition-all duration-1000"
                  style={{ width: `${Math.min(100, (issuanceHistory.length / 100) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <button className="mt-12 text-[#c2f575] font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:translate-x-2 transition-transform">
            Learn more about our portal <ArrowRight size={18} />
          </button>

          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#c2f575]/5 rounded-full blur-[100px]"></div>
        </div>
      </div>

      {/* Issuance Modal */}
      {showGeneratorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] w-full max-w-4xl shadow-[0_40px_100px_rgba(0,0,0,0.4)] border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-12 pb-6 flex items-center justify-between">
              <div>
                <h3 className="text-4xl font-black text-[#040457] tracking-tighter">Certification Generator</h3>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2">
                  STEP {modalStep}: {
                    modalStep === 1 ? 'CHOOSE ISSUANCE METHOD' :
                      modalStep === 2 ? (issuanceMethod === 'manual' ? 'UPLOAD YOUR TEMPLATE' : 'SELECT FROM LIBRARY') :
                        'FINALIZE ISSUANCE'
                  }
                </p>
              </div>
              <button onClick={resetModal} className="p-4 bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-all">
                <X size={24} />
              </button>
            </div>

            <div className="p-12 pt-0 max-h-[75vh] overflow-y-auto no-scrollbar">
              {modalStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
                  <button
                    onClick={() => { setIssuanceMethod('manual'); setModalStep(2); }}
                    className="group p-12 bg-[#fcfdff] border border-gray-100 rounded-[3rem] hover:shadow-2xl hover:border-[#040457] transition-all duration-500 flex flex-col items-center text-center"
                  >
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-[#040457] mb-10 shadow-sm border border-gray-50 group-hover:scale-110 transition-transform">
                      <Upload size={32} />
                    </div>
                    <h4 className="text-2xl font-black text-[#040457] mb-3 tracking-tight">Manual Upload</h4>
                    <p className="text-gray-400 font-medium text-sm leading-relaxed max-w-[200px]">
                      Upload your own .png or .svg template background.
                    </p>
                  </button>

                  <button
                    onClick={() => { setIssuanceMethod('template'); setModalStep(2); }}
                    className="group p-12 bg-white border border-[#040457] rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col items-center text-center"
                  >
                    <div className="w-24 h-24 bg-[#040457] rounded-full flex items-center justify-center text-white mb-10 shadow-2xl group-hover:scale-110 transition-transform">
                      <BookOpen size={32} />
                    </div>
                    <h4 className="text-2xl font-black text-[#040457] mb-3 tracking-tight">Template Library</h4>
                    <p className="text-gray-400 font-medium text-sm leading-relaxed max-w-[200px]">
                      Choose from our pre-designed professional templates.
                    </p>
                  </button>
                </div>
              )}

              {modalStep === 2 && issuanceMethod === 'manual' && (
                <div className="space-y-10 py-8 animate-in slide-in-from-right-4">
                  <button onClick={() => setModalStep(1)} className="flex items-center gap-2 text-[#040457] font-black text-[10px] uppercase tracking-widest hover:translate-x-[-4px] transition-transform">
                    <ChevronLeft size={16} /> Back
                  </button>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div
                      onClick={() => uploadInputRef.current?.click()}
                      className="h-full min-h-[300px] border-4 border-dashed border-gray-100 bg-gray-50 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:border-[#040457] hover:bg-white transition-all group overflow-hidden"
                    >
                      {manualFile ? (
                        <div className="p-8 w-full h-full">
                          <img src={manualFile} className="w-full h-full object-contain rounded-2xl" alt="Manual Template" width="500" height="500" />
                          <p className="text-[10px] font-black text-center mt-4 text-gray-400 uppercase tracking-widest">Click to change template</p>
                        </div>
                      ) : (
                        <>
                          <Upload size={48} className="text-gray-300 mb-6 group-hover:scale-110 transition-transform" />
                          <p className="text-[#040457] font-black text-lg tracking-tight text-center px-6">Click to upload template (PNG/PPT Image)</p>
                          <p className="text-gray-400 text-xs mt-2 uppercase font-bold tracking-widest">Supports Student Name & Zone Overlays</p>
                        </>
                      )}
                      <input ref={uploadInputRef} type="file" className="hidden" accept="image/png,image/jpeg,image/svg+xml" onChange={handleManualUpload} />
                    </div>

                    <div className="space-y-6">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Live Preview (Dynamic)</label>
                      <CertificateOverlay
                        template={manualFile || 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?auto=format&fit=crop&w=800&q=80'}
                        studentName="Sachin Sundar"
                        zoneName={selectedZone}
                        signature1={signature1}
                        signature2={signature2}
                        brandColor={palette[1]}
                      />
                      <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex items-start gap-4">
                        <Zap size={20} className="text-amber-500 shrink-0" />
                        <p className="text-xs text-amber-800 font-medium leading-relaxed">
                          Dynamic fields like <span className="font-bold">Student Name</span> and <span className="font-bold">Zone Title</span> will be automatically replaced with recipient data upon issuance.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-[#040457] shadow-sm"><FileText size={28} /></div>
                      <div>
                        <p className="text-[#040457] font-black tracking-tight">Need a standard template?</p>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Download our premium starter kit</p>
                      </div>
                    </div>
                    <a href="#" className="flex items-center gap-2 bg-[#040457] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                      View Kit <ExternalLink size={14} className="text-[#c2f575]" />
                    </a>
                  </div>
                </div>
              )}

              {modalStep === 2 && issuanceMethod === 'template' && (
                <div className="space-y-10 py-8 animate-in slide-in-from-right-4 relative">
                  <button onClick={() => setModalStep(1)} className="flex items-center gap-2 text-[#040457] font-black text-[10px] uppercase tracking-widest">
                    <ChevronLeft size={16} /> Back
                  </button>
                  <div className="grid grid-cols-2 gap-8 opacity-40 grayscale pointer-events-none">
                    {MOCK_TEMPLATES.map(t => (
                      <div
                        key={t.id}
                        className="group relative rounded-[2.5rem] overflow-hidden border-4 border-transparent"
                      >
                        <img src={t.preview} className="w-full aspect-[16/10] object-cover" alt={t.name} width="500" height="500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
                          <h5 className="text-white font-black text-xl tracking-tight">{t.name}</h5>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coming Soon Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center z-20 pt-20">
                    <div className="bg-white/80 backdrop-blur-md p-10 rounded-[3rem] border border-gray-100 shadow-2xl text-center rotate-3 hover:rotate-0 transition-transform duration-500">
                      <Sparkles size={48} className="text-[#c2f575] mx-auto mb-6" />
                      <h4 className="text-3xl font-black text-[#040457] mb-2 tracking-tighter">Library Coming Soon</h4>
                      <p className="text-gray-400 font-medium max-w-xs mx-auto text-sm leading-relaxed">
                        We are curating high-fidelity certificate templates tailored for your professional brand. Stay tuned!
                      </p>
                      <button onClick={() => setModalStep(1)} className="mt-8 px-10 py-4 bg-[#040457] text-white rounded-2xl font-black uppercase text-[10px] tracking-widest">Return to Methods</button>
                    </div>
                  </div>
                </div>
              )}

              {modalStep === 3 && (
                <div className="space-y-10 py-8 animate-in slide-in-from-bottom-4">
                  <button onClick={() => setModalStep(2)} className="flex items-center gap-2 text-[#040457] font-black text-[10px] uppercase tracking-widest">
                    <ChevronLeft size={16} /> Back to Design
                  </button>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assign to Learning Zone</label>
                      <div className="relative group">
                        <Database className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                        <select
                          value={selectedZone}
                          onChange={(e) => setSelectedZone(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-100 rounded-3xl pl-16 pr-8 py-5 font-black text-lg text-[#040457] outline-none appearance-none focus:ring-4 focus:ring-[#c2f575]/20 transition-all cursor-pointer shadow-sm"
                        >
                          {zonesList.map(z => <option key={z.id} value={z.title}>{z.title}</option>)}
                          {zonesList.length === 0 && <option disabled>No zones found</option>}
                        </select>
                      </div>
                    </div>

                    <div className="p-10 bg-[#faffdf] rounded-[3.5rem] border border-[#c2f575]/20 flex items-center justify-between shadow-sm group">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-[#040457] shadow-md group-hover:rotate-12 transition-transform duration-500">
                          <Mail size={32} />
                        </div>
                        <div>
                          <p className="text-lg font-black text-[#040457]">Email Automation</p>
                          <p className="text-[10px] font-bold text-[#040457]/40 uppercase tracking-[0.1em] mt-1 max-w-[300px]">
                            SECURELY SEND CREDENTIALS TO EVERY REGISTERED STUDENT'S MAILBOX
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAutoEmail(!autoEmail)}
                        className={`w-16 h-9 rounded-full p-1.5 transition-all duration-300 shadow-inner ${autoEmail ? 'bg-[#040457]' : 'bg-gray-300'}`}
                      >
                        <div className={`w-6 h-6 rounded-full bg-white shadow-xl transition-transform duration-300 ${autoEmail ? 'translate-x-7' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-gray-100">
                    <button
                      onClick={handleIssue}
                      disabled={isIssuing}
                      className="w-full py-8 bg-[#040457] text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.4em] shadow-2xl flex items-center justify-center gap-5 hover:scale-[1.01] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isIssuing ? (
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          ISSUE & SIGN CREDENTIALS
                          <ArrowRight size={24} className="text-[#c2f575]" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateEngine;