import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MapPin,
  Star,
  Calendar as CalendarIcon,
  Clock,
  Check,
  Video,
  FileText,
  ArrowRight,
  ShieldCheck,
  X,
  Camera,
  ShoppingBag,
  CreditCard,
  Sparkles,
  Maximize2,
  Users,
  MessageSquare,
  UserPlus,
  UserCheck,
  Globe,
  Plus,
  ArrowLeft,
  LayoutGrid,
  Award,
  Database,
  Search,
  Zap,
  TrendingUp,
  CreditCard as CardIcon,
  Plus as PlusIcon,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../utils/firebase';
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  getDoc,
  setDoc,
  deleteDoc,
  increment,
  getCountFromServer
} from 'firebase/firestore';

import PhotoAdjustModal from '../components/PhotoAdjustModal';
import { UserRole } from '../types';


// Sub-components moved outside to fix focus bug

const ProfileHeader = ({
  profileUser, isMe, role, isEditing, editName, setEditName,
  editHeadline, setEditHeadline, editLocation, setEditLocation,
  isFollowing, handleFollow, bannerInputRef, handleFileChange,
  avatarInputRef, setIsEditing, handleSaveProfile,
  setShowProductModal, navigate,
  handleViewFollowers, tutorStudentsCount
}: any) => (
  <div className="flex flex-col w-full relative">
    {/* Dark Banner Section */}
    <div className="bg-[#1A1A4E] relative h-[260px] md:h-[320px] flex flex-col justify-end pb-8">
      <div className="absolute inset-0 opacity-40">
        {profileUser.banner ? (
          <img src={profileUser.banner} className="w-full h-full object-cover" alt="Banner" />
        ) : (
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#c2f575_0,transparent_60%)]"></div>
        )}
      </div>

      {/* Banner Actions */}
      {isMe && (
        <div className="absolute top-6 right-6 z-30">
          <button
            onClick={() => bannerInputRef.current?.click()}
            className="px-6 py-2.5 bg-black/30 backdrop-blur-md border border-white/20 rounded-lg text-white hover:bg-white hover:text-[#1A1A4E] transition-all shadow-lg flex items-center gap-2"
          >
            <Camera size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Update Banner</span>
          </button>
          <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'banner')} />
        </div>
      )}

      {/* Name and Action Buttons on Banner */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-10 relative z-10">
        <div className="flex items-end gap-6 w-full">
          {/* Avatar Space Offset - to push name/headline away from left edge where avatar sits */}
          <div className="hidden md:block w-40 md:w-44 shrink-0 md:mr-8"></div>

          <div className="flex-1 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-white">
            {/* User Details */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                {isEditing ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your Name"
                    className="text-3xl md:text-[42px] font-black tracking-tight drop-shadow-md bg-transparent border-b border-white/20 outline-none w-full"
                  />
                ) : (
                  <h1 className="text-3xl md:text-[42px] font-black tracking-tight drop-shadow-md">{profileUser.name}</h1>
                )}
                {role === UserRole.TUTOR && (
                  <div className="bg-[#5c7a36]/40 border border-[#6b8e23] text-[#c2f575] px-2.5 py-1 rounded flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest backdrop-blur-sm">
                    <ShieldCheck size={12} strokeWidth={3} /> Verified Expert
                  </div>
                )}
              </div>
              {isEditing ? (
                <input
                  value={editHeadline}
                  onChange={(e) => setEditHeadline(e.target.value)}
                  placeholder="Your Headline"
                  className="text-indigo-100/90 text-[16px] italic max-w-xl bg-transparent border-b border-white/20 outline-none w-full"
                />
              ) : (
                <p className="text-indigo-100/90 text-[16px] italic line-clamp-1">{profileUser.headline || (role === UserRole.TUTOR ? 'Expert Educator' : 'Aspiring Learner')}</p>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-4 mb-2">
              {isMe ? (
                <>
                  {isEditing ? (
                    <button onClick={handleSaveProfile} className="px-8 py-3 bg-white text-[#1A1A4E] rounded-xl font-black uppercase text-[11px] tracking-widest hover:brightness-110 transition-all shadow-xl flex items-center gap-2 whitespace-nowrap">
                      Save Profile
                    </button>
                  ) : (
                    <button onClick={() => setIsEditing(true)} className="px-8 py-3 bg-[#403e6a]/60 border border-white/10 backdrop-blur-md text-white rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-white hover:text-[#1A1A4E] transition-all shadow-xl flex items-center gap-2 whitespace-nowrap">
                      Edit Profile
                    </button>
                  )}
                  {role === UserRole.TUTOR && (
                    <button onClick={() => setShowProductModal(true)} className="px-8 py-3 bg-[#c2f575] text-[#1A1A4E] rounded-xl font-black uppercase text-[11px] tracking-widest hover:brightness-110 transition-all shadow-xl flex items-center gap-2 whitespace-nowrap">
                      <ShoppingBag size={14} /> List Product
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => navigate(`/inbox?userId=${profileUser.uid}`)} className="px-8 py-3 bg-[#403e6a]/60 border border-white/10 backdrop-blur-md text-white rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-white hover:text-[#1A1A4E] transition-all shadow-xl flex items-center gap-2 whitespace-nowrap">
                    <MessageSquare size={14} /> Message
                  </button>
                  <button onClick={handleFollow} className={`px-10 py-3 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all flex items-center gap-2 shadow-xl whitespace-nowrap ${isFollowing ? 'bg-white/10 text-white border border-white/20 hover:bg-red-500/80 hover:border-red-500' : 'bg-[#c2f575] text-[#1A1A4E] hover:brightness-110'}`}>
                    {isFollowing ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>

    {/* White Bottom Strip & Avatar */}
    <div className="bg-white border-b border-gray-100/50 relative shadow-sm z-20">
      <div className="max-w-7xl mx-auto w-full px-6 md:px-10">
        <div className="flex flex-col md:flex-row items-center md:items-start pt-4 md:pt-0 pb-6 w-full relative">

          {/* Avatar - Negative Margin makes it overlap perfectly */}
          <div className="relative group shrink-0 -mt-[80px] md:-mt-[110px] mb-6 md:mb-0 md:mr-8 z-30">
            <div className={`w-36 h-36 md:w-44 md:h-44 rounded-3xl md:rounded-[2.2rem] p-[5px] bg-gradient-to-tr from-[#c2f575] via-[#4d56c8] to-[#1A1A4E] shadow-2xl overflow-hidden`}>
              <div className="w-full h-full bg-[#1A1A4E] rounded-[1.8rem] overflow-hidden border-2 border-[#1A1A4E] relative group">
                <img src={profileUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + profileUser.uid} alt="Profile" className="w-full h-full object-cover" />
                {isMe && (
                  <div className="absolute bottom-2 right-2">
                    <button onClick={() => avatarInputRef.current?.click()} className="w-8 h-8 md:w-10 md:h-10 bg-white text-indigo-900 rounded-full shadow-lg flex items-center justify-center hover:bg-[#c2f575] border border-transparent transition-all opacity-0 group-hover:opacity-100"><Camera size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Stats on the White Part */}
          <div className="flex-1 flex flex-wrap items-center justify-center md:justify-start gap-10 mt-4 md:mt-6">
            <div className="flex items-center gap-2.5">
              <MapPin size={18} className="text-[#c2f575]" />
              {isEditing ? (
                <input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Location"
                  className="bg-transparent text-gray-400 font-black text-[11px] uppercase tracking-widest outline-none border-b border-gray-200"
                />
              ) : (
                <span className="text-gray-400 font-black text-[11px] uppercase tracking-[0.2em]">{profileUser.location || 'Global'}</span>
              )}
            </div>

            {role === UserRole.TUTOR ? (
              <div className="flex items-center gap-10">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-indigo-900">{tutorStudentsCount || 0}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Students</span>
                </div>
                <button onClick={handleViewFollowers} className="flex items-center gap-3 group">
                  <span className="text-xl font-black text-indigo-900 group-hover:text-indigo-600 transition-colors">{profileUser.followersCount || 0}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Followers</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-10">
                <button onClick={handleViewFollowers} className="flex items-center gap-3 group">
                  <span className="text-xl font-black text-indigo-900 group-hover:text-indigo-600 transition-colors">{profileUser.followersCount || 0}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Followers</span>
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-black text-indigo-900">{profileUser.followingCount || 0}</span>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Following</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  </div>
);

const AboutSection = ({ isEditing, editBio, setEditBio, profileUser }: any) => (
  <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm mb-12">
    <div className="flex justify-between items-center mb-8">
      <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3">
        <Sparkles size={24} className="text-[#c2f575]" /> About
      </h3>
      {isEditing && (
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {editBio.length}/200
        </span>
      )}
    </div>
    <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100">
      {isEditing ? (
        <textarea
          maxLength={200}
          value={editBio}
          onChange={(e) => setEditBio(e.target.value)}
          className="w-full bg-transparent text-xl text-gray-700 leading-relaxed italic outline-none min-h-[100px] resize-none"
          placeholder="Tell us about yourself..."
        />
      ) : (
        <p className="text-xl text-gray-700 leading-relaxed italic">{profileUser.bio || 'Sharing knowledge and building the future of learning.'}</p>
      )}
    </div>
  </div>
);

const StudentProfile = ({
  profileUser, isMe, zones, enrolledIds, navigate,
  isEditing, editExperience, setEditExperience,
  editEducation, setEditEducation, editSkills, setEditSkills
}: any) => {
  const addExp = () => setEditExperience([...editExperience, { title: '', company: '', location: '', startDate: '', endDate: '', description: '' }]);
  const updateExp = (idx: number, field: string, val: string) => {
    const newEx = [...editExperience];
    newEx[idx] = { ...newEx[idx], [field]: val };
    setEditExperience(newEx);
  };
  const removeExp = (idx: number) => setEditExperience(editExperience.filter((_: any, i: number) => i !== idx));

  const addEdu = () => setEditEducation([...editEducation, { school: '', degree: '', startDate: '', endDate: '', description: '' }]);
  const updateEdu = (idx: number, field: string, val: string) => {
    const newEd = [...editEducation];
    newEd[idx] = { ...newEd[idx], [field]: val };
    setEditEducation(newEd);
  };
  const removeEdu = (idx: number) => setEditEducation(editEducation.filter((_: any, i: number) => i !== idx));

  return (
    <div className="space-y-12">
      <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-black text-indigo-900 mb-8 flex items-center gap-3">
          <Globe size={24} className="text-[#c2f575]" /> Learnings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {zones.filter((z: any) => enrolledIds.includes(z.id)).length > 0 ? zones.filter((z: any) => enrolledIds.includes(z.id)).map((zone: any) => (
            <div key={zone.id} className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center gap-6 group hover:border-[#c2f575] transition-all cursor-pointer" onClick={() => navigate(`/classroom/zone/${zone.id}`)}>
              <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg">
                <img src={zone.image} alt={zone.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <h4 className="text-xl font-black text-indigo-900">{zone.title}</h4>
                <p className="text-sm text-gray-500 mt-1">Joined Zone</p>
              </div>
              <ArrowRight size={20} className="text-gray-300 group-hover:text-[#c2f575] transition-colors" />
            </div>
          )) : (
            <div className="col-span-full py-10 text-center opacity-30 italic flex flex-col items-center">
              <Zap size={40} className="mb-4" />
              <p>No joined zones yet.</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3">
            <ShieldCheck size={24} className="text-[#0077b5]" /> Experience
          </h3>
          {isEditing && (
            <button onClick={addExp} className="p-3 bg-indigo-50 text-indigo-900 rounded-xl hover:bg-[#c2f575] transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest">
              <Plus size={16} /> Add Experience
            </button>
          )}
        </div>
        <div className="space-y-10">
          {(isEditing ? editExperience : (profileUser.experience || [])).map((exp: any, idx: number) => (
            <div key={idx} className="relative pl-10 border-l-2 border-gray-50 pb-10 last:pb-0">
              <div className="absolute top-0 -left-[11px] w-5 h-5 rounded-full bg-white border-4 border-[#0077b5]"></div>
              {isEditing ? (
                <div className="space-y-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-start">
                    <input value={exp.title} onChange={(e) => updateExp(idx, 'title', e.target.value)} placeholder="Job Title" className="text-xl font-black text-indigo-900 bg-transparent outline-none w-full mr-4 border-b border-gray-200 focus:border-indigo-900" />
                    <button onClick={() => removeExp(idx)} className="text-gray-400 hover:text-red-500"><X size={20} /></button>
                  </div>
                  <input value={exp.company} onChange={(e) => updateExp(idx, 'company', e.target.value)} placeholder="Company" className="text-sm font-bold text-gray-600 bg-transparent outline-none w-full border-b border-gray-200 focus:border-indigo-900" />
                  <div className="flex gap-4">
                    <input value={exp.startDate} onChange={(e) => updateExp(idx, 'startDate', e.target.value)} placeholder="Start Date" className="text-xs font-bold text-gray-400 bg-transparent outline-none w-1/2 border-b border-gray-200" />
                    <input value={exp.endDate} onChange={(e) => updateExp(idx, 'endDate', e.target.value)} placeholder="End Date" className="text-xs font-bold text-gray-400 bg-transparent outline-none w-1/2 border-b border-gray-200" />
                  </div>
                  <textarea value={exp.description} onChange={(e) => updateExp(idx, 'description', e.target.value)} placeholder="Description" className="text-sm text-gray-500 bg-transparent outline-none w-full resize-none border-b border-gray-200 h-24" />
                </div>
              ) : (
                <>
                  <h4 className="text-xl font-black text-indigo-900 leading-tight">{exp.title}</h4>
                  <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">{exp.company} • {exp.startDate} — {exp.endDate}</p>
                  <p className="text-gray-500 mt-4 leading-relaxed line-clamp-3">{exp.description}</p>
                </>
              )}
            </div>
          ))}
          {(!isEditing && (!profileUser.experience || profileUser.experience.length === 0)) && (
            <div className="py-10 text-center opacity-30 italic">No experience listed.</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-2xl font-black text-indigo-900 flex items-center gap-3">
            <Award size={24} className="text-[#c2f575]" /> Education
          </h3>
          {isEditing && (
            <button onClick={addEdu} className="p-3 bg-indigo-50 text-indigo-900 rounded-xl hover:bg-[#c2f575] transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest">
              <Plus size={16} /> Add Education
            </button>
          )}
        </div>
        <div className="space-y-10">
          {(isEditing ? editEducation : (profileUser.education || [])).map((edu: any, idx: number) => (
            <div key={idx} className="flex gap-6 p-6 rounded-2xl bg-gray-50/50 border border-gray-100 relative group">
              <div className="shrink-0 w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-900 shadow-sm"><Award size={28} /></div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <input value={edu.school} onChange={(e) => updateEdu(idx, 'school', e.target.value)} placeholder="School/University" className="text-xl font-black text-indigo-900 bg-transparent outline-none w-full border-b border-gray-200" />
                      <button onClick={() => removeEdu(idx)} className="text-gray-300 hover:text-red-500 ml-4"><X size={18} /></button>
                    </div>
                    <input value={edu.degree} onChange={(e) => updateEdu(idx, 'degree', e.target.value)} placeholder="Degree/Course" className="text-sm font-bold text-gray-600 bg-transparent outline-none w-full border-b border-gray-200" />
                    <div className="flex gap-4">
                      <input value={edu.startDate} onChange={(e) => updateEdu(idx, 'startDate', e.target.value)} placeholder="Year Started" className="text-xs font-black text-indigo-300 bg-transparent outline-none w-1/2 border-b border-gray-200" />
                      <input value={edu.endDate} onChange={(e) => updateEdu(idx, 'endDate', e.target.value)} placeholder="Year Ended" className="text-xs font-black text-indigo-300 bg-transparent outline-none w-1/2 border-b border-gray-200" />
                    </div>
                  </div>
                ) : (
                  <>
                    <h4 className="text-xl font-black text-indigo-900 leading-tight">{edu.school}</h4>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">{edu.degree}</p>
                    <p className="text-[10px] font-black text-indigo-300 mt-1">{edu.startDate} — {edu.endDate}</p>
                  </>
                )}
              </div>
            </div>
          ))}
          {(!isEditing && (!profileUser.education || profileUser.education.length === 0)) && (
            <div className="py-10 text-center opacity-30 italic">No education details provided.</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-12 border border-gray-100 shadow-sm">
        <h3 className="text-2xl font-black text-indigo-900 mb-8 flex items-center gap-3">
          <Star size={24} className="text-yellow-400" /> Skills
        </h3>
        <div className="flex flex-wrap gap-4">
          {(isEditing ? editSkills : (profileUser.skills || [])).map((skill: string, idx: number) => (
            <div key={idx} className="group relative">
              <span className="px-6 py-3 bg-indigo-50 text-indigo-900 rounded-full font-bold text-sm border border-indigo-100 flex items-center gap-2">
                {skill}
                {isEditing && <button onClick={() => setEditSkills(editSkills.filter((_: any, i: number) => i !== idx))} className="text-indigo-300 hover:text-red-500"><X size={14} /></button>}
              </span>
            </div>
          ))}
          {isEditing && (
            <input
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val && !editSkills.includes(val)) {
                    setEditSkills([...editSkills, val]);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              placeholder="Add skill..."
              className="px-6 py-3 bg-white border border-dashed border-gray-300 rounded-full text-sm font-bold text-indigo-900 outline-none focus:border-indigo-500"
            />
          )}
        </div>
      </div>
    </div>
  );
};

const TutorProfile = ({ profileUser, zones, products, activeTab, setActiveTab, navigate }: any) => (
  <div className="bg-white rounded-[4rem] shadow-[0_60px_120px_rgba(26,26,78,0.12)] border border-gray-100 overflow-hidden">
    <div className="flex bg-gray-50/50 p-5 border-b border-gray-100 gap-2 overflow-x-auto no-scrollbar">
      {[
        { id: 'zones', label: 'Zones', icon: <Globe size={20} /> },
        { id: 'mentorship', label: 'Mentorship', icon: <Video size={20} /> },
        { id: 'services', label: 'Services', icon: <ShoppingBag size={20} /> },
        { id: 'materials', label: 'Materials', icon: <FileText size={20} /> }
      ].map(tab => (
        <button
          key={tab.id} onClick={() => setActiveTab(tab.id)}
          className={`flex-1 min-w-[150px] flex items-center justify-center gap-5 py-7 rounded-[3rem] text-xs font-black uppercase tracking-[0.25em] transition-all
            ${activeTab === tab.id ? 'bg-white text-indigo-900 shadow-2xl scale-[1.02] border border-gray-100' : 'text-gray-400 hover:text-indigo-900 hover:bg-white/50'}
          `}
        >
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>

    <div className="p-16">
      {activeTab === 'zones' && (
        <div className="space-y-12 animate-in fade-in duration-500">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-4xl font-black text-indigo-900 tracking-tighter">Learning Zones</h2>
              <p className="text-gray-400 font-medium text-lg mt-2">Professional learning streams curated by {profileUser.name}.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {zones.length > 0 ? zones.map((zone: any) => (
              <div key={zone.id} className="bg-white border border-gray-100 rounded-[3.5rem] overflow-hidden group hover:shadow-2xl transition-all duration-700 flex flex-col">
                <div className="h-60 overflow-hidden relative">
                  <img src={zone.image} alt={zone.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md text-indigo-900 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase shadow-xl tracking-widest">${zone.price}</div>
                </div>
                <div className="p-10 flex flex-col flex-1">
                  <h4 className="text-2xl font-black text-indigo-900 mb-8 leading-tight tracking-tighter line-clamp-2 min-h-[4rem] group-hover:text-indigo-600 transition-colors">{zone.title}</h4>
                  <button onClick={() => navigate(`/classroom/zone/${zone.id}`)} className="w-full py-6 bg-indigo-900 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-4 hover:brightness-110 transition-all shadow-xl">Join Zone <ArrowRight size={18} className="text-[#c2f575]" /></button>
                </div>
              </div>
            )) : <div className="col-span-full py-20 text-center opacity-20"><Globe size={64} className="mx-auto mb-6" /><p className="text-xl font-black uppercase tracking-widest">No active learning zones</p></div>}
          </div>
        </div>
      )}

      {activeTab === 'mentorship' && (
        <div className="space-y-20 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {products.filter((p: any) => p.type === 'mentorship').length > 0 ? products.filter((p: any) => p.type === 'mentorship').map((mentorship: any) => (
              <div key={mentorship.id} className="bg-indigo-900 p-12 rounded-[4rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div className="inline-flex items-center gap-3 bg-[#c2f575] text-indigo-900 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                      <Video size={14} /> session
                    </div>
                    <p className="text-4xl font-black text-[#c2f575]">{mentorship.price} {mentorship.currency}</p>
                  </div>
                  <h3 className="text-3xl font-black mb-4 tracking-tighter leading-tight">{mentorship.title}</h3>
                  <button onClick={() => navigate(`/booking/${mentorship.id}?tutorId=${profileUser.uid}`)} className="w-full py-6 bg-[#c2f575] text-indigo-900 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.3em] shadow-2xl hover:scale-[1.02] active:scale-95 transition-all mt-4">Book a Session</button>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center opacity-20"><Video size={64} className="mx-auto mb-6" /><p className="text-xl font-black uppercase tracking-widest">No listings available</p></div>
            )}
          </div>
        </div>
      )}

      {['services', 'materials'].includes(activeTab) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {products.filter((p: any) => p.type === activeTab.slice(0, -1)).length > 0 ? products.filter((p: any) => p.type === activeTab.slice(0, -1)).map((prod: any) => (
            <div key={prod.id} className="bg-white border border-gray-100 p-12 rounded-[3.5rem] hover:shadow-2xl transition-all group flex flex-col relative overflow-hidden">
              <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center text-indigo-900 mb-10 group-hover:bg-[#c2f575] transition-all">
                {activeTab === 'services' ? <ShoppingBag size={40} /> : <FileText size={40} />}
              </div>
              <h4 className="text-3xl font-black text-indigo-900 mb-3 tracking-tighter leading-tight">{prod.title}</h4>
              <div className="mt-auto flex justify-between items-center pt-10 border-t border-gray-50">
                <p className="text-4xl font-black text-indigo-900">${prod.price}</p>
                <button className="w-14 h-14 bg-gray-50 text-indigo-900 rounded-2xl hover:bg-indigo-900 hover:text-white transition-all flex items-center justify-center"><ArrowRight size={24} /></button>
              </div>
            </div>
          )) : <div className="col-span-full py-32 text-center opacity-20"><ShoppingBag size={64} className="mx-auto mb-6" /><p className="text-xl font-black uppercase tracking-widest">No listings available</p></div>}
        </div>
      )}
    </div>
  </div>
);

const ProfileView: React.FC = () => {
  const { id } = useParams();
  const { user: currentUser, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [isMe, setIsMe] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  // Followers Modal State
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [profileUserFollowsMe, setProfileUserFollowsMe] = useState(false);

  // Layout & Tabs State
  const [activeTab, setActiveTab] = useState<string>('mentorship');

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editHeadline, setEditHeadline] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editName, setEditName] = useState('');
  const [editExperience, setEditExperience] = useState<any[]>([]);
  const [editEducation, setEditEducation] = useState<any[]>([]);
  const [editSkills, setEditSkills] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Product/Zone Listing State (for Tutor Self-View)
  const [showProductModal, setShowProductModal] = useState(false);
  const [productTitle, setProductTitle] = useState('');
  const [productType, setProductType] = useState<'material' | 'service' | 'mentorship'>('service');
  const [productPrice, setProductPrice] = useState('');
  const [productCurrency, setProductCurrency] = useState<'USD' | 'INR' | 'EUR'>('INR');
  const [isListingProduct, setIsListingProduct] = useState(false);

  // Data State
  const [zones, setZones] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [enrolledIds, setEnrolledIds] = useState<string[]>([]);
  const [tutorStudentsCount, setTutorStudentsCount] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Photo Adjustment State
  const [adjustingImage, setAdjustingImage] = useState<string | null>(null);
  const [adjustType, setAdjustType] = useState<'avatar' | 'banner' | null>(null);

  const mentorshipRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const targetId = id === 'me' ? currentUser?.uid : id;

  useEffect(() => {
    if (!targetId) {
      if (!currentUser) navigate('/auth');
      return;
    }

    setLoading(true);
    setIsMe(targetId === currentUser?.uid);

    let unsubscribe = () => { };

    if (db) {
      unsubscribe = onSnapshot(doc(db, 'users', targetId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfileUser({ uid: docSnap.id, ...data });
          setEditBio(data.bio || '');
          setEditHeadline(data.headline || '');
          setEditLocation(data.location || '');
          setEditName(data.name || '');
          setEditExperience(data.experience || []);
          setEditEducation(data.education || []);
          setEditSkills(data.skills || []);

          // Fetch extra data for this profile
          fetchProfileExtraData(docSnap.id, data);
        } else {
          setProfileUser(null);
        }
        setLoading(false);
      });

      // Check following status if not me
      if (currentUser && targetId !== currentUser.uid) {
        getDoc(doc(db, 'followers', `${currentUser.uid}_${targetId}`)).then(d => setIsFollowing(d.exists()));
      }
    } else {
      // Fallback for mock mode if user is viewing self
      if (targetId === currentUser?.uid) {
        setProfileUser(currentUser);
        setEditBio(currentUser.bio || '');
        setEditHeadline(currentUser.headline || '');
        setEditLocation(currentUser.location || '');
        setEditName(currentUser.name || '');
        setEditExperience(currentUser.experience || []);
        setEditEducation(currentUser.education || []);
        setEditSkills(currentUser.skills || []);
        setLoading(false);
      }
    }

    return () => unsubscribe();
  }, [targetId, currentUser]);

  const fetchProfileExtraData = async (uid: string, userData: any) => {
    if (!db) return;

    // 1. Availability
    setAvailability(userData.availability || []);

    // 2. Zones (Created by this user)
    const qZones = query(collection(db, 'zones'), where('tutorId', '==', uid));
    const zSnap = await getDocs(qZones);
    const zonesData = zSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setZones(zonesData);

    // Fetch student count from each zone's students collection
    let studentsCount = 0;
    for (const zone of zonesData) {
      const coll = collection(db, 'zones', zone.id, 'students');
      const snapshot = await getCountFromServer(coll);
      studentsCount += snapshot.data().count;
    }
    setTutorStudentsCount(studentsCount);

    // Fetch accurate followers count
    const followersColl = collection(db, 'followers');
    const followersQuery = query(followersColl, where('followingId', '==', uid));
    const followersSnap = await getCountFromServer(followersQuery);
    const actualFollowersCount = followersSnap.data().count;

    setProfileUser((prev: any) => prev ? { ...prev, followersCount: actualFollowersCount } : null);

    // 3. Products
    const qProds = query(collection(db, 'products'), where('tutorId', '==', uid));
    const pSnap = await getDocs(qProds);
    setProducts(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    // 4. Enrollments (if looking at own profile)
    if (uid === currentUser?.uid) {
      const qEnroll = collection(db, `users/${uid}/enrollments`);
      const eSnap = await getDocs(qEnroll);
      setEnrolledIds(eSnap.docs.map(d => d.data().zoneId));
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !profileUser || !db) return;

    const followId = `${currentUser.uid}_${profileUser.uid}`;
    const followRef = doc(db, 'followers', followId);

    try {
      if (isFollowing) {
        await deleteDoc(followRef);
        await updateDoc(doc(db, 'users', profileUser.uid), { followersCount: increment(-1) });
        await updateDoc(doc(db, 'users', currentUser.uid), { followingCount: increment(-1) });
        setIsFollowing(false);
      } else {
        await setDoc(followRef, {
          followerId: currentUser.uid,
          followingId: profileUser.uid,
          createdAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'users', profileUser.uid), { followersCount: increment(1) });
        await updateDoc(doc(db, 'users', currentUser.uid), { followingCount: increment(1) });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  const handleViewFollowers = async () => {
    if (!profileUser?.uid || !db || !currentUser) return;

    setShowFollowersModal(true);
    setLoadingFollowers(true);

    try {
      // If NOT me, verify mutual follow first
      if (!isMe) {
        const meFollowingThem = isFollowing;
        const themFollowingMeSnap = await getDoc(doc(db, 'followers', `${profileUser.uid}_${currentUser.uid}`));
        const themFollowingMe = themFollowingMeSnap.exists();

        setProfileUserFollowsMe(themFollowingMe);

        if (!meFollowingThem || !themFollowingMe) {
          setFollowersList([]);
          setLoadingFollowers(false);
          return; // Block viewing if not mutual
        }
      }

      const q = query(collection(db, 'followers'), where('followingId', '==', profileUser.uid));
      const snap = await getDocs(q);

      const followersIds = snap.docs.map(doc => doc.data().followerId);
      if (followersIds.length === 0) {
        setFollowersList([]);
        setLoadingFollowers(false);
        return;
      }

      // Fetch user details for each follower
      const usersData: any[] = [];
      // Split into chunks of 10 for 'in' queries
      for (let i = 0; i < followersIds.length; i += 10) {
        const chunk = followersIds.slice(i, i + 10);
        const usersQ = query(collection(db, 'users'), where('__name__', 'in', chunk));
        const usersSnap = await getDocs(usersQ);
        usersSnap.forEach(d => usersData.push({ id: d.id, ...d.data() }));
      }

      setFollowersList(usersData);
    } catch (e) {
      console.error("Error fetching followers", e);
    }
    setLoadingFollowers(false);
  };

  const handleListProduct = async () => {
    if (!productTitle || !productPrice || !currentUser || !db) return;
    setIsListingProduct(true);

    try {
      await addDoc(collection(db, 'products'), {
        tutorId: currentUser.uid,
        title: productTitle,
        type: productType,
        price: productPrice,
        currency: 'INR',
        createdAt: serverTimestamp()
      });

      setIsListingProduct(false);
      setShowProductModal(false);
      setProductTitle('');
      setProductPrice('');

      if (productType === 'mentorship') {
        navigate('/settings/availability');
      }
    } catch (e) {
      console.error("Error listing product", e);
      setIsListingProduct(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAdjustingImage(reader.result as string);
        setAdjustType(type);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUser || !db) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: editName,
        bio: editBio.slice(0, 200),
        headline: editHeadline,
        location: editLocation,
        experience: editExperience,
        education: editEducation,
        skills: editSkills
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  };

  const handleSavePhoto = async (croppedImage: string) => {
    if (!currentUser || !adjustType) return;
    try {
      const updates: any = {};
      if (adjustType === 'avatar') updates.avatar = croppedImage;
      else updates.banner = croppedImage;
      await updateProfile(updates);
      setAdjustingImage(null);
      setAdjustType(null);
    } catch (error) {
      console.error("Failed to save photo:", error);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#c2f575] border-t-transparent rounded-full animate-spin"></div></div>;
  if (!profileUser) return <div className="h-screen flex flex-col items-center justify-center"><h2 className="text-3xl font-black text-indigo-900 mb-4">User Not Found</h2><button onClick={() => navigate('/dashboard')} className="px-8 py-4 bg-indigo-900 text-white rounded-2xl">Return to Dashboard</button></div>;

  let displayRole = profileUser.role || UserRole.STUDENT;
  if (!isMe && profileUser.bankingDetailsProvided) {
    displayRole = UserRole.TUTOR;
  }
  const role = displayRole;


  // --- RENDERING ---



  return (
    <div className="-m-8 min-h-screen bg-[#fbfbfb] pb-20 animate-in fade-in duration-700">
      {adjustingImage && (
        <PhotoAdjustModal
          image={adjustingImage}
          type={adjustType || 'avatar'}
          onSave={handleSavePhoto}
          onClose={() => { setAdjustingImage(null); setAdjustType(null); }}
          onChangePhoto={() => {
            setAdjustingImage(null);
            if (adjustType === 'avatar') avatarInputRef.current?.click();
            else bannerInputRef.current?.click();
          }}
        />
      )}


      <ProfileHeader
        profileUser={profileUser} isMe={isMe} role={role} isEditing={isEditing}
        editName={editName} setEditName={setEditName} editHeadline={editHeadline} setEditHeadline={setEditHeadline}
        editLocation={editLocation} setEditLocation={setEditLocation} isFollowing={isFollowing} handleFollow={handleFollow}
        bannerInputRef={bannerInputRef} handleFileChange={handleFileChange} avatarInputRef={avatarInputRef}
        setIsEditing={setIsEditing} handleSaveProfile={handleSaveProfile} setShowProductModal={setShowProductModal} navigate={navigate}
        handleViewFollowers={handleViewFollowers} tutorStudentsCount={tutorStudentsCount}
      />

      <div className="max-w-7xl mx-auto mt-8 px-10 relative z-20">
        <AboutSection isEditing={isEditing} editBio={editBio} setEditBio={setEditBio} profileUser={profileUser} />
        {role === UserRole.STUDENT ? (
          <StudentProfile
            profileUser={profileUser} isMe={isMe} zones={zones} enrolledIds={enrolledIds} navigate={navigate}
            isEditing={isEditing} editExperience={editExperience} setEditExperience={setEditExperience}
            editEducation={editEducation} setEditEducation={setEditEducation} editSkills={editSkills} setEditSkills={setEditSkills}
          />
        ) : (
          <TutorProfile
            profileUser={profileUser} zones={zones} products={products} activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate}
          />
        )}
      </div>



      {/* Product Listing Modal (for Tutor) */}
      {showProductModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-[0_40px_100px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="px-12 py-10 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-3xl font-black text-[#040457] tracking-tight">List Digital Product</h3>
              <button onClick={() => setShowProductModal(false)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all"><X size={24} /></button>
            </div>
            <div className="p-12 space-y-10">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PRODUCT NAME</label>
                <input type="text" placeholder="e.g. Masterclass Assets" value={productTitle} onChange={(e) => setProductTitle(e.target.value)} className="w-full bg-[#f8fafc] border border-transparent rounded-2xl px-8 py-5 font-bold text-[#040457] placeholder:text-gray-300 outline-none focus:bg-white focus:border-indigo-900/10 transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">TYPE</label>
                <div className="grid grid-cols-3 gap-4">
                  {(['material', 'service', 'mentorship'] as const).map(t => (
                    <button key={t} onClick={() => setProductType(t)} className={`py-4 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${productType === t ? 'bg-indigo-900 text-white shadow-xl' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PRICE</label><input type="number" min="0" placeholder="0.00" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} className="w-full bg-[#f8fafc] border border-transparent rounded-2xl px-8 py-5 font-bold text-[#040457] outline-none" /></div>
                <div className="space-y-3"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CURRENCY</label>                  <select value={productCurrency} onChange={(e) => setProductCurrency(e.target.value as any)} className="w-full bg-[#f8fafc] border border-transparent rounded-2xl px-8 py-5 font-bold text-[#040457] outline-none">
                  <option value="INR">INR (₹)</option>
                  <option value="USD" disabled>USD ($) - Coming Soon</option>
                  <option value="EUR" disabled>EUR (€) - Coming Soon</option>
                </select></div>
              </div>
              <button onClick={handleListProduct} disabled={isListingProduct} className="w-full py-7 bg-indigo-900 text-white rounded-[1.75rem] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-4 disabled:opacity-70">
                {isListingProduct ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : <>CONFIRM LISTING <ArrowRight size={20} className="text-[#c2f575]" /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Followers Modal (Instagram Style) */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[80vh]">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/30 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-indigo-900">Followers</h3>
                {(!isMe && !(isFollowing && profileUserFollowsMe)) ? (
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Mutual Followers Only</p>
                ) : (
                  <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">{followersList.length} total</p>
                )}
              </div>
              <button onClick={() => setShowFollowersModal(false)} className="p-3 text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              {(!isMe && !(isFollowing && profileUserFollowsMe)) ? (
                <div className="text-center py-10 opacity-50">
                  <p className="text-sm font-bold text-indigo-900">Private List</p>
                  <p className="text-[10px] uppercase font-bold mt-2">You must mutually follow each <br />other to view connections.</p>
                </div>
              ) : loadingFollowers ? (
                <div className="flex justify-center py-10">
                  <div className="w-8 h-8 border-4 border-[#c2f575] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : followersList.length > 0 ? (
                <div className="space-y-4">
                  {followersList.map(fUser => (
                    <div key={fUser.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl cursor-pointer" onClick={() => { setShowFollowersModal(false); navigate(`/profile/${fUser.id}`); }}>
                      <img src={fUser.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + fUser.id} className="w-12 h-12 rounded-xl object-cover" alt="" />
                      <div>
                        <p className="text-sm font-black text-indigo-900">{fUser.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate w-48">{fUser.headline || 'Nunma User'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 opacity-50">
                  <p className="text-sm font-bold text-indigo-900">No followers yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};




export default ProfileView;
