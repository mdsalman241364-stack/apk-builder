import { 
  MemoryItem, 
  Routine, 
  Reminder, 
  Note, 
  HabitGoal, 
  UserProfile, 
  AppPermissions, 
  QuickActionItem,
  WeatherData,
  SavedPlace
} from '../types';

export const initialUserProfile: UserProfile = {
  name: 'Tarun',
  nickname: 'Tarun',
  aiName: 'DIGUU AI',
  relationshipMode: 'Girlfriend 💕',
  voiceGender: 'male',
  location: 'Ahmedabad, India',
  occupation: 'Developer',
  theme: 'neon-cyber',
  personality: 'Warm Bestie',
  languageMode: 'hinglish',
  voiceStyle: 'Puck',
  voiceSpeed: 1.0,
  voicePitch: 1.0,
  voiceEngine: 'server_ai',
  wakeWordEnabled: true,
  avatarVariant: 'main',
  avatarOutfit: 'Pink Sweats & Bow 🎀',
  haloColor: '#ec4899',
  whatsappAutoReplyEnabled: false,
  whatsappAutoReplyRule: 'all',
  whatsappCustomContacts: 'Aarav, Mom, Work',
};

export const initialMemories: MemoryItem[] = [
  {
    id: 'm1',
    category: 'food',
    key: 'Favorite Drink',
    value: 'Hot Cappuccino with Cinnamon ☕',
    createdAt: '15 May 2026',
    permissionGranted: true,
  },
  {
    id: 'm2',
    category: 'places',
    key: 'Home City',
    value: 'Ahmedabad, Gujarat 📍',
    createdAt: '10 May 2026',
    permissionGranted: true,
  },
  {
    id: 'm3',
    category: 'routines',
    key: 'Work Hours',
    value: '09:30 AM to 06:30 PM (Software Developer) 💻',
    createdAt: '12 May 2026',
    permissionGranted: true,
  },
  {
    id: 'm4',
    category: 'music',
    key: 'Favorite Music',
    value: 'Lo-Fi Chillbeats & Soft Hindi Acoustic 🎵',
    createdAt: '14 May 2026',
    permissionGranted: true,
  },
  {
    id: 'm5',
    category: 'preferences',
    key: 'Sports Preference',
    value: 'Loves Cricket & F1 Racing 🏎️🏏',
    createdAt: '18 May 2026',
    permissionGranted: true,
  },
];

export const initialRoutines: Routine[] = [
  {
    id: 'r1',
    title: 'Morning Routine & Briefing',
    time: '06:00 AM',
    repeat: 'Daily',
    enabled: true,
    icon: 'Sun',
  },
  {
    id: 'r2',
    title: 'Office Time & Focus Mode',
    time: '09:30 AM',
    repeat: 'Weekdays',
    enabled: true,
    icon: 'Briefcase',
  },
  {
    id: 'r3',
    title: 'Hydration & Stretch Reminder',
    time: '02:00 PM',
    repeat: 'Daily',
    enabled: true,
    icon: 'Activity',
  },
  {
    id: 'r4',
    title: 'Gym & Fitness Workout',
    time: '07:00 PM',
    repeat: 'Daily',
    enabled: true,
    icon: 'Dumbbell',
  },
  {
    id: 'r5',
    title: 'Night Summary & Sleep Routine',
    time: '11:00 PM',
    repeat: 'Daily',
    enabled: true,
    icon: 'Moon',
  },
];

export const initialReminders: Reminder[] = [
  {
    id: 'rem1',
    title: 'Take Daily Vitamins & Water 💧',
    date: '15 May 2026',
    time: '08:00 AM',
    repeat: 'Daily',
    category: 'Health',
    completed: false,
    soundName: 'Sweet Tone',
  },
  {
    id: 'rem2',
    title: 'Call Mummy & Check In 📞',
    date: '15 May 2026',
    time: '07:00 PM',
    repeat: 'Daily',
    category: 'Personal',
    completed: false,
    soundName: 'Gentle Bell',
  },
  {
    id: 'rem3',
    title: 'Review Project File before Office 📁',
    date: '16 May 2026',
    time: '09:00 AM',
    repeat: 'None',
    category: 'Work',
    completed: false,
    soundName: 'Chime',
  },
];

export const initialNotes: Note[] = [
  {
    id: 'n1',
    title: 'DIGUU Feature Roadmap 🚀',
    content: '- Implement Voice Interrupts\n- Personal memory recall\n- Smart health stretch reminders\n- Multi-theme avatar customization',
    category: 'Work',
    updatedAt: '15 May 2026',
  },
  {
    id: 'n2',
    title: 'Shopping List & Household 🛒',
    content: '- Coffee beans (Light Roast)\n- Cinnamon powder\n- Oats & Milk\n- Protein powder',
    category: 'Personal',
    updatedAt: '14 May 2026',
  },
  {
    id: 'n3',
    title: 'Voice Note Transcript 🎙️',
    content: 'Meeting with product team discussed AI studio release date and DIGUU hyper intelligence features.',
    category: 'Voice Notes',
    updatedAt: '13 May 2026',
  },
];

