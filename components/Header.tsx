
import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  User,
  Settings as SettingsIcon,
  LogOut,
  CreditCard,
  Search,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import PayoutSetupModal from './PayoutSetupModal';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';

interface HeaderProps {
  onToggleRole: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleRole }) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const { user, logout } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (location.pathname === '/notifications' && user) {
      localStorage.setItem(`lastNotificationsView_${user.uid}`, Date.now().toString());
      setUnreadCount(0);
    }
  }, [location.pathname, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  useEffect(() => {
    if (!user) return;

    let calendarCount = 0;
    let messageCount = 0;

    const updateBadge = () => setUnreadCount(calendarCount + messageCount);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = `${tomorrow.getFullYear()}-${(tomorrow.getMonth() + 1).toString().padStart(2, '0')}-${tomorrow.getDate().toString().padStart(2, '0')}`;

    const qCalendar = query(
      collection(db, 'users', user.uid, 'calendar_events'),
      where('dateKey', '==', tomorrowKey)
    );

    const unsubCalendar = onSnapshot(qCalendar, (snap) => {
      const lastViewTimeStr = localStorage.getItem(`lastNotificationsView_${user.uid}`);
      const lastViewTime = lastViewTimeStr ? parseInt(lastViewTimeStr) : 0;
      const now = new Date();

      // If notifications were viewed within the last 12 hours, assume calendar notifications are read
      if ((now.getTime() - lastViewTime) < 12 * 60 * 60 * 1000) {
        calendarCount = 0;
      } else {
        calendarCount = snap.docs.length;
      }
      updateBadge();
    });

    const qConversations = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubMessages = onSnapshot(qConversations, (snap) => {
      const now = new Date();
      const lastViewTimeStr = localStorage.getItem(`lastNotificationsView_${user.uid}`);
      const lastViewTime = lastViewTimeStr ? parseInt(lastViewTimeStr) : 0;

      messageCount = snap.docs.filter(d => {
        const data = d.data();
        if (!data.lastMessageTime) return false;
        if (data.lastMessageSenderId === user.uid) return false;
        try {
          const msgTime = data.lastMessageTime.toDate();
          if (msgTime.getTime() <= lastViewTime) return false;
          return (now.getTime() - msgTime.getTime()) < 24 * 60 * 60 * 1000;
        } catch (e) { return false; }
      }).length;
      updateBadge();
    });

    return () => {
      unsubCalendar();
      unsubMessages();
    };
  }, [user]);

  if (!user) return null;

  return (
    <header className="h-16 bg-white border-b border-gray-50 flex items-center justify-end gap-6 px-6 md:px-10 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <Link to="/search" className="p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
          <Search className="text-gray-400 group-hover:text-[#1A1A4E] transition-colors" size={20} />
        </Link>
        <Link to="/notifications" className="p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group relative">
          <Bell className="text-gray-400 group-hover:text-[#1A1A4E] transition-colors" size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-sm">
              {unreadCount}
            </span>
          )}
        </Link>

      </div>

      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-[#c2f575] transition-all ring-offset-2"
        >
          <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
        </button>

        {showProfileMenu && (
          <div
            ref={menuRef}
            className="absolute right-0 mt-3 w-72 z-50 animate-in fade-in zoom-in slide-in-from-top-2 duration-200"
          >
            <div className="bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100 py-6 overflow-hidden">
              <div className="px-6 pb-4 mb-3">
                <p className="font-black text-gray-900 text-sm">{user.name}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{user.email}</p>
              </div>

              <div className="px-3 space-y-1">
                <Link
                  to="/profile/me"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-4 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all group"
                >
                  <User size={16} className="text-gray-400 group-hover:text-indigo-900" /> My Profile
                </Link>
                <Link
                  to="/settings/preferences"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-4 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all group"
                >
                  <SettingsIcon size={16} className="text-gray-400 group-hover:text-indigo-900" /> Preferences
                </Link>
                <Link
                  to="/settings/billing"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-4 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-50 rounded-xl transition-all group"
                >
                  <CreditCard size={16} className="text-gray-400 group-hover:text-indigo-900" /> Billings
                </Link>
              </div>

              <div className="px-6 py-4 border-t border-gray-50 mt-4">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-[10px] font-black text-gray-700 uppercase tracking-widest">Switch to {user.role === UserRole.STUDENT ? 'Tutor' : 'Student'}</span>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      if (user.role === UserRole.STUDENT && !user.bankingDetailsProvided) {
                        setShowPayoutModal(true);
                      } else {
                        onToggleRole();
                      }
                    }}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 shadow-inner ${user.role === UserRole.TUTOR ? 'bg-[#c2f575]' : 'bg-gray-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${user.role === UserRole.TUTOR ? 'translate-x-5' : ''}`}></div>
                  </button>
                </div>
                <button
                  onClick={() => { logout(); setShowProfileMenu(false); }}
                  className="flex items-center gap-3 w-full text-left px-0 py-2 text-[10px] text-red-500 hover:text-red-600 transition-colors font-black uppercase tracking-[0.2em]"
                >
                  <LogOut size={16} /> Signout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPayoutModal && (
        <PayoutSetupModal
          onClose={() => setShowPayoutModal(false)}
          onComplete={() => {
            setShowPayoutModal(false);
            onToggleRole();
          }}
        />
      )}
    </header>
  );
};

export default Header;
