import React from 'react';
import { Home, MessageSquare, Brain, Sparkles, User } from 'lucide-react';

export type TabType = 'home' | 'chat' | 'memory' | 'creativity' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = React.memo(({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'chat' as TabType, label: 'Chat', icon: MessageSquare },
    { id: 'memory' as TabType, label: 'Routines', icon: Brain },
    { id: 'creativity' as TabType, label: 'Creativity', icon: Sparkles },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0C10]/95 backdrop-blur-md border-t border-slate-800/80 py-2.5 px-3 select-none gpu-accel">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 transition-all py-1.5 px-3.5 rounded-2xl active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-white font-medium bg-indigo-500/15 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="text-[10px] uppercase tracking-wider font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';

