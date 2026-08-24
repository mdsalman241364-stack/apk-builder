import React from 'react';
import { Mic, Volume2, Sparkles } from 'lucide-react';

interface VoicePulseVisualizerProps {
  isListening: boolean;
  isSpeaking: boolean;
  onVoiceClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const VoicePulseVisualizer: React.FC<VoicePulseVisualizerProps> = React.memo(({
  isListening,
  isSpeaking,
  onVoiceClick,
  size = 'md',
}) => {
  const isActive = isListening || isSpeaking;

  const barHeights = [20, 35, 50, 30, 65, 45, 80, 55, 90, 40, 70, 35, 60, 25, 45, 20];

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-36 h-36',
  }[size];

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
  }[size];

  return (
    <div className="relative flex flex-col items-center justify-center my-3">
      {/* Outer CSS Pulsing Halo Rings */}
      {isActive && (
        <>
          <div
            className={`absolute rounded-full border border-cyan-400/50 ${sizeClasses} animate-pulse-ring-1 pointer-events-none`}
            style={{
              borderColor: isSpeaking ? 'rgba(236, 72, 153, 0.6)' : 'rgba(34, 211, 238, 0.6)',
              backgroundColor: isSpeaking ? 'rgba(236, 72, 153, 0.08)' : 'rgba(34, 211, 238, 0.08)',
            }}
          />
          <div
            className={`absolute rounded-full border border-indigo-500/40 ${sizeClasses} animate-pulse-ring-2 pointer-events-none`}
            style={{
              borderColor: isSpeaking ? 'rgba(168, 85, 247, 0.5)' : 'rgba(99, 102, 241, 0.5)',
              backgroundColor: isSpeaking ? 'rgba(168, 85, 247, 0.08)' : 'rgba(99, 102, 241, 0.08)',
            }}
          />
          <div
            className={`absolute rounded-full border border-cyan-300/30 ${sizeClasses} animate-pulse-ring-3 pointer-events-none`}
          />
        </>
      )}

      {/* Center Orb Trigger */}
      <button
        onClick={onVoiceClick}
        className={`relative z-10 flex items-center justify-center rounded-full transition-all duration-300 shadow-2xl cursor-pointer ${sizeClasses} ${
          isSpeaking
            ? 'bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-500 text-white animate-voice-breath shadow-[0_0_30px_rgba(236,72,153,0.5)]'
            : isListening
            ? 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white animate-voice-breath shadow-[0_0_30px_rgba(34,211,238,0.5)]'
            : 'bg-slate-900/90 border border-slate-700 hover:border-indigo-500/60 text-indigo-300 hover:text-white shadow-lg hover:scale-105'
        }`}
      >
        {isSpeaking ? (
          <Volume2 className={`${iconSizes} animate-bounce text-pink-200`} />
        ) : isListening ? (
          <Mic className={`${iconSizes} animate-pulse text-cyan-200`} />
        ) : (
          <Mic className={`${iconSizes} text-indigo-400 group-hover:text-cyan-300`} />
        )}
      </button>

      {/* Dynamic Equalizer Frequency Wave Bars */}
      <div className="flex items-center justify-center gap-1 h-10 mt-3 px-2">
        {barHeights.map((h, idx) => (
          <div
            key={idx}
            className={`w-1 rounded-full transition-all duration-300 ${
              isSpeaking
                ? 'bg-gradient-to-t from-pink-500 via-purple-500 to-cyan-400 shadow-[0_0_8px_rgba(236,72,153,0.8)]'
                : isListening
                ? 'bg-gradient-to-t from-cyan-400 to-blue-500 shadow-[0_0_8px_rgba(56,189,248,0.8)]'
                : 'bg-slate-800/80 h-1.5'
            }`}
            style={{
              height: isActive ? `${Math.max(6, (h * (0.4 + (idx % 3) * 0.25)))}px` : '6px',
              animation: isActive ? `audioBarBounce 0.8s ease-in-out infinite ${idx * 0.05}s` : 'none',
            }}
          />
        ))}
      </div>

      {/* Status Badge Indicator */}
      <div className="mt-1">
        {isSpeaking ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-semibold tracking-wide animate-pulse shadow-sm">
            <Volume2 className="w-3.5 h-3.5 text-pink-400" />
            <span>DIGUU is Speaking...</span>
          </span>
        ) : isListening ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold tracking-wide animate-pulse shadow-sm">
            <Mic className="w-3.5 h-3.5 text-cyan-400" />
            <span>Listening... Say "Hey Diguu"</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/60 border border-slate-800 text-slate-400 text-[11px] font-medium">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            <span>Tap microphone to start voice conversation</span>
          </span>
        )}
      </div>
    </div>
  );
});

VoicePulseVisualizer.displayName = 'VoicePulseVisualizer';

