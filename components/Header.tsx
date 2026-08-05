
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  User,
  Settings as SettingsIcon,
  LogOut,
  CreditCard,
  Search,
  Bell,
  Gem,
  MoreVertical,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useDropdownBoundary } from '../hooks/useDropdownBoundary';

interface HeaderProps {
  onToggleRole: () => void;
}

/* ─── STYLES ──────────────────────────────────────────────── */

const headerStyle: React.CSSProperties = {
  height: 64,
  background: 'transparent',
  borderBottom: 'none',
  boxShadow: 'none',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: '0 1.5rem',
  gap: '0.375rem',
  position: 'fixed',
  top: 0,
  right: 0,
  left: 0,
  zIndex: 30,
  pointerEvents: 'none',
};

/* iconBtnStyle replaced by liquid-glass tailwind classes */

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.625rem',
  padding: '0.4375rem 0.625rem',
  borderRadius: 7,
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: '#374151',
  textDecoration: 'none',
  transition: 'background 0.1s, color 0.1s',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  width: '100%',
  textAlign: 'left',
};

/* ─── COMPONENT ───────────────────────────────────────────── */

const Header: React.FC<HeaderProps> = ({ onToggleRole }) => {
  const [showMenu, setShowMenu] = useState(false);
  const { user, logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  const [theme, setTheme] = useState<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  );

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const container = document.getElementById('main-scroll-container');
    if (!container) return;

    const handleScroll = () => {
      const currentScrollY = container.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const boundaryStyles = useDropdownBoundary(btnRef, menuRef, showMenu, 'bottom-right');

  /* Clear badge when viewing notifications */
  useEffect(() => {
    if (location.pathname === '/notifications' && user) {
      localStorage.setItem(`lastNotificationsView_${user.uid}`, Date.now().toString());
      setUnread(0);
    }
  }, [location.pathname, user]);

  /* Close on outside click */
  useEffect(() => {
    const cb = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setShowMenu(false);
    };
    if (showMenu) document.addEventListener('mousedown', cb);
    return () => document.removeEventListener('mousedown', cb);
  }, [showMenu]);

  /* Notification badge */
  useEffect(() => {
    if (!user) return;
    let cal = 0, msgs = 0, gen = 0;
    const update = () => setUnread(cal + msgs + gen);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    const unsubCal = onSnapshot(
      query(collection(db, 'users', user.uid, 'calendar_events'), where('dateKey', '==', tKey)),
      snap => {
        const lv = parseInt(localStorage.getItem(`lastNotificationsView_${user.uid}`) || '0');
        cal = Date.now() - lv < 12 * 3600 * 1000 ? 0 : snap.docs.length;
        update();
      }
    );

    const unsubMsg = onSnapshot(
      query(collection(db, 'conversations'), where('participants', 'array-contains', user.uid)),
      snap => {
        const lv = parseInt(localStorage.getItem(`lastNotificationsView_${user.uid}`) || '0');
        msgs = snap.docs.filter(d => {
          const data = d.data();
          if (!data.lastMessageTime || data.lastMessageSenderId === user.uid) return false;
          try {
            const t = data.lastMessageTime.toDate().getTime();
            return t > lv && Date.now() - t < 86400_000;
          } catch { return false; }
        }).length;
        update();
      }
    );

    const unsubGen = onSnapshot(
      collection(db, 'users', user.uid, 'notifications'),
      snap => {
        const lv = parseInt(localStorage.getItem(`lastNotificationsView_${user.uid}`) || '0');
        gen = snap.docs.filter(d => {
          const data = d.data();
          try {
            const t = (data.createdAt && typeof data.createdAt.toDate === 'function') ? data.createdAt.toDate().getTime() : Date.now();
            return t > lv && !data.read;
          } catch { return false; }
        }).length;
        update();
      }
    );

    return () => {
      setTimeout(() => {
        unsubCal();
        unsubMsg();
        unsubGen();
      }, 0);
    };
  }, [user]);

  if (!user) return null;

  /* hover helpers */
  const menuOn = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; };
  const menuOff = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; };

  /* ══════════════════════════════════════════════════════════ */
  return (
    <header id="global-header" style={headerStyle} className={`flex transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full md:translate-y-0'}`}>

      {/* ── Icon strip ─────────────────────────── */}
      {/* Search */}
      <Link to="/search" aria-label="Search" className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 pointer-events-auto relative liquid-glass liquid-glass-white transition-all duration-300 hover:scale-110">
        <Search size={17} />
      </Link>

      {/* Notifications */}
      <Link to="/notifications" aria-label="Notifications" className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 pointer-events-auto relative liquid-glass liquid-glass-white transition-all duration-300 hover:scale-110">
        <Bell size={17} />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: 5, right: 5,
            width: 14, height: 14,
            background: 'var(--brand-red)',
            borderRadius: '50%',
            border: '2px solid var(--surface)',
            fontSize: '0.5rem',
            fontWeight: 900,
            color: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>{unread}</span>
        )}
      </Link>

      {/* ── Divider ────────────────────────────── */}
      <div className="hidden md:block" style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 0.25rem' }} />

      {/* ── Avatar / menu ──────────────────────── */}
      <div ref={btnRef} style={{ position: 'relative', pointerEvents: 'auto', display: 'flex' }}>
        {/* Mobile Three Dots */}
        <button
          id="header-mobile-menu-button"
          onClick={() => setShowMenu(p => !p)}
          aria-haspopup="true"
          aria-expanded={showMenu}
          className="md:hidden w-10 h-10 rounded-full flex items-center justify-center shrink-0 pointer-events-auto relative liquid-glass liquid-glass-white transition-all duration-300 hover:scale-110"
        >
          <MoreVertical size={17} />
        </button>

        {/* Desktop Avatar */}
        <button
          id="header-avatar-button"
          className="hidden md:block"
          onClick={() => setShowMenu(p => !p)}
          aria-haspopup="true"
          aria-expanded={showMenu}
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--r-full)',
            border: `1.5px solid ${showMenu ? 'var(--brand-blue)' : 'var(--border)'}`,
            padding: 0,
            cursor: 'pointer',
            overflow: 'hidden',
            background: 'var(--surface)',
            transition: 'border-color 0.12s',
          }}
          onMouseEnter={e => { if (!showMenu) (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-muted)'; }}
          onMouseLeave={e => { if (!showMenu) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
        >
          <img src={user.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </button>

        {/* ── Dropdown ───────────────────────────── */}
        {showMenu && (
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'absolute',
              ...boundaryStyles,
              width: 260,
              zIndex: 50,
              /* Dropdown gets a soft shadow — sidebar/header stay flat */
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: 'var(--shadow-dropdown)',
              overflow: 'hidden',
              animation: 'fade-in 0.12s ease, slide-up 0.12s ease',
              animationFillMode: 'both',
            }}
          >
            {/* User info */}
            <div className="hidden md:block" style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                  <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                    {user.name}
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: 'var(--text-faint)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: '0.375rem' }}>
              {[
                { to: '/profile/me', icon: <User size={14} />, label: 'My Profile', desktopOnly: true },
                ...(user.role === UserRole.THALA ? [
                  { to: '/settings/pricing', icon: <Gem size={14} />, label: 'Pricing' },
                ] : []),
                { to: '/settings/preferences', icon: <SettingsIcon size={14} />, label: 'Preferences' },
                { to: '/settings/billing', icon: <CreditCard size={14} />, label: 'Billing' },
              ].map(item => (
                <div key={item.to} className={item.desktopOnly ? "hidden md:block" : ""}>
                  <Link
                    to={item.to}
                    role="menuitem"
                    onClick={() => setShowMenu(false)}
                    style={{ ...menuItemStyle, display: 'flex' }}
                    onMouseEnter={menuOn}
                    onMouseLeave={menuOff}
                  >
                    <span style={{ color: 'var(--text-faint)', flexShrink: 0 }}>{item.icon}</span>
                    {item.label}
                  </Link>
                </div>
              ))}
            </div>

            {/* Role toggle (Desktop) */}
            <div className="hidden md:block" style={{ padding: '0.625rem 1rem', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Switch to {user.role === UserRole.STUDENT ? 'Tutor' : 'Student'}
                </span>
                <button
                  onClick={() => { setShowMenu(false); onToggleRole(); }}
                  aria-label="Toggle role"
                  style={{
                    width: 38,
                    height: 20,
                    borderRadius: 999,
                    border: 'none',
                    background: user.role === UserRole.THALA ? 'var(--nunma-lime)' : 'var(--border)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background 0.2s',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: 16, height: 16,
                    borderRadius: '50%',
                    background: 'var(--surface)',
                    boxShadow: 'var(--shadow-sm)',
                    transform: user.role === UserRole.THALA ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </button>
              </div>
            </div>

            {/* Role toggle (Mobile) */}
            <div className="md:hidden" style={{ padding: '0.375rem', borderTop: '1px solid var(--border-light)' }}>
              <button
                role="menuitem"
                onClick={() => { setShowMenu(false); onToggleRole(); }}
                style={{ ...menuItemStyle, display: 'flex', width: '100%' }}
                onMouseEnter={menuOn}
                onMouseLeave={menuOff}
              >
                <span style={{ color: 'var(--text-faint)', flexShrink: 0 }}><User size={14} /></span>
                Switch to {user.role === UserRole.STUDENT ? 'Tutor' : 'Student'}
              </button>
            </div>

            {/* Theme Toggle (Desktop & Mobile) */}
            <div style={{ padding: '0.375rem', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)' }}>
              <button
                role="menuitem"
                onClick={(e) => { e.preventDefault(); toggleTheme(); }}
                style={{ ...menuItemStyle, display: 'flex', width: '100%', justifyContent: 'space-between' }}
                onMouseEnter={menuOn}
                onMouseLeave={menuOff}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ color: 'var(--text-faint)', flexShrink: 0 }}>
                    {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                  </span>
                  Dark Mode
                </div>
                <div style={{
                  width: 38,
                  height: 20,
                  borderRadius: 999,
                  background: theme === 'dark' ? 'var(--nunma-lime)' : 'var(--border)',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 16, height: 16,
                    borderRadius: '50%',
                    background: 'var(--surface)',
                    boxShadow: 'var(--shadow-sm)',
                    transform: theme === 'dark' ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s',
                  }} />
                </div>
              </button>
            </div>

            {/* Sign out */}
            <div style={{ padding: '0.375rem' }}>
              <button
                role="menuitem"
                onClick={() => { logout(); setShowMenu(false); }}
                style={{ ...menuItemStyle, color: 'var(--brand-red)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; }}
                onMouseLeave={menuOff}
              >
                <LogOut size={14} style={{ flexShrink: 0 }} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
