import React from 'react';
import { motion } from 'motion/react';

interface VoiceWaveProps {
  isSpeaking: boolean;
  isListening: boolean;
}

export const VoiceWave: React.FC<VoiceWaveProps> = React.memo(({ isSpeaking, isListening }) => {

  const bars = [16, 28, 45, 20, 60, 35, 80, 50, 90, 40, 75, 30, 65, 25, 55, 20, 40, 15];
  const isActive = isSpeaking || isListening;

  return (
    <div className="relative flex items-center justify-center gap-1.5 h-12 my-2 px-4 overflow-hidden rounded-2xl bg-slate-950/40 border border-slate-800/80">
      {/* Background CSS Pulsing Glow during active speech */}
      {isActive && (
        <div
          className={`absolute inset-0 rounded-2xl opacity-20 pointer-events-none transition-all duration-500 ${
            isSpeaking ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 animate-pulse' : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 animate-pulse'
          }`}
        />
      )}

      {bars.map((height, i) => (
        <motion.div
          key={i}
          className={`w-1 rounded-full z-10 transition-colors duration-300 ${
            isSpeaking
              ? 'bg-gradient-to-t from-pink-500 via-purple-500 to-cyan-400 shadow-[0_0_10px_#ec4899]'
              : isListening
              ? 'bg-gradient-to-t from-cyan-400 to-blue-600 shadow-[0_0_10px_#38bdf8]'
              : 'bg-slate-800'
          }`}
          style={{
            animation: isActive ? `audioBarBounce 0.7s ease-in-out infinite ${(i * 0.06)}s` : 'none',
          }}
          animate={
            isActive
              ? {
                  height: [
                    `${Math.max(6, height * 0.2)}px`,
                    `${Math.min(44, height * (isSpeaking ? 0.95 : 0.75))}px`,
                    `${Math.max(6, height * 0.2)}px`,
                  ],
                }
              : { height: '6px' }
          }
          transition={{
            repeat: Infinity,
            duration: 0.5 + (i % 5) * 0.12,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
});

VoiceWave.displayName = 'VoiceWave';


