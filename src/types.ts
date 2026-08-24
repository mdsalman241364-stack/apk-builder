export type Sender = 'user' | 'diguu';

export interface ChatMessage {
  id: string;
  sender: Sender;
  text: string;
  timestamp: string;
  actionTag?: string;
  isVoice?: boolean;
}

export type MemoryCategory = 'food' | 'music' | 'movies' | 'contacts' | 'routines' | 'places' | 'preferences';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  createdAt: string;
  permissionGranted: boolean;
}

export interface Routine {
  id: string;
  title: string;
  time: string;
  repeat: 'Daily' | 'Weekdays' | 'Weekends';
  enabled: boolean;
  icon?: string;
  category?: 'outdoor' | 'indoor' | 'work' | 'wellness';
  location?: string;
}

export interface ScheduleSuggestion {
  id: string;
  routineId?: string;
  reminderId?: string;
  title: string;
  originalTime: string;
  suggestedTime: string;
  type: 'weather_impact' | 'calendar_conflict' | 'routine_optimization';
  severity: 'high' | 'medium' | 'low';
  reason: string;
  actionLabel: string;
  applied?: boolean;
}

export interface Reminder {
  id: string;
  title: string;
  date: string;
  time: string;
  repeat: string;
  category: 'Health' | 'Work' | 'Personal' | 'Call' | 'Alarm';
  completed: boolean;
  soundName?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  category: 'Work' | 'Personal' | 'Ideas' | 'Voice Notes' | 'Meeting Summaries';
  updatedAt: string;
}

export interface HabitGoal {
  id: string;
  title: string;
  targetDays: number;
  currentStreak: number;
  completedToday: boolean;
  category: 'Health' | 'Productivity' | 'Mindfulness' | 'Learning';
}

export interface UserProfile {
  name: string;
  nickname: string;
  aiName?: string;
  relationshipMode?: string;
  voiceGender?: 'male' | 'female';
  location: string;
  occupation: string;
  theme: 'jarvis' | 'glass' | 'cyberpunk' | 'ios' | 'matrix' | 'neon-cyber' | 'dark-velvet' | 'violet-glow' | 'sunset-gold' | 'light-cyber';
  personality: 'Warm Bestie' | 'Professional AI' | 'Chill Buddy' | 'Guru Coach';
  languageMode: 'hinglish' | 'hindi' | 'gujarati' | 'english';
  voiceStyle: 'Kore' | 'Zephyr' | 'Puck' | 'Charon' | 'Fenrir';
  voiceSpeed: number; // 0.8 to 1.5
  voicePitch?: number; // 0.8 to 1.2
  voiceEngine?: 'natural_webspeech' | 'server_ai';
  wakeWordEnabled: boolean;
  avatarVariant: string;
  avatarOutfit: string;
  haloColor: string;
  whatsappAutoReplyEnabled?: boolean;
  whatsappAutoReplyRule?: 'all' | 'contacts_only' | 'busy_mode' | 'custom_list';
  whatsappCustomContacts?: string;
}

export interface WhatsAppAutoReplyLog {
  id: string;
  sender: string;
  incomingMessage: string;
  aiResponse: string;
  timestamp: string;
  rule: string;
  status: 'sent' | 'simulated';
}

export interface AppPermissions {
  microphone: boolean;
  storage: boolean;
  camera: boolean;
  location: boolean;
  contacts: boolean;
  calendar: boolean;
  notifications: boolean;
}

export interface QuickActionItem {
  id: string;
  label: string;
  iconName: string;
  category: string;
  action: string;
  shortcut?: string;
}

export interface WeatherData {
  city: string;
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  highLow: string;
}

export interface SavedPlace {
  id: string;
  name: string;
  address: string;
  category: 'Home' | 'Work' | 'Gym' | 'Cafe' | 'Other';
  estimatedMinutes: number;
}
