
import React, { useMemo, useState } from 'react';
import { useApp } from '../App';
import UserCard from './UserCard';
import { Card, UserRole } from '../types';
import { SYSTEM_PARTY_ID } from '../db';

interface CardGridProps {
  folderId: string | null;
  onEditCard: (card: Card) => void;
}

const CardGrid: React.FC<CardGridProps> = ({ folderId, onEditCard }) => {
  const { cards, searchQuery, currentUser, instructions, theme, folders } = useApp();
  const [expandedPinnedIds, setExpandedPinnedIds] = useState<Set<string>>(new Set());
  const isDark = theme === 'dark';

  const folderCards = useMemo(() => {
    if (!folderId) return [];
    const folder = folders.find(f => f.id === folderId);
    let rawCards = cards.filter(c => c.folder_id === folderId);

    if (currentUser?.role === UserRole.DEV) {
      rawCards = rawCards.filter(c => c.creator_role === UserRole.DEV || c.user_id === currentUser.id);
    }

    if (folder?.party_id === SYSTEM_PARTY_ID) {
      return rawCards.filter(c => c.creator_role === UserRole.DEV);
    }
    
    return rawCards;
  }, [cards, folderId, folders, currentUser]);

  const folderInstructions = useMemo(() => {
    if (!folderId) return [];
    return instructions.filter(i => i.folder_id === folderId);
  }, [instructions, folderId]);

  const { pinnedCards, regularCards } = useMemo(() => {
    const filtered = folderCards.filter(c => 
      c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.external_link.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
      const isAOwn = a.user_id === currentUser?.id;
      const isBOwn = b.user_id === currentUser?.id;
      if (isAOwn && !isBOwn) return -1;
      if (!isAOwn && isBOwn) return 1;
      return b.timestamp - a.timestamp;
    });

    return {
      pinnedCards: sorted.filter(c => c.is_pinned),
      regularCards: sorted.filter(c => !c.is_pinned)
    };
  }, [folderCards, searchQuery, currentUser?.id]);

  const togglePinned = (id: string) => {
    const newSet = new Set(expandedPinnedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedPinnedIds(newSet);
  };

  const renderInstructionContent = (text: any) => {
    let contentStr = "";
    if (typeof text === 'string') contentStr = text;
    else if (text?.message) contentStr = text.message;
    else if (text) {
      try { contentStr = JSON.stringify(text); } catch { contentStr = String(text); }
    }

    const parts = contentStr.split('\n');
    const boldRegex = /\*\*(.*?)\*\*/g;

    return parts.map((line, i) => {
      if (line.trim().startsWith('## ')) {
        return <h2 key={i} className="text-[#00ff9d] text-xl font-black mb-3 mt-4 first:mt-0 tracking-tighter uppercase">{line.replace('## ', '').trim()}</h2>;
      }
      const segments = line.split(boldRegex);
      const formatted = segments.map((segment, index) => {
        if (index % 2 === 1) return <b key={index} className="text-[#2563eb] dark:text-[#60a5fa] font-black">{segment}</b>;
        return segment;
      });
      return <p key={i} className="text-sm leading-relaxed mb-1 opacity-90 font-medium">{formatted}</p>;
    });
  };

  if (!folderId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 dark:bg-slate-800">
          <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
        </div>
        <p className="text-lg font-bold text-slate-500">Select a community folder</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {folderInstructions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {folderInstructions.map(box => (
            <div key={box.id} className={`p-8 rounded-[2.5rem] border shadow-lg relative overflow-hidden transition-all hover:shadow-xl ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-100'}`}>
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
              <div className="relative z-10">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 block">Pinned Information</span>
                {renderInstructionContent(box.content)}
              </div>
            </div>
          ))}
        </div>
      )}

      {pinnedCards.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 px-2 mb-8">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500 flex items-center gap-2">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              Priority Hub
            </h4>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
          </div>

          <div className="grid grid-cols-1 gap-6">
            {pinnedCards.map(card => {
              const isExpanded = expandedPinnedIds.has(card.id);
              const isAdminCard = card.creator_role === UserRole.ADMIN || card.creator_role === UserRole.DEV;

              return (
                <div key={card.id} className="w-full max-w-xl mx-auto space-y-4 animate-in slide-in-from-top-4 duration-500">
                  <button
                    onClick={() => togglePinned(card.id)}
                    className={`group w-full flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all duration-300 shadow-xl overflow-hidden relative ${
                      isExpanded 
                        ? 'bg-indigo-600 border-indigo-400 text-white' 
                        : isDark ? 'bg-slate-900 border-slate-800 text-indigo-400' : 'bg-white border-indigo-100 text-indigo-600'
                    }`}
                  >
                    {isExpanded && <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent animate-pulse pointer-events-none" />}
                    
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        isExpanded ? 'bg-white text-indigo-600 rotate-12' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      }`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d={isExpanded ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                           <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isExpanded ? 'text-white/70' : 'text-slate-500'}`}>
                             {isAdminCard ? "Update from the admin" : "Priority Marker"}
                           </span>
                           <span className="flex h-1.5 w-1.5 relative">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                           </span>
                        </div>
                        <h5 className={`font-black text-sm lg:text-base leading-none mt-1 ${isExpanded ? 'text-white' : isDark ? 'text-white' : 'text-slate-900'}`}>
                          {card.display_name}
                        </h5>
                      </div>
                    </div>

                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'}`}>
                      {isExpanded ? 'Close Update' : 'View Update'}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-500 origin-top">
                      <UserCard card={card} onEdit={() => onEditCard(card)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-6 pt-10">
        {(pinnedCards.length > 0 && regularCards.length > 0) && (
           <div className="flex items-center gap-4 px-2">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Community Feed</h4>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8 lg:gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {regularCards.length > 0 ? (
            regularCards.map(card => (
              <UserCard key={card.id} card={card} onEdit={() => onEditCard(card)} />
            ))
          ) : pinnedCards.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <div className="inline-flex p-6 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <p className="text-slate-500 font-bold">No profiles established in this community yet.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default CardGrid;
