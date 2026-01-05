
import { User, Folder, Card, Follow, AppNotification, UserRole, NotificationType, Party, InstructionBox, RewardLevel } from './types';
import { supabase } from './supabase';

const SESSION_KEY = 'connector_pro_v3_session';
export const SYSTEM_PARTY_ID = 'SYSTEM';

// --- SECURITY & FINGERPRINTING ---

export const getFingerprint = async (): Promise<string> => {
  const payload = [
    navigator.userAgent,
    navigator.language,
    window.screen.width,
    window.screen.height,
    window.screen.colorDepth,
    new Date().getTimezoneOffset()
  ].join('|');
  
  const msgUint8 = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const isUserBanned = async (partyId: string, username: string): Promise<boolean> => {
  try {
    const fingerprint = await getFingerprint();
    const { data } = await supabase
      .from('banned_identities')
      .select('id')
      .eq('party_id', partyId)
      .or(`name.eq.${username},device_fingerprint.eq.${fingerprint}`);
    
    return !!data && data.length > 0;
  } catch (e) {
    return false;
  }
};

// --- SESSION LOGIC ---

export const isPodSessionActive = (party: Party | null): { active: boolean; sessionName?: string } => {
  if (!party || !party.pod_sessions || party.pod_sessions.length === 0) return { active: true };
  
  const tz = party.timezone || 'UTC';
  const nowInTz = new Date(new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date()));
  const currentMinutes = nowInTz.getHours() * 60 + nowInTz.getMinutes();

  for (const session of party.pod_sessions) {
    const [startH, startM] = session.start.split(':').map(Number);
    const [endH, endM] = session.end.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    if (currentMinutes >= startMin && currentMinutes <= endMin) {
      return { active: true, sessionName: session.name };
    }
  }
  return { active: false };
};

// --- REWARD LOGIC ---

export const getRewardTier = (score: number): { level: RewardLevel; color: string; icon: string } => {
  if (score >= 500) return { level: RewardLevel.CROWN, color: 'text-fuchsia-500', icon: '👑' };
  if (score >= 200) return { level: RewardLevel.DIAMOND, color: 'text-cyan-400', icon: '💎' };
  if (score >= 100) return { level: RewardLevel.GOLD, color: 'text-amber-400', icon: '🥇' };
  if (score >= 50) return { level: RewardLevel.SILVER, color: 'text-slate-300', icon: '🥈' };
  return { level: RewardLevel.BRONZE, color: 'text-orange-600', icon: '🥉' };
};

// --- TIMEZONE & CALENDAR ---

export const isValidTimeZone = (tz: string): boolean => {
  if (!tz) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (ex) {
    return false;
  }
};

export const getCalendarDaysBetween = (start: number, end: number, tz: string = 'UTC'): number => {
  const safeTz = isValidTimeZone(tz) ? tz : 'UTC';
  const fmt = new Intl.DateTimeFormat('en-US', { 
    timeZone: safeTz, 
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric' 
  });
  
  const startParts = fmt.formatToParts(new Date(start));
  const endParts = fmt.formatToParts(new Date(end));
  const getVal = (parts: Intl.DateTimeFormatPart[], type: string) => parts.find(p => p.type === type)?.value;
  
  const dS = new Date(`${getVal(startParts, 'year')}-${getVal(startParts, 'month')?.padStart(2, '0')}-${getVal(startParts, 'day')?.padStart(2, '0')}T00:00:00`);
  const dE = new Date(`${getVal(endParts, 'year')}-${getVal(endParts, 'month')?.padStart(2, '0')}-${getVal(endParts, 'day')?.padStart(2, '0')}T00:00:00`);
  
  const diffMs = dE.getTime() - dS.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
};

export const isCardExpired = (card: Card, party: Party | null) => {
  if (card.is_permanent) return false;
  const tz = party?.timezone || 'UTC';
  const daysPassed = getCalendarDaysBetween(card.timestamp, Date.now(), tz);
  return daysPassed > 1;
};

// --- DATABASE OPERATIONS ---

export const saveSession = (user: User | null) => {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
};

export const getSession = (): User | null => {
  const data = localStorage.getItem(SESSION_KEY);
  return data ? JSON.parse(data) : null;
};

