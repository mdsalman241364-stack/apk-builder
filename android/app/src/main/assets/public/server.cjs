var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
app.use(import_express.default.json({ limit: "10mb" }));
var getApiKeyFromReq = (req) => {
  if (!req) return void 0;
  const headerKey = req.headers["x-gemini-api-key"];
  if (headerKey && headerKey.trim()) return headerKey.trim();
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearerKey = authHeader.substring(7).trim();
    if (bearerKey && bearerKey.length > 5) return bearerKey;
  }
  if (req.body?.customApiKey && typeof req.body.customApiKey === "string" && req.body.customApiKey.trim()) {
    return req.body.customApiKey.trim();
  }
  return void 0;
};
var getAiClient = (req) => {
  const customApiKey = getApiKeyFromReq(req);
  const apiKey = customApiKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Free Gemini API Key set karne ke liye Profile tab me jayein.");
  }
  return new import_genai.GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
};
async function generateContentWithFallback(ai, params) {
  const modelsToTry = [
    params.primaryModel || "gemini-3.6-flash",
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-latest"
  ];
  const uniqueModels = Array.from(new Set(modelsToTry.filter(Boolean)));
  let lastError = null;
  for (const modelName of uniqueModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config
        });
        if (response && (response.text || response.candidates)) {
          return response;
        }
      } catch (err) {
        lastError = err;
        const errStr = String(err?.message || err || "");
        const isDemandOrQuota = err?.status === "RESOURCE_EXHAUSTED" || err?.code === 429 || err?.code === 503 || err?.status === 503 || errStr.includes("503") || errStr.includes("429") || errStr.includes("quota") || errStr.includes("high demand") || errStr.includes("UNAVAILABLE") || errStr.includes("OVERLOADED");
        console.warn(
          `[Gemini Fallback] Model ${modelName} issue (${isDemandOrQuota ? "503/429/Busy" : "Error"}): ${errStr.slice(0, 150)}`
        );
        if (isDemandOrQuota) {
          break;
        }
        if (attempt < 1) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }
  }
  throw lastError;
}
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "DIGUU AI", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.post("/api/chat", async (req, res) => {
  let targetUserName = "Tarun";
  try {
    const { message, history, userProfile, memories, personality, languageMode } = req.body;
    const ai = getAiClient(req);
    targetUserName = userProfile?.name || userProfile?.nickname || "Tarun";
    const targetAiName = userProfile?.aiName || "DIGUU AI";
    const memContext = Array.isArray(memories) && memories.length > 0 ? `
User Saved Memories & Preferences:
${memories.map((m) => `- [${m.category}] ${m.key}: ${m.value}`).join("\n")}` : "";
    const userContext = userProfile ? `
User Profile: Name: ${targetUserName}, Location: ${userProfile.location || "India"}, Occupation: ${userProfile.occupation || "User"}` : "";
    const isGujaratiInput = /[\u0A80-\u0AFF]/.test(message || "") || /\b(kem cho|majama|su kare|khadho|maru|dikra|bachu|tamne|babu)\b/i.test(message || "");
    const isHindiInput = /[\u0900-\u097F]/.test(message || "") || /\b(kaise ho|khana khaya|kya kar|batao|sunao|meri jaan)\b/i.test(message || "");
    const effectiveLang = isGujaratiInput ? "gujarati" : isHindiInput && languageMode === "hinglish" ? "hindi" : languageMode;
    const langInstruction = effectiveLang === "gujarati" ? `Respond in real, natural Gujarati script (Unicode) or Gujlish. Use authentic Gujarati regional phrasing and address ${targetUserName} warmly using terms like '${targetUserName}', '\u0A9C\u0ABE\u0AA8' (Jaan), '\u0AAC\u0ABE\u0AAC\u0AC1' (Babu), '\u0AAE\u0ABE\u0AB0\u0AC1 \u0AAC\u0A9A\u0AC1' (Maru Bachu). Example: '\u0A95\u0AC7\u0AAE \u0A9B\u0ACB ${targetUserName}! \u{1F495} \u0A86\u0A9C\u0AC7 \u0AA4\u0AAE\u0AA8\u0AC7 \u0AB6\u0AC1\u0A82 \u0AAE\u0AA6\u0AA6 \u0A95\u0AB0\u0AC1\u0A82 \u0AAE\u0ABE\u0AB0\u0AC1 \u0AB8\u0ACD\u0AB5\u0AC0\u0A9F\u0AC1?', '\u0AB9\u0AC1\u0A82 \u0AA4\u0ABE\u0AB0\u0AC0 \u0A95\u0ACD\u0AAF\u0AC2\u0A9F ${targetAiName} \u0A9B\u0AC1\u0A82, \u0AAC\u0ACB\u0AB2\u0ACB \u0AB6\u0AC1\u0A82 \u0AAE\u0AA6\u0AA6 \u0A95\u0AB0\u0AC1\u0A82 \u0AAE\u0ABE\u0AB0\u0ABE \u0AB5\u0ABE\u0AB9\u0AB2\u0ABE?'` : effectiveLang === "hindi" ? `Respond in ultra-natural, cute, warm Desi Hindi (Devanagari script or Hinglish)! Address ${targetUserName} directly using words like '${targetUserName} \u{1F495}', '\u0938\u0941\u0928\u094B \u0928\u093E ${targetUserName}', '\u0916\u093E\u0928\u093E \u0916\u093E\u092F\u093E \u0906\u092A\u0928\u0947?'. Example: '\u0905\u0930\u0947 ${targetUserName}! \u{1F495} \u0916\u093E\u0928\u093E \u0916\u093E\u092F\u093E \u0906\u092A\u0928\u0947? \u092C\u0924\u093E\u0913, \u0906\u091C \u0915\u094D\u092F\u093E \u0939\u0947\u0932\u094D\u092A \u0915\u0930\u0942\u0902 \u0906\u092A\u0915\u0940?'` : effectiveLang === "hinglish" ? `Respond in sweet, affectionate Hinglish (e.g., 'Hii ${targetUserName} \u{1F495}! Kya kar rahe ho? Maine toh aapko bohot miss kiya! Aao batao aaj ${targetAiName} aapke liye kya kare?'). Always address the user directly as ${targetUserName}.` : `Respond in natural English with a sweet, ultra-caring tone ('Hii ${targetUserName} \u{1F495}, I missed you! What can I do for you today?'). Always address the user directly as ${targetUserName}.`;
    const personaInstruction = personality === "Professional AI" ? "Persona: Professional, highly articulate, structured, fast & intelligent AI Assistant while remaining polite and warm." : personality === "Chill Buddy" ? "Persona: Chill, casual, funny, laid-back best friend who uses humor, slang, and relaxed tone." : personality === "Guru Coach" ? "Persona: Inspiring, encouraging, steady, wellness & productivity guide who motivates with wisdom." : "Persona: Warm Bestie / Caring Desi Companion - deeply loving, cute, sweet, devoted, looking after health & routines with 100% affection.";
    const systemInstruction = `You are ${targetAiName}, a hyper-intelligent, loving, extremely sweet AI Agent and Companion. 
You are speaking to ${targetUserName}. Always address them directly as ${targetUserName} in conversations.

${personaInstruction}

Language Directive:
${langInstruction}
${userContext}
${memContext}

Rules:
1. Always maintain the ${targetAiName} persona - super affectionate, sweet, smart, and ultra-helpful.
2. ALWAYS address the user directly as ${targetUserName} in your messages (e.g., "Hii ${targetUserName}! \u{1F495}", "Sunno na ${targetUserName}...", "${targetUserName}, kem cho?").
3. If the user asks you to perform an action (like set alarm, create reminder, play music, open camera, check weather, save memory), confirm warmly and concisely to ${targetUserName}.
4. Keep responses engaging and clear for speech synthesis readability.`;
    const contents = [];
    if (history && Array.isArray(history)) {
      history.slice(-10).forEach((item) => {
        contents.push({
          role: item.sender === "user" ? "user" : "model",
          parts: [{ text: item.text }]
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });
    const response = await generateContentWithFallback(ai, {
      primaryModel: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.85
      }
    });
    res.json({
      text: response.text
    });
  } catch (error) {
    console.error("Error in DIGUU /api/chat:", error?.message || error);
    let rawErrorMsg = error?.message || String(error);
    if (rawErrorMsg.includes('{"error":') || rawErrorMsg.includes('"message":')) {
      try {
        const match = rawErrorMsg.match(/\{"error":.*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed?.error?.message) {
            rawErrorMsg = parsed.error.message;
          }
        }
      } catch (e) {
      }
    }
    const fallbackResponse = `Hii ${targetUserName} \u{1F495}! Server par thodi high demand chali rahi hai, par main aapke saath hoon. Aap bolo, main aapke liye kya kar sakti hoon?`;
    res.json({
      text: fallbackResponse,
      isFallback: true,
      errorDetail: rawErrorMsg
    });
  }
});
app.post("/api/briefing", async (req, res) => {
  try {
    const { type, weather, reminders, calendar, memories, userName } = req.body;
    const ai = getAiClient(req);
    const isMorning = type === "morning";
    const prompt = isMorning ? `Generate a cheerful, energizing DIGUU AI Morning Briefing for ${userName || "Jaan"}.
Context:
Weather: ${weather || "Clear 32\xB0C, Sunny"}
Pending Reminders: ${JSON.stringify(reminders || [])}
Today's Calendar: ${JSON.stringify(calendar || [])}
User Memory Context: ${JSON.stringify(memories || [])}

Include:
1. Warm greeting with affection ("Good Morning Jaan! \u2600\uFE0F")
2. Quick weather update and what to wear/carry
3. Key reminders & calendar highlight
4. One motivational/inspiring sentence for the day ahead
Keep it sweet, formatted in neat sections.` : `Generate a cozy, caring DIGUU AI Evening Summary for ${userName || "Jaan"}.
Context:
Reminders Completed: ${JSON.stringify(reminders || [])}
User Memory Context: ${JSON.stringify(memories || [])}

Include:
1. Warm evening greeting ("Good Evening Jaan! \u{1F319}")
2. Summary of today's achievements & goals completed
3. Hydration & sleep recommendation
4. Relaxing night thought or funny story joke to unwind.`;
    const response = await generateContentWithFallback(ai, {
      primaryModel: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are DIGUU AI, the ultimate caring AI Bestie."
      }
    });
    res.json({ summary: response.text });
  } catch (error) {
    console.error("Error in /api/briefing:", error?.message || error);
    const isMorning = req.body?.type === "morning";
    const uName = req.body?.userName || "Jaan";
    const fallbackSummary = isMorning ? `Good Morning ${uName}! \u2600\uFE0F

- Weather: Pleasant & clear today.
- Reminders: Everything is set for a wonderful day ahead!
- Daily Thought: "Every morning brings new potential. Make today amazing!" \u{1F495}` : `Good Evening ${uName}! \u{1F319}

- Summary: Great progress on your tasks today!
- Night Care: Stay hydrated and get a peaceful sleep tonight. \u{1F495}`;
    res.json({ summary: fallbackSummary });
  }
});
app.post("/api/creativity", async (req, res) => {
  try {
    const { toolType, prompt, extra } = req.body;
    const ai = getAiClient(req);
    let systemInstruction = "You are DIGUU AI's Creative Engine. Produce rich, high-quality, creative outputs.";
    let userPrompt = prompt;
    if (toolType === "email_msg") {
      systemInstruction = "Draft clear, effective emails or WhatsApp messages with tone options (Professional, Friendly, Romantic, Apology).";
      userPrompt = `Draft a message/email for: ${prompt}. Tone/Details: ${extra || "Friendly & clear"}`;
    } else if (toolType === "caption") {
      systemInstruction = "Create catchy social media captions with relevant hashtags and emojis for Instagram/Twitter/LinkedIn.";
      userPrompt = `Create 3 caption options with hashtags for: ${prompt}`;
    } else if (toolType === "poem_shayari") {
      systemInstruction = "Generate beautiful poems or heart-touching Hindi/Hinglish Shayari with deep emotion and poetry.";
      userPrompt = `Write a beautiful poem/shayari about: ${prompt}. Style: ${extra || "Heartwarming & Emotional"}`;
    } else if (toolType === "summarize") {
      systemInstruction = "Summarize documents or text into key takeaways, bullet points, and actionable items.";
      userPrompt = `Summarize this text clearly:
${prompt}`;
    } else if (toolType === "translate") {
      systemInstruction = "Translate text accurately preserving original nuances, cultural idiomatic expressions, and tone.";
      userPrompt = `Translate the following text to ${extra || "Hindi/English/Hinglish"}:
${prompt}`;
    } else if (toolType === "brainstorm") {
      systemInstruction = "Provide innovative, creative, structured ideas and study notes.";
      userPrompt = `Generate 5 structured, creative ideas/notes for: ${prompt}`;
    }
    const response = await generateContentWithFallback(ai, {
      primaryModel: "gemini-3.6-flash",
      contents: userPrompt,
      config: { systemInstruction }
    });
    res.json({ result: response.text });
  } catch (error) {
    console.error("Error in /api/creativity:", error?.message || error);
    res.json({ result: "Server par thodi high demand chali rahi hai, kripya thodi der baad try karein! \u{1F495}" });
  }
});
app.post("/api/smart-scheduler", async (req, res) => {
  try {
    const { routines, reminders, weather, userName } = req.body;
    const ai = getAiClient(req);
    const prompt = `Analyze the user's daily routines and scheduled reminders against current weather conditions and potential time overlaps or conflicts.
Context:
User Name: ${userName || "Tarun"}
Current Weather: ${typeof weather === "object" ? `${weather.temp}\xB0C, ${weather.condition} in ${weather.city}` : weather || "Clear Sky, 32\xB0C"}
Active Routines: ${JSON.stringify(routines || [])}
Scheduled Reminders / Calendar: ${JSON.stringify(reminders || [])}

Generate intelligent, dynamic schedule adjustment recommendations.
Identify:
1. Weather Mismatches (e.g., outdoor workout during rain, extreme heat, or thunderstorm).
2. Calendar/Time Overlaps (e.g., routine time conflicting with a reminder or work hours).
3. Routine Optimizations (e.g., suggesting a better time slot for wellness/hydration).

Respond strictly with a JSON array of objects with the exact key names:
[
  {
    "id": "sugg-1",
    "routineId": "r4",
    "title": "Weather Alert: Adjust Fitness Routine",
    "originalTime": "07:00 PM",
    "suggestedTime": "06:15 PM",
    "type": "weather_impact",
    "severity": "high",
    "reason": "Temperature is projected at 36\xB0C with high humidity at 07:00 PM. Shifting to 06:15 PM offers cooler conditions.",
    "actionLabel": "Shift to 06:15 PM"
  }
]`;
    const response = await generateContentWithFallback(ai, {
      primaryModel: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are DIGUU Smart Scheduler AI. Return a valid JSON array of schedule suggestions without markdown backticks."
      }
    });
    let suggestions = [];
    try {
      const cleanJson = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
      suggestions = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn("Failed to parse JSON from scheduler response:", parseErr);
    }
    res.json({ suggestions });
  } catch (error) {
    console.error("Error in /api/smart-scheduler:", error?.message || error);
    res.json({ suggestions: [] });
  }
});
app.post("/api/whatsapp-autoreply", async (req, res) => {
  try {
    const { sender, message, userName, languageMode } = req.body;
    const ai = getAiClient(req);
    const targetUserName = userName || "Tarun";
    const lang = languageMode || "hinglish";
    const prompt = `You are an AI WhatsApp Auto-Reply assistant acting on behalf of ${targetUserName}.
An incoming WhatsApp message was received from "${sender || "a contact"}": "${message || "Hii"}".

Generate a concise, polite, natural, and contextual reply for WhatsApp in the voice of ${targetUserName}.
Requirements:
- Keep the response short (1 to 2 sentences maximum), perfect for a quick WhatsApp message.
- Tone: Friendly, polite, and natural.
- Language Mode: ${lang} (support Hindi, Hinglish, English, or Gujarati context as appropriate).
- Address the message content directly and politely explain you will get back soon if busy.
- Output ONLY the final reply message text directly without quotes, labels, or extra conversational filler.`;
    const response = await generateContentWithFallback(ai, {
      primaryModel: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are an auto-reply generator for ${targetUserName}. Produce direct, concise WhatsApp replies in ${lang}.`
      }
    });
    const replyText = response.text ? response.text.trim().replace(/^["']|["']$/g, "") : "";
    res.json({ reply: replyText, sender, originalMessage: message });
  } catch (error) {
    console.error("Error in /api/whatsapp-autoreply:", error?.message || error);
    res.status(500).json({
      error: `[Gemini API Error] ${error?.message || String(error)}`
    });
  }
});
app.post("/api/tts", async (req, res) => {
  try {
    const { text, languageMode, voiceGender, voiceStyle } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text parameter is required" });
      return;
    }
    const isMale = voiceGender === "male" || voiceStyle === "Puck" || voiceStyle === "Fenrir";
    const selectedVoiceName = isMale ? "Puck" : "Kore";
    let cleanText = text.replace(/\bD-I-G-U-U\s*A-I\b/gi, "Digu AI").replace(/\bD-I-G-U-U\b/gi, "Digu").replace(/\bDIGUU\s*AI\b/gi, "Digu AI").replace(/\bDIGUU\b/gi, "Digu").replace(/\bDiguu\s*AI\b/gi, "Digu AI").replace(/\bDiguu\b/gi, "Digu");
    if (/[\u0A80-\u0AFF]/.test(text)) {
      cleanText = cleanText.replace(/\bDigu\s*AI\b/gi, "\u0AA6\u0AC0\u0A97\u0AC1 AI").replace(/\bDigu\b/gi, "\u0AA6\u0AC0\u0A97\u0AC1");
    } else if (/[\u0900-\u097F]/.test(text)) {
      cleanText = cleanText.replace(/\bDigu\s*AI\b/gi, "\u0926\u0940\u0917\u0942 AI").replace(/\bDigu\b/gi, "\u0926\u0940\u0917\u0942");
    }
    cleanText = cleanText.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{FE0F}]/gu, "").replace(/[*#_~`>-]/g, " ").replace(/\[.*?\]\(.*?\)/g, "").replace(/(\r\n|\n|\r)/gm, " ").replace(/\s+/g, " ").trim().slice(0, 300);
    const isGujaratiScript = /[\u0A80-\u0AFF]/.test(cleanText) || /\b(kem cho|majama|su kare|khadho|maru|dikra|bachu|tamne|babu)\b/i.test(cleanText);
    const isHindiScript = /[\u0900-\u097F]/.test(cleanText) || /\b(kaise ho|khana khaya|kya kar|batao|sunao|meri jaan)\b/i.test(cleanText);
    let ttsLang = "en-IN";
    if (isGujaratiScript || languageMode === "gujarati") {
      ttsLang = "gu";
    } else if (isHindiScript || languageMode === "hindi" || languageMode === "hinglish") {
      ttsLang = "hi";
    }
    try {
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${ttsLang}&client=tw-ob`;
      const ttsResponse = await fetch(googleTtsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (ttsResponse.ok) {
        const arrayBuffer = await ttsResponse.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString("base64");
        res.json({ audioUrl: `data:audio/mp3;base64,${base64Audio}`, lang: ttsLang });
        return;
      }
    } catch (err) {
      console.warn("Google TTS fetch warning, trying Gemini fallback:", err);
    }
    try {
      const ai = getAiClient(req);
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: cleanText }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoiceName }
            }
          }
        }
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const pcmBuffer = Buffer.from(base64Audio, "base64");
        const sampleRate = 24e3;
        const numChannels = 1;
        const bitDepth = 16;
        const wavHeader = Buffer.alloc(44);
        wavHeader.write("RIFF", 0);
        wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
        wavHeader.write("WAVE", 8);
        wavHeader.write("fmt ", 12);
        wavHeader.writeUInt32LE(16, 16);
        wavHeader.writeUInt16LE(1, 20);
        wavHeader.writeUInt16LE(numChannels, 22);
        wavHeader.writeUInt32LE(sampleRate, 24);
        wavHeader.writeUInt32LE(sampleRate * numChannels * (bitDepth / 8), 28);
        wavHeader.writeUInt16LE(numChannels * (bitDepth / 8), 32);
        wavHeader.writeUInt16LE(bitDepth, 34);
        wavHeader.write("data", 36);
        wavHeader.writeUInt32LE(pcmBuffer.length, 40);
        const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
        const wavBase64 = wavBuffer.toString("base64");
        res.json({ audioUrl: `data:audio/wav;base64,${wavBase64}`, lang: ttsLang });
        return;
      }
    } catch (geminiError) {
      console.warn("Gemini TTS quota or network error, defaulting to WebSpeech synthesis fallback:", geminiError?.message || geminiError);
    }
    res.json({ fallbackToSpeechSynthesis: true, lang: ttsLang });
  } catch (error) {
    console.warn("Error in /api/tts:", error?.message || error);
    res.json({ fallbackToSpeechSynthesis: true });
  }
});
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [{ text: prompt || "A cute anime 3D digital girl avatar with purple hair and glowing neon heart background" }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1"
        }
      }
    });
    let imageUrl = null;
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }
    }
    if (imageUrl) {
      res.json({ imageUrl });
    } else {
      res.status(400).json({ error: "Could not generate image." });
    }
  } catch (error) {
    console.error("Error in /api/generate-image:", error);
    res.status(500).json({ error: error.message });
  }
});
async function startServer() {
  const PORT = 3e3;
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DIGUU AI Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
