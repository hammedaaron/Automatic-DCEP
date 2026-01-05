
import React, { useMemo, useState } from 'react';
import { Card, UserRole } from '../types';
import { useApp } from '../App';
import { updateCardPin, getCalendarDaysBetween } from '../db';

interface UserCardProps {
  card: Card;
  onEdit: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ card, onEdit }) => {
  const { currentUser, follows, toggleFollow, cards, isPoweredUp, theme, isAdmin, isDev, activeParty, showToast } = useApp();
  
  const [visited1, setVisited1] = useState(false);
  const [visited2, setVisited2] = useState(false);
  const [isPinning, setIsPinning] = useState(false);

  const isFollowed = follows.some(f => f.follower_id === currentUser?.id && f.target_card_id === card.id);
  const isOwnCard = card.user_id === currentUser?.id;
  const isDark = theme === 'dark';
  
  const followsMe = follows.some(f => {
    const myCardIds = cards.filter(c => c.user_id === currentUser?.id).map(c => c.id);
    return f.follower_id === card.user_id && myCardIds.includes(f.target_card_id);
  });

  const isMutual = isFollowed && followsMe;
  const isDevOwned = card.creator_role === UserRole.DEV;
  const isAdminOwned = card.creator_role === UserRole.ADMIN;
  const isAuthorityNode = isDevOwned || isAdminOwned;

  const canManage = useMemo(() => {
    if (isDev) return true;
    if (isAdmin) {
      if (isDevOwned) return false;
      return true;
    }
    return isOwnCard;
  }, [isDev, isAdmin, isDevOwned, isOwnCard]);

  const canPin = useMemo(() => isDev || (isAdmin && !isDevOwned), [isDev, isAdmin, isDevOwned]);

  const handlePinToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPinning) return;
    setIsPinning(true);
    
    const targetPinState = !card.is_pinned;
    
    try {
      await updateCardPin(card.id, targetPinState);
      showToast(targetPinState ? "Node Pinned to Priority Hub" : "Priority Removed");
    } catch (err: any) {
      const errorMessage = err?.message || "Pinning operation failed.";
      showToast(`DB Error: ${errorMessage}`, "error");
    } finally {
      setIsPinning(false);
    }
  };

  const tz = activeParty?.timezone || 'UTC';
  const now = Date.now();

  const stabilityStatus = useMemo(() => {
    if (card.is_permanent) return '∞ PERMANENT';
    
    const daysPassed = getCalendarDaysBetween(card.timestamp, now, tz);
    
    if (daysPassed === 0) return 'STABLE';
    if (daysPassed === 1) return 'EXPIRING';
    return 'EXPIRED';
  }, [card.is_permanent, card.timestamp, now, tz]);

  const hasLink2 = !!card.external_link2 && card.external_link2.trim().length > 0;
  const allLinksVisited = visited1 && (!hasLink2 || visited2);

  const absoluteLink1 = useMemo(() => {
    const url = card.external_link?.trim();
    if (!url) return '#';
    return url.startsWith('http') ? url : `https://${url}`;
  }, [card.external_link]);

  const absoluteLink2 = useMemo(() => {
    const url = card.external_link2?.trim();
    if (!url) return '#';
    return url.startsWith('http') ? url : `https://${url}`;
  }, [card.external_link2]);

  const stats = useMemo(() => {
    if (!activeParty) return { followers: 0, following: 0 };
    const targetUserCards = cards.filter(c => c.user_id === card.user_id).map(c => c.id);
    const uniqueFollowers = new Set(
      follows.filter(f => targetUserCards.includes(f.target_card_id) && f.party_id === activeParty.id).map(f => f.follower_id)
    ).size;
    const uniqueFollowing = new Set(
      follows.filter(f => f.follower_id === card.user_id && f.party_id === activeParty.id)
        .map(f => cards.find(c => c.id === f.target_card_id)?.user_id)
        .filter(id => id !== undefined)
    ).size;
    return { followers: uniqueFollowers, following: uniqueFollowing };
  }, [follows, card.user_id, activeParty, cards]);

  const handleEngageToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFollowed && !allLinksVisited) {
      const missing = !visited1 ? (card.link1_label || "Post 1") : (card.link2_label || "Post 2");
      showToast(`Verify ${missing} first.`, "error");
      return;
    }
    if (isFollowed) {
      if (window.confirm(`Stop engaging with ${card.display_name}?`)) toggleFollow(card.id);
    } else {
      toggleFollow(card.id);
    }
  };
  
  const isPinned = card.is_pinned;
  const baseClasses = `relative rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 transition-all duration-500 flex flex-col h-full border z-10 overflow-hidden`;
  const themeClasses = isPoweredUp ? 'glass-card shimmer' : isDark ? 'bg-slate-900' : 'bg-white shadow-sm';
  const borderClasses = isPinned 
    ? 'border-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.15)] sm:scale-[1.02]' 
    : isDevOwned ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
    : isAdminOwned ? 'border-orange-500' 
    : isFollowed ? 'border-indigo-500/20' 
    : 'border-slate-100 dark:border-slate-800';
  
  return (
    <div 
      id={`card-${card.id}`}
      className={`${baseClasses} ${themeClasses} ${borderClasses} ${isFollowed ? 'opacity-85' : 'hover:-translate-y-1 sm:hover:-translate-y-2 hover:shadow-xl'}`}
    >
      {isDevOwned && <div className="star-dust"></div>}
      {isPinned && <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />}

      <div className="flex flex-col h-full relative z-20">
        <div className="flex items-start justify-between mb-4 sm:mb-5 gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center font-black text-base sm:text-xl border-2 shrink-0 transition-all ${
              isDevOwned ? 'bg-emerald-500 text-white border-emerald-400' : 
              isAdminOwned ? 'bg-orange-500 text-white border-orange-400' :
              isMutual ? 'bg-emerald-500 text-white border-emerald-400' : 
              isDark ? 'bg-slate-800 border-slate-700 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600'
            }`}>
              {card.display_name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className={`font-black text-xs sm:text-base leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {card.display_name}
              </h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {isPinned && <span className="bg-indigo-600 text-white text-[6px] sm:text-[7px] font-black px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-tighter">PRIORITY</span>}
                {isMutual && <span className="bg-emerald-500 text-white text-[6px] sm:text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter">MUTUAL</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canPin && (
              <button 
                onClick={handlePinToggle} 
                disabled={isPinning}
                className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all ${isPinned ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-400'}`}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" /></svg>
              </button>
            )}
          </div>
        </div>

        <div className={`flex items-center justify-center p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all mb-4 sm:mb-5 ${isPinned ? 'bg-indigo-500/5 border-indigo-500/10' : isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="text-center border-r border-slate-200 dark:border-slate-800">
              <p className="text-xs sm:text-sm font-black text-indigo-500 truncate">{stats.followers}</p>
              <p className="text-[6px] sm:text-[7px] font-black uppercase tracking-widest text-slate-500 truncate">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-xs sm:text-sm font-black text-indigo-500 truncate">{stats.following}</p>
              <p className="text-[6px] sm:text-[7px] font-black uppercase tracking-widest text-slate-500 truncate">Following</p>
            </div>
          </div>
        </div>

        <div className="mb-4 sm:mb-5 flex items-center justify-between px-1">
           <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-widest text-slate-500 truncate mr-2">Stability Matrix</span>
           <span className={`text-[6px] sm:text-[7px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0 ${stabilityStatus.includes('EXPIRING') ? 'text-orange-500' : stabilityStatus.includes('PERMANENT') ? 'text-indigo-500' : 'text-emerald-500'}`}>
             {stabilityStatus}
           </span>
        </div>

        <div className="mt-auto space-y-2 sm:space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <a href={absoluteLink1} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); setVisited1(true); }}
              className={`flex items-center justify-center gap-1.5 py-3 sm:py-4 px-1.5 text-[9px] sm:text-[10px] font-black rounded-xl transition-all border-2 ${
                visited1 ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                : (isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700')
              }`}
            >
              <span className="truncate">{card.link1_label || 'POST 1'}</span>
            </a>
            {hasLink2 ? (
              <a href={absoluteLink2} target="_blank" rel="noopener noreferrer" onClick={(e) => { e.stopPropagation(); setVisited2(true); }}
                className={`flex items-center justify-center gap-1.5 py-3 sm:py-4 px-1.5 text-[9px] sm:text-[10px] font-black rounded-xl transition-all border-2 ${
                  visited2 ? (isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                : (isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-700')
              }`}
            >
              <span className="truncate">{card.link2_label || 'POST 2'}</span>
            </a>
          ) : (
            <div className={`flex items-center justify-center py-3 sm:py-4 px-1.5 text-[7px] sm:text-[8px] font-black rounded-xl border border-dashed ${isDark ? 'border-slate-800 text-slate-600' : 'border-slate-100 text-slate-300'}`}>
              SINGLE
            </div>
          )}
          </div>

          {!isOwnCard ? (
            <button onClick={handleEngageToggle}
              className={`w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 px-3 rounded-xl text-[9px] sm:text-[10px] font-black transition-all shadow-lg border-2 ${
                isFollowed ? 'bg-emerald-500 border-emerald-400 text-white' 
                : !allLinksVisited ? 'bg-slate-300 border-slate-200 opacity-60 text-white cursor-not-allowed'
                : 'bg-indigo-600 border-indigo-500 text-white active:scale-95'
              }`}
            >
              <span className="truncate">{isFollowed ? 'NODE ENGAGED' : 'ENGAGE NODE'}</span>
            </button>
          ) : (
            <div className={`w-full text-center py-3.5 sm:py-4 px-3 text-[8px] sm:text-[9px] font-black rounded-xl uppercase tracking-[0.15em] border border-dashed ${isPinned ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500' : 'bg-slate-500/5 border-slate-500/20 text-slate-500/50'}`}>
              <span className="truncate">{isPinned ? 'Priority Hub' : 'Identity Node'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard;
