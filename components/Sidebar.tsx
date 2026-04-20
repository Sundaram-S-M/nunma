
import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MonitorPlay,
  Mail,
  Briefcase,
  Layers,
  Share2,
  ShoppingBag,
  PanelLeftClose,
  PanelLeft,
  HardDrive,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { AddonManagerModal } from './AddonManagerModal';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const LogoIcon = () => (
  <Link to="/dashboard" aria-label="Dashboard">
    <img src="/assets/logo-icon.png" alt="Nunma" style={{ width: 28, height: 28, objectFit: 'contain', display: 'block' }} width="500" height="500" />
  </Link>
);

const LogoFull = () => (
  <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center' }}>
    <img src="/assets/logo-full.png" alt="Nunma" style={{ height: 26, objectFit: 'contain', display: 'block' }} width="500" height="500" />
  </Link>
);

/* ─── STYLES ──────────────────────────────────────────────── */

const sidebarBase: React.CSSProperties = {
  /* Flat solid white — no blur, no transparency */
  background: '#ffffff',
  borderRight: '1px solid #E5E7EB',
  boxShadow: 'none',
  height: '100vh',
  position: 'sticky',
  top: 0,
  display: 'flex',
  flexDirection: 'column',
  zIndex: 40,
  overflow: 'hidden',
  flexShrink: 0,
  transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
};

const toggleBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 'var(--r-md)',
  border: '1px solid var(--border)',
  background: 'var(--surface-hover)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-faint)',
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'background 0.12s, color 0.12s',
};

const navLinkBase: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  padding: '0.625rem 0.875rem',
  borderRadius: 'var(--r-full)',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: 'var(--text-muted)',
  textDecoration: 'none',
  transition: 'background 0.12s, color 0.12s',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
};

const sectionLabel: React.CSSProperties = {
  fontSize: '0.625rem',
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-faint)',
  padding: '0.25rem 0.75rem 0.625rem',
};

