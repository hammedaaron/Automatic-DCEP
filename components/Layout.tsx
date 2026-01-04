
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
    selectedFolderId, folders, notifications,
    isDev, isAdmin, cards, isWorkflowMode, setIsWorkflowMode, socketStatus
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'folders' | 'community' | 'leaderboard'>('community');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className={`flex h-screen overflow-hidden transition-all duration-500 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex-col lg:flex-row`}>
      {isPoweredUp && <div className="fixed inset-0 power-up-bg opacity-10 z-0 pointer-events-none" />}
      
      {/* SIDEBAR / FOLDER BROWSER */}
      <div className={`${activeTab === 'folders' ? 'fixed inset-0 z-50 flex' : 'hidden'} lg:relative lg:flex lg:h-full lg:z-20`}>
        <FolderSidebar onSelect={() => setActiveTab('community')} />
      </div>

      {/* MAIN VIEWPORT */}
      <main className={`flex-1 flex flex-col h-full overflow-hidden z-10 relative ${activeTab === 'folders' ? 'hidden lg:flex' : 'flex'}`}>
        
        {/* COMPACT HEADER */}
        <header className={`px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between sticky top-0 z-40 transition-all ${isDark ? 'bg-slate-900/60' : 'bg-white/80'} backdrop-blur-xl border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3 lg:gap-6 flex-1 min-w-0">
            <h1 className="text-lg lg:text-2xl font-black tracking-tight truncate flex items-center gap-2">
              <span className="truncate">{activeTab === 'leaderboard' ? 'Leaderboard' : currentFolderName}</span>
              <div className="shrink-0 relative flex h-1.5 w-1.5" title={`Realtime: ${socketStatus}`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${socketStatus === 'connected' ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${socketStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              </div>
            </h1>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            {isDev && (
              <button onClick={() => setIsWorkflowMode(!isWorkflowMode)} className={`hidden sm:flex p-2 rounded-xl transition-all border-2 ${isWorkflowMode ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-400'}`} title="Design Canvas">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
              </button>
            )}
            
            <button onClick={() => setIsNotifOpen(true)} className={`p-2 lg:p-2.5 rounded-xl transition-all relative ${isNotifOpen ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              {unreadNotifications > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white dark:border-slate-900 text-[8px] font-black items-center justify-center text-white">{unreadNotifications}</span></span>}
            </button>

            <button 
              onClick={onOpenCreateProfile} 
              disabled={isCreationDisabled || !selectedFolderId} 
              className={`${isCreationDisabled || !selectedFolderId ? 'bg-slate-200 dark:bg-slate-800 text-slate-400' : 'bg-indigo-600 text-white shadow-lg'} px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={isCreationDisabled ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"} /></svg>
              <span className="uppercase tracking-widest">{!selectedFolderId ? 'Select' : isCreationDisabled ? 'Joined' : 'Join'}</span>
            </button>
          </div>
        </header>

        {/* MAIN SCROLLABLE AREA */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-10 pb-32">
          {activeTab === 'leaderboard' ? <LeaderboardTable /> : children}
        </div>

        {/* BOTTOM NAVIGATION (MOBILE ONLY) */}
        <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-[100] px-4 pb-6 pt-2 ${isDark ? 'bg-slate-950/80' : 'bg-white/80'} backdrop-blur-xl border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} flex items-center justify-around`}>
          <button 
            onClick={() => setActiveTab('folders')}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'folders' ? 'text-indigo-500 scale-110' : 'text-slate-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h7" /></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">PODs</span>
          </button>
          <button 
            onClick={() => setActiveTab('community')}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'community' ? 'text-indigo-500 scale-110' : 'text-slate-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" /></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">Feed</span>
          </button>
          <button 
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${activeTab === 'leaderboard' ? 'text-indigo-500 scale-110' : 'text-slate-500'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span className="text-[8px] font-black uppercase tracking-widest">Rank</span>
          </button>
          <button 
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`flex flex-col items-center gap-1 p-2 transition-all text-slate-500`}
          >
            {isDark ? <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.071 16.071l.707.707M7.929 7.929l.707-.707M12 8a4 4 0 110 8 4 4 0 010-8z" /></svg> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
            <span className="text-[8px] font-black uppercase tracking-widest">{isDark ? 'Light' : 'Dark'}</span>
          </button>
        </nav>

        {/* Scroll Top Button */}
        <button onClick={scrollToTop} className={`fixed bottom-24 lg:bottom-10 right-4 lg:right-10 p-3 rounded-full shadow-2xl transition-all duration-500 z-[90] border-2 group ${showScrollTop ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-50 pointer-events-none'} ${isDev ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20' : 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/20'}`} aria-label="Scroll to top"><svg className="w-5 h-5 transform group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg></button>
      </main>

      {/* NOTIFICATION SIDE DRAWER */}
      <div className={`fixed inset-0 z-[150] transition-opacity duration-300 ${isNotifOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsNotifOpen(false)}>
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
        <div className={`absolute top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl transition-transform duration-500 ease-out ${isNotifOpen ? 'translate-x-0' : 'translate-x-full'}`} onClick={(e) => e.stopPropagation()}>
          <NotificationPanel onClose={() => setIsNotifOpen(false)} />
        </div>
      </div>
    </div>
  );
};

export default Layout;
