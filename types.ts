export enum UserRole {
  REGULAR = 'REGULAR',
  ADMIN = 'ADMIN',
  DEV = 'DEV'
}

export enum RewardLevel {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  DIAMOND = 'DIAMOND',
  CROWN = 'CROWN'
}

export type SessionType = 'morning' | 'afternoon' | 'evening';

export interface SessionWindow {
  enabled: boolean;
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface PodSession {
  name: string;
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export interface Party {
  id: string;
  name: string;
  timezone?: string;
  pod_sessions?: PodSession[];
  session_config?: {
    morning: SessionWindow;
    afternoon: SessionWindow;
    evening: SessionWindow;
  };
  max_slots?: number;
  is_parking_enabled?: boolean;
}

export interface User {
  id: string;
  name: string;
  password?: string;
  admin_code?: string;
  role: UserRole;
  party_id: string;
  profile_link?: string;
  device_fingerprint?: string;
  push_token?: string;
  engagement_warnings?: number;
  warning_label?: string; // 'CLEAN', '1st Warning', '2nd Warning', 'Final Warning'
  missed_pod_warnings?: number;
  reward_level?: RewardLevel;
  total_score?: number;
  last_pod_participation?: number;
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
  party_id: string;
}

export interface Card {
  id: string;
  user_id: string;
  creator_role: UserRole;
  folder_id: string;
  party_id: string;
  display_name: string;
  external_link: string;
  external_link2?: string;
  link1_label?: string;
  link2_label?: string;
  is_permanent?: boolean;
  is_pinned?: boolean;
  timestamp: number;
  window_id?: string;
  session_type?: SessionType;
  session_date?: string; // "YYYY-MM-DD"
  is_admin_card?: boolean;
  engagement_warnings?: number;
  warning_label?: string;
  x?: number;
  y?: number;
}

export interface InstructionBox {
  id: string;
  folder_id: string;
  party_id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Follow {
  id: string;
  follower_id: string;
  target_card_id: string;
  party_id: string;
  timestamp: number;
}

export enum NotificationType {
  FOLLOW = 'FOLLOW',
  FOLLOW_BACK = 'FOLLOW_BACK',
  SYSTEM_WARNING = 'SYSTEM_WARNING'
}

export interface AppNotification {
  id: string;
  recipient_id: string;
  sender_id: string;
  sender_name: string;
  type: NotificationType;
  related_card_id: string;
  party_id: string;
  timestamp: number;
  read: boolean;
}