
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../App';
import FolderSidebar from './FolderSidebar';
import NotificationPanel from './NotificationPanel';
import LeaderboardTable from './LeaderboardTable';
import { UserRole, SessionType } from '../types';
import { SYSTEM_PARTY_ID, getHubCycleInfo } from '../db';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps & { onOpenCreateProfile: () => void }> = ({ children, onOpenCreateProfile }) => {
  const { 
    currentUser, theme, setTheme, isPoweredUp, 
    selectedFolderId, folders, notifications, activeParty,
    isDev, isAdmin, cards, socketStatus, syncData, showToast,
    activeSessionTab, setActiveSessionTab
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'folders' | 'community' | 'leaderboard'>('community');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const unreadNotifications = notifications.filter(n => n.recipient_id === currentUser?.id && !n.read).length;
  const currentFolder = folders.find(f => f.id === selectedFolderId);
  const currentFolderName = currentFolder?.name || 'Hub';
  const isDark = theme === 'dark';

  const userHasProfile = cards.some(c => c.user_id === currentUser?.id && c.folder_id === selectedFolderId);
  const isSystemFolder = currentFolder?.party_id === SYSTEM_PARTY_ID;
  const isCreationDisabled = (userHasProfile && !isDev && !isAdmin) || (isSystemFolder && !isDev);

  const cycleInfo = useMemo(() => getHubCycleInfo(activeParty), [activeParty]);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    const handleScroll = () => { setShowScrollTop(scrollContainer.scrollTop > 400); };
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => { scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await syncData();
      showToast("Hub Synchronized");
    } catch (err) {
      showToast("Sync Failed", "error");
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  // Session pill config with "CREATION OPEN" status logic
  const sessions = useMemo(() => {
    const config = activeParty?.session_config;
    if (!config || isDev) return [];
    
    const available: { id: SessionType, label: string, status: string, isOpen: boolean }[] = [];
    const now = new Date();
    const tz = activeParty?.timezone || 'UTC';
    const nowInTz = new Date(new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(now));
    const currentH = nowInTz.getHours();
    const currentM = nowInTz.getMinutes();
    const currentTime = `${currentH.toString().padStart(2, '0')}:${currentM.toString().padStart(2, '0')}`;

    const check = (type: SessionType, name: string) => {
      const s = config[type];
      if (s?.enabled) {
        const isOpen = currentTime >= s.start && currentTime <= s.end;
        available.push({ 
          id: type, 
          label: name, 
          isOpen,
          status: isOpen ? 'CREATION OPEN' : 'VIEW & ENGAGE ONLY' 
        });
      }
    };

    check('morning', 'Morning');
    check('afternoon', 'Afternoon');
    check('evening', 'Evening');
    
    return available;
  }, [activeParty, isDev]);

  return (
    <div className={`flex h-[100dvh] w-screen overflow-hidden transition-all duration-300 ${isDark ? 'bg-[#020617] text-slate-100' : 'bg-slate-50 text-slate-900'} flex-col lg:flex-row`}>
      {isPoweredUp && <div className="fixed inset-0 power-up-bg opacity-10 z-0 pointer-events-none" />}
      
      <div className={`fixed inset-y-0 left-0 z-[100] w-72 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${activeTab === 'folders' ? 'translate-x-0' : '-translate-x-full'} border-r ${isDark ? 'border-white/10 bg-[#020617]' : 'border-slate-200 bg-white'}`}>
        <FolderSidebar onSelect={() => setActiveTab('community')} />
      </div>

      {activeTab === 'folders' && (
        <div onClick={() => setActiveTab('community')} className="lg:hidden fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300" />
      )}

      <main className="flex-1 flex flex-col h-full overflow-hidden z-10 relative">
        <header className={`px-4 lg:px-8 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 lg:py-5 flex flex-col gap-3 sticky top-0 z-40 transition-all ${isDark ? 'bg-slate-900/90' : 'bg-white/95 shadow-sm'} backdrop-blur-xl border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between gap-4 lg:gap-8 min-w-0">
            <div className="flex flex-col min-w-0">
              <h1 className={`text-xl lg:text-3xl font-black tracking-tight truncate flex items-center gap-3 shrink-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span className="truncate">{activeTab === 'leaderboard' ? 'Rankings' : currentFolderName}</span>
                <div className="shrink-0 relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${socketStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${socketStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                </div>
              </h1>
              <button 
                onClick={() => setShowStatusModal(!showStatusModal)} 
                className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest mt-1 w-fit transition-all ${cycleInfo.activeSession ? 'text-emerald-500' : 'text-slate-500'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cycleInfo.activeSession ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                {cycleInfo.activeSession ? `Window Active: ${cycleInfo.activeSession.name}` : 'Hub Idle: View Schedule'}
              </button>
            </div>

            <div className="hidden xl:flex items-center gap-6">
              <nav className={`flex items-center p-1 rounded-2xl border ${isDark ? 'bg-slate-950 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                <button onClick={() => setActiveTab('community')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'community' ? 'bg-indigo-600 text-white shadow-lg' : isDark ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`}>Feed</button>
                <button onClick={() => setActiveTab('leaderboard')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'leaderboard' ? 'bg-indigo-600 text-white shadow-lg' : isDark ? 'text-slate-500 hover:text-indigo-400' : 'text-slate-500 hover:text-indigo-600'}`}>Rankings</button>
              </nav>

              {activeTab === 'community' && sessions.length > 0 && (
                <div className={`flex items-center p-1 rounded-2xl border ${isDark ? 'bg-slate-950 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSessionTab(s.id)}
                      className={`px-4 py-1.5 rounded-xl text-left transition-all group ${activeSessionTab === s.id ? 'bg-indigo-600 text-white shadow-lg' : isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-indigo-600'}`}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">{s.label}</span>
                        <span className={`text-[7px] font-bold uppercase mt-1 ${s.isOpen ? (activeSessionTab === s.id ? 'text-emerald-300' : 'text-emerald-500 pulse') : 'opacity-40'}`}>
                          {s.status}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 lg:gap-4 shrink-0">
              <button onClick={toggleTheme} className={`p-2 lg:p-3 rounded-xl border-2 transition-all ${isDark ? 'bg-slate-800 border-white/10 text-amber-400 hover:border-amber-400' : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-indigo-600'}`} title="Toggle Theme">
                {isDark ? (
                  <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.071 16.071l.707.707M7.929 7.929l.707-.707M12 8a4 4 0 110 8 4 4 0 010-8z" /></svg>
                ) : (
                  <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                )}
              </button>

              <button onClick={handleManualRefresh} className={`p-2 lg:p-3 rounded-xl transition-all border-2 ${isDark ? 'bg-slate-800 border-white/10 hover:border-emerald-500' : 'bg-slate-100 border-slate-200 hover:border-emerald-600'} text-emerald-500`} title="Force Sync">
                <svg className={`w-5 h-5 lg:w-6 lg:h-6 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>

              <button onClick={() => setIsNotifOpen(true)} className={`p-2 lg:p-3 rounded-xl transition-all relative border-2 ${isNotifOpen ? 'bg-indigo-600 border-indigo-400 text-white' : isDark ? 'bg-slate-800 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {unreadNotifications > 0 && <span className="absolute -top-2 -right-2 flex h-5 w-5 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full text-[9px] font-black items-center justify-center text-white">{unreadNotifications}</span>}
              </button>

              <button onClick={onOpenCreateProfile} disabled={isCreationDisabled || !selectedFolderId} className={`${isCreationDisabled || !selectedFolderId ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-transparent' : 'bg-indigo-600 text-white shadow-lg border-indigo-400'} px-5 py-2.5 rounded-xl text-[10px] font-black transition-all active:scale-95 border-2`}>
                <span className="uppercase tracking-[0.2em]">{!selectedFolderId ? 'Select' : isCreationDisabled ? 'Joined' : 'Join'}</span>
              </button>
            </div>
          </div>

          {activeTab === 'community' && sessions.length > 0 && (
            <div className="xl:hidden flex items-center justify-center overflow-x-auto pb-1 no-scrollbar">
              <div className={`inline-flex p-1 rounded-2xl border ${isDark ? 'bg-slate-950 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                {sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSessionTab(s.id)}
                    className={`px-4 py-2 rounded-xl text-left transition-all ${activeSessionTab === s.id ? 'bg-indigo-600 text-white shadow-lg' : isDark ? 'text-slate-500' : 'text-slate-400'}`}
                  >
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest whitespace-nowrap">{s.label}</span>
                      <span className={`text-[6px] font-bold uppercase mt-0.5 whitespace-nowrap ${s.isOpen ? (activeSessionTab === s.id ? 'text-emerald-300' : 'text-emerald-500 animate-pulse') : 'opacity-40'}`}>
                        {s.isOpen ? 'OPEN' : 'LOCKED'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </header>

        {/* HUB STATUS MODAL */}
        {showStatusModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" onClick={() => setShowStatusModal(false)}>
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
            <div 
              className={`relative w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl border animate-in zoom-in-95 duration-300 ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex flex-col">
                  <h3 className={`font-black text-2xl tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>Hub Protocol</h3>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">Operational Windows & Schedule</p>
                </div>
                <button onClick={() => setShowStatusModal(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Currently Active</label>
                  {cycleInfo.activeSession ? (
                    <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between group">
                      <div>
                        <p className="text-sm font-black text-emerald-500 uppercase tracking-tight">{cycleInfo.activeSession.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Closes in {cycleInfo.activeSession.remaining} minutes</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg animate-pulse">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 text-center">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Protocol Offline: No Active Window</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Daily Cycle Schedule ({activeParty?.timezone || 'UTC'})</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                    {sessions.map((s, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-800/30 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                        <p className={`text-xs font-black uppercase ${isDark ? 'text-white' : 'text-slate-900'}`}>{s.label}</p>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-[10px] font-black ${s.isOpen ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                            {s.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
                   <p className="text-[9px] font-black text-red-500 uppercase tracking-tight text-center">
                     GLOBAL HUB RESET AT {cycleInfo.resetTimeFormatted} ({cycleInfo.resetIn} MINS)
                   </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT AREA */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar scrollable p-4 lg:p-12 pb-[calc(110px+env(safe-area-inset-bottom))]">
          {activeTab === 'leaderboard' ? <LeaderboardTable /> : children}
        </div>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-[150] px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 ${isDark ? 'bg-slate-900/95' : 'bg-white/95'} backdrop-blur-2xl border-t ${isDark ? 'border-white/10' : 'border-slate-200'} flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.4)]`}>
          <button onClick={() => setActiveTab('folders')} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'folders' ? 'text-indigo-500 scale-110' : 'text-slate-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
            <span className="text-[9px] font-black uppercase tracking-[0.15em]">Hubs</span>
          </button>
          <button onClick={() => setActiveTab('community')} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'community' ? 'text-indigo-500 scale-110' : 'text-slate-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" /></svg>
            <span className="text-[9px] font-black uppercase tracking-[0.15em]">Feed</span>
          </button>
          <button onClick={() => setActiveTab('leaderboard')} className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'leaderboard' ? 'text-indigo-500 scale-110' : 'text-slate-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span className="text-[9px] font-black uppercase tracking-[0.15em]">Rank</span>
          </button>
        </nav>

        {/* SCROLL TOP BUTTON */}
        <button onClick={scrollToTop} className={`fixed bottom-28 lg:bottom-12 right-6 lg:right-12 p-4 rounded-full shadow-2xl transition-all duration-500 z-[160] border-2 ${showScrollTop ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-50 pointer-events-none'} ${isDark ? 'bg-indigo-600 border-indigo-400' : 'bg-indigo-600 border-indigo-500'} text-white`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
        </button>
      </main>

      {/* NOTIFICATION SIDE DRAWER */}
      <div className={`fixed inset-0 z-[200] transition-opacity duration-300 ${isNotifOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsNotifOpen(false)}>
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" />
        <div className={`absolute top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-[#020617] transition-transform duration-500 ${isNotifOpen ? 'translate-x-0' : 'translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
          <NotificationPanel onClose={() => setIsNotifOpen(false)} />
        </div>
      </div>
    </div>
  );
};

export default Layout;
