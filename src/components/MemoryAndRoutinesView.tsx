import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Brain, 
  Clock, 
  Heart, 
  Plus, 
  Trash2, 
  Check, 
  ShieldCheck, 
  Droplets, 
  Footprints, 
  Wind, 
  Sparkles,
  Calendar,
  Flame,
  Search,
  Lock
} from 'lucide-react';
import { MemoryItem, Routine, HabitGoal, MemoryCategory, Reminder, WeatherData } from '../types';
import { SmartSchedulerView } from './SmartSchedulerView';

interface MemoryAndRoutinesViewProps {
  memories: MemoryItem[];
  routines: Routine[];
  habits: HabitGoal[];
  reminders: Reminder[];
  weather: WeatherData;
  userName: string;
  onAddMemory: (memory: Omit<MemoryItem, 'id' | 'createdAt'>) => void;
  onDeleteMemory: (id: string) => void;
  onToggleMemoryPermission: (id: string) => void;
  onToggleRoutine: (id: string) => void;
  onAddRoutine: (routine: Omit<Routine, 'id'>) => void;
  onApplyTimeShift: (routineId: string, newTime: string) => void;
}

export const MemoryAndRoutinesView: React.FC<MemoryAndRoutinesViewProps> = React.memo(({
  memories,
  routines,
  habits,
  reminders,
  weather,
  userName,
  onAddMemory,
  onDeleteMemory,
  onToggleMemoryPermission,
  onToggleRoutine,
  onAddRoutine,
  onApplyTimeShift,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'memory' | 'scheduler' | 'routines' | 'health'>('scheduler');

  // Memory form state
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('food');
  const [searchQuery, setSearchQuery] = useState('');

  // Hydration state
  const [waterGlasses, setWaterGlasses] = useState(5);
  const targetGlasses = 8;

  // Step counter state
  const [currentSteps, setCurrentSteps] = useState(6420);
  const targetSteps = 10000;

  // Breathing Exercise state
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [breathTimer, setBreathTimer] = useState(60);

  const handleCreateMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey || !newValue) return;
    onAddMemory({
      key: newKey,
      value: newValue,
      category: newCategory,
      permissionGranted: true,
    });
    setNewKey('');
    setNewValue('');
    setShowAddMemory(false);
  };

  const filteredMemories = memories.filter(m => 
    m.key.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Breathing loop effect
  React.useEffect(() => {
    let interval: any = null;
    if (isBreathingActive) {
      interval = setInterval(() => {
        setBreathPhase((prev) => {
          if (prev === 'Inhale') return 'Hold';
          if (prev === 'Hold') return 'Exhale';
          return 'Inhale';
        });
      }, 4000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isBreathingActive]);

  return (
    <div className="space-y-4 pb-24 px-4 max-w-2xl mx-auto pt-2">
      {/* Sub Navigation Bar */}
      <div className="flex items-center justify-center p-1 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <button
          onClick={() => setActiveSubTab('scheduler')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeSubTab === 'scheduler'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>Smart Scheduler</span>
        </button>

        <button
          onClick={() => setActiveSubTab('memory')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeSubTab === 'memory'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Brain className="w-3.5 h-3.5" />
          <span>Memory</span>
        </button>

        <button
          onClick={() => setActiveSubTab('routines')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeSubTab === 'routines'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Routines</span>
        </button>

        <button
          onClick={() => setActiveSubTab('health')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
            activeSubTab === 'health'
              ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>Wellness</span>
        </button>
      </div>

      {/* 0. SMART SCHEDULER TAB */}
      {activeSubTab === 'scheduler' && (
        <SmartSchedulerView
          routines={routines}
          reminders={reminders}
          weather={weather}
          userName={userName}
          onApplyTimeShift={onApplyTimeShift}
          onAddRoutine={onAddRoutine}
        />
      )}

      {/* 1. PERSONAL MEMORY TAB */}
      {activeSubTab === 'memory' && (
        <div className="space-y-4">
          {/* Header info card */}
          <div className="p-4 rounded-3xl bg-slate-900/80 border border-pink-500/20 shadow-xl flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-pink-400" />
                <h3 className="text-sm font-bold text-slate-100">DIGUU Memory Bank</h3>
              </div>
              <p className="text-xs text-slate-300/80 mt-1">
                DIGUU remembers your favorite foods, music, routines, and contacts ONLY with your permission. Review or delete saved memories anytime! 💕
              </p>
            </div>

            <button
              onClick={() => setShowAddMemory(!showAddMemory)}
              className="p-2.5 rounded-2xl bg-pink-500/20 text-pink-300 border border-pink-500/40 hover:bg-pink-500/30 transition-all shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Add Memory Modal / Form */}
          {showAddMemory && (
            <motion.form
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleCreateMemory}
              className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-xl"
            >
              <h4 className="text-xs font-bold text-pink-300 uppercase tracking-wider">Save New Memory</h4>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                >
                  <option value="food">Food & Drink ☕</option>
                  <option value="music">Music & Songs 🎵</option>
                  <option value="movies">Movies & Shows 🎬</option>
                  <option value="contacts">Important Contacts 📞</option>
                  <option value="routines">Daily Routines 💻</option>
                  <option value="places">Favorite Places 📍</option>
                  <option value="preferences">General Preferences ⭐</option>
                </select>

                <input
                  type="text"
                  placeholder="Key (e.g., Favorite Coffee)"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  required
                />
              </div>

              <input
                type="text"
                placeholder="Value (e.g., Hot Cappuccino with extra cinnamon)"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                required
              />

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddMemory(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-pink-500 text-white text-xs font-bold shadow-md hover:bg-pink-600"
                >
                  Save Memory
                </button>
              </div>
            </motion.form>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search memories (food, music, places)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-pink-500/40"
            />
          </div>

          {/* Memory items list */}
          <div className="space-y-2.5">
            {filteredMemories.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3 shadow-md hover:border-pink-500/30 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {m.category}
                    </span>
                    <span className="text-xs font-bold text-slate-200">{m.key}</span>
                  </div>
                  <p className="text-xs text-pink-300 font-medium mt-1">{m.value}</p>
                  <span className="text-[10px] text-slate-400 mt-1 block">Saved on {m.createdAt}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleMemoryPermission(m.id)}
                    title={m.permissionGranted ? 'DIGUU has permission to personalize using this memory' : 'Memory locked from AI customization'}
                    className={`p-2 rounded-xl text-xs font-semibold border transition-all ${
                      m.permissionGranted
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {m.permissionGranted ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={() => onDeleteMemory(m.id)}
                    className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. ROUTINES TAB */}
      {activeSubTab === 'routines' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>My Automated Routines</span>
              </h3>
              <p className="text-xs text-slate-300/80 mt-1">
                DIGUU triggers briefings, alarms, and reminders automatically at scheduled times.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {routines.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100">{r.title}</div>
                    <div className="text-[11px] text-pink-300 font-medium mt-0.5">
                      {r.time} • Repeat: {r.repeat}
                    </div>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={r.enabled}
                    onChange={() => onToggleRoutine(r.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500" />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. HEALTH & WELLNESS TAB */}
      {activeSubTab === 'health' && (
        <div className="space-y-4">
          {/* Water Intake Tracker */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-cyan-500/20 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-100">Water Reminders & Hydration</h3>
              </div>
              <span className="text-xs font-bold text-cyan-300 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                {waterGlasses} / {targetGlasses} Glasses
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_#38bdf8] transition-all duration-500"
                style={{ width: `${(waterGlasses / targetGlasses) * 100}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-300">Target: 2.0 Liters Daily</span>
              <button
                onClick={() => setWaterGlasses((prev) => Math.min(targetGlasses, prev + 1))}
                className="px-3.5 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold hover:bg-cyan-400 transition-all shadow-md flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log Glass</span>
              </button>
            </div>
          </div>

          {/* Step Goal Counter */}
          <div className="p-4 rounded-3xl bg-slate-900/90 border border-emerald-500/20 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Footprints className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Step Goal Tracker</h3>
              </div>
              <span className="text-xs font-bold text-emerald-300 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                {currentSteps.toLocaleString()} / {targetSteps.toLocaleString()} Steps
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-bold text-emerald-400">4.8 km</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Distance</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-bold text-orange-400">285 kcal</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Calories</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-bold text-cyan-400">42 mins</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Active Time</div>
              </div>
            </div>
          </div>

          {/* Interactive Guided Breathing Session */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-pink-500/20 shadow-xl text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Wind className="w-5 h-5 text-pink-400" />
              <h3 className="text-sm font-bold text-slate-100">Guided Breathing Session</h3>
            </div>

            {/* Animated Expanding Breathing Ring */}
            <div className="relative flex items-center justify-center my-4">
              <motion.div
                className="w-32 h-32 rounded-full border-2 border-pink-500/50 bg-pink-500/10 flex items-center justify-center shadow-[0_0_30px_rgba(236,72,153,0.3)]"
                animate={
                  isBreathingActive
                    ? {
                        scale: breathPhase === 'Inhale' ? [1, 1.4] : breathPhase === 'Hold' ? 1.4 : [1.4, 1],
                      }
                    : { scale: 1 }
                }
                transition={{ duration: 4, ease: 'easeInOut' }}
              >
                <div className="text-center">
                  <div className="text-xs font-black text-pink-300 uppercase tracking-widest">
                    {isBreathingActive ? breathPhase : 'Relax'}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5">
                    {isBreathingActive ? 'Focus on Breath' : 'Ready?'}
                  </div>
                </div>
              </motion.div>
            </div>

            <button
              onClick={() => setIsBreathingActive(!isBreathingActive)}
              className={`px-6 py-2.5 rounded-full font-bold text-xs shadow-lg transition-all ${
                isBreathingActive
                  ? 'bg-rose-500 text-white shadow-rose-500/30'
                  : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-pink-500/30 hover:scale-105'
              }`}
            >
              {isBreathingActive ? 'Stop Breathing Session' : 'Start 2 Min Breathing'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

MemoryAndRoutinesView.displayName = 'MemoryAndRoutinesView';

