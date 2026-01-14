
import React, { useState, useMemo } from 'react';
import { useApp } from '../App';
import { UserRole, Folder, PodSession, SessionType } from '../types';
import { addFolder as dbAddFolder, updateFolderName as dbUpdateFolderName, deleteFolder as dbDeleteFolder, updatePartyTimezone, updatePartySessionConfig, purgePartyCards, SYSTEM_PARTY_ID } from '../db';

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
    currentUser, theme, isAdmin, isDev, logout, activeParty, setActiveParty, showToast
  } = useApp();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [isChangingTz, setIsChangingTz] = useState(false);
  const [tzSearch, setTzSearch] = useState('');

  // Pod Protocol State
  const [isManagingSessions, setIsManagingSessions] = useState(false);
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

  const handleCopyInvite = () => {
    if (!activeParty) return;
    const url = new URL(window.location.origin);
    url.searchParams.set('hub', activeParty.id);
    navigator.clipboard.writeText(url.toString());
    showToast("Hub Invite Link Copied!");
  };

  const handleUpdateSessionConfig = async (type: SessionType, field: string, value: any) => {
    if (!activeParty || (!isAdmin && !isDev)) return;
    
    const currentConfig = activeParty.session_config || {
      morning: { enabled: false, start: '08:00', end: '11:00' },
      afternoon: { enabled: false, start: '13:00', end: '16:00' },
      evening: { enabled: false, start: '19:00', end: '22:00' }
    };

    const newConfig = {
      ...currentConfig,
      [type]: {
        ...currentConfig[type],
        [field]: value
      }
    };

    // Optimistic local update
    setActiveParty({ ...activeParty, session_config: newConfig });

    try {
      await updatePartySessionConfig(activeParty.id, newConfig);
    } catch (err) {
      showToast("Sync Error: Window settings might not have saved.", "error");
      // Supabase realtime will eventually correct the local state to match DB
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

  const config = activeParty?.session_config || {
    morning: { enabled: false, start: '08:00', end: '11:00' },
    afternoon: { enabled: false, start: '13:00', end: '16:00' },
    evening: { enabled: false, start: '19:00', end: '22:00' }
  };

  return (
    <aside className={`w-full lg:w-72 flex flex-col h-full border-r transition-colors duration-500 overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600 shadow-xl z-20'}`}>
      
      {/* HEADER: STICKY TOP */}
      <div className="p-6 pb-4 shrink-0">
        <h2 className={`font-black text-2xl tracking-tighter flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 ${isDev ? 'bg-emerald-500 shadow-emerald-500/20' : isAdmin ? 'bg-amber-500 shadow-amber-500/20' : 'bg-indigo-600 shadow-indigo-500/20'}`}>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
          </div>
          <div className="truncate flex flex-col min-w-0">
            <span className="truncate leading-none">{isDev ? 'Architect' : (activeParty?.name || 'Hub')}</span>
            {!isDev && activeParty && (
               <button onClick={() => (isAdmin || isDev) && setIsChangingTz(!isChangingTz)} className={`text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1 flex items-center gap-1 transition-colors ${isAdmin ? 'hover:text-indigo-400' : 'cursor-default'}`}>
                 <span className="truncate max-w-[120px]">{activeParty.timezone || 'UTC'}</span>
                 {(isAdmin || isDev) && <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg>}
               </button>
            )}
          </div>
        </h2>
        
        {activeParty && (
          <div className="mt-6 flex flex-col gap-2">
            {(isAdmin || isDev) && (
              <button 
                onClick={handleCopyInvite}
                className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Share Hub Invite
              </button>
            )}
            
            <button 
              onClick={() => setIsManagingSessions(!isManagingSessions)}
              className={`w-full px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-2 ${
                isManagingSessions 
                ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg' 
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/20'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {isAdmin || isDev ? (isManagingSessions ? 'Close Console' : 'Manage Windows') : 'View Schedule'}
            </button>
          </div>
        )}
      </div>

      {/* MAIN SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 space-y-6 pb-12">
        
        {/* POD PROTOCOL CONSOLE (IN-FLOW) */}
        {isManagingSessions && (
          <div className="p-4 bg-slate-100 dark:bg-slate-800/95 rounded-[2rem] border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-4 duration-300 shadow-xl relative space-y-4 overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
             
             <div className="flex items-center justify-between">
               <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Control Protocol</p>
               <button onClick={() => setIsManagingSessions(false)} className="p-1.5 bg-slate-200 dark:bg-slate-900 rounded-lg text-slate-400 hover:text-white">
                 <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6" /></svg>
               </button>
             </div>
             
             <div className="space-y-3">
               {(['morning', 'afternoon', 'evening'] as SessionType[]).map((type) => (
                 <div key={type} className={`p-3 rounded-xl border transition-all ${config[type].enabled ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-slate-200/50 dark:bg-slate-900/50 border-transparent'}`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[9px] font-black uppercase tracking-widest truncate min-w-0 ${config[type].enabled ? 'text-indigo-500' : 'text-slate-500'}`}>{type}</span>
                      <button 
                        disabled={!isAdmin && !isDev}
                        onClick={() => handleUpdateSessionConfig(type, 'enabled', !config[type].enabled)}
                        className={`w-9 h-4.5 rounded-full relative transition-all border shrink-0 ${config[type].enabled ? 'bg-indigo-500 border-indigo-400' : 'bg-slate-400 border-slate-300'}`}
                      >
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-all ${config[type].enabled ? 'left-5' : 'left-1'}`} />
                      </button>
                    </div>
                    {config[type].enabled && (isAdmin || isDev) && (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                         <div className="space-y-1">
                           <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter block ml-1">Start</span>
                           <input 
                             type="time" 
                             value={config[type].start} 
                             onChange={e => handleUpdateSessionConfig(type, 'start', e.target.value)} 
                             className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white p-1 rounded-lg text-[9px] font-black outline-none focus:border-indigo-500 transition-colors" 
                           />
                         </div>
                         <div className="space-y-1">
                           <span className="text-[7px] font-black text-slate-500 uppercase tracking-tighter block ml-1">End</span>
                           <input 
                             type="time" 
                             value={config[type].end} 
                             onChange={e => handleUpdateSessionConfig(type, 'end', e.target.value)} 
                             className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white p-1 rounded-lg text-[9px] font-black outline-none focus:border-indigo-500 transition-colors" 
                           />
                         </div>
                      </div>
                    )}
                 </div>
               ))}
             </div>

             {(isAdmin || isDev) && (
                <button 
                  onClick={handlePurgeHub}
                  disabled={isTerminating}
                  className={`w-full py-2.5 rounded-xl text-[9px] font-black tracking-widest uppercase transition-all flex items-center justify-center gap-2 border ${
                    isTerminating 
                    ? 'bg-slate-800 border-slate-700 text-slate-600' 
                    : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-600 hover:text-white'
                  }`}
                >
                  {isTerminating ? 'Purging...' : 'Wipe Content'}
                </button>
             )}
          </div>
        )}

        {/* TIMEZONE MODAL (IN-FLOW) */}
        {isChangingTz && (
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300 shadow-xl relative">
             <div className="flex items-center justify-between mb-3">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Hub Boundary</p>
               <button onClick={() => setIsChangingTz(false)} className="text-slate-400 hover:text-white">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6" /></svg>
               </button>
             </div>
             <input 
               type="text" 
               placeholder="Search..." 
               value={tzSearch}
               onChange={e => setTzSearch(e.target.value)}
               className={`w-full px-3 py-2 rounded-xl text-xs font-bold outline-none border transition-all mb-3 ${isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}
             />
             <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto custom-scrollbar pr-1">
               {filteredTimezones.map((tz: string) => (
                 <button 
                   key={tz} 
                   onClick={() => handleTzChange(tz)} 
                   className={`w-full px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-tight text-left truncate transition-all ${activeParty?.timezone === tz ? 'bg-indigo-600 text-white' : 'hover:bg-indigo-500/10 text-slate-400'}`}
                 >
                   {tz.replace(/_/g, ' ')}
                 </button>
               ))}
             </div>
          </div>
        )}

        {/* NAVIGATION LINKS */}
        <div className="space-y-6">
          {isDev && (
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
          )}
          
          {isAdmin && !isDev && (
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
          )}

          <div>
            <div className="px-4 mb-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] flex items-center justify-between">
              <span>Communities</span>
              {(isAdmin || isDev) && !isAdding && (
                <button onClick={() => setIsAdding(true)} className="p-1.5 hover:bg-indigo-500/10 rounded-lg text-indigo-500 transition-all active:scale-90">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                </button>
              )}
            </div>

            {isAdding && (
              <div className="mb-4 animate-in slide-in-from-top-2 duration-300">
                <div className={`p-2 rounded-2xl border ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <input autoFocus placeholder="Name..." className={`w-full bg-transparent border-none outline-none text-xs font-bold px-3 py-2 ${isDark ? 'text-white' : 'text-slate-900'}`} value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addFolder(newFolderName)} />
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <button onClick={() => setIsAdding(false)} className="px-3 py-1 text-[8px] font-black uppercase text-slate-500">Cancel</button>
                    <button onClick={() => addFolder(newFolderName)} className="px-4 py-1.5 bg-indigo-600 text-white text-[8px] font-black uppercase rounded-lg shadow-lg">Create</button>
                  </div>
                </div>
              </div>
            )}
            
            <nav className="space-y-1.5">
              {sortedFolders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => handleSelect(folder.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all ${
                    selectedFolderId === folder.id 
                      ? (isDev ? 'bg-emerald-600' : isAdmin ? 'bg-amber-500' : 'bg-indigo-600') + ' text-white shadow-lg' 
                      : `hover:bg-slate-100 ${isDark ? 'hover:bg-slate-800' : ''} font-semibold`
                  }`}
                >
                  <span className="text-xl shrink-0">{folder.party_id === SYSTEM_PARTY_ID ? '⚡' : '📁'}</span>
                  <span className="truncate text-sm tracking-tight">{folder.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* FOOTER: STICKY BOTTOM */}
      <div className={`p-6 border-t shrink-0 ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'} space-y-4`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-xl shrink-0 ${isDev ? 'bg-gradient-to-tr from-emerald-500 to-teal-600' : isAdmin ? 'bg-gradient-to-tr from-amber-500 to-orange-600' : 'bg-gradient-to-tr from-indigo-600 to-violet-600'}`}>
            {currentUser?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentUser?.name}</p>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${isDev ? 'text-emerald-400' : isAdmin ? 'text-amber-500' : 'text-slate-500'} truncate`}>
              {isDev ? 'Architect' : isAdmin ? 'Admin' : 'Active User'}
            </p>
          </div>
        </div>
        
        <button 
          onClick={logout}
          className="w-full py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default FolderSidebar;
