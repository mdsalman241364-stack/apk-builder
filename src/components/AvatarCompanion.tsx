import React from 'react';
import { motion } from 'motion/react';
import { Heart, Mic, Sparkles, Volume2 } from 'lucide-react';
import { UserProfile } from '../types';

// Avatar Image imports
import avatarMain from '../assets/images/diguu_avatar_main_1785882815230.jpg';
import avatarWink from '../assets/images/diguu_avatar_wink_1785882896630.jpg';

interface AvatarCompanionProps {
  userProfile: UserProfile;
  isSpeaking: boolean;
  isListening: boolean;
  onVoiceClick: () => void;
  statusText?: string;
}

export const AvatarCompanion: React.FC<AvatarCompanionProps> = ({
  userProfile,
  isSpeaking,
  isListening,
  onVoiceClick,
  statusText,
}) => {
  const avatarSrc = userProfile.avatarVariant === 'wink' ? avatarWink : avatarMain;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900/80 to-indigo-950/20 rounded-3xl border border-slate-800 backdrop-blur-md shadow-2xl overflow-hidden min-h-[320px]">
      {/* Decorative Voice Orb Glow */}
      <div className="absolute w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[70px] pointer-events-none" />

      {/* Sleek Soundwave Visualizer Bar (Matches Sleek Interface Design) */}
      <div className="mb-4 flex justify-center items-end space-x-1.5 h-10 z-10">
        <div className={`w-1 bg-cyan-400/40 rounded-full ${isSpeaking || isListening ? 'animate-bounce h-6' : 'h-3'}`} />
        <div className={`w-1 bg-cyan-400/60 rounded-full ${isSpeaking || isListening ? 'animate-bounce h-8 delay-75' : 'h-5'}`} />
        <div className={`w-1 bg-cyan-400/90 rounded-full shadow-lg shadow-cyan-400/40 ${isSpeaking || isListening ? 'animate-bounce h-10 delay-150' : 'h-8'}`} />
        <div className={`w-1 bg-cyan-400/60 rounded-full ${isSpeaking || isListening ? 'animate-bounce h-7 delay-100' : 'h-6'}`} />
        <div className={`w-1 bg-cyan-400/40 rounded-full ${isSpeaking || isListening ? 'animate-bounce h-5 delay-200' : 'h-3'}`} />
      </div>

      {/* Avatar Display Container with Animated Halo Rings */}
      <div className="relative group cursor-pointer my-1 z-10" onClick={onVoiceClick}>
        {/* CSS Pulsing Radar Rings during Voice Interaction */}
        {(isSpeaking || isListening) && (
          <>
            <div
              className={`absolute -inset-4 rounded-full border animate-pulse-ring-1 pointer-events-none ${
                isSpeaking ? 'border-pink-500/60 bg-pink-500/10' : 'border-cyan-400/60 bg-cyan-400/10'
              }`}
            />
            <div
              className={`absolute -inset-8 rounded-full border animate-pulse-ring-2 pointer-events-none ${
                isSpeaking ? 'border-purple-500/50 bg-purple-500/10' : 'border-indigo-500/50 bg-indigo-500/10'
              }`}
            />
            <div
              className={`absolute -inset-12 rounded-full border animate-pulse-ring-3 pointer-events-none ${
                isSpeaking ? 'border-pink-400/30' : 'border-cyan-300/30'
              }`}
            />
          </>
        )}

        {/* Animated Outer Pulse Ring */}
        <motion.div
          className="absolute -inset-3 rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-600 opacity-60 blur-md"
          animate={{
            scale: isSpeaking || isListening ? [1, 1.08, 1] : [1, 1.03, 1],
            opacity: isSpeaking || isListening ? [0.6, 0.9, 0.6] : [0.3, 0.5, 0.3],
          }}
          transition={{ repeat: Infinity, duration: isSpeaking ? 1.2 : 2.5, ease: 'easeInOut' }}
        />

        {/* Outer Halo Circle */}
        <div
          className="relative w-36 h-36 md:w-44 md:h-44 rounded-full p-1 bg-gradient-to-tr from-indigo-500 via-cyan-400 to-slate-800 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          style={{ borderColor: userProfile.haloColor }}
        >
          <div className="w-full h-full rounded-full overflow-hidden border-2 border-slate-900 bg-slate-900 relative">
            <img
              src={avatarSrc}
              alt="DIGUU AI Avatar"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-105"
            />

            {/* Speaking / Listening Indicator Overlay */}
            {(isSpeaking || isListening) && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center">
                <div className="px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-400/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 shadow-lg">
                  {isSpeaking ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-bounce" />
                      <span>Speaking...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                      <span>Listening...</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Headline & Subtitle matching "Hey Diguu" Sleek aesthetic */}
      <div className="text-center mt-3 z-10">
        <h2 className="text-2xl font-light text-white tracking-wide italic">
          "Hey DIGUU"
        </h2>
        <p className="text-slate-400 text-xs max-w-xs mt-1 px-4 leading-relaxed">
          {statusText || `Listening for your request. Ask me to draft an email, check your schedule, or tell a story.`}
        </p>
      </div>

      {/* Voice Trigger Button */}
      <motion.button
        onClick={onVoiceClick}
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.02 }}
        className={`mt-4 px-6 py-2.5 rounded-2xl flex items-center gap-2 font-medium text-xs tracking-wide transition-all shadow-lg z-10 ${
          isListening
            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/30 animate-pulse border border-cyan-400/40'
            : 'bg-white/10 hover:bg-white/15 border border-white/15 text-white shadow-indigo-500/20'
        }`}
      >
        <Mic className="w-4 h-4 text-cyan-400" />
        <span>{isListening ? 'Listening... Tap to Stop' : 'Tap to Speak'}</span>
      </motion.button>
    </div>
  );
};
