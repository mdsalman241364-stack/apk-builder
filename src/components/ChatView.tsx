import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Mic, Volume2, Sparkles, Heart, Languages, RefreshCw, Zap, Bot } from 'lucide-react';
import { ChatMessage, UserProfile } from '../types';
import { VoiceWave } from './VoiceWave';

import avatarMain from '../assets/images/diguu_avatar_main_1785882815230.jpg';

interface ChatViewProps {
  userProfile: UserProfile;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isSpeaking: boolean;
  isListening: boolean;
  onVoiceClick: () => void;
  onSpeakText: (text: string) => void;
  onLanguageChange: (mode: 'hinglish' | 'hindi' | 'gujarati' | 'english') => void;
  isLoading: boolean;
}

export const ChatView: React.FC<ChatViewProps> = React.memo(({
  userProfile,
  messages,
  onSendMessage,
  isSpeaking,
  isListening,
  onVoiceClick,
  onSpeakText,
  onLanguageChange,
  isLoading,
}) => {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const quickPrompts = userProfile.languageMode === 'gujarati' 
    ? [
        'કેમ છો જાન 💕 શું કરે છે?',
        'તમે જમ્યા કે નહિ જાન? 🍲',
        'હેય DIGUU, રોમેન્ટિક વાત કરો 💖',
        'આજે હવામાન કેવું છે? ☀️',
        'એક મીઠી શાયરી કે ગીત સંભળાવો 🎵',
      ]
    : userProfile.languageMode === 'hindi'
    ? [
        'अरे मेरी जान 💕 खाना खाया आपने?',
        'मेरा कितना ख्याल रखते हो आप 💖',
        'आज का मौसम कैसा है? ☀️',
        'आपकी आवाज़ कितनी प्यारी है 🎵',
        'मुझे एक प्यारी सी शायरी सुनाओ 🌸',
      ]
    : [
        'Hii Jaan 💕 Kaise ho aap?',
        'Aaj ka weather kaisa hai? ☀️',
        'Hey Diguu, music chalao 🎵',
        'Hey Diguu, shaam 7 baje call yaad dilana 🔔',
        'Ek sundar poem/shayari sunao 🌸',
      ];

  return (
    <div className="flex flex-col h-[calc(100dvh-130px)] max-w-2xl mx-auto pb-3 px-2 sm:px-4 touch-scroll gpu-accel">
      {/* 1. Sleek Glassmorphism Voice Visualizer & Assistant Bar */}
      <div className={`p-3.5 rounded-3xl border transition-all duration-300 backdrop-blur-xl shadow-xl ${
        isSpeaking 
          ? 'bg-slate-900/80 border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.15)] ring-1 ring-pink-500/30'
          : isListening 
          ? 'bg-slate-900/80 border-cyan-400/50 shadow-[0_0_20px_rgba(56,189,248,0.15)] ring-1 ring-cyan-400/30'
          : 'bg-slate-900/60 border-slate-800 shadow-md'
      }`}>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-indigo-500/50 shadow-md">
                <img src={avatarMain} alt="DIGUU" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              </div>
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                isSpeaking ? 'bg-pink-500 animate-ping' : isListening ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'
              }`} />
            </div>

            <div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span>DIGUU Voice Visualizer</span>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="text-emerald-400 font-semibold">Wake: "Hey Diguu"</span>
                <span>•</span>
                <span className={isSpeaking ? 'text-pink-400 font-semibold' : isListening ? 'text-cyan-400 font-semibold' : 'text-slate-400'}>
                  {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Idle'}
                </span>
              </div>
            </div>
          </div>

          {/* Language Mode Pills */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-full border border-slate-800/80">
            {(['hinglish', 'hindi', 'gujarati', 'english'] as const).map((mode) => {
              const labels = { hinglish: 'Hinglish', hindi: 'हिंदी', gujarati: 'ગુજરાતી', english: 'Eng' };
              const isActiveMode = userProfile.languageMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => onLanguageChange(mode)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                    isActiveMode
                      ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>
        </div>

        {/* CSS Animated Voice Wave Canvas */}
        <VoiceWave isSpeaking={isSpeaking} isListening={isListening} />
      </div>

      {/* 2. Chat Messages Container with Fixed Bottom Padding */}
      <div className="flex-1 overflow-y-auto space-y-3 px-2 py-3 my-2 no-scrollbar">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-7 h-7 rounded-full overflow-hidden border border-indigo-500/40 shrink-0 mb-1 shadow-sm">
                  <img src={avatarMain} alt="DIGUU" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>
              )}

              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-lg ${
                  isUser
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 text-white rounded-br-xs border border-indigo-400/30'
                    : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-bl-xs backdrop-blur-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Action Tag Badge */}
                {msg.actionTag && (
                  <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/40 shadow-sm">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    <span>{msg.actionTag}</span>
                  </div>
                )}

                {/* Message Footer */}
                <div className={`flex items-center justify-between gap-2 mt-2 pt-1 border-t ${isUser ? 'border-indigo-400/30' : 'border-slate-800'}`}>
                  <span className={`text-[10px] ${isUser ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </span>

                  {!isUser && (
                    <button
                      onClick={() => onSpeakText(msg.text)}
                      className="p-1 rounded-full hover:bg-slate-800 text-cyan-400 transition-colors cursor-pointer"
                      title="Speak Message"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium p-3 bg-slate-900/80 rounded-2xl w-fit border border-slate-800 shadow-md backdrop-blur-md">
            <Bot className="w-4 h-4 animate-bounce text-cyan-400" />
            <span>DIGUU AI is thinking & typing... ✨</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 3. Horizontal Smooth Scroll Quick Action Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto py-1.5 px-1 no-scrollbar shrink-0">
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(prompt)}
            className="px-3.5 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-[11px] font-semibold text-slate-300 whitespace-nowrap transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* 4. Floating Input Field & Mic Bar (No Overlap with Navigation) */}
      <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 shrink-0">
        <div className="relative">
          {(isListening || isSpeaking) && (
            <>
              <div
                className={`absolute -inset-1.5 rounded-full border animate-pulse-ring-1 pointer-events-none ${
                  isSpeaking ? 'border-pink-500/60 bg-pink-500/10' : 'border-cyan-400/60 bg-cyan-400/10'
                }`}
              />
              <div
                className={`absolute -inset-3 rounded-full border animate-pulse-ring-2 pointer-events-none ${
                  isSpeaking ? 'border-purple-500/50 bg-purple-500/10' : 'border-indigo-500/50 bg-indigo-500/10'
                }`}
              />
            </>
          )}

          <button
            type="button"
            onClick={onVoiceClick}
            className={`relative z-10 p-3 rounded-full text-white transition-all shadow-lg cursor-pointer ${
              isSpeaking
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 shadow-pink-500/40 animate-pulse'
                : isListening
                ? 'bg-cyan-500 shadow-cyan-500/40 animate-pulse'
                : 'bg-gradient-to-r from-indigo-500 to-cyan-500 shadow-indigo-500/30 hover:scale-105'
            }`}
            title="Voice Speech Input"
          >
            {isSpeaking ? <Volume2 className="w-5 h-5 text-pink-100 animate-bounce" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Talk to DIGUU (${userProfile.languageMode})...`}
          className="flex-1 bg-slate-900/90 border border-slate-800 rounded-full px-4 py-3 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500/60 shadow-inner backdrop-blur-md"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="p-3 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:scale-105 transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
});

ChatView.displayName = 'ChatView';

