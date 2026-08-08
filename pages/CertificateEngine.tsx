
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { db, functions } from '../utils/firebase';
import { httpsCallable } from 'firebase/functions';
import { formatDate } from '../utils/dateUtils';
import CertificateTemplate from '../components/CertificateTemplate';
import CertificateOverlay from '../components/CertificateOverlay';
import html2canvas from 'html2canvas';

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
          className="px-4 py-2 bg-nunma-forest text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-md shadow-indigo-900/10"
        >
          OK
        </button>
        <div className="flex-1 flex items-center bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 gap-3">
          <div className="w-8 h-8 rounded-full shadow-sm shrink-0" style={{ backgroundColor: hsvToHex(hsv.h, hsv.s, hsv.v) }} />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexChange(e.target.value)}
            className="bg-transparent font-bold text-xs text-nunma-forest w-24 outline-none"
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
            className="bg-transparent font-bold text-xs text-nunma-forest w-14 outline-none"
          />
        </div>
        <button
          onClick={handleEyeDropper}
          className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-nunma-forest hover:bg-gray-100 transition-all"
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
  const navigate = useNavigate();
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
  const [institutionLogo, setInstitutionLogo] = useState<string | null>(null);
  const [isIssuing, setIsIssuing] = useState(false);
  const [issuanceHistory, setIssuanceHistory] = useState<any[]>([]);

  const sig1InputRef = useRef<HTMLInputElement>(null);
  const sig2InputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
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
        if (data.institutionLogo) setInstitutionLogo(data.institutionLogo);
      } else {
        setPalette(['#052E16', '#bbf7d0']);
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
        institutionLogo,
        updatedAt: new Date().toISOString()
      });
      alert('Global settings saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save settings.');
    }
  };

  const addColorToPalette = (newColor: string) => {
    if (palette.length >= 2) {
      alert("Maximum 2 colors allowed in the palette.");
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

    const headers = ['Student Name', 'Zone Name', 'Issuance Date'];
    const rows = zoneData.map(h => `
      <tr>
        <td>${h.studentName}</td>
        <td>${h.zoneName}</td>
        <td>${formatDate(h.date)}</td>
      </tr>
    `);

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${zoneName.substring(0, 31).replace(/[^a-zA-Z0-9 ]/g, '')}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          .header { background-color: #C2F575; color: #052E16; font-weight: bold; text-align: left; padding: 5px; }
          td { padding: 5px; white-space: nowrap; }
        </style>
      </head>
      <body>
        <table border="1">
          <tr>
            <td rowspan="4" colspan="3" style="border:none; text-align:left; vertical-align:top;">
              <img src="${window.location.origin}/assets/logo-full.png" alt="Nunma" height="60" />
            </td>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
          </tr>
          <tr>
            <td style="border:none; font-weight:bold; color:#052E16;">Zone Name</td>
            <td style="border:none;">${zoneName}</td>
          </tr>
          <tr>
            <td style="border:none; font-weight:bold; color:#052E16;">User Name</td>
            <td style="border:none;">${user?.name || 'Tutor'}</td>
          </tr>
          <tr>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
          </tr>
          <tr>
            ${headers.map(h => `<th class="header">${h}</th>`).join('')}
          </tr>
          ${rows.join('\n')}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Certificates_${zoneName.replace(/\\s+/g, '_')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleIssue = async () => {
    setIsIssuing(true);
    try {
      const zone = zonesList.find(z => z.title === selectedZone);
      if (!zone) {
        alert("Selected zone not found.");
        setIsIssuing(false);
        return;
      }
      const zoneId = zone.id;
      
      const studentsSnap = await getDocs(collection(db, 'zones', zoneId, 'students'));
      const activeStudentIds = studentsSnap.docs
        .filter(docSnap => docSnap.data().status === 'active')
        .map(docSnap => docSnap.id);

      if (activeStudentIds.length === 0) {
        alert("No active students found in this Zone to issue certificates to.");
        setIsIssuing(false);
        return;
      }

      const registerFn = httpsCallable(functions, 'registerIssuance');
      let successCount = 0;
      let failCount = 0;

      for (const studentUid of activeStudentIds) {
        try {
          await registerFn({ zoneId, studentUid });
          successCount++;
        } catch (err: any) {
          console.error(`Failed to issue certificate to student ${studentUid}:`, err);
          if (err.message && err.message.includes("already exists")) {
            successCount++;
          } else {
            failCount++;
          }
        }
      }

      setIsIssuing(false);
      setShowGeneratorModal(false);
      setModalStep(1);
      setIssuanceMethod(null);
      
      if (failCount === 0) {
        alert(`Certificates issued successfully to all ${successCount} active students!`);
      } else {
        alert(`Successfully issued to ${successCount} students. Failed for ${failCount} students.`);
      }
    } catch (e: any) {
      console.error("Global crash in issuing certificates:", e);
      alert(`Issuance failed: ${e.message || e}`);
      setIsIssuing(false);
    }
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInstitutionLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setManualFile(url);
    }
  };

  const handleDownloadMockup = async () => {
    const node = document.getElementById('certificate-preview-node');
    if (!node) return;
    try {
      const canvas = await html2canvas(node, { scale: 2, useCORS: true, backgroundColor: null });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'certificate-reference-mockup.png';
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Failed to capture certificate:', e);
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
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-gray-400 hover:text-nunma-forest font-black text-[10px] uppercase tracking-widest mb-6 transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <h1 className="text-4xl font-extrabold text-nunma-forest mb-2 tracking-tighter">Certificate Engine</h1>
          <p className="text-gray-400 font-medium text-sm italic">Automate professional credentials with Nunma's secure issuance system.</p>
        </div>
        <button
          onClick={() => setShowGeneratorModal(true)}
          className="bg-nunma-forest text-white font-black uppercase tracking-[0.2em] px-8 py-4 rounded-2xl shadow-xl shadow-nunma-forest/20 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all"
        >
          <Zap size={20} className="text-[#c2f575]" /> Issue Credentials
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm relative">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-2xl font-black text-nunma-forest mb-2">Institution Branding</h3>
                <p className="text-xs text-gray-400 font-medium italic">Define your institution's default branding palette.</p>
              </div>
              <ShieldCheck className="text-[#c2f575]" size={32} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="relative">
                  <div className="flex items-center gap-4 mb-6">
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
                    {palette.length < 2 && (
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Institution Logo</label>
                    <div
                      onClick={() => logoInputRef.current?.click()}
                      className="h-32 bg-gray-50 border border-gray-100 rounded-[2rem] flex flex-col items-center justify-center border-dashed hover:border-nunma-forest transition-colors cursor-pointer overflow-hidden relative shadow-inner"
                    >
                      {institutionLogo ? <img src={institutionLogo} className="w-full h-full object-contain p-4" alt="Logo" /> : <><Camera className="text-gray-300 mb-2" size={24} /><span className="text-[9px] font-black text-gray-400 uppercase">Upload Logo</span></>}
                      <input ref={logoInputRef} type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Primary Signature</label>
                    <div
                      onClick={() => sig1InputRef.current?.click()}
                      className="h-32 bg-gray-50 border border-gray-100 rounded-[2rem] flex flex-col items-center justify-center border-dashed hover:border-nunma-forest transition-colors cursor-pointer overflow-hidden relative shadow-inner"
                    >
                      {signature1 ? <img src={signature1} className="w-full h-full object-contain p-4" alt="Sig 1" /> : <><Camera className="text-gray-300 mb-2" size={24} /><span className="text-[9px] font-black text-gray-400 uppercase">Upload Sig 1</span></>}
                      <input ref={sig1InputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleSignatureUpload(e, 1)} />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Secondary Signature</label>
                    <div
                      onClick={() => sig2InputRef.current?.click()}
                      className="h-32 bg-gray-50 border border-gray-100 rounded-[2rem] flex flex-col items-center justify-center border-dashed hover:border-nunma-forest transition-colors cursor-pointer overflow-hidden relative shadow-inner"
                    >
                      {signature2 ? <img src={signature2} className="w-full h-full object-contain p-4" alt="Sig 2" /> : <><Camera className="text-gray-300 mb-2" size={24} /><span className="text-[9px] font-black text-gray-400 uppercase">Upload Sig 2</span></>}
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
                        <p className="text-xs font-black text-nunma-forest">{zName}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                          {data.count} STUDENTS • {formatDate(data.lastDate)}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadBatchAsExcel(zName)}
                        className="p-3 text-nunma-forest hover:bg-indigo-50 rounded-xl transition-colors"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  ))}
                  {issuanceHistory.length === 0 && (
                    <div className="py-6 text-center opacity-20 flex flex-col items-start md:items-center">
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
                className="px-12 py-5 bg-nunma-forest text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:brightness-110 active:scale-95 transition-all"
              >
                Save Global Settings
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-nunma-forest rounded-[3rem] p-12 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[500px]">
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
                <h3 className="text-4xl font-black text-nunma-forest tracking-tighter">Certification Generator</h3>
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
                    className="group p-12 bg-[#fcfdff] border border-gray-100 rounded-[3rem] hover:shadow-2xl hover:border-nunma-forest transition-all duration-500 flex flex-col items-center text-center"
                  >
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-nunma-forest mb-10 shadow-sm border border-gray-50 group-hover:scale-110 transition-transform">
                      <Upload size={32} />
                    </div>
                    <h4 className="text-2xl font-black text-nunma-forest mb-3 tracking-tight">Manual Upload</h4>
                    <p className="text-gray-400 font-medium text-sm leading-relaxed max-w-[200px]">
                      Upload your own .png or .svg template background.
                    </p>
                  </button>

                  <button
                    onClick={() => { setIssuanceMethod('template'); setModalStep(2); }}
                    className="group p-12 bg-white border border-nunma-forest rounded-[3rem] shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col items-center text-center"
                  >
                    <div className="w-24 h-24 bg-nunma-forest rounded-full flex items-center justify-center text-white mb-10 shadow-2xl group-hover:scale-110 transition-transform">
                      <BookOpen size={32} />
                    </div>
                    <h4 className="text-2xl font-black text-nunma-forest mb-3 tracking-tight">Template Library</h4>
                    <p className="text-gray-400 font-medium text-sm leading-relaxed max-w-[200px]">
                      Choose from our pre-designed professional templates.
                    </p>
                  </button>
                </div>
              )}

              {modalStep === 2 && issuanceMethod === 'manual' && (
                <div className="space-y-10 py-8 animate-in slide-in-from-right-4">
                  <button onClick={() => setModalStep(1)} className="flex items-center gap-2 text-nunma-forest font-black text-[10px] uppercase tracking-widest hover:translate-x-[-4px] transition-transform">
                    <ChevronLeft size={16} /> Back
                  </button>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div
                      onClick={() => uploadInputRef.current?.click()}
                      className="h-full min-h-[300px] border-4 border-dashed border-gray-100 bg-gray-50 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:border-nunma-forest hover:bg-white transition-all group overflow-hidden"
                    >
                      {manualFile ? (
                        <div className="p-8 w-full h-full flex flex-col items-center justify-center">
                          <img src={manualFile} className="w-full h-full object-contain rounded-2xl" alt="Custom Template Background" />
                          <p className="text-[10px] font-black text-center mt-4 text-gray-400 uppercase tracking-widest">Click to change background</p>
                        </div>
                      ) : (
                        <>
                          <Upload size={48} className="text-gray-300 mb-6 group-hover:scale-110 transition-transform" />
                          <p className="text-nunma-forest font-black text-lg tracking-tight text-center px-6">Click to upload Custom Background Template</p>
                          <p className="text-gray-400 text-xs mt-2 uppercase font-bold tracking-widest">Supports Student Name Overlay (PNG/JPG)</p>
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

                  <div className="bg-indigo-50/50 p-6 md:p-8 rounded-[2.5rem] border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-nunma-forest shadow-sm"><FileText size={28} /></div>
                      <div>
                        <p className="text-nunma-forest font-black tracking-tight text-center md:text-left">Perfect your design?</p>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1 text-center md:text-left">Download reference or continue</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                      <button onClick={handleDownloadMockup} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-nunma-forest px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm border border-gray-100">
                        <Download size={14} className="text-nunma-forest" /> Download Mockup
                      </button>
                      <button onClick={() => setModalStep(3)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-nunma-forest text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
                        Continue to Issue <ArrowRight size={14} className="text-[#c2f575]" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {modalStep === 2 && issuanceMethod === 'template' && (
                <div className="space-y-10 py-8 animate-in slide-in-from-right-4">
                  <button onClick={() => setModalStep(1)} className="flex items-center gap-2 text-nunma-forest font-black text-[10px] uppercase tracking-widest hover:translate-x-[-4px] transition-transform">
                    <ChevronLeft size={16} /> Back
                  </button>

                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Built-in Template (Selected)</label>
                        <h4 className="text-2xl font-black text-nunma-forest tracking-tight">Modern Academic</h4>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl flex items-center gap-2">
                        <Zap size={16} className="text-amber-500" />
                        <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Dynamic Auto-Fill Active</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-100 rounded-[3rem] p-4 md:p-8">
                      <CertificateTemplate
                        studentName="Sachin Sundar"
                        courseName={selectedZone}
                        tutorName={user?.name || "Course Director"}
                        issueDate={new Date().toLocaleDateString()}
                        logoUrl={institutionLogo || undefined}
                        signatureUrl={signature1 || undefined}
                        brandColorPrimary={palette[0] || '#052E16'}
                        brandColorSecondary={palette[1] || '#bbf7d0'}
                      />
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 p-6 md:p-8 rounded-[2.5rem] border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-nunma-forest shadow-sm"><FileText size={28} /></div>
                      <div>
                        <p className="text-nunma-forest font-black tracking-tight text-center md:text-left">Perfect your design?</p>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1 text-center md:text-left">Download reference or continue</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                      <button onClick={handleDownloadMockup} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-nunma-forest px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm border border-gray-100">
                        <Download size={14} className="text-nunma-forest" /> Download Mockup
                      </button>
                      <button onClick={() => setModalStep(3)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-nunma-forest text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
                        Continue to Issue <ArrowRight size={14} className="text-[#c2f575]" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {modalStep === 3 && (
                <div className="space-y-10 py-8 animate-in slide-in-from-bottom-4">
                  <button onClick={() => setModalStep(2)} className="flex items-center gap-2 text-nunma-forest font-black text-[10px] uppercase tracking-widest">
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
                          className="w-full bg-gray-50 border border-gray-100 rounded-3xl pl-16 pr-8 py-5 font-black text-lg text-nunma-forest outline-none appearance-none focus:ring-4 focus:ring-[#c2f575]/20 transition-all cursor-pointer shadow-sm"
                        >
                          {zonesList.map(z => <option key={z.id} value={z.title}>{z.title}</option>)}
                          {zonesList.length === 0 && <option disabled>No zones found</option>}
                        </select>
                      </div>
                    </div>

                    <div className="p-10 bg-[#faffdf] rounded-[3.5rem] border border-[#c2f575]/20 flex items-center justify-between shadow-sm group">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-nunma-forest shadow-md group-hover:rotate-12 transition-transform duration-500">
                          <Mail size={32} />
                        </div>
                        <div>
                          <p className="text-lg font-black text-nunma-forest">Email Automation</p>
                          <p className="text-[10px] font-bold text-nunma-forest/40 uppercase tracking-[0.1em] mt-1 max-w-[300px]">
                            SECURELY SEND CREDENTIALS TO EVERY REGISTERED STUDENT'S MAILBOX
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setAutoEmail(!autoEmail)}
                        className={`w-16 h-9 rounded-full p-1.5 transition-all duration-300 shadow-inner ${autoEmail ? 'bg-nunma-forest' : 'bg-gray-300'}`}
                      >
                        <div className={`w-6 h-6 rounded-full bg-white shadow-xl transition-transform duration-300 ${autoEmail ? 'translate-x-7' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-gray-100">
                    <button
                      onClick={handleIssue}
                      disabled={isIssuing}
                      className="w-full py-8 bg-nunma-forest text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.4em] shadow-2xl flex items-center justify-center gap-5 hover:scale-[1.01] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
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