export const expelAndBanUser = async (user: User) => {
  const fingerprint = user.device_fingerprint || await getFingerprint();
  
  await supabase.from('banned_identities').insert([{
    party_id: user.party_id,
    name: user.name,
    device_fingerprint: fingerprint,
    banned_at: Date.now()
  }]);

  await supabase.from('users').delete().eq('id', user.id);
};

export const ensureDevUser = async () => {
  const partyId = SYSTEM_PARTY_ID;
  const devId = 'dev-master-root';
  const fingerprint = await getFingerprint();
  const devData: User = { id: devId, name: 'Dev', role: UserRole.DEV, party_id: partyId, device_fingerprint: fingerprint };
  
  const { data: user } = await supabase.from('users').select('id').eq('id', devId).maybeSingle();
  if (!user) {
    await supabase.from('users').insert([devData]);
  }
  return devData;
};

export const resetAllData = async () => {
  const tables = ['notifications', 'follows', 'cards', 'instructions', 'folders', 'banned_identities'];
  for (const table of tables) {
    await supabase.from(table).delete().neq('id', '_root_protected_');
  }
  await supabase.from('users').delete().neq('id', 'dev-master-root');
  await supabase.from('parties').delete().neq('id', SYSTEM_PARTY_ID);
  return true;
};

export const deleteParty = async (id: string) => {
  const tables = ['notifications', 'follows', 'cards', 'instructions', 'folders', 'users', 'banned_identities'];
  for (const table of tables) {
    await supabase.from(table).delete().eq('party_id', id);
  }
  await supabase.from('parties').delete().eq('id', id);
};

export const deleteUser = async (id: string) => {
  await supabase.from('users').delete().eq('id', id);
};

export const updatePartySessions = async (partyId: string, sessions: any[]) => {
  await supabase.from('parties').update({ pod_sessions: sessions }).eq('id', partyId);
};

export const updatePartyParkingStatus = async (partyId: string, status: boolean) => {
  await supabase.from('parties').update({ is_parking_enabled: status }).eq('id', partyId);
};

export const getParties = async () => {
  const { data } = await supabase.from('parties').select('*').order('name');
  return (data || []) as Party[];
};

export const findPartyByName = async (name: string): Promise<Party | null> => {
  const { data } = await supabase.from('parties').select('*').ilike('name', name.trim()).maybeSingle();
  return data as Party | null;
};

export const findParty = async (partyId: string): Promise<Party | null> => {
  if (partyId === SYSTEM_PARTY_ID) return { id: SYSTEM_PARTY_ID, name: 'System Core', timezone: 'UTC' };
  const { data } = await supabase.from('parties').select('*').eq('id', partyId).maybeSingle();
  return data as Party | null;
};

export const updatePartyTimezone = async (partyId: string, timezone: string) => {
  await supabase.from('parties').update({ timezone }).eq('id', partyId);
};

export const getPartyData = async (partyId: string) => {
  const [foldersRes, cardsRes, followsRes, notificationsRes, instructionsRes] = await Promise.all([
    supabase.from('folders').select('*').or(`party_id.eq.${partyId},party_id.eq.${SYSTEM_PARTY_ID}`).order('name'),
    supabase.from('cards').select('*').or(`party_id.eq.${partyId},party_id.eq.${SYSTEM_PARTY_ID}`).order('timestamp', { ascending: false }),
    supabase.from('follows').select('*').eq('party_id', partyId),
    supabase.from('notifications').select('*').eq('party_id', partyId).order('timestamp', { ascending: false }),
    supabase.from('instructions').select('*').or(`party_id.eq.${partyId},party_id.eq.${SYSTEM_PARTY_ID}`)
  ]);
  return {
    folders: (foldersRes.data || []) as Folder[],
    cards: (cardsRes.data || []) as Card[],
    follows: (followsRes.data || []) as Follow[],
    notifications: (notificationsRes.data || []) as AppNotification[],
    instructions: (instructionsRes.data || []) as InstructionBox[]
  };
};

export const getAuthorityData = async () => {
  const [partiesRes, usersRes, foldersRes, cardsRes, bannedRes, followsRes] = await Promise.all([
    supabase.from('parties').select('*'),
    supabase.from('users').select('*'),
    supabase.from('folders').select('*'),
    supabase.from('cards').select('*'),
    supabase.from('banned_identities').select('*'),
    supabase.from('follows').select('*')
  ]);
  return {
    parties: (partiesRes.data || []) as Party[],
    users: (usersRes.data || []) as User[],
    folders: (foldersRes.data || []) as Folder[],
    cards: (cardsRes.data || []) as Card[],
    banned: (bannedRes.data || []) as any[],
    follows: (followsRes.data || []) as Follow[]
  };
};

