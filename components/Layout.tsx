import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../App';
import FolderSidebar from './FolderSidebar';
import NotificationPanel from './NotificationPanel';
import LeaderboardTable from './LeaderboardTable';
import { UserRole } from '../types';
import { SYSTEM_PARTY_ID } from '../db';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps & { onOpenCreateProfile: () => void }> = ({ children, onOpenCreateProfile }) => {
  const { 
    currentUser, theme, setTheme, isPoweredUp, 
    selectedFolderId, folders, notifications, activeParty,
    isDev, isAdmin, cards, socketStatus, syncData, showToast
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'folders' | 'community' | 'leaderboard'>('community');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isParkingOpen, setIsParkingOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const parkingRef = useRef<HTMLDivElement>(null);

  const unreadNotifications = notifications.filter(n => n.recipient_id === currentUser?.id && !n.read).length;
  const currentFolder = folders.find(f => f.id === selectedFolderId);
  const currentFolderName = currentFolder?.name || 'Hub';
  const isDark = theme === 'dark';

  const userHasProfile = cards.some(c => c.user_id === currentUser?.id && c.folder_id === selectedFolderId);
  const isSystemFolder = currentFolder?.party_id === SYSTEM_PARTY_ID;
  const isCreationDisabled = (userHasProfile && !isDev && !isAdmin) || (isSystemFolder && !isDev);

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

  const freeSpots = React.useMemo(() => {
    if (!activeParty) return 0;
    const max = activeParty.max_slots || 50;
    const currentMemberIds = new Set(cards.filter(c => c.party_id === activeParty.id).map(c => c.user_id));
    return Math.max(0, max - currentMemberIds.size);
  }, [activeParty, cards]);

  return (
    <div className={`flex h-screen w-screen overflow-hidden transition-all duration-500 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex-col lg:flex-row`}>
      {isPoweredUp && <div className="fixed inset-0 power-up-bg opacity-10 z-0 pointer-events-none" />}
      
      {/* SIDEBAR (FOLDERS) - Slide-in for mobile */}
      <div className={`fixed inset-y-0 left-0 z-[100] w-72 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${activeTab === 'folders' ? 'translate-x-0' : '-translate-x-full'} border-r ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
        <FolderSidebar onSelect={() => setActiveTab('community')} />
        <button onClick={() => setActiveTab('community')} className="lg:hidden absolute top-4 -right-12 p-3 text-white bg-indigo-600 rounded-r-2xl shadow-xl">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>

      {/* OVERLAY FOR SIDEBAR */}
      {activeTab === 'folders' && (
        <div onClick={() => setActiveTab('community')} className="lg:hidden fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300" />
      )}

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden z-10 relative">
        
        {/* TOP NAVIGATION BAR */}
        <header className={`px-4 lg:px-8 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 lg:py-4 flex items-center justify-between sticky top-0 z-40 transition-all ${isDark ? 'bg-slate-900/90' : 'bg-white/95 shadow-sm'} backdrop-blur-xl border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-4 lg:gap-8 flex-1 min-w-0">
            <h1 className="text-lg lg:text-2xl font-black tracking-tight truncate flex items-center gap-3 shrink-0">
              <span className="truncate">{activeTab === 'leaderboard' ? 'Rankings' : currentFolderName}</span>
              <div className="shrink-0 relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${socketStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${socketStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              </div>
            </h1>

            {/* Desktop Center Navigation Tabs */}
            <nav className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button onClick={() => setActiveTab('community')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'community' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-500'}`}>Feed</button>
              <button onClick={() => setActiveTab('leaderboard')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'leaderboard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-500'}`}>Rankings</button>
            </nav>
          </div>

          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            {activeParty?.is_parking_enabled && (
              <div className="relative" ref={parkingRef}>
                <button onClick={() => setIsParkingOpen(!isParkingOpen)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${isParkingOpen ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:border-indigo-500'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="hidden xl:inline">Parking</span>
                </button>
              </div>
            )}

            <button onClick={handleManualRefresh} className={`p-2 lg:p-2.5 rounded-xl transition-all border-2 ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} border-emerald-500/50 text-emerald-500`} title="Force Sync">
              <svg className={`w-4 h-4 lg:w-5 lg:h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>

            <button onClick={() => setIsNotifOpen(true)} className={`p-2 lg:p-2.5 rounded-xl transition-all relative ${isNotifOpen ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 bg-red-500 border-2 border-white dark:border-slate-900 rounded-full text-[8px] font-black items-center justify-center text-white">{unreadNotifications}</span>}
            </button>

            <button onClick={onOpenCreateProfile} disabled={isCreationDisabled || !selectedFolderId} className={`${isCreationDisabled || !selectedFolderId ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' : 'bg-indigo-600 text-white shadow-lg'} px-4 py-2.5 rounded-xl text-[10px] font-black transition-all active:scale-[0.95]`}>
              <span className="uppercase tracking-[0.2em]">{!selectedFolderId ? 'Select' : isCreationDisabled ? 'Joined' : 'Join'}</span>
            </button>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-12 pb-[calc(100px+env(safe-area-inset-bottom))]">
          {activeTab === 'leaderboard' ? <LeaderboardTable /> : children}
        </div>

        {/* MOBILE BOTTOM NAVIGATION BAR */}
        <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-[150] px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-3 ${isDark ? 'bg-slate-950/95' : 'bg-white/95'} backdrop-blur-2xl border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.3)]`}>
          <button onClick={() => setActiveTab('folders')} className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'folders' ? 'text-indigo-500 scale-110' : 'text-slate-500'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">Hubs</span>
          </button>
          <button onClick={() => setActiveTab('community')} className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'community' ? 'text-indigo-500 scale-110' : 'text-slate-500'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" /></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">Feed</span>
          </button>
          <button onClick={() => setActiveTab('leaderboard')} className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'leaderboard' ? 'text-indigo-500 scale-110' : 'text-slate-500'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">Rank</span>
          </button>
          <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className="flex flex-col items-center gap-1 p-2 transition-all text-slate-500">
            {isDark ? <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.071 16.071l.707.707M7.929 7.929l.707-.707M12 8a4 4 0 110 8 4 4 0 010-8z" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            <span className="text-[8px] font-black uppercase tracking-widest">{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </nav>

        {/* SCROLL TOP BUTTON */}
        <button onClick={scrollToTop} className={`fixed bottom-28 lg:bottom-12 right-6 lg:right-12 p-4 rounded-full shadow-2xl transition-all duration-500 z-[160] border-2 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'} ${isDark ? 'bg-indigo-600 border-indigo-400' : 'bg-indigo-600 border-indigo-500'} text-white`}>
          <svg className="w-6 h-6 transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
        </button>
      </main>

      {/* NOTIFICATION SIDE DRAWER */}
      <div className={`fixed inset-0 z-[200] transition-opacity duration-300 ${isNotifOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsNotifOpen(false)}>
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
        <div className={`absolute top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 transition-transform duration-500 ${isNotifOpen ? 'translate-x-0' : 'translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
          <NotificationPanel onClose={() => setIsNotifOpen(false)} />
        </div>
      </div>
    </div>
  );
};

export default Layout;