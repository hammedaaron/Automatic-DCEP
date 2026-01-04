
import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { User, UserRole, Folder, Card, Follow, AppNotification, NotificationType, Party, InstructionBox } from './types';
import { getSession, saveSession, findParty, getPartyData, markRead, deleteCard as dbDeleteCard, upsertCard, upsertFollow, addNotification, SYSTEM_PARTY_ID, isCardExpired, expelAndBanUser, updatePushToken } from './db';
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
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getSession());
  const [activeParty, setActiveParty] = useState<Party | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [follows, setFollows] = useState<Follow[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [instructions, setInstructions] = useState<InstructionBox[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isPoweredUp, setIsPoweredUp] = useState(false);
  const [isWorkflowMode, setIsWorkflowMode] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [socketStatus, setSocketStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');

  const lastAudit = useRef<number>(0);
  const cardsRef = useRef(cards);
  const followsRef = useRef(follows);

  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { followsRef.current = follows; }, [follows]);

  const showToast = useCallback((message: any, type: 'success' | 'error' = 'success') => {
    let finalMsg = typeof message === 'string' ? message : message?.notification?.body || message?.message || "Notice";
    setToast({ message: finalMsg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // 1. Handle Foreground Notifications
  useEffect(() => {
    onForegroundMessage((payload) => {
      showToast(payload); 
      syncData(); 
    });
  }, [showToast]);

  const runAccountabilityAudit = useCallback(async () => {
    if (currentUser?.role !== UserRole.ADMIN || !activeParty) return;
    if (Date.now() - lastAudit.current < 60000) return; 
    lastAudit.current = Date.now();

    const { data: users } = await supabase.from('users').select('*').eq('party_id', activeParty.id);
    if (!users) return;

    for (const member of users) {
      if (member.role !== UserRole.REGULAR) continue;
      
      const inbound = followsRef.current.filter(f => cardsRef.current.find(c => c.id === f.target_card_id)?.user_id === member.id).length;
      const outbound = followsRef.current.filter(f => f.follower_id === member.id).length;

      if (inbound - outbound > 3) {
        const warnings = (member.engagement_warnings || 0) + 1;
        if (warnings >= 4) {
          await expelAndBanUser(member as User);
          showToast(`JANITOR: Expelled ${member.name} for persistent leaching.`, "error");
        } else {
          await supabase.from('users').update({ engagement_warnings: warnings }).eq('id', member.id);
          await addNotification({
            recipient_id: member.id, sender_id: 'SYSTEM', sender_name: 'System Audit',
            type: NotificationType.SYSTEM_WARNING, party_id: activeParty.id, related_card_id: ''
          });
          showToast(`JANITOR: Issued strike ${warnings}/4 to ${member.name}. Support gap detected.`);
        }
      }
    }
  }, [currentUser, activeParty, showToast]);

  const syncData = useCallback(async () => {
    const pid = currentUser?.party_id || SYSTEM_PARTY_ID;
    try {
      const party = await findParty(pid);
      setActiveParty(party);
      const data = await getPartyData(pid);
      setFolders(data.folders);
      setCards(data.cards.filter(c => !isCardExpired(c, party)));
      setFollows(data.follows);
      setNotifications(data.notifications);
      setInstructions(data.instructions);
    } catch (err: any) {
      console.error("Sync Error", err);
    }
  }, [currentUser?.party_id]);

  useEffect(() => {
    if (!currentUser) return;
    syncData();
    const interval = setInterval(() => {
      if (currentUser.role === UserRole.ADMIN) runAccountabilityAudit();
    }, 60000);
    return () => clearInterval(interval);
  }, [currentUser?.id, syncData, runAccountabilityAudit]);

  // 2. Defensive Push Registration logic
  useEffect(() => {
    const registerForPush = async () => {
      if (!currentUser) return;
      
      try {
        const messaging = await initMessaging();
        if (!messaging) return;

        if ('serviceWorker' in navigator && 'Notification' in window) {
          // Check for VAPID key
          const vapidKey = (window as any).process.env.FIREBASE_VAPID_KEY;
          if (!vapidKey || vapidKey.trim() === "") {
             console.warn("FCM: Registration skipped - FIREBASE_VAPID_KEY is not set.");
             return;
          }

          const registration = await navigator.serviceWorker.register('/sw.js');
          
          if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;
          } else if (Notification.permission === 'denied') {
            return;
          }

          const token = await getToken(messaging, { 
            serviceWorkerRegistration: registration,
            vapidKey 
          });

          if (token && token !== currentUser.push_token) {
            await updatePushToken(currentUser.id, token);
            setCurrentUser({ ...currentUser, push_token: token });
          }
        }
      } catch (err) {
        console.warn("FCM: Token retrieval was blocked or failed:", err);
      }
    };
    registerForPush();
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser || !currentUser.party_id) return;
    const pid = currentUser.party_id;
    const channel = supabase.channel(`party-realtime-${pid}`);
    
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards', filter: `party_id=eq.${pid}` }, () => syncData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `party_id=eq.${pid}` }, () => syncData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `party_id=eq.${pid}` }, () => syncData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `party_id=eq.${pid}` }, () => syncData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'instructions', filter: `party_id=eq.${pid}` }, () => syncData())
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
    } catch (err) {
      showToast("Sync Error", "error");
    }
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

  const markNotificationRead = async (id: string) => {
    await markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const logout = () => { saveSession(null); setCurrentUser(null); setActiveParty(null); };

  const contextValue: AppContextType = {
    currentUser, setCurrentUser, activeParty, isAdmin: currentUser?.role === UserRole.ADMIN,
    isDev: currentUser?.role === UserRole.DEV, logout, folders, setFolders, cards, setCards,
    follows, toggleFollow, notifications, instructions, markNotificationRead,
    selectedFolderId, setSelectedFolderId, deleteCard, updateCard, searchQuery, setSearchQuery,
    theme, setTheme, isPoweredUp, setIsPoweredUp, showToast, isWorkflowMode, setIsWorkflowMode,
    socketStatus
  };

  if (!currentUser) return <Gate onAuth={u => setCurrentUser(u)} />;

  const renderMainContent = () => {
    if (selectedFolderId === 'authority-table') return <AuthorityTable />;
    if (isWorkflowMode && currentUser?.role === UserRole.DEV) return <DevWorkflow folderId={selectedFolderId} />;
    return <CardGrid folderId={selectedFolderId} onEditCard={c => setEditingCard(c)} />;
  };

  return (
    <AppContext.Provider value={contextValue}>
      <Layout onOpenCreateProfile={() => setIsCreateModalOpen(true)}>
        {renderMainContent()}
      </Layout>
      {isCreateModalOpen && <CreateProfileModal 
        onClose={() => setIsCreateModalOpen(false)} 
        onSubmit={async (n, l1, l2) => {
          const newCard: Card = {
            id: Math.random().toString(36).substr(2, 9),
            user_id: currentUser.id,
            creator_role: currentUser.role,
            folder_id: selectedFolderId!,
            party_id: currentUser.party_id,
            display_name: n,
            external_link: l1,
            external_link2: l2,
            timestamp: Date.now(),
            x: 0,
            y: 0
          };
          await upsertCard(newCard);
          showToast("Profile Established in Hub");
          setIsCreateModalOpen(false);
        }} 
      />}
      {editingCard && <EditProfileModal 
        card={editingCard} 
        onClose={() => setEditingCard(null)} 
        onUpdate={updateCard} 
        onDelete={deleteCard} 
      />}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </AppContext.Provider>
  );
};

export default App;
