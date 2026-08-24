import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sun, 
  Moon, 
  CloudSun, 
  BatteryCharging, 
  Sparkles, 
  Clock, 
  Bell, 
  CheckCircle2, 
  Plus, 
  Zap, 
  PhoneCall, 
  Camera, 
  Music, 
  MessageSquare, 
  Calculator, 
  FileText, 
  HeartPulse, 
  Navigation, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Flame,
  Volume2,
  Filter,
  Layers,
  Activity
} from 'lucide-react';
import { UserProfile, WeatherData, Reminder, HabitGoal, QuickActionItem, SavedPlace, Routine } from '../types';
import { AvatarCompanion } from './AvatarCompanion';
import { 
  toggleNativeFlashlight, 
  openNativeWhatsApp, 
  triggerNativeAlarmOrCalendar, 
  triggerNativeCameraCapture 
} from '../utils/nativeBridge';

interface SmartDashboardProps {
  userProfile: UserProfile;
  weather: WeatherData;
  reminders: Reminder[];
  routines?: Routine[];
  habits: HabitGoal[];
  quickActions: QuickActionItem[];
  places: SavedPlace[];
  isSpeaking: boolean;
  isListening: boolean;
  onVoiceClick: () => void;
  onSelectAction: (actionItem: QuickActionItem) => void;
  onToggleReminder: (id: string) => void;
  onGenerateBriefing: (type: 'morning' | 'evening') => void;
  onApplyTimeShift?: (routineId: string, newTime: string) => void;
  onNavigateToScheduler?: () => void;
  onUpdateProfile?: (updated: Partial<UserProfile>) => void;
  briefingText: string;
  isBriefingLoading: boolean;
}

