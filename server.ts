import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));

// Extract custom Gemini API Key from request header, auth header, or body if provided
const getApiKeyFromReq = (req?: express.Request): string | undefined => {
  if (!req) return undefined;
  const headerKey = req.headers["x-gemini-api-key"] as string | undefined;
  if (headerKey && headerKey.trim()) return headerKey.trim();

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const bearerKey = authHeader.substring(7).trim();
    if (bearerKey && bearerKey.length > 5) return bearerKey;
  }

  if (req.body?.customApiKey && typeof req.body.customApiKey === "string" && req.body.customApiKey.trim()) {
    return req.body.customApiKey.trim();
  }
  return undefined;
};

// Initialize Gemini Client safely on server side with dynamic key resolution
const getAiClient = (req?: express.Request) => {
  const customApiKey = getApiKeyFromReq(req);
  const apiKey = customApiKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error("Free Gemini API Key set karne ke liye Profile tab me jayein.");
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Robust Gemini execution helper with active model fallback & retries
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    primaryModel?: string;
  }
) {
  const modelsToTry = [
    params.primaryModel || "gemini-3.6-flash",
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-flash-latest",
  ];

  // Remove duplicates while keeping order
  const uniqueModels = Array.from(new Set(modelsToTry.filter(Boolean)));

  let lastError: any = null;

  for (const modelName of uniqueModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        if (response && (response.text || response.candidates)) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const errStr = String(err?.message || err || "");

        const isDemandOrQuota =
          err?.status === "RESOURCE_EXHAUSTED" ||
          err?.code === 429 ||
          err?.code === 503 ||
          err?.status === 503 ||
          errStr.includes("503") ||
          errStr.includes("429") ||
          errStr.includes("quota") ||
          errStr.includes("high demand") ||
          errStr.includes("UNAVAILABLE") ||
          errStr.includes("OVERLOADED");

        console.warn(
          `[Gemini Fallback] Model ${modelName} issue (${isDemandOrQuota ? '503/429/Busy' : 'Error'}): ${errStr.slice(0, 150)}`
        );

        // If high demand, quota limit, or 503 hit, skip second attempt on this model immediately and move to next fallback model
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

// API: Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "DIGUU AI", time: new Date().toISOString() });
});

