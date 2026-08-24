import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Palette, 
  Mic, 
  ShieldCheck, 
  Sliders, 
  Smartphone, 
  Laptop, 
  Watch, 
  Home as HomeIcon, 
  Check, 
  Heart, 
  Instagram, 
  Youtube, 
  Github, 
  Twitter,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  Send,
  Bot,
  BellRing,
  Filter,
  CheckCircle,
  Clock,
  Key,
  Eye,
  EyeOff,
  Lock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { UserProfile, AppPermissions, WhatsAppAutoReplyLog } from '../types';
import { openSpecialSystemSettings, generateWhatsAppAIReply, openNativeAppSettings } from '../utils/nativeBridge';

import avatarMain from '../assets/images/diguu_avatar_main_1785882815230.jpg';
import avatarWink from '../assets/images/diguu_avatar_wink_1785882896630.jpg';

interface CustomizationViewProps {
  userProfile: UserProfile;
  permissions: AppPermissions;
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onTogglePermission: (key: keyof AppPermissions) => void;
}

export const CustomizationView: React.FC<CustomizationViewProps> = React.memo(({
  userProfile,
  permissions,
  onUpdateProfile,
  onTogglePermission,
}) => {
  // Gemini API Key Local Storage State
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user_gemini_api_key') || '';
    }
    return '';
  });
  const [savedApiKey, setSavedApiKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('user_gemini_api_key') || '';
    }
    return '';
  });
  const [keyShowPassword, setKeyShowPassword] = useState(false);
  const [keySaveSuccess, setKeySaveSuccess] = useState(false);

  const handleSaveApiKey = () => {
    const trimmed = apiKeyInput.trim();
    if (typeof window !== 'undefined') {
      if (trimmed) {
        localStorage.setItem('user_gemini_api_key', trimmed);
        setSavedApiKey(trimmed);
      } else {
        localStorage.removeItem('user_gemini_api_key');
        setSavedApiKey('');
      }
    }
    setKeySaveSuccess(true);
    setTimeout(() => setKeySaveSuccess(false), 3000);
  };

  const handleClearApiKey = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user_gemini_api_key');
    }
    setApiKeyInput('');
    setSavedApiKey('');
    setKeySaveSuccess(true);
    setTimeout(() => setKeySaveSuccess(false), 3000);
  };

  const [simSender, setSimSender] = useState('Aarav');
  const [simMessage, setSimMessage] = useState('Bhai shaam ko milenge kya? Important kaam hai!');
  const [simLoading, setSimLoading] = useState(false);
  const [simReply, setSimReply] = useState<string | null>(null);
  const [replyLogs, setReplyLogs] = useState<WhatsAppAutoReplyLog[]>([
    {
      id: 'log-1',
      sender: 'Priya',
      incomingMessage: 'Khana khaya aapne? Meeting kab khatam hogi?',
      aiResponse: `Hii Priya! ${userProfile.name || 'Tarun'} is currently in a meeting. Will message you right after! 💕`,
      timestamp: '10:42 AM',
      rule: 'contacts_only',
      status: 'sent',
    },
  ]);

  const handleRunSimulator = async () => {
    if (!simMessage.trim()) return;
    setSimLoading(true);
    setSimReply(null);
    try {
      const generated = await generateWhatsAppAIReply(
        simSender || 'Friend',
        simMessage,
        userProfile.name || 'Tarun',
        userProfile.languageMode || 'hinglish',
        userProfile.whatsappAutoReplyRule || 'all',
        userProfile.whatsappCustomContacts || ''
      );
      setSimReply(generated);

      const newLog: WhatsAppAutoReplyLog = {
        id: `log-${Date.now()}`,
        sender: simSender || 'Contact',
        incomingMessage: simMessage,
        aiResponse: generated,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rule: userProfile.whatsappAutoReplyRule || 'all',
        status: 'simulated',
      };
      setReplyLogs((prev) => [newLog, ...prev.slice(0, 5)]);
    } catch (e) {
      console.error('Simulator error:', e);
    } finally {
      setSimLoading(false);
    }
  };

  const outfits = [
    'Pink Sweats & Bow 🎀',
    'Cyberpunk Neon Jacket ⚡',
    'Soft Sunset Hoodie 🌅',
    'Elegant Floral Kurti 🌸',
  ];

  const personalities = [
    { name: 'Warm Bestie', desc: 'Loving, affectionate, caring ("Hii Jaan 💕")' },
    { name: 'Professional AI', desc: 'Formal, precise, fast & structured' },
    { name: 'Chill Buddy', desc: 'Casual, funny, relaxed & humorous' },
    { name: 'Guru Coach', desc: 'Motivational, health-focused & structured' },
  ];

  const haloColors = [
    { name: 'Cyber Pink', color: '#ec4899' },
    { name: 'Neon Cyan', color: '#38bdf8' },
    { name: 'Royal Purple', color: '#a855f7' },
    { name: 'Sunset Gold', color: '#eab308' },
  ];

  const permissionItems: { key: keyof AppPermissions; label: string; desc: string }[] = [
    { key: 'microphone', label: 'Microphone Access', desc: 'For real-time voice commands and speech conversation' },
    { key: 'storage', label: 'Storage & Media', desc: 'For saving AI generated images and notes' },
    { key: 'camera', label: 'Camera Access', desc: 'For photo capture and visual AI queries' },
    { key: 'location', label: 'Location Access', desc: 'For weather updates and travel navigation time' },
    { key: 'contacts', label: 'Contacts Access', desc: 'For calling and sending messages to friends/family' },
    { key: 'calendar', label: 'Calendar Access', desc: 'For scheduling reminders and morning briefings' },
    { key: 'notifications', label: 'Notifications', desc: 'For proactive briefings, alarms, and alerts' },
  ];

  const [openSections, setOpenSections] = useState({
    identity: true,
    apikey: true,
    voice: true,
    whatsapp: true,
  });

  const toggleSection = (section: 'identity' | 'apikey' | 'voice' | 'whatsapp') => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="space-y-4 pb-28 px-2 sm:px-4 max-w-2xl mx-auto pt-2">
      {/* ==========================================
          ACCORDION 1: CUSTOM USER IDENTITY & AVATAR
         ========================================== */}
      <div className="rounded-3xl bg-slate-900/90 border border-indigo-500/30 shadow-xl overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('identity')}
          className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <User className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Section 1: Custom User Identity</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  {userProfile.name || 'Tarun'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Set user name, relationship style, avatar & neon glow</p>
            </div>
          </div>
          {openSections.identity ? <ChevronUp className="w-5 h-5 text-indigo-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSections.identity && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 pt-0 border-t border-slate-800/80 space-y-4"
          >
            {/* User Name Input */}
            <div className="space-y-1.5 pt-3">
              <label className="text-xs font-bold text-slate-300">Your Name (How DIGUU Addresses You)</label>
              <div className="relative">
                <input
                  type="text"
                  value={userProfile.name || ''}
                  onChange={(e) => onUpdateProfile({ name: e.target.value, nickname: e.target.value })}
                  placeholder="Enter your name (e.g. Tarun)"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <Sparkles className="w-4 h-4 text-indigo-400 absolute right-3.5 top-3 pointer-events-none" />
              </div>
              <p className="text-[11px] text-indigo-300/80">
                DIGUU AI will directly speak to you using this name in every response (e.g. "Hii {userProfile.name || 'Tarun'} 💕").
              </p>
            </div>

            {/* Companion Relationship Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Companion Relationship Style</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'Girlfriend 💕', label: 'Girlfriend 💕', desc: 'Cute, loving & playful' },
                  { id: 'Best Friend', label: 'Best Friend 🤝', desc: 'Supportive & candid' },
                  { id: 'Personal Assistant', label: 'Assistant 💼', desc: 'Professional & fast' },
                  { id: 'Bro / Mentor', label: 'Bro / Mentor 🚀', desc: 'Direct & motivating' },
                ].map((rel) => (
                  <button
                    key={rel.id}
                    type="button"
                    onClick={() => onUpdateProfile({ relationshipMode: rel.id as any })}
                    className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                      userProfile.relationshipMode === rel.id
                        ? 'bg-pink-500/20 border-pink-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold text-pink-300">{rel.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{rel.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Avatar Pose Variant */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Avatar Pose Variant</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onUpdateProfile({ avatarVariant: 'main' })}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                    userProfile.avatarVariant === 'main'
                      ? 'bg-pink-500/10 border-pink-500 shadow-md ring-1 ring-pink-500'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <img src={avatarMain} alt="Main Avatar" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-100">Main Companion</div>
                    <div className="text-[10px] text-pink-300">Warm & Smiling</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateProfile({ avatarVariant: 'wink' })}
                  className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                    userProfile.avatarVariant === 'wink'
                      ? 'bg-pink-500/10 border-pink-500 shadow-md ring-1 ring-pink-500'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <img src={avatarWink} alt="Wink Avatar" referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover" />
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-100">Playful Wink</div>
                    <div className="text-[10px] text-pink-300">Winking 💕</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Outfit Style */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Avatar Outfit Style</label>
              <div className="grid grid-cols-2 gap-2">
                {outfits.map((outfit) => (
                  <button
                    key={outfit}
                    type="button"
                    onClick={() => onUpdateProfile({ avatarOutfit: outfit })}
                    className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all cursor-pointer ${
                      userProfile.avatarOutfit === outfit
                        ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {outfit}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic 5-in-1 Theme Switcher System */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Dynamic 5-in-1 Theme Switcher System</span>
                <span className="text-[10px] text-cyan-400 font-semibold uppercase">Real-Time Canvas Theme</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    id: 'jarvis',
                    name: 'JARVIS Dark Futuristic',
                    icon: '🤖',
                    border: 'border-cyan-400/80',
                    badgeBg: 'bg-cyan-500/20 text-cyan-300',
                    desc: 'Pure Dark Navy (#0B0F19) with glowing Cyan & Purple accents',
                  },
                  {
                    id: 'glass',
                    name: 'Liquid Glass UI',
                    icon: '💧',
                    border: 'border-purple-400/80',
                    badgeBg: 'bg-purple-500/20 text-purple-300',
                    desc: 'Glassmorphism blur (25px), frosted cards & plasma visualizer',
                  },
                  {
                    id: 'cyberpunk',
                    name: 'Cyberpunk Neon',
                    icon: '⚡',
                    border: 'border-pink-500/80',
                    badgeBg: 'bg-pink-500/20 text-pink-300',
                    desc: 'Obsidian Black (#05050A) with electric pink & neon yellow',
                  },
                  {
                    id: 'ios',
                    name: 'Minimalist iOS Clean',
                    icon: '📱',
                    border: 'border-slate-400/80',
                    badgeBg: 'bg-slate-500/20 text-slate-200',
                    desc: 'Dark Graphite (#1C1C1E) with smooth monochrome glass cards',
                  },
                  {
                    id: 'matrix',
                    name: 'Retro Matrix Green',
                    icon: '💻',
                    border: 'border-emerald-500/80',
                    badgeBg: 'bg-emerald-500/20 text-emerald-300',
                    desc: 'Terminal Black (#020b04) with phosphor green hacker HUD',
                  },
                ].map((t) => {
                  const isSelected = userProfile.theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onUpdateProfile({ theme: t.id as any })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? `bg-slate-900 ${t.border} shadow-lg ring-1 ring-cyan-500/40`
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          <span>{t.icon}</span>
                          <span>{t.name}</span>
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ==========================================
          ACCORDION 2: GEMINI API KEY SETUP
         ========================================== */}
      <div className="rounded-3xl bg-slate-900/90 border border-violet-500/30 shadow-xl overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('apikey')}
          className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/15 text-violet-400 border border-violet-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Section 2: Gemini API Key Setup</span>
                {savedApiKey ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    Custom Key Active
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    Default Key Active
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">Save custom API key in LocalStorage for unlimited quota</p>
            </div>
          </div>
          {openSections.apikey ? <ChevronUp className="w-5 h-5 text-violet-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSections.apikey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 pt-0 border-t border-slate-800/80 space-y-3.5"
          >
            <div className="space-y-2 pt-3">
              <label className="text-xs font-bold text-slate-300">Gemini API Key (Saved in LocalStorage)</label>
              <div className="relative">
                <input
                  type={keyShowPassword ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter custom Gemini API Key (e.g. AIzaSy...)"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-violet-500 font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setKeyShowPassword(!keyShowPassword)}
                  className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  title={keyShowPassword ? 'Hide Key' : 'Show Key'}
                >
                  {keyShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                <div className="text-[11px] text-slate-400">
                  {savedApiKey ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Key ending in ...{savedApiKey.slice(-4)} active in LocalStorage
                    </span>
                  ) : (
                    <span>No custom key set. Using standard process.env key.</span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {savedApiKey && (
                    <button
                      type="button"
                      onClick={handleClearApiKey}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Clear Key
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Save Key</span>
                  </button>
                </div>
              </div>

              {keySaveSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold text-center"
                >
                  ✓ Custom Gemini API Key saved to LocalStorage! Authorization header enabled.
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* ==========================================
          ACCORDION 4: WHATSAPP AGENT & PERMISSIONS
         ========================================== */}
      <div className="rounded-3xl bg-slate-900/90 border border-emerald-500/30 shadow-xl overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('whatsapp')}
          className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Section 4: WhatsApp AI Agent & System Permissions</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  userProfile.whatsappAutoReplyEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {userProfile.whatsappAutoReplyEnabled ? 'Agent Active 🟢' : 'Agent Paused ⏸️'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Auto-reply rules, live simulator, logs & system permissions</p>
            </div>
          </div>
          {openSections.whatsapp ? <ChevronUp className="w-5 h-5 text-emerald-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSections.whatsapp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 pt-0 border-t border-slate-800/80 space-y-4"
          >
            {/* Master Toggle & Grant Button */}
            <div className="flex items-center justify-between pt-3">
              <div>
                <h4 className="text-xs font-bold text-slate-200">WhatsApp AI Auto-Reply Switch</h4>
                <p className="text-[10px] text-slate-400">Respond in voice of {userProfile.name || 'Tarun'}</p>
              </div>

              <button
                type="button"
                onClick={() => onUpdateProfile({ whatsappAutoReplyEnabled: !userProfile.whatsappAutoReplyEnabled })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  userProfile.whatsappAutoReplyEnabled ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    userProfile.whatsappAutoReplyEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Android Notification Listener Permission Button */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-300 block">Notification Listener Service</span>
                <span className="text-[10px] text-slate-400 block">Required for reading incoming WhatsApp alerts</span>
              </div>
              <button
                type="button"
                onClick={() => openSpecialSystemSettings('notification_listener')}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Grant Access</span>
              </button>
            </div>

            {/* Auto-Reply Rules Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                <span>Auto-Reply Response Rules</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'all', label: '🌐 All Messages', desc: 'Reply to every incoming WhatsApp text' },
                  { id: 'contacts_only', label: '👥 Saved Contacts', desc: 'Reply only to known saved numbers' },
                  { id: 'busy_mode', label: '🌙 Busy / DND Mode', desc: 'Reply when busy or in focus mode' },
                  { id: 'custom_list', label: '📝 Custom List', desc: 'Filter specific target contact names' },
                ].map((ruleItem) => (
                  <button
                    key={ruleItem.id}
                    type="button"
                    onClick={() => onUpdateProfile({ whatsappAutoReplyRule: ruleItem.id as any })}
                    className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      (userProfile.whatsappAutoReplyRule || 'all') === ruleItem.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-slate-100 ring-1 ring-emerald-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-emerald-300 flex items-center justify-between">
                      <span>{ruleItem.label}</span>
                      {(userProfile.whatsappAutoReplyRule || 'all') === ruleItem.id && (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{ruleItem.desc}</div>
                  </button>
                ))}
              </div>

              {/* Custom Contacts List Input */}
              {(userProfile.whatsappAutoReplyRule === 'custom_list') && (
                <div className="mt-2 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300">Allowed Contact Names (Comma Separated)</label>
                  <input
                    type="text"
                    value={userProfile.whatsappCustomContacts || ''}
                    onChange={(e) => onUpdateProfile({ whatsappCustomContacts: e.target.value })}
                    placeholder="e.g. Aarav, Mom, Priya, Rahul"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Live Simulator & Tester */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <span>Test AI WhatsApp Auto-Reply</span>
                </span>
                <span className="text-[10px] text-slate-400">Gemini 3.6 Flash Engine</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={simSender}
                  onChange={(e) => setSimSender(e.target.value)}
                  placeholder="Sender Name"
                  className="col-span-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  placeholder="Test WhatsApp Message..."
                  className="col-span-2 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="button"
                onClick={handleRunSimulator}
                disabled={simLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {simLoading ? (
                  <span>Generating AI Reply...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Simulate WhatsApp Notification & Generate Reply</span>
                  </>
                )}
              </button>

              {/* Generated Reply Preview Box */}
              {simReply && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px] text-emerald-300 font-bold">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>AI Generated WhatsApp Reply:</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/30 px-2 py-0.5 rounded-full text-emerald-200">
                      RemoteInput Sent
                    </span>
                  </div>
                  <p className="text-xs text-slate-100 font-medium italic">"{simReply}"</p>
                </motion.div>
              )}

              {/* History Logs */}
              {replyLogs.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-900">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span>Recent Auto-Replies Log</span>
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {replyLogs.map((log) => (
                      <div key={log.id} className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between text-slate-300">
                          <span className="font-bold text-emerald-300">{log.sender}</span>
                          <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                        </div>
                        <p className="text-slate-400 line-clamp-1">In: "{log.incomingMessage}"</p>
                        <p className="text-slate-200 font-semibold line-clamp-1 text-emerald-200">Out: "{log.aiResponse}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* System Permissions Control Grid */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>System Permissions Control Center</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-bold uppercase">100% User Control</span>
              </div>

              <div className="space-y-1.5">
                {permissionItems.map((item) => (
                  <div
                    key={item.key}
                    className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                        <span>{item.label}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          permissions[item.key]
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {permissions[item.key] ? 'Granted ✓' : 'Denied'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">{item.desc}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onTogglePermission(item.key)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                        permissions[item.key] ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      <Check className="w-4 h-4 font-black" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => openNativeAppSettings()}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Open Android App Info & Permissions Settings</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>



      {/* ==========================================
          ACCORDION 3: VOICE & ACCENT EXPERIENCE
         ========================================== */}
      <div className="rounded-3xl bg-slate-900/90 border border-purple-500/30 shadow-xl overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('voice')}
          className="w-full p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Mic className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Section 3: Voice & Accent Customization</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 uppercase">
                  {userProfile.voiceGender || 'female'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Voice gender switcher, language accents & speech speed</p>
            </div>
          </div>
          {openSections.voice ? <ChevronUp className="w-5 h-5 text-purple-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>

        {openSections.voice && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 pt-0 border-t border-slate-800/80 space-y-4"
          >
            {/* Voice Gender Toggle Switcher */}
            <div className="space-y-2 pt-3">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Voice Gender Switcher</span>
                <span className="text-[10px] text-pink-400 font-semibold uppercase">Dynamic TTS Allocation</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateProfile({ voiceGender: 'female', voiceStyle: 'Kore' })}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    userProfile.voiceGender === 'female'
                      ? 'bg-gradient-to-r from-pink-500/20 to-purple-500/20 border-pink-500 text-slate-100 shadow-md ring-1 ring-pink-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-pink-300">Female Voice 👩</span>
                    {userProfile.voiceGender === 'female' && <Check className="w-4 h-4 text-pink-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    hi-IN-Wavenet-A / gu-IN-Wavenet-A (Cute & Sweet)
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateProfile({ voiceGender: 'male', voiceStyle: 'Puck' })}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    userProfile.voiceGender === 'male'
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500 text-slate-100 shadow-md ring-1 ring-cyan-500/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300">Male Voice 👨</span>
                    {userProfile.voiceGender === 'male' && <Check className="w-4 h-4 text-cyan-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    hi-IN-Wavenet-B / gu-IN-Wavenet-B (Warm & Deep)
                  </div>
                </button>
              </div>
            </div>

            {/* Language & Accent Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Language & Accent Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'gujarati', label: 'ગુજરાતી (Gujarati GF)', desc: 'Real Gujarati cute sweet voice' },
                  { id: 'hindi', label: 'हिंदी (Desi GF)', desc: 'Natural Hindi cute girlfriend tone' },
                  { id: 'hinglish', label: 'Hinglish (Bestie)', desc: 'Playful Indian Hinglish' },
                  { id: 'english', label: 'English (US/UK)', desc: 'Natural sweet English' },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => onUpdateProfile({ languageMode: lang.id as any })}
                    className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                      userProfile.languageMode === lang.id
                        ? 'bg-indigo-500/20 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold text-indigo-300">{lang.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{lang.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Personality Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">AI Persona Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {personalities.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => onUpdateProfile({ personality: p.name as any })}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      userProfile.personality === p.name
                        ? 'bg-pink-500/15 border-pink-500 text-slate-100 shadow-md'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold text-pink-300">{p.name}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Voice Style Preset */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Voice Tone Style Preset</label>
              <div className="flex gap-2">
                {['Kore (Warm Female)', 'Zephyr (Soft Female)', 'Puck (Energetic)'].map((vName) => {
                  const code = vName.split(' ')[0] as any;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => onUpdateProfile({ voiceStyle: code })}
                      className={`flex-1 py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                        userProfile.voiceStyle === code
                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {code}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pitch & Rate Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Pitch Slider */}
              <div className="space-y-1 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                  <span>Voice Pitch</span>
                  <span className="text-cyan-300 font-bold">{(userProfile.voicePitch || 1.0).toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.2"
                  step="0.05"
                  value={userProfile.voicePitch || 1.0}
                  onChange={(e) => onUpdateProfile({ voicePitch: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Deep Pitch (0.8x)</span>
                  <span>Cute Pitch (1.2x)</span>
                </div>
              </div>

              {/* Speed / Rate Slider */}
              <div className="space-y-1 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                  <span>Speech Rate / Speed</span>
                  <span className="text-pink-300 font-bold">{userProfile.voiceSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="1.3"
                  step="0.05"
                  value={userProfile.voiceSpeed}
                  onChange={(e) => onUpdateProfile({ voiceSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-pink-500 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500">
                  <span>Relaxed (0.8x)</span>
                  <span>Fast (1.3x)</span>
                </div>
              </div>
            </div>

            {/* Voice Synthesis Engine Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-300">Human Voice Synthesis Engine</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateProfile({ voiceEngine: 'server_ai' })}
                  className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                    userProfile.voiceEngine !== 'natural_webspeech'
                      ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold text-purple-300">Server AI Engine 🎙️</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Google Cloud & Gemini Multilingual Audio</div>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateProfile({ voiceEngine: 'natural_webspeech' })}
                  className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer ${
                    userProfile.voiceEngine === 'natural_webspeech'
                      ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border-cyan-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="text-xs font-bold text-cyan-300">Natural WebSpeech 🗣️</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Offline-capable Android Native Voices</div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>



      {/* 4. DEVELOPER PROFILE CARD */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-pink-500/30 shadow-2xl text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 p-0.5 shadow-lg flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center font-bold text-pink-300 text-lg">
            RT
          </div>
        </div>

        <div>
          <div className="flex items-center justify-center gap-1.5">
            <h3 className="text-base font-bold text-slate-100">Rohit Tarun</h3>
            <CheckCircle2 className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
          </div>
          <p className="text-xs text-pink-300 font-medium">Creator & Lead Developer of DIGUU AI</p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-1">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-900 text-pink-400 hover:bg-pink-500/20 transition-colors">
            <Instagram className="w-4 h-4" />
          </a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-900 text-rose-400 hover:bg-rose-500/20 transition-colors">
            <Youtube className="w-4 h-4" />
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-900 text-slate-200 hover:bg-slate-800 transition-colors">
            <Github className="w-4 h-4" />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-slate-900 text-cyan-400 hover:bg-cyan-500/20 transition-colors">
            <Twitter className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* 5. FUTURE EXPANSION ROADMAP */}
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
        <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Future Expansion Roadmap</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-left">
            <Laptop className="w-4 h-4 text-purple-400 mb-1" />
            <div className="text-xs font-bold text-slate-200">Desktop Companion</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Mac & Windows Overlay</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-left">
            <Watch className="w-4 h-4 text-pink-400 mb-1" />
            <div className="text-xs font-bold text-slate-200">Smartwatch App</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Wear OS & Apple Watch</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-left">
            <HomeIcon className="w-4 h-4 text-cyan-400 mb-1" />
            <div className="text-xs font-bold text-slate-200">Smart Home IoT</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Lights, Thermostats, Locks</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-left">
            <Smartphone className="w-4 h-4 text-emerald-400 mb-1" />
            <div className="text-xs font-bold text-slate-200">Plugin Ecosystem</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Custom Voice Actions</div>
          </div>
        </div>
      </div>
    </div>
  );
});

CustomizationView.displayName = 'CustomizationView';