export const SmartDashboard: React.FC<SmartDashboardProps> = React.memo(({
  userProfile,
  weather,
  reminders,
  routines = [],
  habits,
  quickActions,
  places,
  isSpeaking,
  isListening,
  onVoiceClick,
  onSelectAction,
  onToggleReminder,
  onGenerateBriefing,
  onApplyTimeShift,
  onNavigateToScheduler,
  onUpdateProfile,
  briefingText,
  isBriefingLoading,
}) => {
  const [briefingTab, setBriefingTab] = useState<'morning' | 'evening'>('morning');
  const [flashActive, setFlashActive] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Category Collapsible Card States
  const [isNativeExpanded, setIsNativeExpanded] = useState(true);
  const [isShortcutsExpanded, setIsShortcutsExpanded] = useState(true);
  const [isUtilitiesExpanded, setIsUtilitiesExpanded] = useState(true);
  const [utilityCategory, setUtilityCategory] = useState<'all' | 'daily' | 'communication' | 'media' | 'health'>('all');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleFlashlightToggle = async () => {
    const newState = await toggleNativeFlashlight();
    setFlashActive(newState);
    showToast(newState ? 'Flashlight Enabled 🔦' : 'Flashlight Disabled 🔦');
  };

  const handleOpenWhatsApp = () => {
    openNativeWhatsApp('Hii Jaan! Sending message via DIGUU AI 💕');
    showToast('Launching WhatsApp... 💬');
  };

  const handleOpenAlarm = () => {
    triggerNativeAlarmOrCalendar('DIGUU Morning Alarm');
    showToast('Opening Android Clock / Alarm Intent ⏰');
  };

  const handleOpenCamera = () => {
    triggerNativeCameraCapture();
    showToast('Launching Camera Stream 📷');
  };

  // Quick action icon mapper
  const renderIcon = (name: string) => {
    switch (name) {
      case 'AlarmClock': return <Clock className="w-5 h-5 text-amber-400" />;
      case 'Bell': return <Bell className="w-5 h-5 text-pink-400" />;
      case 'PhoneCall': return <PhoneCall className="w-5 h-5 text-emerald-400" />;
      case 'CloudSun': return <CloudSun className="w-5 h-5 text-cyan-400" />;
      case 'Zap': return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'Music': return <Music className="w-5 h-5 text-purple-400" />;
      case 'MessageSquare': return <MessageSquare className="w-5 h-5 text-green-400" />;
      case 'HeartPulse': return <HeartPulse className="w-5 h-5 text-rose-400" />;
      case 'Camera': return <Camera className="w-5 h-5 text-indigo-400" />;
      case 'FileText': return <FileText className="w-5 h-5 text-orange-400" />;
      case 'Calculator': return <Calculator className="w-5 h-5 text-blue-400" />;
      case 'Navigation': return <Navigation className="w-5 h-5 text-teal-400" />;
      default: return <Sparkles className="w-5 h-5 text-pink-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-24 px-4 max-w-2xl mx-auto pt-2">
      {/* Top Main Avatar Companion Box */}
      <AvatarCompanion
        userProfile={userProfile}
        isSpeaking={isSpeaking}
        isListening={isListening}
        onVoiceClick={onVoiceClick}
      />

      {/* Weather & Battery Status Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Weather Card */}
        <div className="p-4 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1">Weather</span>
            <div className="text-2xl font-light text-white">{weather.temp}°C</div>
            <div className="text-xs text-cyan-400 font-medium mt-0.5">{weather.condition} • {weather.city}</div>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <CloudSun className="w-6 h-6" />
          </div>
        </div>

        {/* System & Battery Card */}
        <div className="p-4 rounded-3xl bg-slate-900/50 border border-slate-800 backdrop-blur-md flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold block mb-1">System</span>
            <div className="text-2xl font-light text-emerald-400">88% ⚡</div>
            <div className="text-xs text-slate-400 mt-0.5">Privacy Mode Active</div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <BatteryCharging className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 5-in-1 Real-Time Theme Quick Selector */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-4 backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              Theme Switcher
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-medium capitalize">
            Current: {userProfile.theme || 'jarvis'}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'jarvis', label: 'JARVIS', icon: '🤖', color: 'border-cyan-400 text-cyan-300' },
            { id: 'glass', label: 'Liquid Glass', icon: '💧', color: 'border-purple-400 text-purple-300' },
            { id: 'cyberpunk', label: 'Cyberpunk', icon: '⚡', color: 'border-pink-500 text-pink-400' },
            { id: 'ios', label: 'iOS Clean', icon: '📱', color: 'border-slate-300 text-slate-100' },
            { id: 'matrix', label: 'Matrix', icon: '💻', color: 'border-emerald-400 text-emerald-300' },
          ].map((themeItem) => {
            const active = userProfile.theme === themeItem.id;
            return (
              <button
                key={themeItem.id}
                onClick={() => onUpdateProfile && onUpdateProfile({ theme: themeItem.id as any })}
                className={`px-3 py-1.5 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  active
                    ? `bg-slate-800 ${themeItem.color} shadow-md ring-1 ring-cyan-500/50`
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span>{themeItem.icon}</span>
                <span>{themeItem.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Morning & Evening Briefing Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 backdrop-blur-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
              {briefingTab === 'morning' ? 'Morning Briefing' : 'Evening Summary'}
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => {
                setBriefingTab('morning');
                onGenerateBriefing('morning');
              }}
              className={`px-3 py-1 rounded-xl text-xs font-medium flex items-center gap-1 transition-all ${
                briefingTab === 'morning'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Morning</span>
            </button>

            <button
              onClick={() => {
                setBriefingTab('evening');
                onGenerateBriefing('evening');
              }}
              className={`px-3 py-1 rounded-xl text-xs font-medium flex items-center gap-1 transition-all ${
                briefingTab === 'evening'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Evening</span>
            </button>
          </div>
        </div>

        {isBriefingLoading ? (
          <div className="py-6 flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-indigo-300 font-medium">DIGUU is analyzing schedule & traffic...</span>
          </div>
        ) : (
          <div className="p-3.5 bg-slate-800/40 rounded-2xl border border-slate-800/80 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
            {briefingText || (
              briefingTab === 'morning'
                ? `☀️ Good Morning ${userProfile.nickname}!\n72° Sunny in ${weather.city}.\n\n💡 DIGUU Suggests: Leave in 15 mins for your product sync meeting. Traffic is increasing on main routes.\n\n📅 Agenda Highlights:\n• 10:00 AM — Product Sync\n• 02:30 PM — Health Checkup`
                : `🌙 Good Evening ${userProfile.nickname}!\nGreat job today! You completed 3 key tasks.\n\n💧 Hydration Status: 2.1L completed.\n🧘 Guided Breathing: Recommended before sleep for optimal rest.`
            )}
          </div>
        )}
      </div>

      {/* Smart Scheduler AI Recommendation Widget */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-3xl p-4 backdrop-blur-md shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">
              Smart Scheduler Alert
            </h3>
          </div>
          <button
            onClick={onNavigateToScheduler}
            className="text-[10px] font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Full Analysis</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <CloudSun className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100">
                Weather Shift: Gym & Fitness Routine
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Current: {weather.temp}°C {weather.condition} in {weather.city} • Peak heat at 07:00 PM
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (onApplyTimeShift && routines.length > 0) {
                const targetRoutine = routines.find(r => r.title.toLowerCase().includes('gym')) || routines[0];
                onApplyTimeShift(targetRoutine.id, '06:15 PM');
                setToastMsg('Shifted Gym Routine to 06:15 PM! 🕒');
                setTimeout(() => setToastMsg(null), 2500);
              } else if (onNavigateToScheduler) {
                onNavigateToScheduler();
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[11px] font-bold shadow-md hover:scale-105 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            Shift 06:15 PM
          </button>
        </div>
      </div>

      {/* Toast Feedback Notification */}
      {toastMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="p-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl text-white text-xs font-bold text-center shadow-lg border border-pink-400/40"
        >
          {toastMsg}
        </motion.div>
      )}

      {/* Direct Native Android Controls Bar (Collapsible Category Card) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 backdrop-blur-md shadow-lg transition-all">
        <button
          onClick={() => setIsNativeExpanded(!isNativeExpanded)}
          className="w-full flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-bold text-pink-400 uppercase tracking-widest">Native Android Controls</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Capacitor Bridge</span>
            {isNativeExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {isNativeExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-3"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Flashlight */}
              <motion.button
                onClick={handleFlashlightToggle}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  flashActive
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-950/60 border-slate-800 hover:border-amber-500/40 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Zap className={`w-5 h-5 ${flashActive ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800">
                    {flashActive ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold block">Flashlight</span>
                  <span className="text-[10px] text-slate-400 block">Camera Torch LED</span>
                </div>
              </motion.button>

              {/* WhatsApp Intent */}
              <motion.button
                onClick={handleOpenWhatsApp}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/40 text-left flex flex-col justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <MessageSquare className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                    Intent
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-slate-200 block">WhatsApp</span>
                  <span className="text-[10px] text-slate-400 block">Launch App Direct</span>
                </div>
              </motion.button>

              {/* Alarm & Clock */}
              <motion.button
                onClick={handleOpenAlarm}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-cyan-500/40 text-left flex flex-col justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <Clock className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                    Alarm
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-slate-200 block">Set Alarm</span>
                  <span className="text-[10px] text-slate-400 block">Clock Intent</span>
                </div>
              </motion.button>

              {/* Camera Capture */}
              <motion.button
                onClick={handleOpenCamera}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-purple-500/40 text-left flex flex-col justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <Camera className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                    Camera
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-slate-200 block">Camera</span>
                  <span className="text-[10px] text-slate-400 block">Live Feed Capture</span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Voice Quick Commands (Collapsible Category Card) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 backdrop-blur-md shadow-lg transition-all">
        <button
          onClick={() => setIsShortcutsExpanded(!isShortcutsExpanded)}
          className="w-full flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">
              Voice Shortcuts
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Hands-Free</span>
            {isShortcutsExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {isShortcutsExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-3"
          >
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.slice(0, 4).map((qa) => (
                <motion.button
                  key={qa.id}
                  onClick={() => onSelectAction(qa)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-left flex items-center gap-3 transition-all group cursor-pointer"
                >
                  <div className="p-2 rounded-xl bg-slate-800/80 group-hover:bg-indigo-500/20 text-indigo-400 transition-colors">
                    {renderIcon(qa.iconName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-slate-400 uppercase tracking-tighter block">{qa.label}</span>
                    <span className="text-xs text-white font-medium truncate block">"{qa.shortcut}"</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Smart Productivity Utilities (Expandable Categorized Cards Grid) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 backdrop-blur-md shadow-lg space-y-3">
        <button
          onClick={() => setIsUtilitiesExpanded(!isUtilitiesExpanded)}
          className="w-full flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
              Smart Productivity Utilities
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
              80+ Actions
            </span>
            {isUtilitiesExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {isUtilitiesExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 pt-1"
          >
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'all', label: 'All 80+' },
                { id: 'daily', label: 'Daily Tasks' },
                { id: 'communication', label: 'Communication' },
                { id: 'media', label: 'Media & Tools' },
                { id: 'health', label: 'Health & Travel' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setUtilityCategory(cat.id as any)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    utilityCategory === cat.id
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Grid of Actions matching selected category */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {quickActions
                .filter((item) => {
                  if (utilityCategory === 'all') return true;
                  if (utilityCategory === 'daily') return ['AlarmClock', 'Bell', 'FileText'].includes(item.iconName);
                  if (utilityCategory === 'communication') return ['PhoneCall', 'MessageSquare', 'Zap'].includes(item.iconName);
                  if (utilityCategory === 'media') return ['Camera', 'Music', 'Calculator'].includes(item.iconName);
                  if (utilityCategory === 'health') return ['CloudSun', 'HeartPulse', 'Navigation'].includes(item.iconName);
                  return true;
                })
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelectAction(item)}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-800/60 transition-all flex flex-col items-center justify-center text-center gap-2 group shadow-sm cursor-pointer active:scale-95"
                  >
                    <div className="p-2 rounded-xl bg-slate-800/80 group-hover:scale-110 transition-transform">
                      {renderIcon(item.iconName)}
                    </div>
                    <span className="text-[11px] font-semibold text-slate-200 line-clamp-1">{item.label}</span>
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Wellness & Hydration Goal Block */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-4">
        <h3 className="text-xs font-bold text-rose-400 uppercase tracking-widest">Wellness Center</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-2xl border border-slate-800">
            <div className="w-9 h-9 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 text-lg">💧</div>
            <div className="flex-1">
              <p className="text-xs text-white font-medium">Hydration Goal</p>
              <p className="text-[10px] text-slate-400">Last: 45m ago • Goal: 2.5L</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-2xl border border-slate-800">
            <div className="w-9 h-9 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 text-lg">🧘</div>
            <div className="flex-1">
              <p className="text-xs text-white font-medium">Guided Breathing</p>
              <p className="text-[10px] text-slate-400">Recommended after work</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Reminders */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">Scheduled Reminders</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {reminders.filter(r => !r.completed).length} Pending
          </span>
        </div>

        <div className="space-y-2">
          {reminders.map((r) => (
            <div
              key={r.id}
              className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                r.completed
                  ? 'bg-slate-950/40 border-slate-800/50 opacity-60'
                  : 'bg-slate-800/30 border-slate-800 hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onToggleReminder(r.id)}
                  className={`p-1 rounded-full transition-colors ${
                    r.completed ? 'text-emerald-400' : 'text-slate-500 hover:text-cyan-400'
                  }`}
                >
                  <CheckCircle2 className={`w-5 h-5 ${r.completed ? 'fill-emerald-400/20' : ''}`} />
                </button>
                <div>
                  <div className={`text-xs font-medium ${r.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {r.title}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {r.date} • {r.time} ({r.category})
                  </div>
                </div>
              </div>

              <span className="text-[10px] text-indigo-300 font-medium px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                {r.soundName || 'Default'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Goal Tracking */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest">Goal Tracking</h3>
          <span className="text-[10px] text-cyan-400 font-semibold">Active Streaks 🔥</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {habits.slice(0, 4).map((h) => (
            <div key={h.id} className="p-3.5 rounded-2xl bg-slate-800/30 border border-slate-800">
              <div className="text-xs font-medium text-slate-200">{h.title}</div>
              <div className="w-full bg-slate-700/60 h-1.5 rounded-full mt-2.5">
                <div className="bg-cyan-400 h-1.5 rounded-full w-3/4 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
              </div>
              <div className="flex items-center justify-between mt-2 text-[10px]">
                <span className="text-slate-400">Streak: {h.currentStreak}d</span>
                <span className="text-cyan-400 font-semibold">75% Complete</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

SmartDashboard.displayName = 'SmartDashboard';

