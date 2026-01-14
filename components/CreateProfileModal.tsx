
import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { UserRole } from '../types';
import { SYSTEM_PARTY_ID } from '../db';

interface CreateProfileModalProps {
  onClose: () => void;
  onSubmit: (name: string, link1: string, link2: string) => void;
}

const CreateProfileModal: React.FC<CreateProfileModalProps> = ({ onClose, onSubmit }) => {
  const { currentUser, theme, cards, selectedFolderId, activeParty, showToast, activeSessionTab, folders } = useApp();
  const [name, setName] = useState(currentUser?.name || '');
  const [link1, setLink1] = useState('');
  const isDark = theme === 'dark';

  const isDev = currentUser?.role === UserRole.DEV;
  const isAdmin = currentUser?.role === UserRole.ADMIN || isDev;

  const todayStr = useMemo(() => {
    const tz = activeParty?.timezone || 'UTC';
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }, [activeParty]);

  const sessionConfig = activeParty?.session_config?.[activeSessionTab];

  const { isBlocked, blockReason } = useMemo(() => {
    const currentFolder = folders.find(f => f.id === selectedFolderId);
    
    // --- THE WALL: BLOCK ADMINS FROM DEV FOLDERS ---
    if (isAdmin && !isDev && currentFolder?.party_id === SYSTEM_PARTY_ID) {
      return { isBlocked: true, blockReason: "Access Denied: Universal Folders are restricted to Architects." };
    }

    // --- ADMIN LIMITS: 5 PER COMMUNITY ---
    if (isAdmin && !isDev) {
      const folderCount = cards.filter(c => 
        c.user_id === currentUser?.id && 
        c.folder_id === selectedFolderId && 
        c.session_date === todayStr
      ).length;

      if (folderCount >= 5) {
        return { isBlocked: true, blockReason: "Community Cap: Max 5 nodes permitted per folder today." };
      }
      return { isBlocked: false, blockReason: '' }; // Admins can post anytime
    }
    
    // Architect (Dev) has no limits
    if (isDev) return { isBlocked: false, blockReason: '' };

    // Standard Node Submission Protocol for Regular Users
    if (!sessionConfig || !sessionConfig.enabled) {
      return { isBlocked: true, blockReason: `Session protocol for "${activeSessionTab}" is currently disabled.` };
    }

    const now = new Date();
    const tz = activeParty?.timezone || 'UTC';
    const nowInTz = new Date(new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(now));
    const currentTime = `${nowInTz.getHours().toString().padStart(2, '0')}:${nowInTz.getMinutes().toString().padStart(2, '0')}`;
    
    if (currentTime < sessionConfig.start || currentTime > sessionConfig.end) {
      return { isBlocked: true, blockReason: `Window Closed: Node submission for "${activeSessionTab}" only permitted between ${sessionConfig.start} and ${sessionConfig.end}.` };
    }

    const hasPosted = cards.some(c => 
      c.user_id === currentUser?.id && 
      c.folder_id === selectedFolderId &&
      c.session_type === activeSessionTab && 
      c.session_date === todayStr
    );

    if (hasPosted) {
      return { isBlocked: true, blockReason: `Identity Lock: You have already established a node for today's "${activeSessionTab}" session in this community.` };
    }

    return { isBlocked: false, blockReason: '' };
  }, [isAdmin, isDev, sessionConfig, activeSessionTab, currentUser, cards, todayStr, activeParty, selectedFolderId, folders]);

  const handlePost = () => {
    if (isBlocked) {
      showToast(blockReason, "error");
      return;
    }
    if (!name.trim() || !link1.trim()) return;
    
    let c1 = link1.trim();
    if (!c1.startsWith('http')) c1 = `https://${c1}`;

    onSubmit(name.trim(), c1, "");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className={`w-full max-w-lg transform transition-all rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-100'}`}>
        <div className="px-10 py-8 flex items-center justify-between">
          <div className="flex flex-col">
            <h3 className={`font-black text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Join Hub</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase mt-1 tracking-widest">Protocol: Identity Submission</p>
          </div>
          <button onClick={onClose} className="p-3 text-slate-500"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        
        <div className="px-10 pb-10 space-y-6">
          <div className={`p-4 rounded-2xl border ${isBlocked ? 'bg-red-500/10 border-red-500/30' : 'bg-indigo-500/10 border-indigo-500/30'}`}>
            <div className="flex justify-between items-center">
              <span className={`text-[9px] font-black uppercase tracking-widest ${isBlocked ? 'text-red-500' : 'text-emerald-500'}`}>
                {isBlocked ? 'Submission Denied' : `Active Hub Session: ${activeSessionTab}`}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-medium leading-relaxed">
              {isAdmin 
                ? "Administrative Authority: You may bypass session timing, but a community limit of 5 nodes applies." 
                : isBlocked 
                  ? blockReason 
                  : `Identity verified. You are authorized to establish one node for the current ${activeSessionTab} window.`}
            </p>
          </div>

          {!isBlocked && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Identity Name</label>
                <input 
                  placeholder="Username or Handle" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className={`w-full rounded-2xl px-6 py-4 font-bold outline-none border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`} 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Primary Content Link</label>
                <input 
                  placeholder="https://..." 
                  value={link1} 
                  onChange={e => setLink1(e.target.value)} 
                  className={`w-full rounded-2xl px-6 py-4 font-bold outline-none border transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'}`} 
                />
              </div>
            </div>
          )}
          
          <div className="flex gap-4 pt-4">
            <button onClick={onClose} className="flex-1 py-5 text-slate-500 font-black uppercase tracking-widest text-xs">Cancel</button>
            <button 
              onClick={handlePost} 
              disabled={isBlocked} 
              className={`flex-1 py-5 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-widest text-xs border-2 ${isBlocked ? 'bg-slate-200 dark:bg-slate-800 border-transparent text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 border-indigo-400 active:scale-95'}`}
            >
              Establish Node
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateProfileModal;
