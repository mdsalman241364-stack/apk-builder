/**
 * DIGUU AI Native Device Bridge & Capacitor System Control Plugin
 */

import { getApiHeaders } from './apiUtils';
import { AppPermissions } from '../types';

let activeMediaStream: MediaStream | null = null;
let flashlightTrack: MediaStreamTrack | null = null;
let isFlashlightOn = false;

export interface SinglePermissionResult {
  granted: boolean;
  status: string;
  permanentlyDenied: boolean;
}

/**
 * Check Current Native Permission Granted Statuses without Prompting
 */
export async function checkNativePermissions(): Promise<AppPermissions> {
  const result: AppPermissions = {
    microphone: false,
    storage: false,
    camera: false,
    location: false,
    contacts: false,
    calendar: false,
    notifications: false,
  };

  const NativePermissions = (window as any).Capacitor?.Plugins?.NativePermissions;

  if (NativePermissions && typeof NativePermissions.checkAllPermissions === 'function') {
    try {
      const res = await NativePermissions.checkAllPermissions();
      result.microphone = res.microphone === 'granted';
      result.camera = res.camera === 'granted';
      result.location = res.location === 'granted';
      result.notifications = res.notifications === 'granted';
      result.contacts = res.contacts === 'granted';
      result.calendar = res.calendar === 'granted';
      result.storage = res.storage === 'granted';
      return result;
    } catch (e) {
      console.warn('NativePermissions.checkAllPermissions warning:', e);
    }
  }

  // Web Browser / Web Preview Mode Fallback
  try {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const mic = await navigator.permissions.query({ name: 'microphone' as any });
        result.microphone = mic.state === 'granted';
      } catch (e) {}

      try {
        const cam = await navigator.permissions.query({ name: 'camera' as any });
        result.camera = cam.state === 'granted';
      } catch (e) {}

      try {
        const geo = await navigator.permissions.query({ name: 'geolocation' as any });
        result.location = geo.state === 'granted';
      } catch (e) {}
    }

    if ('Notification' in window) {
      result.notifications = Notification.permission === 'granted';
    }
  } catch (err) {
    console.warn('Web permissions query warning:', err);
  }

  return result;
}

/**
 * Request a single Android Runtime Permission via Native Plugin or System API
 */
export async function requestSingleNativePermission(
  permissionKey: keyof AppPermissions
): Promise<SinglePermissionResult> {
  const NativePermissions = (window as any).Capacitor?.Plugins?.NativePermissions;

  if (NativePermissions && typeof NativePermissions.requestPermission === 'function') {
    try {
      const res = await NativePermissions.requestPermission({ permission: permissionKey });
      const isGranted = res.granted === true || res.status === 'granted';
      const isPermanentlyDenied = res.permanentlyDenied === true || res.status === 'denied_permanent';
      return {
        granted: isGranted,
        status: res.status || (isGranted ? 'granted' : 'denied'),
        permanentlyDenied: isPermanentlyDenied,
      };
    } catch (e) {
      console.warn(`NativePermissions.requestPermission error for ${permissionKey}:`, e);
    }
  }

  // Web Browser / Web Preview Fallbacks
  if (permissionKey === 'microphone') {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return { granted: true, status: 'granted', permanentlyDenied: false };
      } catch (e) {
        return { granted: false, status: 'denied', permanentlyDenied: true };
      }
    }
  } else if (permissionKey === 'camera') {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        return { granted: true, status: 'granted', permanentlyDenied: false };
      } catch (e) {
        return { granted: false, status: 'denied', permanentlyDenied: true };
      }
    }
  } else if (permissionKey === 'location') {
    if ('geolocation' in navigator) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve({ granted: true, status: 'granted', permanentlyDenied: false }),
          () => resolve({ granted: false, status: 'denied', permanentlyDenied: true }),
          { timeout: 5000 }
        );
      });
    }
  } else if (permissionKey === 'notifications') {
    if ('Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        return {
          granted: res === 'granted',
          status: res === 'granted' ? 'granted' : 'denied',
          permanentlyDenied: res === 'denied',
        };
      } catch (e) {}
    }
  }

  return { granted: false, status: 'denied', permanentlyDenied: false };
}

/**
 * Open Android System App Settings Page (App Info -> Permissions)
 */