export const upsertCard = async (card: Card, isUpdate: boolean = false) => {
  if (isUpdate) {
    await supabase.from('cards').update(card).eq('id', card.id);
  } else {
    await supabase.from('cards').insert([card]);
  }
};

export const updateCardPosition = async (id: string, x: number, y: number) => {
  await supabase.from('cards').update({ x, y }).eq('id', id);
};

export const updateCardPin = async (cardId: string, isPinned: boolean) => {
  await supabase.from('cards').update({ is_pinned: isPinned }).eq('id', cardId);
};

export const deleteCard = async (id: string) => {
  await supabase.from('cards').delete().eq('id', id);
};

export const upsertInstruction = async (box: InstructionBox) => {
  await supabase.from('instructions').upsert([box]);
};

export const deleteInstruction = async (id: string) => {
  await supabase.from('instructions').delete().eq('id', id);
};

export const validateAdminPassword = (password: string) => {
  const regex = /^Hamstar([1-9]{2})([1-9])$/;
  const match = password.trim().match(regex);
  if (!match) return null;
  return { partyId: match[1], adminId: match[2] };
};

export const validateDevPassword = (password: string) => {
  const regex = /^Dev([1-8]{2})$/;
  const match = password.trim().match(regex);
  return !!match;
};

export const registerParty = async (partyName: string, adminPassword: string, timezone: string = 'UTC') => {
  const info = validateAdminPassword(adminPassword);
  if (!info) throw new Error("Invalid password format.");
  const existing = await findPartyByName(partyName);
  if (existing) throw new Error(`Community name taken.`);
  const newParty: Party = { id: info.partyId, name: partyName.trim(), timezone, max_slots: 50, pod_sessions: [], is_parking_enabled: false };
  const fingerprint = await getFingerprint();
  const newAdmin: User = {
    id: `admin-${info.partyId}-${info.adminId}`,
    name: 'Admin',
    admin_code: adminPassword.trim(),
    role: UserRole.ADMIN,
    party_id: info.partyId,
    device_fingerprint: fingerprint
  };
  await supabase.from('parties').insert([newParty]);
  await supabase.from('users').insert([newAdmin]);
  return { party: newParty, admin: newAdmin };
};

export const loginUser = async (username: string, password: string, partyId: string): Promise<User | null> => {
  const { data } = await supabase.from('users').select('*').eq('name', username).eq('party_id', partyId).maybeSingle();
  if (!data) return null;
  const user = data as User;
  if (user.role === UserRole.ADMIN) return user.admin_code === password ? user : null;
  return user.password === password ? user : null;
};

export const registerUser = async (user: User) => {
  await supabase.from('users').insert([user]);
  return user;
};

export const checkUserExists = async (username: string, partyId: string) => {
  const { data } = await supabase.from('users').select('id').eq('name', username).eq('party_id', partyId).maybeSingle();
  return !!data;
};

export const addFolder = async (folder: Folder) => {
  await supabase.from('folders').insert([folder]);
};

export const updateFolderName = async (id: string, name: string) => {
  await supabase.from('folders').update({ name }).eq('id', id);
};

export const deleteFolder = async (id: string) => {
  await supabase.from('folders').delete().eq('id', id);
};

export const upsertFollow = async (follow: Follow, shouldAdd: boolean) => {
  if (shouldAdd) {
    await supabase.from('follows').insert([follow]);
  } else {
    await supabase.from('follows').delete().eq('follower_id', follow.follower_id).eq('target_card_id', follow.target_card_id);
  }
};

export const addNotification = async (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
  const newNotif = { ...notif, id: Math.random().toString(36).substr(2, 9), timestamp: Date.now(), read: false };
  await supabase.from('notifications').insert([newNotif]);
  return newNotif as AppNotification;
};

export const markRead = async (id: string) => {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
};

export const updatePushToken = async (userId: string, token: string) => {
  const { error } = await supabase
    .from('users')
    .update({ push_token: token })
    .eq('id', userId);
  if (error) throw error;
};
