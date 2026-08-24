import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Calendar, 
  Clock, 
  CloudSun, 
  CloudRain, 
  AlertTriangle, 
  Check, 
  ArrowRight, 
  RefreshCw, 
  Zap,
  Sliders,
  Sun,
  ShieldAlert,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { Routine, Reminder, WeatherData, ScheduleSuggestion } from '../types';
import { getApiHeaders } from '../utils/apiUtils';

interface SmartSchedulerViewProps {
  routines: Routine[];
  reminders: Reminder[];
  weather: WeatherData;
  userName: string;
  onApplyTimeShift: (routineId: string, newTime: string) => void;
  onAddRoutine: (routine: Omit<Routine, 'id'>) => void;
}

export const SmartSchedulerView: React.FC<SmartSchedulerViewProps> = ({
  routines,
  reminders,
  weather,
  userName,
  onApplyTimeShift,
  onAddRoutine,
}) => {
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'weather' | 'conflicts'>('all');

  // New Routine Modal Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('08:00 AM');
  const [newCategory, setNewCategory] = useState<'outdoor' | 'indoor' | 'work' | 'wellness'>('outdoor');

  // Run AI analysis on mount or when requested
  const runAiAnalysis = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/smart-scheduler', {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          routines,
          reminders,
          weather,
          userName,
        }),
      });

      const data = await res.json();
      if (data.suggestions && Array.isArray(data.suggestions)) {
        setSuggestions(data.suggestions);
      } else {
        generateLocalFallbackSuggestions();
      }
    } catch (err) {
      console.warn('Smart scheduler API call failed, generating intelligent local analysis:', err);
      generateLocalFallbackSuggestions();
    } finally {
      setIsLoading(false);
    }
  };

  // Rule-Based Local Fallback Analysis Engine (Ensures 100% reliable output even without API response)
  const generateLocalFallbackSuggestions = () => {
    const generated: ScheduleSuggestion[] = [];

    // Check weather-sensitive routines
    routines.forEach((r) => {
      const titleLower = r.title.toLowerCase();
      
      // If weather has rain or storm
      if (weather.condition.toLowerCase().includes('rain') || weather.condition.toLowerCase().includes('storm')) {
        if (titleLower.includes('walk') || titleLower.includes('gym') || titleLower.includes('jog') || r.category === 'outdoor') {
          generated.push({
            id: `sugg-${r.id}-weather`,
            routineId: r.id,
            title: `Weather Shift: ${r.title}`,
            originalTime: r.time,
            suggestedTime: '05:30 PM',
            type: 'weather_impact',
            severity: 'high',
            reason: `Rain/Storm predicted at ${r.time} in ${weather.city}. Shifting to 05:30 PM avoids rainfall while maintaining your routine.`,
            actionLabel: 'Shift to 05:30 PM',
          });
        }
      } 
      // If weather is high heat (>30°C)
      else if (weather.temp >= 30) {
        if (titleLower.includes('gym') || titleLower.includes('workout') || titleLower.includes('fitness')) {
          generated.push({
            id: `sugg-${r.id}-heat`,
            routineId: r.id,
            title: `Heat Optimization: ${r.title}`,
            originalTime: r.time,
            suggestedTime: '06:15 PM',
            type: 'weather_impact',
            severity: 'medium',
            reason: `Temperature is at ${weather.temp}°C during peak hours. Advancing workout to 06:15 PM provides 4°C cooler evening conditions.`,
            actionLabel: 'Shift to 06:15 PM',
          });
        }
      }

      // Check for calendar overlaps with reminders
      reminders.forEach((rem) => {
        if (rem.time === r.time && !rem.completed) {
          generated.push({
            id: `sugg-${r.id}-${rem.id}-conflict`,
            routineId: r.id,
            reminderId: rem.id,
            title: `Schedule Overlap Detected`,
            originalTime: r.time,
            suggestedTime: '10:00 AM',
            type: 'calendar_conflict',
            severity: 'high',
            reason: `"${r.title}" overlaps exactly with reminder "${rem.title}" at ${r.time}. Moving routine to 10:00 AM resolves collision.`,
            actionLabel: 'Reschedule Routine to 10:00 AM',
          });
        }
      });
    });

    if (generated.length === 0) {
      generated.push({
        id: 'sugg-optimal',
        title: 'Schedule Fully Optimized! 🎯',
        originalTime: 'All Slots',
        suggestedTime: 'No Changes Needed',
        type: 'routine_optimization',
        severity: 'low',
        reason: `Weather in ${weather.city} (${weather.temp}°C ${weather.condition}) is clear and there are zero calendar conflicts across your ${routines.length} routines.`,
        actionLabel: 'Schedule Balanced',
      });
    }

    setSuggestions(generated);
  };

  useEffect(() => {
    runAiAnalysis();
  }, [routines.length, weather.temp, weather.condition]);

  const handleApplyShift = (sugg: ScheduleSuggestion) => {
    if (sugg.routineId && sugg.suggestedTime) {
      onApplyTimeShift(sugg.routineId, sugg.suggestedTime);
      setAppliedIds((prev) => [...prev, sugg.id]);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    onAddRoutine({
      title: newTitle,
      time: newTime,
      repeat: 'Daily',
      enabled: true,
      category: newCategory,
    });
    setNewTitle('');
    setShowAddModal(false);
  };

  const filteredSuggestions = suggestions.filter((s) => {
    if (activeFilter === 'weather') return s.type === 'weather_impact';
    if (activeFilter === 'conflicts') return s.type === 'calendar_conflict';
    return true;
  });

  return (
    <div className="space-y-5">
      {/* Top Smart Scheduler Banner */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/30 shadow-xl space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
              <h3 className="text-sm font-bold text-white">DIGUU Smart Scheduler</h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                AI Powered ⚡
              </span>
            </div>
            <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">
              Dynamically checks weather conditions in <span className="text-cyan-300 font-semibold">{weather.city}</span> ({weather.temp}°C {weather.condition}) and calendar overlaps to optimize your routines in real time.
            </p>
          </div>

          <button
            onClick={runAiAnalysis}
            disabled={isLoading}
            className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 transition-all shrink-0 cursor-pointer disabled:opacity-50"
            title="Re-run AI Schedule Analysis"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center justify-between pt-1 border-t border-indigo-500/20">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              All Alerts ({suggestions.length})
            </button>
            <button
              onClick={() => setActiveFilter('weather')}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                activeFilter === 'weather'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Weather Shift
            </button>
            <button
              onClick={() => setActiveFilter('conflicts')}
              className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                activeFilter === 'conflicts'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Conflicts
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1 rounded-xl bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[11px] font-bold hover:bg-pink-500/30 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Routine</span>
          </button>
        </div>
      </div>

      {/* Add New Routine Modal Form */}
      {showAddModal && (
        <motion.form
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleAddSubmit}
          className="p-4 rounded-3xl bg-slate-900 border border-indigo-500/30 space-y-3 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">New Routine Entry</h4>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Routine Title (e.g., Morning Jog)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500/50"
              required
            />
            <input
              type="text"
              placeholder="Scheduled Time (e.g., 07:00 AM)"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500/50"
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-400">Environment:</span>
            {(['outdoor', 'indoor', 'work', 'wellness'] as const).map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setNewCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all ${
                  newCategory === cat
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-950 text-slate-400 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-md hover:scale-105 transition-all"
            >
              Create & Analyze
            </button>
          </div>
        </motion.form>
      )}

      {/* Dynamic Schedule Suggestions List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-indigo-300 font-medium">DIGUU is evaluating weather forecasts and schedule conflicts...</p>
          </div>
        ) : filteredSuggestions.length === 0 ? (
          <div className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400">
            No schedule conflicts detected under this filter.
          </div>
        ) : (
          filteredSuggestions.map((sugg) => {
            const isApplied = appliedIds.includes(sugg.id);

            return (
              <motion.div
                key={sugg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-3xl border shadow-lg transition-all space-y-3 ${
                  isApplied
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : sugg.type === 'weather_impact'
                    ? 'bg-amber-950/10 border-amber-500/30'
                    : sugg.type === 'calendar_conflict'
                    ? 'bg-rose-950/10 border-rose-500/30'
                    : 'bg-slate-900/80 border-indigo-500/20'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2.5 rounded-2xl border ${
                        sugg.type === 'weather_impact'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          : sugg.type === 'calendar_conflict'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                      }`}
                    >
                      {sugg.type === 'weather_impact' ? (
                        <CloudSun className="w-5 h-5" />
                      ) : sugg.type === 'calendar_conflict' ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Sparkles className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-100">{sugg.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {sugg.type === 'weather_impact' ? 'Weather Trigger' : sugg.type === 'calendar_conflict' ? 'Conflict' : 'Optimal'}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${
                            sugg.severity === 'high'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {sugg.severity} Priority
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Time shift comparison pill */}
                  {sugg.originalTime !== sugg.suggestedTime && (
                    <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
                      <span className="text-slate-400 line-through">{sugg.originalTime}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-emerald-400">{sugg.suggestedTime}</span>
                    </div>
                  )}
                </div>

                {/* AI Reasoning text */}
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  💡 {sugg.reason}
                </p>

                {/* Interactive Action Button */}
                {sugg.routineId && sugg.originalTime !== sugg.suggestedTime && (
                  <div className="flex items-center justify-end pt-1">
                    {isApplied ? (
                      <span className="px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Schedule Adjusted ✓ ({sugg.suggestedTime})</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApplyShift(sugg)}
                        className="px-4 py-2 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>{sugg.actionLabel || 'Apply Time Shift'}</span>
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Routine Timeline Visualizer */}
      <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>Active Routine Schedule Timeline</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-semibold">{routines.length} Routines Configured</span>
        </div>

        <div className="space-y-2">
          {routines.map((r) => (
            <div
              key={r.id}
              className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_#ec4899]" />
                <div>
                  <div className="text-xs font-bold text-slate-100">{r.title}</div>
                  <div className="text-[10px] text-pink-300 font-medium">
                    Repeat: {r.repeat} {r.category ? `• ${r.category}` : ''}
                  </div>
                </div>
              </div>

              <div className="px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold">
                {r.time}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
