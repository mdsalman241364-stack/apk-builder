import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Sparkles } from 'lucide-react';
import { QuickActionItem, Reminder } from '../types';
import { 
  toggleNativeFlashlight, 
  openNativeWhatsApp, 
  triggerNativeAlarmOrCalendar, 
  triggerNativeCameraCapture 
} from '../utils/nativeBridge';

interface QuickActionsModalProps {
  actionItem: QuickActionItem | null;
  onClose: () => void;
  onAddReminder: (reminder: Omit<Reminder, 'id' | 'completed'>) => void;
}

export const QuickActionsModal: React.FC<QuickActionsModalProps> = ({
  actionItem,
  onClose,
  onAddReminder,
}) => {
  if (!actionItem) return null;

  // State for forms
  const [remTitle, setRemTitle] = useState(actionItem.label || '');
  const [remTime, setRemTime] = useState('08:00 PM');
  const [remDate, setRemDate] = useState('15 May 2026');
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const handleReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddReminder({
      title: remTitle,
      date: remDate,
      time: remTime,
      repeat: 'Daily',
      category: 'Health',
      soundName: 'Sweet Tone',
    });
    triggerNativeAlarmOrCalendar(remTitle, remTime);
    setStatusMessage('Reminder & Native Alarm Triggered! 🔔');
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 1500);
  };

  const handleCalculate = () => {
    try {
      const cleaned = calcInput.replace(/[^0-9+\-*/().]/g, '');
      // eslint-disable-next-line no-eval
      const res = eval(cleaned);
      setCalcResult(String(res));
    } catch (e) {
      setCalcResult('Error');
    }
  };

  const handleExecuteQuickAction = async () => {
    const act = actionItem.action.toLowerCase();
    const label = actionItem.label.toLowerCase();

    if (act.includes('flashlight') || label.includes('flashlight') || label.includes('torch')) {
      const isOn = await toggleNativeFlashlight();
      setStatusMessage(isOn ? 'Flashlight ON 🔦' : 'Flashlight OFF 🔦');
    } else if (act.includes('whatsapp') || label.includes('whatsapp') || label.includes('chat')) {
      openNativeWhatsApp('Hii Jaan! DIGUU AI is sending this message 💕');
      setStatusMessage('Opening WhatsApp... 💬');
    } else if (act.includes('camera') || label.includes('camera') || label.includes('photo')) {
      setStatusMessage('Opening Camera Feed... 📷');
      await triggerNativeCameraCapture((dataUrl) => {
        setCapturedPhoto(dataUrl);
        setStatusMessage('Photo Captured! 📷');
      });
    } else if (act.includes('alarm') || act.includes('reminder') || label.includes('alarm')) {
      triggerNativeAlarmOrCalendar(actionItem.label);
      setStatusMessage('Opening Native Android Clock Intent... ⏰');
    } else {
      setStatusMessage(`Executed "${actionItem.label}" via DIGUU AI 💕`);
    }

    if (!capturedPhoto) {
      setTimeout(() => {
        setStatusMessage(null);
        onClose();
      }, 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-slate-900 border border-pink-500/30 rounded-3xl p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-pink-500/20 text-pink-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">{actionItem.label}</h3>
              <p className="text-[11px] text-pink-300">"{actionItem.shortcut}"</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {statusMessage ? (
          <div className="py-6 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-pink-400 mx-auto animate-bounce" />
            <div className="text-xs font-bold text-pink-300">{statusMessage}</div>
            {capturedPhoto && (
              <div className="mt-3">
                <img src={capturedPhoto} alt="Captured" className="w-32 h-32 object-cover rounded-2xl mx-auto shadow-md" />
              </div>
            )}
          </div>
        ) : (
          <div>
            {actionItem.action === 'set_reminder' || actionItem.action === 'set_alarm' ? (
              <form onSubmit={handleReminderSubmit} className="space-y-3">
                <div>
                  <label className="text-[11px] text-slate-400 font-medium">Title</label>
                  <input
                    type="text"
                    value={remTitle}
                    onChange={(e) => setRemTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 mt-1"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-400 font-medium">Date</label>
                    <input
                      type="text"
                      value={remDate}
                      onChange={(e) => setRemDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-medium">Time</label>
                    <input
                      type="text"
                      value={remTime}
                      onChange={(e) => setRemTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 mt-1"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-lg mt-2"
                >
                  Save & Launch Android Alarm
                </button>
              </form>
            ) : actionItem.action === 'open_calc' ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 125 * 4 + 50"
                    value={calcInput}
                    onChange={(e) => setCalcInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                  <button
                    onClick={handleCalculate}
                    className="px-4 py-2 rounded-xl bg-pink-500 text-white text-xs font-bold"
                  >
                    =
                  </button>
                </div>
                {calcResult !== null && (
                  <div className="p-3 rounded-2xl bg-slate-950 border border-pink-500/30 text-center text-sm font-bold text-pink-300">
                    Result: {calcResult}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center space-y-4">
                <p className="text-xs text-slate-300">
                  DIGUU AI will trigger <strong className="text-pink-300">{actionItem.label}</strong> directly on your device.
                </p>
                <button
                  onClick={handleExecuteQuickAction}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-lg"
                >
                  Trigger Native Action
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
