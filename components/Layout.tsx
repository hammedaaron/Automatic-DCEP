
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../App';
import FolderSidebar from './FolderSidebar';
import NotificationPanel from './NotificationPanel';
import LeaderboardTable from './LeaderboardTable';
import { UserRole } from '../types';
import { SYSTEM_PARTY_ID } from '../db';

interface LayoutProps {
  children: React.ReactNode;
  onOpenCreateProfile: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onOpenCreateProfile }) => {
  const { 
    currentUser, theme, setTheme, isPoweredUp, 
    selectedFolderId, folders, notifications, activeParty,
    isDev, isAdmin, cards, isWorkflowMode, setIsWorkflowMode, 
    socketStatus, syncData, showToast
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'folders' | 'community' | 'leaderboard'>('community');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isParkingOpen, setIsParkingOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'poor'>('good');
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const parkingRef = useRef<HTMLDivElement>(null);

  const unreadNotifications = notifications.filter(n => n.recipient_id === currentUser?.id && !n.read).length;
  const currentFolder = folders.find(f => f.id === selectedFolderId);
  const currentFolderName = currentFolder?.name || 'Hub';
  const isDark = theme === 'dark';

  const userHasProfile = cards.some(c => c.user_id === currentUser?.id && c.folder_id === selectedFolderId);
  const isSystemFolder = currentFolder?.party_id === SYSTEM_PARTY_ID;
  const isCreationDisabled = (userHasProfile && !isDev && !isAdmin) || (isSystemFolder && !isDev);

  // Network Connectivity Sentimental Grading Logic
  useEffect(() => {
    const updateStatus = () => {
      const isOnline = navigator.onLine;
      const connection = (navigator as any).connection;
      
      if (!isOnline) {
        setNetworkQuality('poor');
        return;
      }

      if (connection) {
        // '4g' is considered good, anything else (3g, 2g, slow-2g) is graded poor for real-time apps
        const isFast = connection.effectiveType === '4g' && connection.rtt < 300;
        setNetworkQuality(isFast ? 'good' : 'poor');
      } else {
        // Fallback for browsers without NetworkInformation API
        setNetworkQuality('good');
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateStatus);
    }

    updateStatus();

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      if (connection) {
        connection.removeEventListener('change', updateStatus);
      }
    };
  }, []);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    const handleScroll = () => { setShowScrollTop(scrollContainer.scrollTop > 400); };
    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (parkingRef.current && !parkingRef.current.contains(event.target as Node)) {
        setIsParkingOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    <div className={`flex h-screen overflow-hidden transition-all duration-500 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex-col lg:flex-row`}>
      {isPoweredUp && <div className="fixed inset-0 power-up-bg opacity-10 z-0 pointer-events-none" />}
      
      <div className={`${activeTab === 'folders' ? 'fixed inset-0 z-50 flex' : 'hidden'} lg:relative lg:flex lg:h-full lg:z-20`}>
        <FolderSidebar onSelect={() => setActiveTab('community')} />
      </div>

      <main className={`flex-1 flex flex-col h-full overflow-hidden z-10 relative ${activeTab === 'folders' ? 'hidden lg:flex' : 'flex'}`}>
        
        <header className={`px-4 lg:px-8 py-3 lg:py-5 flex items-center justify-between sticky top-0 z-40 transition-all ${isDark ? 'bg-slate-900/80' : 'bg-white/90'} backdrop-blur-xl border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3 lg:gap-6 flex-1 min-w-0">
            <h1 className="text-lg lg:text-3xl font-black tracking-tight truncate flex items-center gap-2 shrink-0 max-w-[140px] sm:max-w-none">
              <span className="truncate">{activeTab === 'leaderboard' ? 'Rankings' : currentFolderName}</span>
              <div className="shrink-0 relative flex h-2 w-2" title={`Socket: ${socketStatus}`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${socketStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${socketStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              </div>
            </h1>

            {activeParty?.is_parking_enabled && (
              <div className="hidden sm:flex relative" ref={parkingRef}>
                <button 
                  onClick={() => setIsParkingOpen(!isParkingOpen)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                    isParkingOpen ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/10 text-slate-400 hover:border-indigo-500'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="hidden lg:inline">Available Slots</span>
                  <span className="lg:hidden">Slots</span>
                </button>
                
                {isParkingOpen && (
                  <div className="absolute top-14 left-0 w-64 glass-card p-6 rounded-[2rem] border border-white/10 shadow-2xl animate-in slide-in-from-top-4 duration-300 z-50 overflow-hidden">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2 truncate">Hub Capacity</p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-base font-black text-white uppercase tracking-tighter">{freeSpots} Vacant</span>
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/10"></div>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1.5 mb-5 pr-1">
                       {Array.from({ length: Math.min(freeSpots, 12) }).map((_, i) => (
                         <div key={i} className="bg-white/5 p-2.5 rounded-xl text-[9px] font-black text-slate-400 flex justify-between group hover:bg-indigo-500/10 transition-colors">
                            <span className="uppercase">Node ID-{1000 + i}</span>
                            <span className="text-emerald-400 uppercase tracking-widest">Available</span>
                         </div>
                       ))}
                    </div>
                    <button className="w-full bg-indigo-600 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] text-white shadow-xl hover:bg-indigo-700 transition-all active:scale-[0.97]">Establish Node</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 lg:gap-3 shrink-0">
            {/* FORCE REFRESH BUTTON WITH NETWORK QUALITY SENTIMENTAL GRADING */}
            <button 
              onClick={handleManualRefresh} 
              className={`p-2 lg:p-3 rounded-xl transition-all relative border-2 ${
                isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200 shadow-sm'
              } ${
                networkQuality === 'good' 
                  ? 'border-emerald-500/50 text-emerald-500' 
                  : 'border-red-500/50 text-red-500'
              }`}
              title={`Network: ${networkQuality === 'good' ? 'Strong Connection' : 'Poor Connection'}`}
            >
              <svg className={`w-4 h-4 lg:w-5 lg:h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {/* Optional: Small secondary status dot for enhanced visual cues */}
              <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${networkQuality === 'good' ? 'bg-emerald-500' : 'bg-red-500'} shadow-[0_0_5px_currentColor] animate-pulse`}></span>
            </button>

            {isDev && (
              <button onClick={() => setIsWorkflowMode(!isWorkflowMode)} className={`p-2 lg:p-2.5 rounded-xl transition-all border-2 ${isWorkflowMode ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`} title="Design Canvas">
                <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
              </button>
            )}
            
            <button onClick={() => setIsNotifOpen(true)} className={`p-2 lg:p-3 rounded-xl transition-all relative ${isNotifOpen ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 lg:h-5 lg:w-5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 lg:h-5 lg:w-5 bg-red-500 border-2 border-white dark:border-slate-900 text-[8px] lg:text-[9px] font-black items-center justify-center text-white">{unreadNotifications}</span></span>}
            </button>

            <button 
              onClick={onOpenCreateProfile} 
              disabled={isCreationDisabled || !selectedFolderId} 
              className={`${isCreationDisabled || !selectedFolderId ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20'} px-4 lg:px-6 py-2 lg:py-3 rounded-xl lg:rounded-2xl text-[10px] lg:text-xs font-black transition-all flex items-center gap-2 shrink-0 active:scale-[0.95]`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={isCreationDisabled ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"} /></svg>
              <span className="uppercase tracking-[0.2em]">{!selectedFolderId ? 'Select' : isCreationDisabled ? 'Joined' : 'Join'}</span>
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-12 pb-32">
          {activeTab === 'leaderboard' ? <LeaderboardTable /> : children}
        </div>

        <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-8 pt-3 ${isDark ? 'bg-slate-950/95' : 'bg-white/95'} backdrop-blur-2xl border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-around shadow-[0_-10px_40px_rgba(0,0,0,0.3)]`}>
          <button 
            onClick={() => setActiveTab('folders')}
            className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'folders' ? 'text-indigo-500 scale-110' : 'text-slate-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">Hubs</span>
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'community' ? 'text-indigo-500 scale-110' : 'text-slate-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" /></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">Feed</span>
          </button>
          <button 
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center gap-1.5 p-2 transition-all ${activeTab === 'leaderboard' ? 'text-indigo-500 scale-110' : 'text-slate-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">Rank</span>
          </button>
          <button 
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`flex flex-col items-center gap-1.5 p-2 transition-all text-slate-500`}
          >
            {isDark ? <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.071 16.071l.707.707M7.929 7.929l.707-.707M12 8a4 4 0 110 8 4 4 0 010-8z" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            <span className="text-[8px] font-black uppercase tracking-widest">{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </nav>

        <button onClick={scrollToTop} className={`fixed bottom-28 lg:bottom-12 right-6 lg:right-12 p-3 sm:p-4 rounded-full shadow-2xl transition-all duration-500 z-[90] border-2 group ${showScrollTop ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-50 pointer-events-none'} ${isDev ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20' : 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/20'}`} aria-label="Scroll to top"><svg className="w-5 h-5 lg:w-6 lg:h-6 transform group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg></button>
      </main>

      <div className={`fixed inset-0 z-[150] transition-opacity duration-300 ${isNotifOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsNotifOpen(false)}>
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
        <div className={`absolute top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 shadow-[0_0_80px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-out ${isNotifOpen ? 'translate-x-0' : 'translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
          <NotificationPanel onClose={() => setIsNotifOpen(false)} />
        </div>
      </div>
    </div>
  );
};

export default Layout;
