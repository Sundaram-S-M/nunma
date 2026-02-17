
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  MonitorPlay,
  Mail,
  Briefcase,
  Layers,
  ChevronLeft,
  ChevronRight,
  Share2,
  ShoppingBag
} from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

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
  const role = user?.role || UserRole.STUDENT;

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
                  <span className="text-xs font-bold text-[#c2f575]">0%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full mb-4">
                  <div className="w-0 h-full bg-[#c2f575] rounded-full transition-all duration-500"></div>
                </div>
                <p className="text-[10px] text-gray-400 font-medium mb-3">0 Bytes of 100 MB used</p>
                <button className="text-[10px] text-[#c2f575] font-black uppercase tracking-widest hover:brightness-110 transition-all border-b border-transparent hover:border-[#c2f575]">
                  Buy Storage
                </button>
              </div>
              <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-white opacity-5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-[8px] font-black text-gray-400 border border-gray-100 hover:bg-[#1A1A4E] hover:text-white transition-all group relative">
                0%
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#1A1A4E] text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all whitespace-nowrap z-50 translate-x-2 group-hover:translate-x-0">
                  0% Storage
                </div>
              </button>
            </div>
          )
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
