
import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MonitorPlay,
  Mail,
  Briefcase,
  Layers,
  ChevronLeft,
  ChevronRight,
  Share2,
  ShoppingBag,
  X
} from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { AddonManagerModal } from './AddonManagerModal';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const LogoIcon = () => (
  <Link to="/dashboard">
    <img src="/assets/logo-icon.png" alt="Nunma Logo" className="w-10 h-10 shrink-0 object-contain" />
  </Link>
);

const LogoFull = () => (
  <Link to="/dashboard" className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
    <img src="/assets/logo-full.png" alt="Nunma Logo" className="h-10 shrink-0 object-contain" />
  </Link>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || UserRole.STUDENT;
  const currentTier = (user as any)?.current_tier || 'STARTER';

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showAddonModal, setShowAddonModal] = useState(false);

  const storageLimitRaw = user?.subscription_entitlements?.storageLimit || 104857600;
  const storageUsedRaw = user?.subscription_entitlements?.storageUsed || 0;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const storageLimitStr = formatBytes(storageLimitRaw);
  const storageUsedStr = formatBytes(storageUsedRaw);
  const storagePercent = storageLimitRaw > 0 ? Math.round((storageUsedRaw / storageLimitRaw) * 100) : 0;

  const commonLinks = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard', label: 'Dashboard' },
    {
      id: 'classroom',
      icon: role === UserRole.STUDENT ? <MonitorPlay size={20} /> : <Briefcase size={20} />,
      path: role === UserRole.STUDENT ? '/classroom' : '/workplace',
      label: role === UserRole.STUDENT ? 'My Classroom' : 'My Workplace'
    },
    { id: 'explore', icon: <Layers size={20} />, path: '/explore', label: 'Explore' },
    { id: 'inbox', icon: <Mail size={20} />, path: '/inbox', label: 'Inbox' },
    ...(role === UserRole.TUTOR && user?.onboardingCompleted ? [
      { id: 'products', icon: <ShoppingBag size={20} />, path: '/products', label: 'Products' }
    ] : [])
  ];

  return (
    <>
      <aside
        className={`bg-white border-r border-gray-100 flex flex-col sticky top-0 h-screen transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] z-40 relative
        ${isOpen ? 'w-64' : 'w-20'}
      `}
      >
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 bg-white border border-gray-100 rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:shadow-lg transition-all z-50 text-gray-400 hover:text-indigo-900"
        >
          {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        <div className="p-5 flex items-center h-24 overflow-hidden">
          {isOpen ? <LogoFull /> : <div className="flex justify-center w-full scale-75 transition-transform"><LogoIcon /></div>}
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto custom-scrollbar overflow-x-hidden">
          <div className="mb-6">
            {isOpen && (
              <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 animate-in fade-in duration-500">
                Personal
              </p>
            )}
            {commonLinks.map((link) => (
              <NavLink
                key={link.id}
                to={link.path}
                className={({ isActive }) => `
                flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative
                ${isActive
                    ? 'bg-[#c2f575] text-[#1A1A4E] shadow-sm font-bold'
                    : 'text-gray-500 hover:bg-gray-50'
                  }
              `}
              >
                <span className={`shrink-0 transition-all duration-300 ${!isOpen && 'mx-auto group-hover:scale-110'}`}>{link.icon}</span>
                <span className={`truncate text-sm transition-all duration-500 origin-left ${isOpen ? 'opacity-100 scale-100 w-auto' : 'opacity-0 scale-90 w-0 pointer-events-none'}`}>
                  {link.label}
                </span>
                {!isOpen && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#1A1A4E] text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50 translate-x-2 group-hover:translate-x-0">
                    {link.label}
                  </div>
                )}
              </NavLink>
            ))}
          </div>

          {role === UserRole.TUTOR && (
            <div className="mt-4 border-t border-gray-50 pt-6">
              <Link
                to="/u/sundaram"
                target="_blank"
                className="flex items-center gap-4 px-4 py-3 rounded-xl text-indigo-900 bg-indigo-50/50 hover:bg-[#c2f575]/20 transition-all duration-300 group relative"
              >
                <span className={`shrink-0 transition-all duration-300 ${!isOpen && 'mx-auto'}`}><Share2 size={20} className="text-[#1A1A4E]" /></span>
                <span className={`truncate text-[10px] font-black uppercase tracking-widest transition-all duration-500 origin-left ${isOpen ? 'opacity-100 scale-100 w-auto' : 'opacity-0 scale-90 w-0 pointer-events-none'}`}>
                  Public Page
                </span>
                {!isOpen && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#1A1A4E] text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50 translate-x-2 group-hover:translate-x-0">
                    Your Public Profile
                  </div>
                )}
              </Link>
            </div>
          )}
        </nav>

        <div className="p-4">
          {role === UserRole.TUTOR && (
            isOpen ? (
              <div className="bg-[#1A1A4E] rounded-2xl p-6 text-white relative overflow-hidden group shadow-xl animate-in zoom-in duration-300">
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-200">Storage</span>
                    <span className="text-xs font-bold text-[#c2f575]">{storagePercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full mb-4">
                    <div className={`h-full bg-[#c2f575] rounded-full transition-all duration-500`} style={{ width: `${storagePercent}%` }}></div>
                  </div>
                  <p className="text-[10px] text-gray-400 font-medium mb-3">{storageUsedStr} of {storageLimitStr} used</p>
                  <button
                    onClick={() => currentTier === 'STARTER' ? setShowUpgradeModal(true) : setShowAddonModal(true)}
                    className="text-[10px] text-[#c2f575] font-black uppercase tracking-widest hover:brightness-110 transition-all border-b border-transparent hover:border-[#c2f575] inline-block"
                  >
                    Buy Addons
                  </button>
                </div>
                <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white opacity-5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-[8px] font-black text-gray-400 border border-gray-100 hover:bg-[#1A1A4E] hover:text-white transition-all group relative">
                  {storagePercent}%
                  <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#1A1A4E] text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50 translate-x-2 group-hover:translate-x-0">
                    {storagePercent}% Storage
                  </div>
                </button>
              </div>
            )
          )}
        </div>
      </aside>

      {/* Modals placed outside aside to avoid z-index/overflow issues, but fragment wrapper needed */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-indigo-900 transition-colors">
              <X size={20} />
            </button>
            <div className="text-center space-y-4 pt-4">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag size={28} />
              </div>
              <h3 className="text-2xl font-black text-[#1A1A4E]">Expand Your Limits</h3>
              <p className="text-gray-400 text-sm font-medium">Add-ons are available exclusively on the <span className="font-bold text-indigo-900">Standard</span> and <span className="font-bold text-indigo-900">Premium</span> tiers. Upgrade to significantly increase your limits.</p>
              <div className="pt-6">
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    navigate('/billing');
                  }}
                  className="w-full py-4 bg-[#c2f575] text-[#1A1A4E] rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-lg"
                >
                  View Plans
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddonManagerModal
        isOpen={showAddonModal}
        onClose={() => setShowAddonModal(false)}
      />
    </>
  );
};

export default Sidebar;