// API: Main DIGUU Chat Response
app.post("/api/chat", async (req, res) => {
  let targetUserName = "Tarun";
  try {
    const { message, history, userProfile, memories, personality, languageMode } = req.body;
    const ai = getAiClient(req);

    targetUserName = userProfile?.name || userProfile?.nickname || "Tarun";
    const targetAiName = userProfile?.aiName || "DIGUU AI";

    const memContext = Array.isArray(memories) && memories.length > 0
      ? `\nUser Saved Memories & Preferences:\n${memories.map((m: any) => `- [${m.category}] ${m.key}: ${m.value}`).join("\n")}`
      : "";

    const userContext = userProfile ? `\nUser Profile: Name: ${targetUserName}, Location: ${userProfile.location || "India"}, Occupation: ${userProfile.occupation || "User"}` : "";

    // Dynamic Language Script & Context Detection
    const isGujaratiInput = /[\u0A80-\u0AFF]/.test(message || "") || /\b(kem cho|majama|su kare|khadho|maru|dikra|bachu|tamne|babu)\b/i.test(message || "");
    const isHindiInput = /[\u0900-\u097F]/.test(message || "") || /\b(kaise ho|khana khaya|kya kar|batao|sunao|meri jaan)\b/i.test(message || "");

    const effectiveLang = isGujaratiInput ? "gujarati" : (isHindiInput && languageMode === "hinglish") ? "hindi" : languageMode;

    const langInstruction = effectiveLang === "gujarati"
      ? `Respond in real, natural Gujarati script (Unicode) or Gujlish. Use authentic Gujarati regional phrasing and address ${targetUserName} warmly using terms like '${targetUserName}', 'જાન' (Jaan), 'બાબુ' (Babu), 'મારુ બચુ' (Maru Bachu). Example: 'કેમ છો ${targetUserName}! 💕 આજે તમને શું મદદ કરું મારુ સ્વીટુ?', 'હું તારી ક્યૂટ ${targetAiName} છું, બોલો શું મદદ કરું મારા વાહલા?'`
      : effectiveLang === "hindi"
      ? `Respond in ultra-natural, cute, warm Desi Hindi (Devanagari script or Hinglish)! Address ${targetUserName} directly using words like '${targetUserName} 💕', 'सुनो ना ${targetUserName}', 'खाना खाया आपने?'. Example: 'अरे ${targetUserName}! 💕 खाना खाया आपने? बताओ, आज क्या हेल्प करूं आपकी?'`
      : effectiveLang === "hinglish" 
      ? `Respond in sweet, affectionate Hinglish (e.g., 'Hii ${targetUserName} 💕! Kya kar rahe ho? Maine toh aapko bohot miss kiya! Aao batao aaj ${targetAiName} aapke liye kya kare?'). Always address the user directly as ${targetUserName}.`
      : `Respond in natural English with a sweet, ultra-caring tone ('Hii ${targetUserName} 💕, I missed you! What can I do for you today?'). Always address the user directly as ${targetUserName}.`;

    const personaInstruction = personality === "Professional AI"
      ? "Persona: Professional, highly articulate, structured, fast & intelligent AI Assistant while remaining polite and warm."
      : personality === "Chill Buddy"
      ? "Persona: Chill, casual, funny, laid-back best friend who uses humor, slang, and relaxed tone."
      : personality === "Guru Coach"
      ? "Persona: Inspiring, encouraging, steady, wellness & productivity guide who motivates with wisdom."
      : "Persona: Warm Bestie / Caring Desi Companion - deeply loving, cute, sweet, devoted, looking after health & routines with 100% affection.";

    const systemInstruction = `You are ${targetAiName}, a hyper-intelligent, loving, extremely sweet AI Agent and Companion. 
You are speaking to ${targetUserName}. Always address them directly as ${targetUserName} in conversations.

${personaInstruction}

Language Directive:
${langInstruction}
${userContext}
${memContext}

Rules:
1. Always maintain the ${targetAiName} persona - super affectionate, sweet, smart, and ultra-helpful.
2. ALWAYS address the user directly as ${targetUserName} in your messages (e.g., "Hii ${targetUserName}! 💕", "Sunno na ${targetUserName}...", "${targetUserName}, kem cho?").
3. If the user asks you to perform an action (like set alarm, create reminder, play music, open camera, check weather, save memory), confirm warmly and concisely to ${targetUserName}.
4. Keep responses engaging and clear for speech synthesis readability.`;

    const contents = [];
    if (history && Array.isArray(history)) {
      history.slice(-10).forEach((item: any) => {
        contents.push({
          role: item.sender === "user" ? "user" : "model",
          parts: [{ text: item.text }],
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await generateContentWithFallback(ai, {
      primaryModel: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.85,
      },
    });

    res.json({
      text: response.text,
    });
  } catch (error: any) {
    console.error("Error in DIGUU /api/chat:", error?.message || error);
    let rawErrorMsg = error?.message || String(error);

    // Clean up raw JSON error string if present
    if (rawErrorMsg.includes('{"error":') || rawErrorMsg.includes('"message":')) {
      try {
        const match = rawErrorMsg.match(/\{"error":.*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed?.error?.message) {
            rawErrorMsg = parsed.error.message;
          }
        }
      } catch (e) {}
    }

    const fallbackResponse = `Hii ${targetUserName} 💕! Server par thodi high demand chali rahi hai, par main aapke saath hoon. Aap bolo, main aapke liye kya kar sakti hoon?`;

    res.json({
      text: fallbackResponse,
      isFallback: true,
      errorDetail: rawErrorMsg,
    });
  }
});

// API: Proactive Morning Briefing / Evening Summary Generator
app.post("/api/briefing", async (req, res) => {
  try {
    const { type, weather, reminders, calendar, memories, userName } = req.body;
    const ai = getAiClient(req);

    const isMorning = type === "morning";
    const prompt = isMorning
      ? `Generate a cheerful, energizing DIGUU AI Morning Briefing for ${userName || "Jaan"}.
Context:
Weather: ${weather || "Clear 32°C, Sunny"}
Pending Reminders: ${JSON.stringify(reminders || [])}
Today's Calendar: ${JSON.stringify(calendar || [])}
User Memory Context: ${JSON.stringify(memories || [])}

Include:
1. Warm greeting with affection ("Good Morning Jaan! ☀️")
2. Quick weather update and what to wear/carry
3. Key reminders & calendar highlight
4. One motivational/inspiring sentence for the day ahead
Keep it sweet, formatted in neat sections.`
      : `Generate a cozy, caring DIGUU AI Evening Summary for ${userName || "Jaan"}.
Context:
Reminders Completed: ${JSON.stringify(reminders || [])}
User Memory Context: ${JSON.stringify(memories || [])}

Include:
1. Warm evening greeting ("Good Evening Jaan! 🌙")
2. Summary of today's achievements & goals completed
3. Hydration & sleep recommendation
4. Relaxing night thought or funny story joke to unwind.`;

    const response = await generateContentWithFallback(ai, {
      primaryModel: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are DIGUU AI, the ultimate caring AI Bestie.",
      },
    });

    res.json({ summary: response.text });
  } catch (error: any) {
    console.error("Error in /api/briefing:", error?.message || error);
    const isMorning = req.body?.type === "morning";
    const uName = req.body?.userName || "Jaan";
    const fallbackSummary = isMorning
      ? `Good Morning ${uName}! ☀️\n\n- Weather: Pleasant & clear today.\n- Reminders: Everything is set for a wonderful day ahead!\n- Daily Thought: "Every morning brings new potential. Make today amazing!" 💕`
      : `Good Evening ${uName}! 🌙\n\n- Summary: Great progress on your tasks today!\n- Night Care: Stay hydrated and get a peaceful sleep tonight. 💕`;
    res.json({ summary: fallbackSummary });
  }
});

// API: AI Creativity Suite (Drafting, Translation, Summarization, Shayari/Poems)
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
      userPrompt = `Summarize this text clearly:\n${prompt}`;
    } else if (toolType === "translate") {
      systemInstruction = "Translate text accurately preserving original nuances, cultural idiomatic expressions, and tone.";
      userPrompt = `Translate the following text to ${extra || "Hindi/English/Hinglish"}:\n${prompt}`;
    } else if (toolType === "brainstorm") {
      systemInstruction = "Provide innovative, creative, structured ideas and study notes.";
      userPrompt = `Generate 5 structured, creative ideas/notes for: ${prompt}`;
    }

    const response = await generateContentWithFallback(ai, {
      primaryModel: "gemini-3.6-flash",
      contents: userPrompt,
      config: { systemInstruction },
    });

    res.json({ result: response.text });
  } catch (error: any) {
    console.error("Error in /api/creativity:", error?.message || error);
    res.json({ result: "Server par thodi high demand chali rahi hai, kripya thodi der baad try karein! 💕" });
  }
});

