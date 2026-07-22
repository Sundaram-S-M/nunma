
import React, { useState, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import { AddonManagerModal } from './AddonManagerModal';
import { toast } from 'react-hot-toast';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../utils/firebase';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const LogoIcon = () => (
  <Link to="/dashboard" aria-label="Dashboard">
    <img src="/assets/logo-icon.png" alt="Nunma" style={{ width: 28, height: 28, objectFit: 'contain', display: 'block' }} />
  </Link>
);

const LogoFull = () => (
  <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center' }}>
    <img src="/assets/logo-full.png" alt="Nunma" style={{ height: 26, objectFit: 'contain', display: 'block' }} />
  </Link>
);

/* ─── STYLES ──────────────────────────────────────────────── */

const sidebarBase: React.CSSProperties = {
  /* Flat solid surface — no blur, no transparency */
  background: 'var(--surface)',
  borderRight: '1px solid var(--border)',
  boxShadow: 'none',
  height: '100vh',
  position: 'sticky',
  top: 0,
  zIndex: 40,
  overflow: 'visible',
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
  const rawTier = ((user as any)?.current_tier || (user as any)?.tier || 'PREMIUM').toString().toUpperCase();
  const tier = rawTier;
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = React.useRef(0);

  useEffect(() => {
    const container = document.getElementById('main-scroll-container');
    if (!container) return;

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsNavVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsNavVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const triggerStorageSync = async () => {
    if (isSyncing || !functions) return;
    setIsSyncing(true);
    try {
      const fn = httpsCallable(functions, 'syncVideoStorage');
      const result: any = await fn();
      const mb = ((result?.data?.usedStorageBytes || 0) / (1024 * 1024)).toFixed(2);
      const count = result?.data?.videoCount || 0;
      toast.success(`Storage synced: ${mb} MB across ${count} video(s)`, { icon: '💾' });
    } catch (e: any) {
      toast.error(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const usedBytes = (user as any)?.usedStorageBytes || (user as any)?.storage_used_bytes || user?.subscription_entitlements?.storageUsed || 0;
  
  const customLimitBytes = 
    (user as any)?.storageLimitBytes || 
    (user as any)?.storage_limit_bytes || 
    ((user as any)?.storageLimitGB ? (user as any).storageLimitGB * 1024 * 1024 * 1024 : null) ||
    ((user as any)?.storage_limit_gb ? (user as any).storage_limit_gb * 1024 * 1024 * 1024 : null);

  // 200 GB = 214748364800 bytes
  const defaultTierLimit = 
    (rawTier === 'STANDARD' || rawTier === 'GROWTH') ? 53687091200 : // 50 GB
    (rawTier === 'STARTER' && usedBytes <= 3221225472) ? 3221225472 : // 3 GB
    214748364800; // 200 GB for Premium upgraded account

  const limitBytes = customLimitBytes || defaultTierLimit;
  const pct        = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;
  const overLimit  = usedBytes > limitBytes;

  const fmt = (b: number) => {
    if (b === 0) return '0 B';
    const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
    const i = Math.max(0, Math.floor(Math.log(b) / Math.log(k)));
    const val = b / Math.pow(k, i);
    return (i >= 2 ? (val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)) : val.toFixed(0)) + ' ' + s[i];
  };

  const InboxIcon = ({ size = 16, className, ...props }: any) => {
    // Exclude any properties not valid for SVG
    const { strokeWidth, ...rest } = props;
    return (
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        {...rest}
      >
        <g style={{ transform: 'scale(1.18)', transformOrigin: 'center' }}>
          {/* Back Bubble (Darker/Opacity) */}
          <path 
            d="M14.5 6C18.6421 6 22 9.35786 22 13.5C22 15.3486 21.3311 17.0409 20.2337 18.3585L21.5 21.5L17.9173 20.6046C16.8803 20.8631 15.7181 21 14.5 21C10.3579 21 7 17.6421 7 13.5C7 12.3331 7.26647 11.2285 7.7402 10.2393Z" 
            fill="currentColor"
            fillOpacity="0.3"
          />
          {/* Front Bubble */}
          <path 
            d="M9.5 2C13.6421 2 17 5.35786 17 9.5C17 13.6421 13.6421 17 9.5 17C8.28186 17 7.11974 16.7369 6.08272 16.2654L2.5 17.5L3.76632 14.3585C2.66887 13.0409 2 11.3486 2 9.5C2 5.35786 5.35786 2 9.5 2Z" 
            fill="currentColor" 
          />
          {/* 3 Dots */}
          <circle cx="5.5" cy="9.5" r="1.2" fill="var(--surface, #ffffff)" />
          <circle cx="9.5" cy="9.5" r="1.2" fill="var(--surface, #ffffff)" />
          <circle cx="13.5" cy="9.5" r="1.2" fill="var(--surface, #ffffff)" />
        </g>
      </svg>
    );
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
    { id: 'inbox',   icon: <InboxIcon size={16} />,         path: '/inbox',    label: 'Inbox'   },
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
          position: 'relative'
        }}>
          {isOpen ? <LogoFull /> : <LogoIcon />}
          
          <button
            onClick={onToggle}
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
            style={{
              ...toggleBtnStyle,
              position: isOpen ? 'static' : 'absolute',
              right: isOpen ? 'auto' : '-14px',
              background: 'var(--surface)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              zIndex: 50
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-faint)'; }}
          >
            {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
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
                  color: 'var(--nunma-navy)',
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
                    <button
                      onClick={triggerStorageSync}
                      disabled={isSyncing}
                      title="Sync storage usage from Bunny CDN"
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '2px',
                        cursor: isSyncing ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        color: 'var(--text-faint)',
                        opacity: isSyncing ? 0.4 : 1,
                      }}
                    >
                      <RefreshCw size={10} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
                    </button>
                  </div>
                  <span
                    title="Storage used"
                    style={{ fontSize: '0.6875rem', fontWeight: 700, color: overLimit ? 'var(--brand-red)' : 'var(--nunma-navy)' }}
                  >
                    {pct}%
                  </span>
                </div>

                {/* Track */}
                <div style={{ height: 3, background: 'var(--border)', borderRadius: 99, marginBottom: '0.5rem', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: overLimit ? 'var(--brand-red)' : 'var(--nunma-navy)', borderRadius: 99, transition: 'width 0.5s' }} />
                </div>

                <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', marginBottom: overLimit ? '0.5rem' : '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

      {/* Mobile Bottom Nav Island */}
      <nav className={`md:hidden fixed bottom-6 left-4 right-4 z-[50] flex justify-between items-center bg-nunma-forest shadow-[0_20px_40px_rgba(0,0,0,0.4)] rounded-full px-2 py-2 transition-transform duration-500 ${isNavVisible ? 'translate-y-0' : 'translate-y-[200%]'}`}>
        
        {navLinks.slice(0, 4).map(link => (
          <NavLink
            key={link.id}
            to={link.path}
            className={({ isActive }) => 
              `relative flex items-center justify-center rounded-full transition-all duration-300 ${
                isActive ? 'w-14 h-14 bg-nunma-lime shadow-lg' : 'w-14 h-14 text-white/40 hover:text-white/80'
              }`
            }
          >
            {({ isActive }) => (
              <div className={`${isActive ? 'text-nunma-forest' : 'text-current'} transition-colors duration-300 flex items-center justify-center`}>
                {React.cloneElement(link.icon as React.ReactElement<any>, { size: isActive ? 24 : 22, strokeWidth: isActive ? 2.5 : 2 })}
              </div>
            )}
          </NavLink>
        ))}

        {/* Profile (Right corner) */}
        <NavLink
          to="/profile/me"
          className={({ isActive }) => 
            `relative flex items-center justify-center rounded-full transition-all duration-300 ${
              isActive ? 'w-14 h-14 bg-nunma-lime shadow-lg' : 'w-14 h-14 text-white/40 hover:text-white/80'
            }`
          }
        >
          {({ isActive }) => (
            <div className={`transition-all duration-300 flex items-center justify-center w-full h-full rounded-full ${isActive ? 'scale-105' : 'opacity-70 hover:opacity-100'}`}>
              <img 
                src={user?.avatar || '/assets/default-avatar.png'} 
                alt="Profile" 
                className={`rounded-full object-cover transition-all duration-300 ${isActive ? 'w-12 h-12' : 'w-8 h-8 grayscale'}`} 
              />
            </div>
          )}
        </NavLink>
      </nav>

      <AddonManagerModal isOpen={showAddonModal} onClose={() => setShowAddonModal(false)} />
    </>
  );
};

export default Sidebar;
