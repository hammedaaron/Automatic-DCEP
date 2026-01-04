
import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { UserRole } from '../types';
import { optimizeIdentity } from '../services/gemini';
// Fix: removed non-existent getInTimeZone import from db.ts
import { getCalendarDaysBetween, isPodSessionActive } from '../db';

interface CreateProfileModalProps {
  onClose: () => void;
  onSubmit: (name: string, link1: string, link2: string, link1Label?: string, link2Label?: string, isPermanent?: boolean) => void;
}

const CreateProfileModal: React.FC<CreateProfileModalProps> = ({ onClose, onSubmit }) => {
  const { currentUser, theme, cards, selectedFolderId, activeParty, showToast } = useApp();
  const [name, setName] = useState(currentUser?.name || '');
  const [link1, setLink1] = useState('');
  const [link2, setLink2] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const isDark = theme === 'dark';

  const isDev = currentUser?.role === UserRole.DEV;
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  
  const tz = activeParty?.timezone || 'UTC';
  const sessionStatus = useMemo(() => isPodSessionActive(activeParty), [activeParty]);

  const userTodayCardsInFolder = cards.filter(c => 
    c.user_id === currentUser?.id && 
    c.folder_id === selectedFolderId && 
    getCalendarDaysBetween(c.timestamp, Date.now(), tz) === 0
  );
  
  const reachedRateLimit = !isDev && (
    (isAdmin && userTodayCardsInFolder.length >= 2) || 
    (!isAdmin && userTodayCardsInFolder.length >= 1)
  );

  const handlePost = () => {
    if (!sessionStatus.active && !isDev) {
      showToast("POD CLOSED: Participation only allowed during active session windows.", "error");
      return;
    }
    if (reachedRateLimit) {
      showToast(`Daily limit reached for this community.`, "error");
      return;
    }
    if (!name.trim() || !link1.trim()) return;
    
    let c1 = link1.trim();
    if (!c1.startsWith('http')) c1 = `https://${c1}`;
    let c2 = link2.trim();
    if (c2 && !c2.startsWith('http')) c2 = `https://${c2}`;

    onSubmit(name.trim(), c1, c2, undefined, undefined, false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`w-full max-w-lg transform transition-all rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100'}`}>
        <div className="px-10 py-8 flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className={`font-black text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Join Hub</h3>
            {!sessionStatus.active && !isDev && <p className="text-red-500 text-[10px] font-black uppercase mt-1">Pod Windows Inactive</p>}
          </div>
          <button onClick={onClose} className="p-3 text-slate-500"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        
        <div className="px-10 pb-10 space-y-6">
          <input placeholder="Display Name" value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-800 text-white rounded-2xl px-6 py-4 font-bold outline-none border border-slate-700" />
          <input placeholder="Primary Link" value={link1} onChange={e => setLink1(e.target.value)} className="w-full bg-slate-800 text-white rounded-2xl px-6 py-4 font-bold outline-none border border-slate-700" />
          <input placeholder="Secondary Link" value={link2} onChange={e => setLink2(e.target.value)} className="w-full bg-slate-800 text-white rounded-2xl px-6 py-4 font-bold outline-none border border-slate-700" />
          
          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 py-5 text-slate-500 font-black">Cancel</button>
            <button onClick={handlePost} disabled={(!sessionStatus.active && !isDev) || reachedRateLimit} className="flex-1 py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl disabled:opacity-30">Join Feed</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProfileModal;