export async function openNativeAppSettings(): Promise<void> {
  const NativePermissions = (window as any).Capacitor?.Plugins?.NativePermissions;
  if (NativePermissions && typeof NativePermissions.openAppSettings === 'function') {
    try {
      await NativePermissions.openAppSettings();
      return;
    } catch (e) {
      console.warn('NativePermissions.openAppSettings error:', e);
    }
  }

  try {
    window.location.href = 'intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;end';
  } catch (err) {
    console.warn('Could not launch Android app details settings intent:', err);
  }
}

/**
 * Sequential Runtime Permission Requester for Android Launch
 */
export async function requestNativeAndroidPermissions(): Promise<AppPermissions> {
  const current = await checkNativePermissions();
  return current;
}

/**
 * Redirect User to Android System Settings for Special System Actions
 */
export function openSpecialSystemSettings(settingType: 'notification_listener'): void {
  try {
    let intentUri = 'intent:#Intent;action=android.settings.SETTINGS;end';
    if (settingType === 'notification_listener') {
      intentUri = 'intent:#Intent;action=android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS;end';
    }
    window.location.href = intentUri;
  } catch (err) {
    console.warn(`Could not launch intent for ${settingType}:`, err);
  }
}

/**
 * Generate AI WhatsApp Auto-Reply via server endpoint
 */
export async function generateWhatsAppAIReply(
  sender: string,
  message: string,
  userName: string = 'Tarun',
  languageMode: string = 'hinglish',
  rule: string = 'all',
  customContacts: string = ''
): Promise<string> {
  try {
    const response = await fetch('/api/whatsapp-autoreply', {
      method: 'POST',
      headers: getApiHeaders(),
      body: JSON.stringify({
        sender,
        message,
        userName,
        languageMode,
        rule,
        customContacts,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.reply || `Hii ${sender}! ${userName} is currently away. Will get back to you shortly!`;
    }
  } catch (err) {
    console.warn('Error calling WhatsApp AutoReply endpoint:', err);
  }
  return `Hii! ${userName} is currently busy and will reply to you soon.`;
}

/**
 * Toggle Device Flashlight / Torch LED
 */
export async function toggleNativeFlashlight(): Promise<boolean> {
  try {
    if (isFlashlightOn && flashlightTrack) {
      await (flashlightTrack as any).applyConstraints({ advanced: [{ torch: false }] });
      flashlightTrack.stop();
      flashlightTrack = null;
      if (activeMediaStream) {
        activeMediaStream.getTracks().forEach((t) => t.stop());
        activeMediaStream = null;
      }
      isFlashlightOn = false;
      return false;
    } else {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        activeMediaStream = stream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          flashlightTrack = track;
          const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
          if (capabilities && capabilities.torch) {
            await (track as any).applyConstraints({ advanced: [{ torch: true }] });
          }
          isFlashlightOn = true;
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('Flashlight toggle warning:', err);
    isFlashlightOn = !isFlashlightOn;
    return isFlashlightOn;
  }
  return false;
}

/**
 * Open WhatsApp directly with Android intent or wa.me deep link
 */
export function openNativeWhatsApp(message: string = 'Hii! Sent via DIGUU AI 💕', phone?: string): void {
  const encodedText = encodeURIComponent(message);
  let url = `whatsapp://send?text=${encodedText}`;
  if (phone) {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    url = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  }

  const fallbackUrl = phone
    ? `https://wa.me/${phone}?text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  try {
    const win = window.open(url, '_blank');
    if (!win) {
      window.location.href = fallbackUrl;
    }
  } catch (e) {
    window.location.href = fallbackUrl;
  }
}

/**
 * Trigger Android Clock / Calendar Intent for Alarms & Reminders
 */
export function triggerNativeAlarmOrCalendar(title: string = 'DIGUU Reminder', time?: string): void {
  try {
    const alarmIntentUrl = `intent:#Intent;action=android.intent.action.SET_ALARM;S.android.intent.extra.MESSAGE=${encodeURIComponent(title)};end`;
    window.location.href = alarmIntentUrl;
  } catch (e) {
    console.log('Fallback intent for alarm:', e);
  }
}

/**
 * Trigger Camera Capture
 */
export async function triggerNativeCameraCapture(onPhotoCaptured?: (dataUrl: string) => void): Promise<void> {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      video.onloadedmetadata = () => {
        setTimeout(() => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg');
            if (onPhotoCaptured) onPhotoCaptured(dataUrl);
          }
          stream.getTracks().forEach((t) => t.stop());
        }, 1000);
      };
    }
  } catch (err) {
    console.warn('Camera capture error:', err);
  }
}
