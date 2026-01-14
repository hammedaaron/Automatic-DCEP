
import React, { useMemo, useState } from 'react';
import { Card, UserRole } from '../types';
import { useApp } from '../App';
import { updateCardPin } from '../db';

interface UserCardProps {
  card: Card;
  onEdit: () => void;
}

const UserCard: React.FC<UserCardProps> = ({ card, onEdit }) => {
  const { currentUser, follows, toggleFollow, cards, isPoweredUp, theme, isAdmin, isDev, showToast } = useApp();
  
  const [visited, setVisited] = useState(false);
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
  const isPrivilegedOwned = isDevOwned || isAdminOwned;

  const canManage = useMemo(() => {
    if (isDev) return true;
    if (isAdmin) return !isDevOwned;
    return isOwnCard;
  }, [isDev, isAdmin, isDevOwned, isOwnCard]);

  const canPin = useMemo(() => isDev || (isAdmin && !isDevOwned), [isDev, isAdmin, isDevOwned]);

  const roleStyles = useMemo(() => {
    if (isDevOwned) return {
      border: 'border-emerald-500 dark:border-emerald-400',
      shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]',
      bg: isDark ? 'bg-slate-900' : 'bg-white',
      badge: 'bg-emerald-500',
      label: 'ARCHITECT'
    };
    if (isAdminOwned) return {
      border: 'border-orange-500 dark:border-orange-400',
      shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]',
      bg: isDark ? 'bg-slate-900' : 'bg-white',
      badge: 'bg-orange-500',
      label: 'ADMIN'
    };
    return {
      border: 'border-blue-500 dark:border-blue-400',
      shadow: 'shadow-[0_0_15px_rgba(59,130,246,0.1)]',
      bg: isDark ? 'bg-slate-900' : 'bg-white',
      badge: 'bg-blue-600',
      label: 'MEMBER'
    };
  }, [isDevOwned, isAdminOwned, isDark]);

  const handlePinToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPinning) return;

    const targetPinState = !card.is_pinned;

    // RULE: Maximum 2 Pinned items per community folder
    if (targetPinState === true) {
      const pinnedInThisFolder = cards.filter(c => c.folder_id === card.folder_id && c.is_pinned).length;
      if (pinnedInThisFolder >= 2) {
        showToast("Pin Limit: Only 2 priority nodes allowed per community.", "error");
        return;
      }
    }

    setIsPinning(true);
    try {
      await updateCardPin(card.id, targetPinState);
      showToast(targetPinState ? "Node Pinned" : "Priority Removed");
    } catch (err: any) {
      showToast("Operation failed.", "error");
    } finally { setIsPinning(false); }
  };

  const stats = useMemo(() => {
    const targetUserCards = cards.filter(c => c.user_id === card.user_id).map(c => c.id);
    const followers = new Set(follows.filter(f => targetUserCards.includes(f.target_card_id)).map(f => f.follower_id)).size;
    const following = new Set(follows.filter(f => f.follower_id === card.user_id)).size;
    return { followers, following };
  }, [follows, card.user_id, cards]);

  const handleEngageToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFollowed && !visited) {
      showToast(`Verify content link first.`, "error");
      return;
    }
    toggleFollow(card.id);
  };
  
  const containerClasses = isPoweredUp ? 'shimmer' : '';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';

  const hasWarning = card.warning_label && card.warning_label !== 'CLEAN';

  return (
    <div 
      id={`card-${card.id}`}
      className={`relative rounded-[2.5rem] p-6 sm:p-7 transition-all duration-300 flex flex-col h-full border-2 ${roleStyles.border} ${roleStyles.shadow} ${roleStyles.bg} ${containerClasses} ${card.is_pinned ? 'ring-4 ring-indigo-500/30 scale-[1.03] z-10 shadow-2xl' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
    >
      <div className="flex flex-col h-full relative z-20">
        
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6 gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl border-2 shrink-0 shadow-lg ${isMutual ? 'bg-emerald-500 border-emerald-300 text-white' : isDark ? 'bg-slate-800 border-white/10 text-white' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
              {card.display_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`font-black text-lg sm:text-xl leading-tight truncate drop-shadow-sm ${textPrimary}`}>{card.display_name}</h3>
                {hasWarning && (
                  <span className="bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-full animate-pulse whitespace-nowrap shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                    {card.warning_label}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <span className={`${roleStyles.badge} text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm`}>
                  {roleStyles.label}
                </span>
                {card.is_pinned && <span className="bg-indigo-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm">PRIORITY</span>}
                {isMutual && <span className="bg-emerald-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm">MUTUAL</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-1.5">
            {canPin && (
              <button onClick={handlePinToggle} disabled={isPinning} className={`p-2.5 rounded-xl transition-all ${card.is_pinned ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400'}`}>
                <svg className="w-5 h-5" fill={card.is_pinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" /></svg>
              </button>
            )}
            {canManage && (
               <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className={`p-2.5 rounded-xl transition-all hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-500`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
               </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className={`grid ${isPrivilegedOwned ? 'grid-cols-1' : 'grid-cols-2'} gap-4 mb-6 p-4 rounded-2xl border-2 ${isDark ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
            <div className={`text-center ${!isPrivilegedOwned ? 'border-r-2 border-slate-200 dark:border-white/10' : ''}`}>
              <p className="text-2xl font-black text-indigo-500 leading-none">{stats.followers}</p>
              <p className={`text-[9px] font-black uppercase tracking-widest mt-2 ${textSecondary}`}>Inbound</p>
            </div>
            {!isPrivilegedOwned && (
              <div className="text-center">
                <p className="text-2xl font-black text-indigo-500 leading-none">{stats.following}</p>
                <p className={`text-[9px] font-black uppercase tracking-widest mt-2 ${textSecondary}`}>Outbound</p>
              </div>
            )}
        </div>

        {/* Action Buttons */}
        <div className="mt-auto space-y-4">
          <div className="w-full">
            <a href={card.external_link} target="_blank" rel="noopener noreferrer" onClick={() => setVisited(true)} className={`flex items-center justify-center py-5 px-4 text-[11px] font-black rounded-2xl border-2 transition-all active:scale-95 text-center leading-tight shadow-sm ${visited ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400' : isDark ? 'bg-slate-800 border-white/10 text-white hover:border-indigo-400' : 'bg-slate-200 border-slate-300 text-slate-800 hover:border-indigo-600'}`}>
              <span className="uppercase tracking-widest">{card.link1_label || 'VISIT PRIMARY NODE'}</span>
            </a>
          </div>

          {!isOwnCard ? (
            <button onClick={handleEngageToggle} className={`w-full py-5 rounded-2xl text-[12px] font-black uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 border-2 ${isFollowed ? 'bg-emerald-500 border-emerald-400 text-white shadow-xl' : !visited ? 'bg-slate-100 dark:bg-slate-800/50 border-transparent text-slate-400 cursor-not-allowed opacity-40' : 'bg-indigo-600 border-indigo-400 text-white shadow-2xl hover:bg-indigo-700 active:scale-[0.97]'}`}>
              {isFollowed ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                  ENGAGED
                </>
              ) : (
                'ENGAGE NODE'
              )}
            </button>
          ) : (
            <div className={`w-full py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] border-2 border-dashed rounded-2xl ${isDark ? 'border-white/10 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
              YOUR IDENTITY
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard;