export const initialHabits: HabitGoal[] = [
  {
    id: 'h1',
    title: 'Drink 8 Glasses of Water 💧',
    targetDays: 30,
    currentStreak: 12,
    completedToday: true,
    category: 'Health',
  },
  {
    id: 'h2',
    title: 'Walk 10,000 Steps Daily 👟',
    targetDays: 30,
    currentStreak: 5,
    completedToday: false,
    category: 'Health',
  },
  {
    id: 'h3',
    title: '10 Min Guided Breathing 🧘‍♀️',
    targetDays: 21,
    currentStreak: 8,
    completedToday: true,
    category: 'Mindfulness',
  },
  {
    id: 'h4',
    title: 'Read 20 Pages of Book 📚',
    targetDays: 30,
    currentStreak: 14,
    completedToday: false,
    category: 'Learning',
  },
];

export const initialPermissions: AppPermissions = {
  microphone: false,
  storage: false,
  camera: false,
  location: false,
  contacts: false,
  calendar: false,
  notifications: false,
};

export const initialQuickActions: QuickActionItem[] = [
  { id: 'qa1', label: 'Set Alarm', iconName: 'AlarmClock', category: 'Time', action: 'set_alarm', shortcut: 'Hey Diguu, kal subah 6 baje uthana' },
  { id: 'qa2', label: 'Set Reminder', iconName: 'Bell', category: 'Task', action: 'set_reminder', shortcut: 'Hey Diguu, shaam 7 baje mummy ko call yaad dilana' },
  { id: 'qa3', label: 'Make Call', iconName: 'PhoneCall', category: 'Contact', action: 'make_call', shortcut: 'Hey Diguu, call Mummy' },
  { id: 'qa4', label: 'Check Weather', iconName: 'CloudSun', category: 'Info', action: 'check_weather', shortcut: 'Hey Diguu, aaj ka weather kaisa hai?' },
  { id: 'qa5', label: 'Flashlight', iconName: 'Zap', category: 'System', action: 'toggle_flashlight', shortcut: 'Hey Diguu, flashlight on karo' },
  { id: 'qa6', label: 'Music Control', iconName: 'Music', category: 'Media', action: 'play_music', shortcut: 'Hey Diguu, music chalao' },
  { id: 'qa7', label: 'Open WhatsApp', iconName: 'MessageSquare', category: 'App', action: 'open_whatsapp', shortcut: 'Hey Diguu, WhatsApp kholo' },
  { id: 'qa8', label: 'Guided Breathing', iconName: 'HeartPulse', category: 'Health', action: 'start_breathing', shortcut: 'Hey Diguu, 5 min breathing karwao' },
  { id: 'qa9', label: 'Camera Control', iconName: 'Camera', category: 'System', action: 'open_camera', shortcut: 'Hey Diguu, camera open karo' },
  { id: 'qa10', label: 'Notes & AI Draft', iconName: 'FileText', category: 'Tools', action: 'open_notes', shortcut: 'Hey Diguu, note banao' },
  { id: 'qa11', label: 'Calculate', iconName: 'Calculator', category: 'Tools', action: 'open_calc', shortcut: 'Hey Diguu, 125 x 4 kitna hoga?' },
  { id: 'qa12', label: 'Navigate Place', iconName: 'Navigation', category: 'Travel', action: 'open_nav', shortcut: 'Hey Diguu, Office jaane ka rasta dikhao' },
];

export const initialWeather: WeatherData = {
  city: 'Ahmedabad, India',
  temp: 32,
  condition: 'Clear Sky ☀️',
  humidity: 45,
  windSpeed: 12,
  highLow: 'H: 36° / L: 24°',
};

export const initialPlaces: SavedPlace[] = [
  { id: 'p1', name: 'Home Sweet Home', address: 'Bodakdev, Ahmedabad', category: 'Home', estimatedMinutes: 0 },
  { id: 'p2', name: 'Tech Park Office', address: 'SG Highway, Ahmedabad', category: 'Work', estimatedMinutes: 22 },
  { id: 'p3', name: 'Fitness Gym Center', address: 'Drive-in Road, Ahmedabad', category: 'Gym', estimatedMinutes: 10 },
  { id: 'p4', name: 'Roast Coffee House', address: 'Satellite, Ahmedabad', category: 'Cafe', estimatedMinutes: 12 },
];
