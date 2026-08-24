import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, X, Check, Settings, ExternalLink, Lock } from 'lucide-react';
import { AppPermissions } from '../types';
import { openNativeAppSettings } from '../utils/nativeBridge';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: AppPermissions;
  onTogglePermission: (key: keyof AppPermissions) => Promise<void> | void;
}

const permissionInfo: { key: keyof AppPermissions; label: string; desc: string }[] = [
  { key: 'microphone', label: 'Microphone Access', desc: 'Required for real-time voice commands and speech conversation' },
  { key: 'storage', label: 'Storage & Media', desc: 'Required for saving AI notes, images, and voice transcripts' },
  { key: 'camera', label: 'Camera Access', desc: 'Required for photo capture and visual AI queries' },
  { key: 'location', label: 'Location Access', desc: 'Required for weather updates and travel navigation time' },
  { key: 'contacts', label: 'Contacts Access', desc: 'Required for contacting friends and custom auto-reply lists' },
  { key: 'calendar', label: 'Calendar Access', desc: 'Required for morning briefing agenda and reminder sync' },
  { key: 'notifications', label: 'Notifications', desc: 'Required for proactive briefings, alarms, and alerts' },
];

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  permissions,
  onTogglePermission,
}) => {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggle = async (key: keyof AppPermissions) => {
    setLoadingKey(key);
    try {
      await onTogglePermission(key);
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold text-slate-100">System Permissions Control Center</h3>
              <p className="text-xs text-emerald-300">Synchronized With Real Android OS State</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Runtime Permissions List */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Android Runtime Permissions</h4>
          {permissionInfo.map((item) => {
            const isGranted = !!permissions[item.key];
            const isLoading = loadingKey === item.key;

            return (
              <div
                key={item.key}
                className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-200 flex items-center gap-2">
                    <span>{item.label}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                      isGranted
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {isGranted ? 'Granted ✓' : 'Denied'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                </div>

                <button
                  onClick={() => handleToggle(item.key)}
                  disabled={isLoading}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isGranted ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                  }`}
                  title={isGranted ? 'Granted in Android OS' : 'Tap to Request Android Permission'}
                >
                  {isLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 font-black" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Open App Info Settings Option */}
        <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-2 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Manage Android System Settings</span>
            </span>
            <span className="text-[10px] text-indigo-300">Android OS Control</span>
          </div>

          <p className="text-[11px] text-slate-400">
            If a permission was permanently denied, you can enable or revoke it anytime directly in Android App Settings.
          </p>

          <button
            onClick={() => openNativeAppSettings()}
            className="w-full py-2.5 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-indigo-400" />
            <span>Open Android App Info & Permissions</span>
          </button>
        </div>

        <div className="pt-1 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg cursor-pointer"
          >
            Close & Return to DIGUU AI
          </button>
        </div>
      </motion.div>
    </div>
  );
};
