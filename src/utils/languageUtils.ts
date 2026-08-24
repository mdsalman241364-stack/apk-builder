/**
 * DIGUU AI - Language Detection, Script Identification & Persona Voice Config Helper
 */

export type LanguageMode = 'hinglish' | 'hindi' | 'gujarati' | 'english';
export type PersonalityType = 'Warm Bestie' | 'Professional AI' | 'Chill Buddy' | 'Guru Coach';

/**
 * Detect language script or Unicode pattern in message text
 */
export function detectTextLanguage(text: string, defaultMode: LanguageMode = 'hinglish'): {
  detectedLang: LanguageMode;
  bcp47Tag: string;
  isGujaratiScript: boolean;
  isDevanagariScript: boolean;
} {
  // Check Gujarati Unicode range: \u0A80-\u0AFF
  const isGujaratiScript = /[\u0A80-\u0AFF]/.test(text);
  
  // Check Devanagari (Hindi) Unicode range: \u0900-\u097F
  const isDevanagariScript = /[\u0900-\u097F]/.test(text);

  // Check common Gujarati words in Roman script (Gujlish)
  const isGujlishWords = /\b(kem cho|majama|su kare|khadho|maru|maro|dikra|bachu|tamne|babu|khano)\b/i.test(text);

  if (isGujaratiScript || (defaultMode === 'gujarati' && !isDevanagariScript) || isGujlishWords) {
    return {
      detectedLang: 'gujarati',
      bcp47Tag: 'gu-IN',
      isGujaratiScript,
      isDevanagariScript,
    };
  }

  if (isDevanagariScript || defaultMode === 'hindi') {
    return {
      detectedLang: 'hindi',
      bcp47Tag: 'hi-IN',
      isGujaratiScript,
      isDevanagariScript,
    };
  }

  if (defaultMode === 'hinglish') {
    return {
      detectedLang: 'hinglish',
      bcp47Tag: 'hi-IN', // Native hi-IN handles Hinglish phonetic accents naturally
      isGujaratiScript,
      isDevanagariScript,
    };
  }

  return {
    detectedLang: 'english',
    bcp47Tag: 'en-IN',
    isGujaratiScript,
    isDevanagariScript,
  };
}

/**
 * Clean markdown, brand names, and emoji noise before passing to TTS for pristine pronunciation
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return '';

  // 1. Sanitize brand names so they don't get spelled out letter-by-letter (D-I-G-U-U A-I or D I G U U)
  let cleaned = text
    .replace(/\bD-I-G-U-U\s*A-I\b/gi, 'Digu AI')
    .replace(/\bD-I-G-U-U\b/gi, 'Digu')
    .replace(/\bDIGUU\s*AI\b/gi, 'Digu AI')
    .replace(/\bDIGUU\b/gi, 'Digu')
    .replace(/\bDiguu\s*AI\b/gi, 'Digu AI')
    .replace(/\bDiguu\b/gi, 'Digu');

  // If Gujarati script is present, convert "Digu" to "દીગુ" for native script phonetic reading
  if (/[\u0A80-\u0AFF]/.test(text)) {
    cleaned = cleaned.replace(/\bDigu\s*AI\b/gi, 'દીગુ AI').replace(/\bDigu\b/gi, 'દીગુ');
  } else if (/[\u0900-\u097F]/.test(text)) {
    cleaned = cleaned.replace(/\bDigu\s*AI\b/gi, 'दीगू AI').replace(/\bDigu\b/gi, 'दीगू');
  }

  // 2. Strip out emojis and special unicode symbols to prevent awkward pauses or verbalizing codes
  cleaned = cleaned
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{FE0F}]/gu, '')
    .replace(/[*#_~`>-]/g, ' ') // Remove markdown symbols
    .replace(/\[.*?\]\(.*?\)/g, '') // Remove markdown links
    .replace(/(\r\n|\n|\r)/gm, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();

  return cleaned;
}

/**
 * Get Persona-based TTS Pitch and Speed Settings with Male / Female Engine Support
 */
export function getPersonaVoiceSettings(
  personality: PersonalityType,
  baseSpeed: number = 1.0,
  voiceGender: 'male' | 'female' = 'male'
): { pitch: number; rate: number } {
  if (voiceGender === 'male') {
    switch (personality) {
      case 'Warm Bestie':
        return { pitch: 0.88, rate: baseSpeed * 1.0 }; // Warm Indian Male Pitch
      case 'Professional AI':
        return { pitch: 0.82, rate: baseSpeed * 1.05 };
      case 'Chill Buddy':
        return { pitch: 0.78, rate: baseSpeed * 0.95 };
      case 'Guru Coach':
        return { pitch: 0.85, rate: baseSpeed * 0.9 };
      default:
        return { pitch: 0.85, rate: baseSpeed };
    }
  }

  // Female Voice Engine Settings
  switch (personality) {
    case 'Warm Bestie':
      return {
        pitch: 1.25, // Sweet, cute, affectionate pitch
        rate: baseSpeed * 1.0,
      };
    case 'Professional AI':
      return {
        pitch: 1.0, // Clear, articulate, balanced
        rate: baseSpeed * 1.05,
      };
    case 'Chill Buddy':
      return {
        pitch: 0.95, // Relaxed, friendly, casual
        rate: baseSpeed * 0.95,
      };
    case 'Guru Coach':
      return {
        pitch: 1.1, // Encouraging, warm, steady
        rate: baseSpeed * 0.9,
      };
    default:
      return { pitch: 1.2, rate: baseSpeed };
  }
}
