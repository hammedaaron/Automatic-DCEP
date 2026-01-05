
import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { UserRole, Folder, PodSession } from '../types';
import { addFolder as dbAddFolder, updateFolderName as dbUpdateFolderName, deleteFolder as dbDeleteFolder, updatePartyTimezone, updatePartySessions, purgePartyCards, SYSTEM_PARTY_ID } from '../db';

interface FolderSidebarProps {
  onSelect?: () => void;
}

const ALL_TIMEZONES = (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') : [
  'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago', 'America/Denver', 
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai', 
  'Asia/Dubai', 'Australia/Sydney', 'Pacific/Auckland'
];

const FolderSidebar: React.FC<FolderSidebarProps> = ({ onSelect }) => {
  const { 
    folders, setFolders, selectedFolderId, setSelectedFolderId, 
    currentUser, theme, isAdmin, isDev, logout, activeParty, showToast
  } = useApp();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [isChangingTz, setIsChangingTz] = useState(false);
  const [tzSearch, setTzSearch] = useState('');

  // Session Control States
  const [isManagingSessions, setIsManagingSessions] = useState(false);
  const [sessionName, setSessionName] = useState('Daily Sync');
  const [sessionStart, setSessionStart] = useState('09:00');
  const [sessionEnd, setSessionEnd] = useState('11:00');
  const [isTerminating, setIsTerminating] = useState(false);

  const isDark = theme === 'dark';

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => {
      const aIsSystem = a.party_id === SYSTEM_PARTY_ID;
      const bIsSystem = b.party_id === SYSTEM_PARTY_ID;
      if (aIsSystem && !bIsSystem) return -1;
      if (!aIsSystem && bIsSystem) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [folders]);

  const filteredTimezones = useMemo(() => {
    if (!tzSearch) return ALL_TIMEZONES.slice(0, 15);
    return ALL_TIMEZONES.filter((tz: string) => 
      tz.toLowerCase().includes(tzSearch.toLowerCase())
    ).slice(0, 15);
  }, [tzSearch]);

  const handleSelect = (id: string) => {
    if (editingFolderId) return; 
    setSelectedFolderId(id);
    if (onSelect) onSelect();
  };

  const handleTzChange = async (tz: string) => {
    if (!activeParty) return;
    try {
      await updatePartyTimezone(activeParty.id, tz);
      setIsChangingTz(false);
      setTzSearch('');
      showToast(`Hub Boundary set to ${tz}`);
    } catch (err: any) {
      showToast(err.message || "Tz update failed", "error");
    }
  };

  const handleAddSession = async () => {
    if (!activeParty) return;
    if (!sessionName.trim()) {
      showToast("Session name required", "error");
      return;
    }
    const currentSessions = activeParty.pod_sessions || [];
    if (currentSessions.length >= 3) {
      showToast("Limit Reached: Max 3 Windows Permitted", "error");
      return;
    }

    try {
      const newSession: PodSession = { name: sessionName.trim(), start: sessionStart, end: sessionEnd };
      const updatedSessions = [...currentSessions, newSession];
      await updatePartySessions(activeParty.id, updatedSessions);
      setSessionName('Daily Sync');
      showToast("POD Session Window Added");
    } catch (err) {
      showToast("Session update failed", "error");
    }
  };

  const handleDeleteSession = async (index: number) => {
    if (!activeParty || !activeParty.pod_sessions) return;
    try {
      const updatedSessions = activeParty.pod_sessions.filter((_, i) => i !== index);
      await updatePartySessions(activeParty.id, updatedSessions);
      showToast("Session Window Removed");
    } catch (err) {
      showToast("Failed to remove session", "error");
    }
  };

  const handlePurgeHub = async () => {
    if (!activeParty) return;
    if (!window.confirm("TERMINATION PROTOCOL: Purge all non-permanent identity nodes from this hub? This cannot be undone.")) return;
    
    setIsTerminating(true);
    try {
      await purgePartyCards(activeParty.id);
      showToast("HUB PURGED: All non-permanent nodes terminated.");
    } catch (err) {
      showToast("Termination failed", "error");
    } finally {
      setIsTerminating(false);
    }
  };

  const addFolder = async (name: string) => {
    if (!name.trim() || !activeParty) return;
    try {
      const folderPartyId = isDev ? SYSTEM_PARTY_ID : activeParty.id;
      const newFolder: Folder = {
        id: Math.random().toString(36).substr(2, 9),
        name: name.trim(),
        icon: isDev ? 'Sparkles' : 'Folder',
        party_id: folderPartyId
      };
      await dbAddFolder(newFolder);
      setNewFolderName('');
      setIsAdding(false);
      showToast(isDev ? "Universal Community Established" : "Local Community Created");
    } catch (err) {
      showToast("Error adding community", "error");
    }
  };

  const renameFolder = async (id: string) => {
    if (!editingFolderName.trim() || !activeParty) {
      setEditingFolderId(null);
      return;
    }
    const folder = folders.find(f => f.id === id);
    if (folder?.party_id === SYSTEM_PARTY_ID && !isDev) {
      showToast("Only System Architect can rename Universal Folders.", "error");
      setEditingFolderId(null);
      return;
    }
    try {
      await dbUpdateFolderName(id, editingFolderName.trim());
      setEditingFolderId(null);
    } catch (err) {
      showToast("Error renaming community", "error");
    }
  };

  return (
    <aside className={`w-full lg:w-72 flex flex-col h-full border-r transition-colors duration-500 ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-xl z-20'}`}>
      <div className="p-8 pb-4">
        <h2 className={`font-black text-2xl tracking-tighter flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 ${isDev ? 'bg-emerald-500 shadow-emerald-500/20' : isAdmin ? 'bg-amber-500 shadow-amber-500/20' : 'bg-indigo-600 shadow-indigo-500/20'}`}>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
          </div>
          <div className="truncate flex flex-col min-w-0">
            <span className="truncate leading-none">{isDev ? 'Architect' : (activeParty?.name || 'Hub')}</span>
            {!isDev && activeParty && (
               <button onClick={() => (isAdmin || isDev) && setIsChangingTz(!isChangingTz)} className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1 flex items-center gap-1 hover:text-indigo-400 transition-colors">
                 <span className="truncate max-w-[120px]">{activeParty.timezone || 'UTC'}</span>
                 {(isAdmin || isDev) && <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg>}
               </button>
            )}
          </div>
        </h2>
        
        {(isAdmin || isDev) && !isChangingTz && activeParty && (
          <button 
            onClick={() => setIsManagingSessions(!isManagingSessions)}
            className={`w-full mt-6 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${
              isManagingSessions 
              ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' 
              : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/20'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {isManagingSessions ? 'Close Console' : 'Manage Windows'}
          </button>
        )}

        {isManagingSessions && (
          <div className="mt-4 p-5 bg-slate-100 dark:bg-slate-800/90 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300 shadow-2xl relative z-30 space-y-4 overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
             
             <div className="flex items-center justify-between">
               <div className="flex flex-col">
                 <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Pod Protocol</p>
                 <p className="text-[8px] font-bold text-slate-500 uppercase">{activeParty?.pod_sessions?.length || 0} of 3 Slots Active</p>
               </div>
               <button onClick={() => setIsManagingSessions(false)} className="p-2 bg-slate-200 dark:bg-slate-900 rounded-full text-slate-400 hover:text-white transition-colors">
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             
             <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
               {activeParty?.pod_sessions && activeParty.pod_sessions.length > 0 ? (
                 activeParty.pod_sessions.map((session, idx) => (
                   <div key={idx} className="flex justify-between items-center p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl group transition-all hover:border-indigo-500/50">
                     <div className="min-w-0">
                       <p className="text-[10px] font-black text-slate-900 dark:text-white truncate">{session.name}</p>
                       <div className="flex items-center gap-1.5 mt-0.5">
                         <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                         <p className="text-[9px] font-bold text-slate-500">{session.start} - {session.end}</p>
                       </div>
                     </div>
                     <button 
                        onClick={() => handleDeleteSession(idx)} 
                        className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                        title="Remove Window"
                      >
                       <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                   </div>
                 ))
               ) : (
                 <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">No Active Windows</p>
                 </div>
               )}
             </div>

             {(!activeParty?.pod_sessions || activeParty.pod_sessions.length < 3) && (
               <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                 <input 
                   type="text" 
                   placeholder="Window Name (e.g. Daily Check-in)" 
                   value={sessionName} 
                   onChange={e => setSessionName(e.target.value)} 
                   className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white px-4 py-2.5 rounded-xl text-[10px] font-black outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600" 
                 />
                 <div className="flex items-center gap-2">
                   <div className="flex-1 space-y-1">
                     <span className="text-[7px] font-black text-slate-500 uppercase ml-2 tracking-tighter">Start</span>
                     <input type="time" value={sessionStart} onChange={e => setSessionStart(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white p-2 rounded-xl text-[10px] font-black outline-none focus:border-indigo-500 transition-all" />
                   </div>
                   <div className="flex-1 space-y-1">
                     <span className="text-[7px] font-black text-slate-500 uppercase ml-2 tracking-tighter">End</span>
                     <input type="time" value={sessionEnd} onChange={e => setSessionEnd(e.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white p-2 rounded-xl text-[10px] font-black outline-none focus:border-indigo-500 transition-all" />
                   </div>
                 </div>
                 <button onClick={handleAddSession} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-2xl text-[10px] font-black tracking-[0.2em] uppercase shadow-lg transition-all active:scale-[0.98]">Authorize Window</button>
               </div>
             )}
             
             <div className="p-3 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
               <p className="text-[8px] text-indigo-500 dark:text-indigo-400 leading-relaxed font-black uppercase tracking-tight">
                 Stability Matrix: The hub initiates a global wipe exactly 60 minutes prior to the first active window.
               </p>
             </div>

             <button 
               onClick={handlePurgeHub}
               disabled={isTerminating}
               className={`w-full py-3 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 border-2 ${
                 isTerminating 
                 ? 'bg-slate-800 border-slate-700 text-slate-600' 
                 : 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500 hover:text-white shadow-xl'
               }`}
             >
               {isTerminating ? (
                 <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               ) : (
                 <>
                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                   Termination Sequence
                 </>
               )}
             </button>
          </div>
        )}

        {isChangingTz && (
          <div className="mt-4 p-5 bg-slate-100 dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300 shadow-xl relative z-30">
             <div className="flex items-center justify-between mb-3">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hub Boundary</p>
               <button onClick={() => setIsChangingTz(false)} className="text-slate-400 hover:text-white">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </div>
             <div className="relative mb-4">
               <input 
                 type="text" 
                 placeholder="Search Timezones..." 
                 value={tzSearch}
                 onChange={e => setTzSearch(e.target.value)}
                 className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold outline-none border transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 shadow-sm'}`}
               />
             </div>
             <div className="grid grid-cols-1 gap-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
               {filteredTimezones.map((tz: string) => (
                 <button 
                   key={tz} 
                   onClick={() => handleTzChange(tz)} 
                   className={`w-full px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-tight text-left truncate transition-all border ${activeParty?.timezone === tz ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-white/5 border-transparent text-slate-400 hover:border-indigo-500/50'}`}
                 >
                   {tz.replace(/_/g, ' ')}
                 </button>
               ))}
             </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4 custom-scrollbar">
        {isDev && (
          <div className="mb-8 px-2">
            <button
              onClick={() => handleSelect('authority-table')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
                selectedFolderId === 'authority-table'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold'
              }`}
            >
              <span className="text-xl shrink-0">🕵️‍♂️</span>
              <span className="truncate text-[10px] font-black uppercase tracking-widest">Global Matrix</span>
            </button>
          </div>
        )}
        
        {isAdmin && !isDev && (
          <div className="mb-8 px-2">
            <button
              onClick={() => handleSelect('authority-table')}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
                selectedFolderId === 'authority-table'
                  ? 'bg-amber-500 text-white shadow-lg'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold'
              }`}
            >
              <span className="text-xl shrink-0">🛡️</span>
              <span className="truncate text-[10px] font-black uppercase tracking-widest">Audit Terminal</span>
            </button>
          </div>
        )}

        <div className="mb-4 px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] flex items-center justify-between">
          <span>Communities</span>
          {(isAdmin || isDev) && !isAdding && (
            <button 
              onClick={() => setIsAdding(true)}
              className="p-1.5 hover:bg-indigo-500/10 rounded-lg text-indigo-500 transition-all active:scale-90"
              title="Establish New Community"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
            </button>
          )}
        </div>

        {isAdding && (
          <div className="px-2 mb-6 animate-in slide-in-from-top-2 duration-300">
            <div className={`p-2 rounded-2xl border transition-all ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-200 shadow-inner'}`}>
              <input 
                autoFocus
                placeholder="Community Name..."
                className={`w-full bg-transparent border-none outline-none text-xs font-bold px-3 py-2 ${isDark ? 'text-white' : 'text-slate-900'}`}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addFolder(newFolderName);
                  if (e.key === 'Escape') setIsAdding(false);
                }}
              />
              <div className="flex items-center justify-end gap-1 mt-1">
                <button onClick={() => setIsAdding(false)} className="px-3 py-1 text-[8px] font-black uppercase text-slate-500 hover:text-red-500">Cancel</button>
                <button onClick={() => addFolder(newFolderName)} className="px-4 py-1.5 bg-indigo-600 text-white text-[8px] font-black uppercase rounded-lg shadow-lg">Create</button>
              </div>
            </div>
          </div>
        )}
        
        <nav className="space-y-1.5">
          {sortedFolders.map(folder => (
            <div key={folder.id} className="group flex items-center gap-1">
              {editingFolderId === folder.id ? (
                <div className="flex-1 flex items-center gap-2 p-1.5 bg-indigo-50 dark:bg-slate-800 rounded-2xl border border-indigo-200 dark:border-slate-700">
                  <input 
                    autoFocus
                    className="flex-1 bg-transparent px-3 py-1.5 text-sm font-bold outline-none text-slate-900 dark:text-white"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && renameFolder(folder.id)}
                  />
                </div>
              ) : (
                <button
                  onClick={() => handleSelect(folder.id)}
                  className={`flex-1 flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group/btn ${
                    selectedFolderId === folder.id 
                      ? (isDev ? 'bg-emerald-600' : isAdmin ? 'bg-amber-500' : 'bg-indigo-600') + ' text-white shadow-lg' 
                      : `hover:bg-slate-100 ${isDark ? 'hover:bg-slate-800 hover:text-white' : ''} font-semibold`
                  }`}
                >
                  <span className="text-xl shrink-0">
                    {folder.party_id === SYSTEM_PARTY_ID ? '⚡' : folder.icon === 'Sparkles' ? '✨' : '📁'}
                  </span>
                  <span className="truncate text-sm tracking-tight">{folder.name}</span>
                </button>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className={`p-6 border-t ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'} space-y-4`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-xl shrink-0 ${isDev ? 'bg-gradient-to-tr from-emerald-500 to-teal-600' : isAdmin ? 'bg-gradient-to-tr from-amber-500 to-orange-600' : 'bg-gradient-to-tr from-indigo-600 to-violet-600'}`}>
            {currentUser?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentUser?.name}</p>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDev ? 'text-emerald-400' : isAdmin ? 'text-amber-500' : 'text-slate-500'} truncate`}>
              {isDev ? 'System Architect' : isAdmin ? 'Master Admin' : 'Active User'}
            </p>
          </div>
        </div>
        
        <button 
          onClick={logout}
          className="w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-50 hover:text-white"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default FolderSidebar;