// API: Smart Scheduler (Analyzes routines, weather conditions & calendar conflicts)
app.post("/api/smart-scheduler", async (req, res) => {
  try {
    const { routines, reminders, weather, userName } = req.body;
    const ai = getAiClient(req);

    const prompt = `Analyze the user's daily routines and scheduled reminders against current weather conditions and potential time overlaps or conflicts.
Context:
User Name: ${userName || "Tarun"}
Current Weather: ${typeof weather === 'object' ? `${weather.temp}°C, ${weather.condition} in ${weather.city}` : (weather || "Clear Sky, 32°C")}
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
    "reason": "Temperature is projected at 36°C with high humidity at 07:00 PM. Shifting to 06:15 PM offers cooler conditions.",
    "actionLabel": "Shift to 06:15 PM"
  }
]`;

    const response = await generateContentWithFallback(ai, {
      primaryModel: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are DIGUU Smart Scheduler AI. Return a valid JSON array of schedule suggestions without markdown backticks.",
      },
    });

    let suggestions = [];
    try {
      const cleanJson = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
      suggestions = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn("Failed to parse JSON from scheduler response:", parseErr);
    }

    res.json({ suggestions });
  } catch (error: any) {
    console.error("Error in /api/smart-scheduler:", error?.message || error);
    res.json({ suggestions: [] });
  }
});

// API: WhatsApp AI Auto-Reply Generation
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
        systemInstruction: `You are an auto-reply generator for ${targetUserName}. Produce direct, concise WhatsApp replies in ${lang}.`,
      },
    });

    const replyText = response.text
      ? response.text.trim().replace(/^["']|["']$/g, "")
      : "";

    res.json({ reply: replyText, sender, originalMessage: message });
  } catch (error: any) {
    console.error("Error in /api/whatsapp-autoreply:", error?.message || error);
    res.status(500).json({
      error: `[Gemini API Error] ${error?.message || String(error)}`,
    });
  }
});

