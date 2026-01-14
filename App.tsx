
import React, { useState, useEffect, useCallback, createContext, useContext, useRef, useMemo } from 'react';
import { User, UserRole, Folder, Card, Follow, AppNotification, NotificationType, Party, InstructionBox, SessionType } from './types';
import { getSession, saveSession, findParty, getPartyData, markRead, deleteCard as dbDeleteCard, upsertCard, upsertFollow, addNotification, SYSTEM_PARTY_ID, isCardExpired, expelAndBanUser, updatePushToken, isTimestampExpired, getHubCycleInfo } from './db';
import { supabase } from './supabase';
import { initMessaging, getToken, onForegroundMessage } from './firebase'; 
import Layout from './components/Layout';
import CardGrid from './components/CardGrid';
import AuthorityTable from './components/AuthorityTable';
import CreateProfileModal from './components/CreateProfileModal';
import EditProfileModal from './components/EditProfileModal';
import Gate from './components/Gate';
import Toast from './components/Toast';
import DevWorkflow from './components/DevWorkflow';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  activeParty: Party | null;
  setActiveParty: (party: Party | null) => void;
  isAdmin: boolean;
  isDev: boolean;
  logout: () => void;
  folders: Folder[];
  setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
  cards: Card[];
  setCards: React.Dispatch<React.SetStateAction<Card[]>>;
  follows: Follow[];
  toggleFollow: (cardId: string) => void;
  notifications: AppNotification[];
  instructions: InstructionBox[];
  markNotificationRead: (id: string) => void;
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  deleteCard: (id: string) => void;
  updateCard: (id: string, name: string, link1: string, link2: string, link1Label?: string, link2Label?: string, isPermanent?: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  isPoweredUp: boolean;
  setIsPoweredUp: (val: boolean) => void;
  showToast: (message: any, type?: 'success' | 'error') => void;
  isWorkflowMode: boolean;
  setIsWorkflowMode: (val: boolean) => void;
  socketStatus: 'connected' | 'disconnected' | 'connecting';
  syncData: () => Promise<void>;
  activeSessionTab: SessionType;
  setActiveSessionTab: (session: SessionType) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

const VIEW_STORAGE_KEY = 'connector_pro_v3_current_view';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getSession());
  const [activeParty, setActiveParty] = useState<Party | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [instructions, setInstructions] = useState<InstructionBox[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() => localStorage.getItem(VIEW_STORAGE_KEY));
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isPoweredUp, setIsPoweredUp] = useState(false);
  const [isWorkflowMode, setIsWorkflowMode] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [invitedHubId, setInvitedHubId] = useState<string | null>(null);
  const [activeSessionTab, setActiveSessionTab] = useState<SessionType>('morning');

  const lastAuditDate = useRef<string>(''); 
  const cardsRef = useRef(cards);
  const followsRef = useRef(follows);
  const activePartyRef = useRef(activeParty);

  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { followsRef.current = follows; }, [follows]);
  useEffect(() => { activePartyRef.current = activeParty; }, [activeParty]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hub = params.get('hub');
    if (hub) {
      setInvitedHubId(hub);
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  useEffect(() => {
    if (selectedFolderId) {
      localStorage.setItem(VIEW_STORAGE_KEY, selectedFolderId);
    } else {
      localStorage.removeItem(VIEW_STORAGE_KEY);
    }
  }, [selectedFolderId]);

  const showToast = useCallback((message: any, type: 'success' | 'error' = 'success') => {
    let finalMsg = typeof message === 'string' ? message : message?.notification?.body || message?.message || "Notice";
    setToast({ message: finalMsg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const syncData = useCallback(async () => {
    const pid = currentUser?.party_id || SYSTEM_PARTY_ID;
    try {
      const party = await findParty(pid);
      setActiveParty(party);
      const data = await getPartyData(pid);
      
      setFolders(data.folders);
      setCards(data.cards.filter(c => !isCardExpired(c, party)));
      setFollows(data.follows.filter(f => !isTimestampExpired(f.timestamp, party)));
      setNotifications(data.notifications.filter(n => !isTimestampExpired(n.timestamp, party)));
      setInstructions(data.instructions);
    } catch (err: any) {
      console.error("Sync Error", err);
    }
  }, [currentUser?.party_id]);

  const runAccountabilityAudit = useCallback(async () => {
    if (currentUser?.role !== UserRole.ADMIN || !activePartyRef.current) return;

    const tz = activePartyRef.current.timezone || 'UTC';
    const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    
    // 1. Only run once per calendar day
    if (lastAuditDate.current === todayDate) return;

    // 2. Calculate if we are in the "Hour before Reset" window
    const info = getHubCycleInfo(activePartyRef.current);
    
    // We trigger the audit when the Hub Reset is less than 60 minutes away
    if (info.resetIn <= 60 && info.resetIn > 0) {
      console.log("JANITOR: Executing Daily Verdict...");
      
      const { data: users } = await supabase.from('users').select('*').eq('party_id', activePartyRef.current.id);
      if (!users) return;

      for (const member of users) {
        if (member.role !== UserRole.REGULAR) continue;
        
        // Calculate Gap (Ignoring Pinned Cards)
        const inbound = followsRef.current.filter(f => {
          const card = cardsRef.current.find(c => c.id === f.target_card_id);
          return card?.user_id === member.id && !card?.is_pinned;
        }).length;

        const outbound = followsRef.current.filter(f => f.follower_id === member.id).length;

        if (inbound - outbound > 3) {
          const strikes = (member.engagement_warnings || 0) + 1;
          const labels = ['CLEAN', '1st Warning', '2nd Warning', 'Final Warning'];
          
          if (strikes >= 4) {
            await expelAndBanUser(member as User);
            showToast(`JANITOR: Node ${member.name} TERMINATED (4/4 strikes).`, "error");
          } else {
            const newLabel = labels[Math.min(strikes, 3)];
            await supabase.from('users').update({ 
              engagement_warnings: strikes, 
              warning_label: newLabel 
            }).eq('id', member.id);
            
            await addNotification({
              recipient_id: member.id, sender_id: 'SYSTEM', sender_name: 'System Audit',
              type: NotificationType.SYSTEM_WARNING, party_id: activePartyRef.current.id, related_card_id: ''
            });
            showToast(`JANITOR: ${member.name} issued ${newLabel}. Support gap detected.`);
          }
        } else {
          // If they fixed their score before the audit, reset them to CLEAN
          if (member.warning_label !== 'CLEAN') {
            await supabase.from('users').update({ warning_label: 'CLEAN', engagement_warnings: 0 }).eq('id', member.id);
          }
        }
      }

      lastAuditDate.current = todayDate; // Mark as completed for today
      showToast("Daily Audit Complete: Hub is compliant.");
    }
  }, [currentUser?.role, showToast]);

  useEffect(() => {
    onForegroundMessage((payload) => {
      showToast(payload); 
      syncData(); 
    });
  }, [showToast, syncData]);

  useEffect(() => {
    if (!currentUser) return;
    syncData();
    // Janitor checks every 60s, but only executes once a day in the Reset Window
    const interval = setInterval(() => {
      runAccountabilityAudit();
    }, 60000);
    return () => clearInterval(interval);
  }, [currentUser?.id, currentUser?.party_id, syncData, runAccountabilityAudit]);

  useEffect(() => {
    const registerForPush = async () => {
      if (!currentUser) return;
      try {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) return;
        const messaging = await initMessaging();
        if (!messaging) return;
        const vapidKey = (window as any).process.env.FIREBASE_VAPID_KEY;
        if (!vapidKey) return;
        let registration = await navigator.serviceWorker.getRegistration('/sw.js');
        if (!registration) registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;
        }
        const token = await getToken(messaging, { serviceWorkerRegistration: registration, vapidKey });
        if (token && token !== currentUser.push_token) {
          await updatePushToken(currentUser.id, token);
          setCurrentUser(prev => prev ? { ...prev, push_token: token } : null);
          showToast("Push Notifications Active");
        }
      } catch (err) { console.warn("FCM: Setup incomplete."); }
    };
    registerForPush();
  }, [currentUser?.id, showToast]);

  useEffect(() => {
    if (!currentUser || !currentUser.party_id) return;
    const pid = currentUser.party_id;
    const channel = supabase.channel(`party-realtime-${pid}`);
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards', filter: `party_id=eq.${pid}` }, () => syncData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `party_id=eq.${pid}` }, () => syncData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders', filter: `party_id=eq.${pid}` }, () => syncData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'folders', filter: `party_id=eq.${SYSTEM_PARTY_ID}` }, () => syncData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `party_id=eq.${pid}` }, () => syncData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `party_id=eq.${pid}` }, () => syncData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'instructions', filter: `party_id=eq.${pid}` }, () => syncData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'instructions', filter: `party_id=eq.${SYSTEM_PARTY_ID}` }, () => syncData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parties', filter: `id=eq.${pid}` }, () => syncData())
      .subscribe((status) => {
        setSocketStatus(status === 'SUBSCRIBED' ? 'connected' : 'disconnected');
      });
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.party_id, syncData]);

  const toggleFollow = async (cardId: string) => {
    if (!currentUser) return;
    const isFollowing = follows.some(f => f.follower_id === currentUser.id && f.target_card_id === cardId);
    const targetCard = cards.find(c => c.id === cardId);
    if (!targetCard) return;

    try {
      if (isFollowing) {
        await upsertFollow({ follower_id: currentUser.id, target_card_id: cardId, party_id: currentUser.party_id, id: '', timestamp: 0 }, false);
        showToast("Engagement Terminated");
      } else {
        const newFollow = {
          id: Math.random().toString(36).substr(2, 9),
          follower_id: currentUser.id,
          target_card_id: cardId,
          party_id: currentUser.party_id,
          timestamp: Date.now()
        };
        await upsertFollow(newFollow, true);
        await addNotification({
          recipient_id: targetCard.user_id,
          sender_id: currentUser.id,
          sender_name: currentUser.name,
          type: NotificationType.FOLLOW,
          party_id: currentUser.party_id,
          related_card_id: cardId
        });
        showToast("Engagement Verified");
      }
    } catch (err) { showToast("Sync Error", "error"); }
  };

  const deleteCard = async (id: string) => {
    if (!window.confirm("Delete this node?")) return;
    await dbDeleteCard(id);
    showToast("Node Purged");
  };

  const updateCard = async (id: string, name: string, link1: string, link2: string, l1Label?: string, l2Label?: string, perm?: boolean) => {
    const card = cards.find(c => c.id === id);
    if (!card) return;
    const updated = { ...card, display_name: name, external_link: link1, external_link2: link2, link1_label: l1Label, link2_label: l2Label, is_permanent: perm };
    await upsertCard(updated, true);
    showToast("Node Re-Configured");
    setEditingCard(null);
  };

  // --- Fix: Implementing missing handleCreateProfile ---
  const handleCreateProfile = async (name: string, link1: string, link2: string) => {
    if (!currentUser || !selectedFolderId) return;

    const tz = activeParty?.timezone || 'UTC';
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

    const newCard: Card = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: currentUser.id,
      creator_role: currentUser.role,
      folder_id: selectedFolderId,
      party_id: currentUser.party_id,
      display_name: name,
      external_link: link1,
      external_link2: link2,
      timestamp: Date.now(),
      session_type: activeSessionTab,
      session_date: dateStr,
      is_pinned: false,
      is_permanent: false
    };

    try {
      await upsertCard(newCard);
      showToast("Identity Synchronized with Matrix");
      setIsCreateModalOpen(false);
      await syncData();
    } catch (err) {
      showToast("Initialization Failed", "error");
    }
  };

  const markNotificationRead = async (id: string) => {
    await markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const logout = () => { 
    saveSession(null); 
    localStorage.removeItem(VIEW_STORAGE_KEY);
    setCurrentUser(null); 
    setActiveParty(null); 
  };

  const todayStr = useMemo(() => {
    const tz = activeParty?.timezone || 'UTC';
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  }, [activeParty]);

  const contextValue: AppContextType = {
    currentUser, setCurrentUser, activeParty, setActiveParty, isAdmin: currentUser?.role === UserRole.ADMIN,
    isDev: currentUser?.role === UserRole.DEV, logout, folders, setFolders, cards, setCards,
    follows, toggleFollow, notifications, instructions, markNotificationRead,
    selectedFolderId, setSelectedFolderId, deleteCard, updateCard, searchQuery, setSearchQuery,
    theme, setTheme, isPoweredUp, setIsPoweredUp, showToast, isWorkflowMode, setIsWorkflowMode,
    socketStatus, syncData, activeSessionTab, setActiveSessionTab
  };

  const renderMainContent = () => {
    if (selectedFolderId === 'authority-table') return <AuthorityTable />;
    if (isWorkflowMode && currentUser?.role === UserRole.DEV) return <DevWorkflow folderId={selectedFolderId} />;
    return <CardGrid folderId={selectedFolderId} onEditCard={c => setEditingCard(c)} />;
  };

  return (
    <AppContext.Provider value={contextValue}>
      {!currentUser ? (
        <Gate 
          invitedHubId={invitedHubId}
          onAuth={u => {
            saveSession(u);
            setCurrentUser(u);
          }} 
        />
      ) : (
        <>
          <Layout onOpenCreateProfile={() => setIsCreateModalOpen(true)}>
            {renderMainContent()}
          </Layout>
          {isCreateModalOpen && <CreateProfileModal 
            onClose={() => setIsCreateModalOpen(false)} 
            onSubmit={handleCreateProfile} 
          />}
          {editingCard && <EditProfileModal 
            card={editingCard} 
            onClose={() => setEditingCard(null)} 
            onUpdate={updateCard} 
            onDelete={deleteCard} 
          />}
        </>
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </AppContext.Provider>
  );
};

export default App;
