import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  initialUserProfile, 
  initialMemories, 
  initialRoutines, 
  initialReminders, 
  initialNotes, 
  initialHabits, 
  initialPermissions, 
  initialQuickActions, 
  initialWeather, 
  initialPlaces 
} from './data/initialData';
import { 
  UserProfile, 
  MemoryItem, 
  Routine, 
  Reminder, 
  Note, 
  HabitGoal, 
  AppPermissions, 
  QuickActionItem, 
  ChatMessage 
} from './types';
import { getApiHeaders } from './utils/apiUtils';

import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { SmartDashboard } from './components/SmartDashboard';
import { ChatView } from './components/ChatView';
import { MemoryAndRoutinesView } from './components/MemoryAndRoutinesView';
import { CreativitySuiteView } from './components/CreativitySuiteView';
import { CustomizationView } from './components/CustomizationView';
import { PermissionsModal } from './components/PermissionsModal';
import { QuickActionsModal } from './components/QuickActionsModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { 
  checkNativePermissions, 
  requestSingleNativePermission, 
  openNativeAppSettings 
} from './utils/nativeBridge';

import { 
  detectTextLanguage, 
  cleanTextForSpeech, 
  getPersonaVoiceSettings 
} from './utils/languageUtils';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  // Core App States with LocalStorage Persistence
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('diguu_user_profile_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse user profile from localStorage:', e);
    }
    return initialUserProfile;
  });

  const [memories, setMemories] = useState<MemoryItem[]>(initialMemories);
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines);
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [habits] = useState<HabitGoal[]>(initialHabits);
  const [permissions, setPermissions] = useState<AppPermissions>(initialPermissions);
  const [quickActions] = useState<QuickActionItem[]>(initialQuickActions);
  const [weather] = useState(initialWeather);
  const [places] = useState(initialPlaces);

  // Sync profile & theme to localStorage & DOM data-theme attribute
  useEffect(() => {
    try {
      localStorage.setItem('diguu_user_profile_v1', JSON.stringify(userProfile));
      const activeTheme = userProfile.theme || 'jarvis';
      document.documentElement.setAttribute('data-theme', activeTheme);
      document.body.setAttribute('data-theme', activeTheme);
      localStorage.setItem('diguu_app_theme', activeTheme);
    } catch (e) {
      console.warn('Failed to save profile or theme to localStorage:', e);
    }
  }, [userProfile]);

  // Synchronize every toggle with actual Android permission state on startup & resume
  useEffect(() => {
    const syncPermissions = () => {
      checkNativePermissions().then((realStates) => {
        setPermissions(realStates);
      });
    };

    syncPermissions();

    window.addEventListener('focus', syncPermissions);
    document.addEventListener('visibilitychange', syncPermissions);

    return () => {
      window.removeEventListener('focus', syncPermissions);
      document.removeEventListener('visibilitychange', syncPermissions);
    };
  }, []);

  // Chat & Voice States with LocalStorage
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('diguu_chat_messages_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse chat messages from localStorage:', e);
    }
    return [
      {
        id: 'msg-0',
        sender: 'diguu',
        text: `Hii ${initialUserProfile.nickname} 💕! Main DIGUU AI hoon, aapki cute & caring girlfriend! Bolo mere babu, aaj aapke liye kya karun? (Kem cho Jaan! 💖)`,
        timestamp: 'Just now',
      },
    ];
  });

  // Sync chat messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('diguu_chat_messages_v1', JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save chat messages to localStorage:', e);
    }
  }, [messages]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Briefing States
  const [briefingText, setBriefingText] = useState('');
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  // Modals
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [selectedQuickAction, setSelectedQuickAction] = useState<QuickActionItem | null>(null);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  // Memory leak prevention cleanup effect on unmount
  useEffect(() => {
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  const fallbackWebSpeech = useCallback((cleanedText: string) => {
    if (!('speechSynthesis' in window)) {
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    const langInfo = detectTextLanguage(cleanedText, userProfile.languageMode);
    utterance.lang = langInfo.bcp47Tag;

    const personaSettings = getPersonaVoiceSettings(userProfile.personality, userProfile.voiceSpeed || 1.0, userProfile.voiceGender || 'male');
    utterance.pitch = personaSettings.pitch;
    utterance.rate = personaSettings.rate;

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice: SpeechSynthesisVoice | null = null;

    if (langInfo.detectedLang === 'gujarati') {
      selectedVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith('gu') || 
        v.name.toLowerCase().includes('gujarati') || 
        v.name.includes('ગુજરાતી')
      ) || null;
      if (!selectedVoice) {
        selectedVoice = voices.find(v => 
          v.lang.toLowerCase().startsWith('hi') || 
          v.name.toLowerCase().includes('hindi')
        ) || null;
      }
    } else if (langInfo.detectedLang === 'hindi' || langInfo.detectedLang === 'hinglish') {
      selectedVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith('hi') || 
        v.name.toLowerCase().includes('hindi')
      ) || null;
    }

    // Default fallback to Indian English voice before any standard system voice
    if (!selectedVoice) {
      selectedVoice = voices.find(v => 
        v.lang.toLowerCase().includes('en-in') || 
        v.name.toLowerCase().includes('india') || 
        v.name.toLowerCase().includes('hindi')
      ) || null;
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [userProfile.languageMode, userProfile.personality, userProfile.voiceSpeed, userProfile.voiceGender]);

  // Natural Audio Speech Helper using Server-Side TTS Engine & HTML5 Audio
  const speakText = useCallback(async (text: string) => {
    if (!text) return;

    // Stop previous playing audio or browser speech
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const cleanedText = cleanTextForSpeech(text);
    if (!cleanedText) return;

    setIsSpeaking(true);

    try {
      // Call Server-Side Multilingual Audio Endpoint
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          text: cleanedText,
          languageMode: userProfile.languageMode,
          personality: userProfile.personality,
          voiceGender: userProfile.voiceGender || 'male',
          voiceStyle: userProfile.voiceStyle || 'Puck',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audio.playbackRate = userProfile.voiceSpeed || 1.0;
          activeAudioRef.current = audio;

          audio.onended = () => {
            setIsSpeaking(false);
            activeAudioRef.current = null;
          };
          audio.onerror = () => {
            console.warn('Audio playback error, falling back to WebSpeech');
            fallbackWebSpeech(cleanedText);
          };

          await audio.play();
          return;
        }
      }
    } catch (err) {
      console.warn('Server TTS fetch failed, resorting to client fallback:', err);
    }

    // Client-side WebSpeech fallback if server audio is unreachable
    fallbackWebSpeech(cleanedText);
  }, [userProfile.languageMode, userProfile.personality, userProfile.voiceGender, userProfile.voiceStyle, userProfile.voiceSpeed, fallbackWebSpeech]);

  // Pre-fetch Speech Synthesis Voices on App Mount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Main DIGUU Chat Communication handler
  const handleSendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          message: text,
          history: messages,
          userProfile,
          memories,
          personality: userProfile.personality,
          languageMode: userProfile.languageMode,
        }),
      });

      const data = await response.json();
      const aiResponseText = data.text || (data.error ? `⚠️ API Error: ${data.error}` : 'Main aapke saath hoon 💕');

      // Check if response triggered an action
      let actionTag = undefined;
      if (text.toLowerCase().includes('reminder') || text.toLowerCase().includes('yaad')) {
        actionTag = 'ACTION: REMINDER_SET 🔔';
      } else if (text.toLowerCase().includes('weather')) {
        actionTag = 'ACTION: WEATHER_CHECK ☀️';
      } else if (text.toLowerCase().includes('flashlight')) {
        actionTag = 'ACTION: FLASHLIGHT_TOGGLE 🔦';
      } else if (text.toLowerCase().includes('music')) {
        actionTag = 'ACTION: MUSIC_PLAYING 🎵';
      }

      const diguuMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'diguu',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionTag,
      };

      setMessages((prev) => [...prev, diguuMsg]);
      speakText(aiResponseText);
    } catch (err: any) {
      console.error('Error sending message:', err);
      const errorMsgText = `⚠️ API Connection Error: ${err?.message || 'Failed to reach backend server'}`;
      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'diguu',
        text: errorMsgText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsChatLoading(false);
    }
  }, [messages, userProfile, memories, speakText]);

  // Web Speech Recognition for Voice Input
  const startVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = userProfile.languageMode === 'gujarati' 
        ? 'gu-IN' 
        : (userProfile.languageMode === 'hindi' || userProfile.languageMode === 'hinglish')
        ? 'hi-IN' 
        : 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };
      recognition.onerror = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          handleSendMessage(transcript);
        }
      };

      try {
        recognition.start();
      } catch (e) {
        console.warn('Recognition start failed:', e);
        setIsListening(false);
      }
    } else {
      // Fallback simulated voice prompt if Web Speech is blocked in browser
      setIsListening(true);
      setTimeout(() => {
        setIsListening(false);
        const fallbackText = userProfile.languageMode === 'gujarati'
          ? 'કેમ છો જાન 💕 આજે હવામાન કેવું છે?'
          : 'Hii Jaan 💕 Khana khaya aapne? Aaj ka weather batao!';
        handleSendMessage(fallbackText);
      }, 2000);
    }
  }, [userProfile.languageMode, handleSendMessage]);

  // Generate Proactive Morning / Evening Briefing
  const handleGenerateBriefing = useCallback(async (type: 'morning' | 'evening') => {
    setIsBriefingLoading(true);
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          type,
          weather: `${weather.condition}, ${weather.temp}°C in ${weather.city}`,
          reminders,
          memories,
          userName: userProfile.nickname,
        }),
      });
      const data = await res.json();
      if (data.summary) {
        setBriefingText(data.summary);
      }
    } catch (err) {
      console.error('Error generating briefing:', err);
    } finally {
      setIsBriefingLoading(false);
    }
  }, [weather, reminders, memories, userProfile.nickname]);

  // Memory Handlers
  const handleAddMemory = useCallback((memory: Omit<MemoryItem, 'id' | 'createdAt'>) => {
    const newItem: MemoryItem = {
      ...memory,
      id: `mem-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    setMemories((prev) => [newItem, ...prev]);
  }, []);

  const handleDeleteMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleToggleMemoryPermission = useCallback((id: string) => {
    setMemories((prev) =>
      prev.map((m) => (m.id === id ? { ...m, permissionGranted: !m.permissionGranted } : m))
    );
  }, []);

  // Routine Handlers
  const handleToggleRoutine = useCallback((id: string) => {
    setRoutines((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  }, []);

  const handleAddRoutine = useCallback((routine: Omit<Routine, 'id'>) => {
    setRoutines((prev) => [...prev, { ...routine, id: `r-${Date.now()}` }]);
  }, []);

  const handleApplyScheduleShift = useCallback((routineId: string, newTime: string) => {
    setRoutines((prev) =>
      prev.map((r) => (r.id === routineId ? { ...r, time: newTime } : r))
    );
  }, []);

  // Reminder Handlers
  const handleToggleReminder = useCallback((id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
    );
  }, []);

  const handleAddReminder = useCallback((reminder: Omit<Reminder, 'id' | 'completed'>) => {
    setReminders((prev) => [{ ...reminder, id: `rem-${Date.now()}`, completed: false }, ...prev]);
  }, []);

  // Note Handlers
  const handleAddNote = useCallback((note: Omit<Note, 'id' | 'updatedAt'>) => {
    const newNote: Note = {
      ...note,
      id: `n-${Date.now()}`,
      updatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };
    setNotes((prev) => [newNote, ...prev]);
  }, []);

  // Profile Update Handler
  const handleUpdateProfile = useCallback((updated: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updated }));
  }, []);

  const handleOpenPermissions = useCallback(() => {
    setIsPermissionsModalOpen(true);
  }, []);

  const handleOpenCustomization = useCallback(() => {
    setActiveTab('profile');
  }, []);

  const handleNavigateToScheduler = useCallback(() => {
    setActiveTab('memory');
  }, []);

  const handleLanguageChange = useCallback((mode: any) => {
    handleUpdateProfile({ languageMode: mode });
  }, [handleUpdateProfile]);

  const handleClosePermissionsModal = useCallback(() => {
    setIsPermissionsModalOpen(false);
  }, []);

  const handleCloseQuickActionsModal = useCallback(() => {
    setSelectedQuickAction(null);
  }, []);

  // Permission Toggle Handler with Real Native Android Request Trigger & State Check
  const handleTogglePermission = useCallback(async (key: keyof AppPermissions) => {
    const res = await requestSingleNativePermission(key);

    if (res.granted) {
      setPermissions((prev) => ({ ...prev, [key]: true }));
    } else {
      setPermissions((prev) => ({ ...prev, [key]: false }));
      if (res.permanentlyDenied) {
        if (typeof window !== 'undefined' && window.confirm(`Android permission for ${key} was denied or restricted. Would you like to open Android App Info Settings to enable it?`)) {
          openNativeAppSettings();
        }
      }
    }
  }, []);

  return (
    <div className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-pink-500 selection:text-white gpu-accel">
      {/* App Header */}
      <Header
        userProfile={userProfile}
        weather={weather}
        onOpenPermissions={handleOpenPermissions}
        onOpenCustomization={handleOpenCustomization}
      />

      {/* Main View Container with Error Boundary */}
      <main className="flex-1 overflow-y-auto touch-scroll pt-2 pb-20 px-2 sm:px-4">
        <ErrorBoundary fallbackTitle="View Navigation Recovered">
          {activeTab === 'home' && (
            <SmartDashboard
              userProfile={userProfile}
              weather={weather}
              reminders={reminders}
              routines={routines}
              habits={habits}
              quickActions={quickActions}
              places={places}
              isSpeaking={isSpeaking}
              isListening={isListening}
              onVoiceClick={startVoiceInput}
              onSelectAction={setSelectedQuickAction}
              onToggleReminder={handleToggleReminder}
              onGenerateBriefing={handleGenerateBriefing}
              onApplyTimeShift={handleApplyScheduleShift}
              onNavigateToScheduler={handleNavigateToScheduler}
              onUpdateProfile={handleUpdateProfile}
              briefingText={briefingText}
              isBriefingLoading={isBriefingLoading}
            />
          )}

          {activeTab === 'chat' && (
            <ChatView
              userProfile={userProfile}
              messages={messages}
              onSendMessage={handleSendMessage}
              isSpeaking={isSpeaking}
              isListening={isListening}
              onVoiceClick={startVoiceInput}
              onSpeakText={speakText}
              onLanguageChange={handleLanguageChange}
              isLoading={isChatLoading}
            />
          )}

          {activeTab === 'memory' && (
            <MemoryAndRoutinesView
              memories={memories}
              routines={routines}
              habits={habits}
              reminders={reminders}
              weather={weather}
              userName={userProfile.nickname}
              onAddMemory={handleAddMemory}
              onDeleteMemory={handleDeleteMemory}
              onToggleMemoryPermission={handleToggleMemoryPermission}
              onToggleRoutine={handleToggleRoutine}
              onAddRoutine={handleAddRoutine}
              onApplyTimeShift={handleApplyScheduleShift}
            />
          )}

          {activeTab === 'creativity' && (
            <CreativitySuiteView
              notes={notes}
              onAddNote={handleAddNote}
            />
          )}

          {activeTab === 'profile' && (
            <CustomizationView
              userProfile={userProfile}
              permissions={permissions}
              onUpdateProfile={handleUpdateProfile}
              onTogglePermission={handleTogglePermission}
            />
          )}
        </ErrorBoundary>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Permissions Modal */}
      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={handleClosePermissionsModal}
        permissions={permissions}
        onTogglePermission={handleTogglePermission}
      />

      {/* Quick Actions Modal */}
      <QuickActionsModal
        actionItem={selectedQuickAction}
        onClose={handleCloseQuickActionsModal}
        onAddReminder={handleAddReminder}
      />
    </div>
  );
}

