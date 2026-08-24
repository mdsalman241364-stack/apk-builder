/**
 * API Utility helper for DIGUU AI
 * Injects custom Gemini API Key headers from LocalStorage if provided by user
 */

export function getApiHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem('user_gemini_api_key');
    if (customKey && customKey.trim()) {
      headers['x-gemini-api-key'] = customKey.trim();
      headers['Authorization'] = `Bearer ${customKey.trim()}`;
    }
  }

  return headers;
}