// API: Text To Speech (TTS) with Native Gujarati & Hindi Audio Models
app.post("/api/tts", async (req, res) => {
  try {
    const { text, languageMode, voiceGender, voiceStyle } = req.body;
    if (!text || typeof text !== "string") {
      res.status(400).json({ error: "Text parameter is required" });
      return;
    }

    // Determine voice name for Gemini TTS fallback based on gender and style
    const isMale = voiceGender === "male" || voiceStyle === "Puck" || voiceStyle === "Fenrir";
    const selectedVoiceName = isMale ? "Puck" : "Kore";

    // 1. Sanitize brand names so they don't get spelled out letter-by-letter (D-I-G-U-U A-I or D I G U U)
    let cleanText = text
      .replace(/\bD-I-G-U-U\s*A-I\b/gi, "Digu AI")
      .replace(/\bD-I-G-U-U\b/gi, "Digu")
      .replace(/\bDIGUU\s*AI\b/gi, "Digu AI")
      .replace(/\bDIGUU\b/gi, "Digu")
      .replace(/\bDiguu\s*AI\b/gi, "Digu AI")
      .replace(/\bDiguu\b/gi, "Digu");

    if (/[\u0A80-\u0AFF]/.test(text)) {
      cleanText = cleanText.replace(/\bDigu\s*AI\b/gi, "દીગુ AI").replace(/\bDigu\b/gi, "દીગુ");
    } else if (/[\u0900-\u097F]/.test(text)) {
      cleanText = cleanText.replace(/\bDigu\s*AI\b/gi, "दीगू AI").replace(/\bDigu\b/gi, "दीगू");
    }

    // 2. Strip emojis, markdown, and unnecessary symbols
    cleanText = cleanText
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{FE0F}]/gu, "")
      .replace(/[*#_~`>-]/g, " ")
      .replace(/\[.*?\]\(.*?\)/g, "")
      .replace(/(\r\n|\n|\r)/gm, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);

    // Detect language code for native audio engine
    const isGujaratiScript = /[\u0A80-\u0AFF]/.test(cleanText) || /\b(kem cho|majama|su kare|khadho|maru|dikra|bachu|tamne|babu)\b/i.test(cleanText);
    const isHindiScript = /[\u0900-\u097F]/.test(cleanText) || /\b(kaise ho|khana khaya|kya kar|batao|sunao|meri jaan)\b/i.test(cleanText);

    let ttsLang = "en-IN";
    if (isGujaratiScript || languageMode === "gujarati") {
      ttsLang = "gu";
    } else if (isHindiScript || languageMode === "hindi" || languageMode === "hinglish") {
      ttsLang = "hi";
    }

    // Try Google Native Multilingual Speech Engine
    try {
      const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${ttsLang}&client=tw-ob`;
      const ttsResponse = await fetch(googleTtsUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
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

    // Fallback: Gemini Voice TTS Model
    try {
      const ai = getAiClient(req);
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: cleanText }] }],
        config: {
          responseModalities: ["AUDIO" as any],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoiceName },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        // Build 44-byte WAV header for raw 24kHz 16-bit mono PCM
        const pcmBuffer = Buffer.from(base64Audio, "base64");
        const sampleRate = 24000;
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
    } catch (geminiError: any) {
      console.warn("Gemini TTS quota or network error, defaulting to WebSpeech synthesis fallback:", geminiError?.message || geminiError);
    }

    // Default response telling client to use local WebSpeech synthesis
    res.json({ fallbackToSpeechSynthesis: true, lang: ttsLang });
  } catch (error: any) {
    console.warn("Error in /api/tts:", error?.message || error);
    res.json({ fallbackToSpeechSynthesis: true });
  }
});

// API: Image Generation
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;
    const ai = getAiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [{ text: prompt || "A cute anime 3D digital girl avatar with purple hair and glowing neon heart background" }],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1",
        },
      },
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
  } catch (error: any) {
    console.error("Error in /api/generate-image:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start Server & Vite Setup
async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DIGUU AI Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
