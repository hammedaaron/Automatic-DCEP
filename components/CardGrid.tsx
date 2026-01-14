
import React, { useMemo } from 'react';
import { useApp } from '../App';
import UserCard from './UserCard';
import { Card, UserRole, SessionType } from '../types';
import { SYSTEM_PARTY_ID } from '../db';

interface CardGridProps {
  folderId: string | null;
  onEditCard: (card: Card) => void;
}

const CardGrid: React.FC<CardGridProps> = ({ folderId, onEditCard }) => {
  const { cards, searchQuery, currentUser, instructions, folders, activeParty, theme, activeSessionTab, setActiveSessionTab, isDev } = useApp();
  const isDark = theme === 'dark';

  const todayStr = useMemo(() => {
    const tz = activeParty?.timezone || 'UTC';
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }, [activeParty]);

  const { pinnedCards, regularCards } = useMemo(() => {
    if (!folderId) return { pinnedCards: [], regularCards: [] };
    const folder = folders.find(f => f.id === folderId);
    
    let filtered = cards.filter(c => c.folder_id === folderId);

    // Protocol: Separation of Architect (System) and Hub (Local) domains
    if (folder?.party_id === SYSTEM_PARTY_ID) {
      // ARCHITECT ZONE: Only Dev cards are visible.
      filtered = filtered.filter(c => c.creator_role === UserRole.DEV);
    } else {
      // COMMUNITY ZONE: Admin and Users visible.
      filtered = filtered.filter(c => {
        // Admins: Always visible across all session tabs
        if (c.creator_role === UserRole.ADMIN || c.is_permanent) {
          return true;
        }
        // Devs: Only visible in local folders if they are explicitly marked "Permanent"
        if (c.creator_role === UserRole.DEV && c.is_permanent) {
          return true;
        }
        // Users: Visible only in their active tab and current date
        if (!isDev) {
           return c.session_type === activeSessionTab && c.session_date === todayStr;
        }
        // Dev sees all in standard folders
        return true;
      });
    }

    const searched = filtered.filter(c => 
      c.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sorted = [...searched].sort((a, b) => {
      if (a.user_id === currentUser?.id) return -1;
      if (b.user_id === currentUser?.id) return 1;
      return b.timestamp - a.timestamp;
    });

    return {
      pinnedCards: sorted.filter(c => c.is_pinned),
      regularCards: sorted.filter(c => !c.is_pinned)
    };
  }, [cards, folderId, folders, searchQuery, currentUser, activeSessionTab, todayStr, isDev]);

  const folderInstructions = instructions.filter(i => i.folder_id === folderId);

  if (!folderId) return (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
      <p className="font-bold text-sm uppercase tracking-widest">Select Hub to Infiltrate</p>
    </div>
  );

  return (
    <div className="space-y-8 lg:space-y-12">
      {folderInstructions.map(box => (
        <div key={box.id} className="p-6 lg:p-10 rounded-[2rem] border-2 border-indigo-500/20 bg-indigo-500/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
          <div className="text-xs lg:text-sm leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{box.content}</div>
        </div>
      ))}

      {pinnedCards.length > 0 && (
        <div className="space-y-4">
          <h4 className="px-2 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">Priority Hub Updates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedCards.map(card => (
              <UserCard key={card.id} card={card} onEdit={() => onEditCard(card)} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {pinnedCards.length > 0 && <h4 className="px-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Community Feed</h4>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8">
          {regularCards.length > 0 ? (
            regularCards.map(card => (
              <UserCard key={card.id} card={card} onEdit={() => onEditCard(card)} />
            ))
          ) : (pinnedCards.length === 0 || folderId) && (
            <div className="col-span-full py-20 text-center opacity-50">
              <p className="text-sm font-black uppercase tracking-widest">{isDev ? 'No nodes detected in matrix' : 'No nodes found for this session'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardGrid;
