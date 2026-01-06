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

  const canManage = useMemo(() => {
    if (isDev) return true;
    if (isAdmin) return !isDevOwned;
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
      showToast(targetPinState ? "Node Pinned" : "Priority Removed");
    } catch (err: any) {
      showToast("Operation failed.", "error");
    } finally { setIsPinning(false); }
  };

  const tz = activeParty?.timezone || 'UTC';
  const stabilityStatus = useMemo(() => {
    if (card.is_permanent) return '∞ PERMANENT';
    const daysPassed = getCalendarDaysBetween(card.timestamp, Date.now(), tz);
    if (daysPassed === 0) return 'STABLE';
    if (daysPassed === 1) return 'EXPIRING';
    return 'EXPIRED';
  }, [card.is_permanent, card.timestamp, tz]);

  const hasLink2 = !!card.external_link2 && card.external_link2.trim().length > 0;
  const allLinksVisited = visited1 && (!hasLink2 || visited2);

  const stats = useMemo(() => {
    const targetUserCards = cards.filter(c => c.user_id === card.user_id).map(c => c.id);
    const followers = new Set(follows.filter(f => targetUserCards.includes(f.target_card_id)).map(f => f.follower_id)).size;
    const following = new Set(follows.filter(f => f.follower_id === card.user_id)).size;
    return { followers, following };
  }, [follows, card.user_id, cards]);

  const handleEngageToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFollowed && !allLinksVisited) {
      showToast(`Verify content links first.`, "error");
      return;
    }
    toggleFollow(card.id);
  };
  
  const themeClasses = isPoweredUp ? 'glass-card shimmer' : isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
  
  return (
    <div className={`relative rounded-[2rem] p-5 sm:p-6 transition-all duration-500 flex flex-col h-full border z-10 ${themeClasses} ${card.is_pinned ? 'ring-2 ring-indigo-500 shadow-xl' : 'shadow-sm'}`}>
      <div className="flex flex-col h-full relative z-20">
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border-2 shrink-0 ${isMutual ? 'bg-emerald-500 text-white' : isDark ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              {card.display_name?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <h3 className={`font-black text-sm sm:text-base leading-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{card.display_name}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {card.is_pinned && <span className="bg-indigo-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase">PRIORITY</span>}
                {isMutual && <span className="bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase">MUTUAL</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {canPin && (
              <button onClick={handlePinToggle} disabled={isPinning} className={`p-2 rounded-xl ${card.is_pinned ? 'text-indigo-500' : 'text-slate-400'}`}>
                <svg className="w-5 h-5" fill={card.is_pinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" /></svg>
              </button>
            )}
            {canManage && (
               <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-slate-400 hover:text-indigo-500">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
               </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
            <div className="text-center border-r border-slate-200 dark:border-slate-800">
              <p className="text-sm font-black text-indigo-500">{stats.followers}</p>
              <p className="text-[7px] font-black uppercase text-slate-500">Inbound</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-indigo-500">{stats.following}</p>
              <p className="text-[7px] font-black uppercase text-slate-500">Outbound</p>
            </div>
        </div>

        <div className="mt-auto space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <a href={card.external_link} target="_blank" rel="noopener noreferrer" onClick={() => setVisited1(true)} className={`flex items-center justify-center py-4 px-2 text-[9px] font-black rounded-xl border-2 transition-all ${visited1 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400'}`}>
              {card.link1_label || 'POST 1'}
            </a>
            {hasLink2 && (
              <a href={card.external_link2} target="_blank" rel="noopener noreferrer" onClick={() => setVisited2(true)} className={`flex items-center justify-center py-4 px-2 text-[9px] font-black rounded-xl border-2 transition-all ${visited2 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400'}`}>
                {card.link2_label || 'POST 2'}
              </a>
            )}
          </div>

          {!isOwnCard ? (
            <button onClick={handleEngageToggle} className={`w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isFollowed ? 'bg-emerald-500 text-white' : !allLinksVisited ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-50' : 'bg-indigo-600 text-white shadow-lg active:scale-95'}`}>
              {isFollowed ? 'ENGAGED' : 'ENGAGE NODE'}
            </button>
          ) : (
            <div className="w-full py-3 text-center text-[8px] font-black uppercase tracking-widest text-slate-400 border border-dashed rounded-xl">Your Identity</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard;