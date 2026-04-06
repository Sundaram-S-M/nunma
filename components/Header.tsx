
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  User,
  Settings as SettingsIcon,
  LogOut,
  CreditCard,
  Search,
  Bell,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';

interface HeaderProps {
  onToggleRole: () => void;
}

/* ─── STYLES ──────────────────────────────────────────────── */

/** Flat header — solid white, 1px bottom border, no blur */
const headerStyle: React.CSSProperties = {
  height: 64,
  background: '#FFFFFF',
  borderBottom: '1px solid #E5E7EB',
  boxShadow: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: '0 1.5rem',
  gap: '0.375rem',
  position: 'sticky',
  top: 0,
  zIndex: 30,
  flexShrink: 0,
};

const iconBtnStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 7,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#9CA3AF',
  transition: 'background 0.12s, color 0.12s',
  textDecoration: 'none',
  position: 'relative',
  flexShrink: 0,
};

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
  const { user, logout }        = useAuth();
  const menuRef   = useRef<HTMLDivElement>(null);
  const btnRef    = useRef<HTMLButtonElement>(null);
  const location  = useLocation();
  const [unread, setUnread] = useState(0);

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
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) setShowMenu(false);
    };
    if (showMenu) document.addEventListener('mousedown', cb);
    return () => document.removeEventListener('mousedown', cb);
  }, [showMenu]);

  /* Notification badge */
  useEffect(() => {
    if (!user) return;
    let cal = 0, msgs = 0;
    const update = () => setUnread(cal + msgs);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;

    const unsubCal = onSnapshot(
      query(collection(db,'users',user.uid,'calendar_events'), where('dateKey','==',tKey)),
      snap => {
        const lv = parseInt(localStorage.getItem(`lastNotificationsView_${user.uid}`) || '0');
        cal = Date.now() - lv < 12*3600*1000 ? 0 : snap.docs.length;
        update();
      }
    );

    const unsubMsg = onSnapshot(
      query(collection(db,'conversations'), where('participants','array-contains',user.uid)),
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

    return () => { unsubCal(); unsubMsg(); };
  }, [user]);

  if (!user) return null;

  /* hover helpers */
  const hoverOn  = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; (e.currentTarget as HTMLElement).style.color = '#111827'; };
  const hoverOff = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#9CA3AF'; };
  const menuOn   = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = '#F3F4F6'; };
  const menuOff  = (e: React.MouseEvent) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; };

  /* ══════════════════════════════════════════════════════════ */
  return (
    <header style={headerStyle}>

      {/* ── Icon strip ─────────────────────────── */}
      {/* Search */}
      <Link to="/search" aria-label="Search" style={iconBtnStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
        <Search size={17} />
      </Link>

      {/* Notifications */}
      <Link to="/notifications" aria-label="Notifications" style={iconBtnStyle} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
        <Bell size={17} />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: 5, right: 5,
            width: 14, height: 14,
            background: '#ef4444',
            borderRadius: '50%',
            border: '2px solid #fff',
            fontSize: '0.5rem',
            fontWeight: 900,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>{unread}</span>
        )}
      </Link>

      {/* ── Divider ────────────────────────────── */}
      <div style={{ width: 1, height: 20, background: '#E5E7EB', margin: '0 0.25rem' }} />

      {/* ── Avatar / menu ──────────────────────── */}
      <div style={{ position: 'relative' }}>
        <button
          ref={btnRef}
          id="header-avatar-button"
          onClick={() => setShowMenu(p => !p)}
          aria-haspopup="true"
          aria-expanded={showMenu}
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: `1.5px solid ${showMenu ? '#2563EB' : '#E5E7EB'}`,
            padding: 0,
            cursor: 'pointer',
            overflow: 'hidden',
            background: '#fff',
            transition: 'border-color 0.12s',
            display: 'block',
          }}
          onMouseEnter={e => { if (!showMenu) (e.currentTarget as HTMLElement).style.borderColor = '#9CA3AF'; }}
          onMouseLeave={e => { if (!showMenu) (e.currentTarget as HTMLElement).style.borderColor = '#E5E7EB'; }}
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
              right: 0,
              top: 'calc(100% + 8px)',
              width: 260,
              zIndex: 50,
              /* Dropdown gets a soft shadow — sidebar/header stay flat */
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: 12,
              boxShadow: '0 8px 24px -4px rgba(0,0,0,0.08), 0 4px 8px -2px rgba(0,0,0,0.04)',
              overflow: 'hidden',
              animation: 'fade-in 0.12s ease, slide-up 0.12s ease',
              animationFillMode: 'both',
            }}
          >
            {/* User info */}
            <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: '1px solid #E5E7EB', flexShrink: 0 }}>
                  <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                    {user.name}
                  </p>
                  <p style={{ fontSize: '0.6875rem', color: '#9CA3AF', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div style={{ padding: '0.375rem' }}>
              {[
                { to: '/profile/me',           icon: <User size={14} />,         label: 'My Profile'   },
                { to: '/settings/preferences', icon: <SettingsIcon size={14} />, label: 'Preferences'  },
                { to: '/settings/billing',     icon: <CreditCard size={14} />,   label: 'Billing'      },
              ].map(item => (
                <Link
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  onClick={() => setShowMenu(false)}
                  style={{ ...menuItemStyle, display: 'flex' }}
                  onMouseEnter={menuOn}
                  onMouseLeave={menuOff}
                >
                  <span style={{ color: '#9CA3AF', flexShrink: 0 }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Role toggle */}
            <div style={{ padding: '0.625rem 1rem', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
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
                    background: user.role === UserRole.TUTOR ? '#c2f575' : '#E5E7EB',
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
                    background: '#fff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    transform: user.role === UserRole.TUTOR ? 'translateX(18px)' : 'translateX(0)',
                    transition: 'transform 0.2s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </button>
              </div>
            </div>

            {/* Sign out */}
            <div style={{ padding: '0.375rem' }}>
              <button
                role="menuitem"
                onClick={() => { logout(); setShowMenu(false); }}
                style={{ ...menuItemStyle, color: '#ef4444' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2'; }}
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