/* ─── COMPONENT ───────────────────────────────────────────── */

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const role      = user?.role || UserRole.STUDENT;
  const tier      = (user as any)?.current_tier || 'STARTER';
  const [showAddonModal, setShowAddonModal] = useState(false);

  const usedBytes  = (user as any)?.usedStorageBytes || 0;
  const limitBytes = tier === 'PREMIUM' ? 32212254720 : tier === 'STANDARD' ? 16106127360 : 3221225472;
  const pct        = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;
  const overLimit  = usedBytes > limitBytes;

  const fmt = (b: number) => {
    if (b === 0) return '0 B';
    const k = 1024, s = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
  };

  const navLinks = [
    { id: 'dashboard', icon: <LayoutDashboard size={16} />, path: '/dashboard',  label: 'Dashboard' },
    {
      id: 'classroom',
      icon: role === UserRole.STUDENT ? <MonitorPlay size={16} /> : <Briefcase size={16} />,
      path: role === UserRole.STUDENT ? '/classroom' : '/workplace',
      label: role === UserRole.STUDENT ? 'My Classroom' : 'My Workplace',
    },
    { id: 'explore', icon: <Layers size={16} />,      path: '/explore',  label: 'Explore' },
    { id: 'inbox',   icon: <Mail size={16} />,         path: '/inbox',    label: 'Inbox'   },
    ...(role === UserRole.THALA && user?.onboardingCompleted
      ? [{ id: 'products', icon: <ShoppingBag size={16} />, path: '/products', label: 'Products' }]
      : []),
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col" style={{ ...sidebarBase, width: isOpen ? 240 : 64 }}>

        {/* ── Logo + toggle ─────────────────────────────── */}
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isOpen ? 'space-between' : 'center',
          padding: isOpen ? '0 1rem 0 1.25rem' : '0',
          borderBottom: 'none',
          flexShrink: 0,
        }}>
          {isOpen ? (
            <>
              <LogoFull />
              <button
                onClick={onToggle}
                aria-label="Collapse sidebar"
                style={toggleBtnStyle}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB'; (e.currentTarget as HTMLElement).style.color = '#9CA3AF'; }}
              >
                <PanelLeftClose size={13} />
              </button>
            </>
          ) : (
            <button
              onClick={onToggle}
              aria-label="Expand sidebar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              <LogoIcon />
            </button>
          )}
        </div>

        {/* ── Nav ──────────────────────────────────────── */}
        <nav
          style={{ flex: 1, padding: '1rem 0.625rem', overflowY: 'auto', overflowX: 'hidden' }}
          className="custom-scrollbar"
        >
          {isOpen && <p style={sectionLabel}>Menu</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navLinks.map(link => (
              <NavLink
                key={link.id}
                to={link.path}
                title={!isOpen ? link.label : undefined}
                style={({ isActive }) => ({
                  ...navLinkBase,
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  padding: isOpen ? '0.625rem 0.875rem' : '0.625rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--text-on-lime)' : 'var(--text-muted)',
                  background: isActive ? 'var(--nunma-lime)' : 'transparent',
                  borderLeft: 'none',
                  paddingLeft: isOpen ? '0.875rem' : '0.625rem',
                })}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  if (el.getAttribute('aria-current') !== 'page') {
                    el.style.background = 'var(--surface-hover)';
                    el.style.color = 'var(--text-secondary)';
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  if (el.getAttribute('aria-current') !== 'page') {
                    el.style.background = 'transparent';
                    el.style.color = 'var(--text-muted)';
                  }
                }}
              >
                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20 }}>{link.icon}</span>
                {isOpen && (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginLeft: '0.75rem' }}>
                    {link.label}
                  </span>
                )}
              </NavLink>
            ))}
          </div>

          {/* ── Tutor public page ──────────────────────── */}
          {role === UserRole.THALA && (
            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              <Link
                to="/u/sundaram"
                target="_blank"
                title={!isOpen ? 'Public Page' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  justifyContent: isOpen ? 'flex-start' : 'center',
                  padding: isOpen ? '0.5rem 0.75rem' : '0.5rem',
                  borderRadius: 8,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--brand-blue)',
                  background: 'var(--surface-active)',
                  textDecoration: 'none',
                  border: '1px solid var(--border)',
                  transition: 'background 0.12s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                <Share2 size={14} style={{ flexShrink: 0 }} />
                {isOpen && (
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Public Page
                  </span>
                )}
              </Link>
            </div>
          )}
        </nav>

        {/* ── Storage widget ────────────────────────────── */}
        {role === UserRole.THALA && (
          <div style={{ padding: '0.75rem 0.625rem', borderTop: '1px solid var(--border-light)', flexShrink: 0 }}>
            {isOpen ? (
              <div style={{
                background: 'var(--surface-hover)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '0.875rem 1rem',
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <HardDrive size={12} style={{ color: overLimit ? 'var(--brand-red)' : 'var(--text-faint)' }} />
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Storage</span>
                  </div>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: overLimit ? 'var(--brand-red)' : 'var(--brand-blue)' }}>{pct}%</span>
                </div>

                {/* Track */}
                <div style={{ height: 3, background: 'var(--border)', borderRadius: 99, marginBottom: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: overLimit ? 'var(--brand-red)' : 'var(--brand-blue)', borderRadius: 99, transition: 'width 0.5s' }} />
                </div>

                <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', marginBottom: overLimit ? '0.5rem' : '0.75rem' }}>
                  {fmt(usedBytes)} of {fmt(limitBytes)}
                </p>

                {overLimit && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: '0.625rem' }}>
                    <AlertTriangle size={10} style={{ color: 'var(--brand-red)' }} />
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brand-red)' }}>Limit exceeded</span>
                  </div>
                )}

                <button
                  onClick={() => navigate('/settings/pricing')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    width: '100%',
                    padding: '0.4375rem 0.75rem',
                    borderRadius: 6,
                    border: 'none',
                    background: overLimit ? 'var(--brand-red)' : 'var(--nunma-lime)',
                    color: overLimit ? '#fff' : 'var(--text-on-lime)',
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'filter 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(0.94)')}
                  onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
                >
                  <Zap size={10} /> Buy Addons
                </button>
              </div>
            ) : (
              /* Collapsed pill */
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  onClick={() => navigate('/settings/pricing')}
                  title={`${pct}% storage used`}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: `1px solid ${overLimit ? 'var(--brand-red)' : 'var(--border)'}`,
                    background: overLimit ? '#FEF2F2' : 'var(--surface-hover)',
                    color: overLimit ? 'var(--brand-red)' : 'var(--text-muted)',
                    fontSize: '0.5rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                >
                  {pct}%
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-[50] flex justify-around items-center p-2 pb-4 border-t border-gray-100 bg-white/80 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
           style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        {navLinks.slice(0, 5).map(link => (
          <NavLink
            key={link.id}
            to={link.path}
            className={({ isActive }) => 
              `flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 min-h-[48px] min-w-[48px] ${
                isActive ? 'text-nunma-lime bg-nunma-navy' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            {link.icon}
            <span className="text-[10px] mt-1 font-bold">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <AddonManagerModal isOpen={showAddonModal} onClose={() => setShowAddonModal(false)} />
    </>
  );
};

export default Sidebar;
