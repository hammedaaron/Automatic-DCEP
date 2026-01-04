
import React, { useMemo, useState } from 'react';
import { useApp } from '../App';
import { NotificationType, AppNotification } from '../types';

interface NotificationPanelProps {
  onClose?: () => void;
}

interface AggregatedNotification extends AppNotification {
  count: number;
  items: AppNotification[];
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
  const { currentUser, notifications, setSelectedFolderId, cards, theme, folders } = useApp();
  const [expandedSenders, setExpandedSenders] = useState<Set<string>>(new Set());

  const aggregatedNotifications = useMemo(() => {
    const groups = new Map<string, AggregatedNotification>();
    const sortedRaw = [...notifications]
      .filter(n => n.recipient_id === currentUser?.id)
      .sort((a, b) => b.timestamp - a.timestamp);

    sortedRaw.forEach(n => {
      const key = n.sender_id;
      if (!groups.has(key)) {
        groups.set(key, { ...n, count: 1, items: [n] });
      } else {
        const existing = groups.get(key)!;
        existing.count++;
        existing.items.push(n);
        if (!n.read) existing.read = false;
        // Keep the most recent data for the header summary
        if (n.timestamp > existing.timestamp) {
           existing.timestamp = n.timestamp;
           existing.type = n.type;
           existing.related_card_id = n.related_card_id;
        }
      }
    });
    
    return Array.from(groups.values()).sort((a, b) => {
      if (a.read !== b.read) return a.read ? 1 : -1;
      return b.timestamp - a.timestamp;
    });
  }, [notifications, currentUser?.id]);

  const unreadCount = notifications.filter(n => n.recipient_id === currentUser?.id && !n.read).length;
  const isDark = theme === 'dark';

  const toggleExpand = (e: React.MouseEvent, senderId: string) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedSenders);
    if (newExpanded.has(senderId)) {
      newExpanded.delete(senderId);
    } else {
      newExpanded.add(senderId);
    }
    setExpandedSenders(newExpanded);
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    const targetCard = cards.find(c => c.id === notif.related_card_id);
    if (targetCard) {
      if (onClose) onClose();
      setSelectedFolderId(targetCard.folder_id);
      let attempts = 0;
      const findAndHighlight = () => {
        const el = document.getElementById(`card-${targetCard.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const highlightClasses = ['ring-8', 'ring-emerald-500/50', 'ring-offset-4', 'scale-105', 'z-50', 'transition-all', 'duration-700', 'shadow-2xl'];
          el.classList.add(...highlightClasses);
          setTimeout(() => el.classList.remove(...highlightClasses), 3500);
        } else if (attempts < 20) {
          attempts++;
          setTimeout(findAndHighlight, 100);
        }
      };
      setTimeout(findAndHighlight, 150);
    } else if (onClose) {
      onClose();
    }
  };

  const getFolderName = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return 'Unknown Hub';
    const folder = folders.find(f => f.id === card.folder_id);
    return folder?.name || 'Unknown Hub';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className={`p-6 border-b flex items-center justify-between sticky top-0 z-10 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
        <h2 className={`font-black text-xl flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Activity Hub
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
              {unreadCount} NEW
            </span>
          )}
        </h2>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {aggregatedNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-full">
            <p className="text-slate-400 text-xs font-black uppercase tracking-widest leading-relaxed">No activity yet.</p>
          </div>
        ) : (
          <div className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
            {aggregatedNotifications.map(group => {
              const isExpanded = expandedSenders.has(group.sender_id);
              return (
                <div key={group.sender_id} className={`transition-all ${group.read ? 'opacity-70' : 'bg-indigo-500/5'}`}>
                  {/* Aggregated Header */}
                  <div
                    onClick={() => group.count > 1 ? null : handleNotificationClick(group)}
                    className={`w-full p-6 transition-all flex items-start gap-4 ${group.count === 1 ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50' : ''}`}
                  >
                    <div className="shrink-0 relative">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm ${group.type === NotificationType.FOLLOW_BACK ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
                        {group.type === NotificationType.FOLLOW_BACK ? '🤝' : '👋'}
                      </div>
                      {group.count > 1 && (
                        <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-md">
                          {group.count}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <span className="font-black">{group.sender_name}</span> 
                        {group.count > 1 
                          ? ` interacted with you in ${group.count} hubs.` 
                          : group.type === NotificationType.FOLLOW_BACK ? " followed you back." : " just followed you."}
                      </p>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {group.count === 1 ? (
                          <button 
                            onClick={() => handleNotificationClick(group)}
                            className="font-black text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Trace to Connect
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => toggleExpand(e, group.sender_id)}
                            className="font-black text-[10px] uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-500"
                          >
                            {isExpanded ? 'Hide Interactions' : 'View All Hubs'}
                            <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                          </button>
                        )}
                        <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">
                          • {new Date(group.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Expanded Sub-list */}
                      {isExpanded && group.count > 1 && (
                        <div className="mt-4 space-y-2 border-l-2 border-indigo-500/20 pl-4 animate-in slide-in-from-top-2 duration-300">
                          {group.items.map((item, idx) => (
                            <button
                              key={item.id}
                              onClick={() => handleNotificationClick(item)}
                              className={`w-full text-left p-3 rounded-xl text-[10px] font-bold transition-all flex items-center justify-between group/item ${isDark ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'}`}
                            >
                              <div className="flex flex-col">
                                <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                                  {item.type === NotificationType.FOLLOW_BACK ? '🤝 Followed back in' : '👋 Followed in'}
                                </span>
                                <span className={isDark ? 'text-white' : 'text-slate-900'}>{getFolderName(item.related_card_id)}</span>
                              </div>
                              <div className="opacity-0 group-hover/item:opacity-100 transition-opacity text-indigo-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;
