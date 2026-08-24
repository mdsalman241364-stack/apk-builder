import React from 'react';
import { Heart, BatteryCharging, CloudSun, ShieldCheck, UserCheck, Sparkles, Settings } from 'lucide-react';
import { UserProfile, WeatherData } from '../types';

interface HeaderProps {
  userProfile: UserProfile;
  weather: WeatherData;
  onOpenPermissions: () => void;
  onOpenCustomization: () => void;
}

export const Header: React.FC<HeaderProps> = React.memo(({
  userProfile,
  weather,
  onOpenPermissions,
  onOpenCustomization,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#0A0C10]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between select-none gpu-accel">
      {/* Brand & Sleek Header Badge */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 font-bold text-white text-lg italic shrink-0">
          D
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-base font-bold tracking-tight text-white">
              DIGUU <span className="text-indigo-400 font-extrabold">Ai</span>
            </h1>
            <span className="text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 font-semibold">
              v2.4 HyperInt
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
            Hyper Intelligence
          </p>
        </div>
      </div>

      {/* Right Quick Widgets */}
      <div className="flex items-center gap-2.5">
        {/* Status Indicators */}
        <div className="hidden sm:flex items-center gap-3 text-xs font-medium text-slate-400">
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-300">Online</span>
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-slate-300">88%</span>
          </span>
        </div>

        {/* Weather Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
          <CloudSun className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-medium">{weather.temp}°C</span>
        </div>

        {/* Security / Permissions Button */}
        <button
          onClick={onOpenPermissions}
          title="Security & Permissions"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 hover:border-emerald-500/50 hover:bg-slate-800 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
        </button>

        {/* Settings / Customize Button */}
        <button
          onClick={onOpenCustomization}
          title="Customize Avatar & Personality"
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 hover:border-indigo-500/50 hover:bg-slate-800 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

