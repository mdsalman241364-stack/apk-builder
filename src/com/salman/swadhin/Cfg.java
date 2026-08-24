package com.salman.swadhin;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

/**
 * NOVA - settings store.
 *
 * BUILT IN KEY
 * ------------
 * BAKED_KEY holds Salman's own API key, lightly scrambled so it is not
 * sitting in the APK as plain readable text. When it is filled in, the app
 * just works - nobody is ever asked for a key. Friends can install the APK
 * and start chatting straight away.
 *
 * To set or change it: run keygen.py, paste the hex line it prints below.
 */
public class Cfg {

    // ==================================================================
    //  বন্ধুদের APK বানাতে হলে: নিচের KEY লাইনটায় তোমার key বসাও।
    //  আর কিছু করতে হবে না — Termux লাগবে না, keygen লাগবে না।
    //
    //      private static final String KEY = "gsk_xxxxxxxx";
    //
    //  নিজের ফোনে ব্যবহার করলে এটা ফাঁকাই থাক, সেটিংসে key দিলেই চলবে।
    // ==================================================================
    private static final String KEY = "";

    // keygen.py দিয়ে স্ক্র্যাম্বল করা key (ঐচ্ছিক, পুরনো পদ্ধতি)
    private static final String BAKED_KEY = "";
    private static final String BAKED_PROVIDER = "groq";
    private static final String BAKED_MODEL = "openai/gpt-oss-120b";

    // Second key, used automatically when the first one runs out of quota.
    // Same scrambler, different provider. Leave empty to disable failover.
    private static final String BAKED_KEY2 = "";
    private static final String BAKED_PROVIDER2 = "gemini";
    private static final String BAKED_MODEL2 = "gemini-3.5-flash";

    /**
     * Used for one turn when the chosen model cannot read images.
     * Groq and OpenRouter both serve this id.
     */
    /**
     * Model used when a turn carries images and the chosen one cannot see.
     * Groq retired llama-4-scout on 17 Jul 2026; Maverick is the remaining
     * vision-capable Llama 4 on that platform.
     */
    public static final String VISION_MODEL =
            "meta-llama/llama-4-maverick-17b-128e-instruct";
    // ==================================================================

    /**
     * Where the relay Worker lives. Baked in like the key was, but harmless if
     * extracted: without a valid access code the relay answers 401, and the
     * real provider keys never leave the server.
     */
    private static final String RELAY_URL = "https://nova.mdsalman0177598.workers.dev";

    /** Access code sent to the relay. Salman's own; teammates change it. */
    private static final String RELAY_CODE = "salman";

    public static final String PREF = "nova_cfg";

    /**
     * Provider used when nothing has been chosen yet and no key is baked in.
     * Kept in one place so it cannot drift from the rest of the code.
     */
    public static final String DEFAULT_PROVIDER =
            RELAY_URL.length() > 0 ? "relay" : "gemini";

    public static final String[] PROVIDERS = {
            "relay", "groq", "gemini", "openrouter", "openai", "ollama"
    };

    /**
     * The key compiled into the app, if any.
     *
     * A plain KEY wins: it is the one line a person can fill in without tools.
     * BAKED_KEY stays supported for anyone who already ran keygen.py.
     */
    public static String bakedKey() {
        if (KEY != null && KEY.trim().length() >= 8) return KEY.trim();
        String h = BAKED_KEY;
        if (h == null || h.length() < 8 || (h.length() % 2) != 0) return "";
        try {
            StringBuilder sb = new StringBuilder(h.length() / 2);
            for (int i = 0; i < h.length(); i += 2) {
                int v = Integer.parseInt(h.substring(i, i + 2), 16);
                sb.append((char) (v ^ ((0x5A + (i / 2)) & 0xFF)));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    public static boolean hasBaked() {
        return bakedKey().length() > 0;
    }

    /**
     * Work out the provider from the shape of the key, so nobody has to edit a
     * second line to match the first. Falls back to the declared constant.
     */
    public static String bakedProvider() {
        String k = bakedKey();
        if (k.startsWith("gsk_")) return "groq";
        if (k.startsWith("AIza")) return "gemini";
        if (k.startsWith("sk-or-")) return "openrouter";
        if (k.startsWith("sk-")) return "openai";
        return BAKED_PROVIDER;
    }

    public static String bakedModel() {
        String p = bakedProvider();
        return p.equals(BAKED_PROVIDER) && BAKED_MODEL.length() > 0
                ? BAKED_MODEL : defaultModel(p);
    }

    /** Unscramble the backup key. Empty string when none was baked in. */
    public static String bakedKey2() {
        String h = BAKED_KEY2;
        if (h == null || h.length() < 8 || (h.length() % 2) != 0) return "";
        try {
            StringBuilder sb = new StringBuilder(h.length() / 2);
            for (int i = 0; i < h.length(); i += 2) {
                int v = Integer.parseInt(h.substring(i, i + 2), 16);
                sb.append((char) (v ^ ((0x5A + (i / 2)) & 0xFF)));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * The config to fall back to when the primary provider is rate limited.
     *
     * A key typed into settings wins over the baked in one, exactly as with the
     * primary. Returns null when no backup is configured, or when the backup
     * would land on the provider that just failed.
     */
    public static JSONObject backup(Context c, JSONObject primary) {
        SharedPreferences p = sp(c);
        String prov = p.getString("backup_provider", BAKED_PROVIDER2);
        String userKey = p.getString("backup_key", "");
        String key = userKey.length() > 0 ? userKey : bakedKey2();
        if (key.length() == 0 && needsKey(prov)) return null;
        if (prov.equals(primary.optString("provider"))) return null;

        String model = p.getString("backup_model", "");
        if (model.length() == 0) {
            model = prov.equals(BAKED_PROVIDER2) ? BAKED_MODEL2 : defaultModel(prov);
        }
        try {
            JSONObject o = new JSONObject(primary.toString());
            o.put("provider", prov);
            o.put("model", model);
            o.put("api_key", key);
            o.put("is_backup", true);
            return o;
        } catch (Exception e) {
            return null;
        }
    }

    public static String relayCode(Context c) {
        String v = sp(c).getString("relay_code", "");
        return v.length() > 0 ? v : RELAY_CODE;
    }

    public static String relayUrl(Context c) {
        String u = sp(c).getString("relay_url", "");
        if (u.length() == 0) u = RELAY_URL;
        u = u.trim();
        while (u.endsWith("/")) u = u.substring(0, u.length() - 1);
        return u;
    }

    /**
     * The endpoint for a loaded config. Relay carries its own url in the
     * config, so this is what callers should use instead of url().
     */
    public static String endpoint(JSONObject cfg) {
        String prov = cfg.optString("provider", DEFAULT_PROVIDER);
        if (isRelay(prov)) return cfg.optString("relay_url", "");
        return url(prov, cfg.optString("ollama_url"));
    }

    public static String url(String provider, String ollamaUrl) {
        if ("groq".equals(provider))
            return "https://api.groq.com/openai/v1/chat/completions";
        if ("gemini".equals(provider))
            return "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
        if ("openrouter".equals(provider))
            return "https://openrouter.ai/api/v1/chat/completions";
        if ("openai".equals(provider))
            return "https://api.openai.com/v1/chat/completions";
        if ("ollama".equals(provider))
            return (ollamaUrl == null || ollamaUrl.length() == 0
                    ? "http://127.0.0.1:11434" : ollamaUrl) + "/v1/chat/completions";
        return "https://api.groq.com/openai/v1/chat/completions";
    }

    /**
     * Model ids the providers have switched off.
     *
     * A saved preference outlives an upgrade, so without this a phone that once
     * selected llama-3.3-70b-versatile keeps sending it forever and every reply
     * fails with a confusing 404. Checked against the Groq deprecation page and
     * the Gemini model lifecycle table, 19 Aug 2026.
     */
    private static final String[] RETIRED = {
            // Groq, shut down 16 Aug 2026
            "llama-3.3-70b-versatile", "llama-3.1-8b-instant",
            // Groq, shut down 17 Jul 2026
            "qwen/qwen3-32b", "meta-llama/llama-4-scout-17b-16e-instruct",
            // Groq, earlier shutdowns
            "deepseek-r1-distill-llama-70b", "moonshotai/kimi-k2-instruct",
            "gemma2-9b-it", "llama3-70b-8192", "llama3-8b-8192",
            "mixtral-8x7b-32768",
            // Gemini, shut down 1 Jun 2026
            "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash-exp",
            // Gemini, shut down earlier
            "gemini-1.5-flash", "gemini-1.5-pro", "gemini-3-pro-preview",
            "gemini-3.1-flash-lite-preview",
    };

    /** True when a stored model id is known to be switched off. */
    public static boolean isRetired(String model) {
        if (model == null || model.length() == 0) return false;
        for (String r : RETIRED) {
            if (r.equals(model)) return true;
        }
        return false;
    }

    public static String defaultModel(String provider) {
        // empty = let the server choose; it knows which keys it actually holds
        if ("relay".equals(provider)) return "";
        if ("groq".equals(provider)) return "openai/gpt-oss-120b";
        if ("gemini".equals(provider)) return "gemini-3.5-flash";
        if ("openrouter".equals(provider)) return "meta-llama/llama-3.3-70b-instruct:free";
        if ("openai".equals(provider)) return "gpt-4o-mini";
        if ("ollama".equals(provider)) return "qwen2.5:3b";
        return "openai/gpt-oss-120b";
    }

    /** Endpoint that lists the models a given key may actually call. */
    public static String modelsUrl(String provider, String ollamaUrl) {
        if ("groq".equals(provider))
            return "https://api.groq.com/openai/v1/models";
        if ("gemini".equals(provider))
            return "https://generativelanguage.googleapis.com/v1beta/openai/models";
        if ("openrouter".equals(provider))
            return "https://openrouter.ai/api/v1/models";
        if ("openai".equals(provider))
            return "https://api.openai.com/v1/models";
        if ("ollama".equals(provider))
            return (ollamaUrl == null || ollamaUrl.length() == 0
                    ? "http://127.0.0.1:11434" : ollamaUrl) + "/v1/models";
        return "";
    }

    public static String keyUrl(String provider) {
        if ("groq".equals(provider)) return "https://console.groq.com/keys";
        if ("gemini".equals(provider)) return "https://aistudio.google.com/apikey";
        if ("openrouter".equals(provider)) return "https://openrouter.ai/keys";
        if ("openai".equals(provider)) return "https://platform.openai.com/api-keys";
        return "";
    }

    public static boolean needsKey(String provider) {
        return !"ollama".equals(provider);
    }

    /** Relay takes a short access code, not a provider API key. */
    public static boolean isRelay(String provider) {
        return "relay".equals(provider);
    }

    private static SharedPreferences sp(Context c) {
        return c.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public static String defaultPersona(Context c) {
        return c.getString(R.string.persona_default);
    }

    /**
     * Full config. The key resolves in this order:
     *   1. a key the user typed into settings
     *   2. the baked in key
     *   3. nothing
     */
    public static JSONObject load(Context c) {
        SharedPreferences p = sp(c);
        String prov = p.getString("provider", hasBaked() ? bakedProvider() : DEFAULT_PROVIDER);
        String userKey = p.getString("api_key", "");
        // Relay authenticates with a short access code, so that is what travels
        // in the Authorization header instead of a provider key.
        String key = isRelay(prov)
                ? (userKey.length() > 0 ? userKey : relayCode(c))
                : (userKey.length() > 0 ? userKey : bakedKey());

        JSONObject o = new JSONObject();
        try {
            o.put("provider", prov);
            // A saved model belongs to the provider it was chosen under. Carrying
            // it across a provider switch produces a 404 (e.g. a llama id sent to
            // Gemini), so only honour it when the provider still matches.
            String savedProv = p.getString("model_provider", "");
            String savedModel = p.getString("model", "");
            String model;
            if (savedModel.length() > 0 && savedProv.equals(prov)
                    && !isRetired(savedModel)) {
                model = savedModel;
            } else if (hasBaked() && prov.equals(bakedProvider())) {
                model = bakedModel();
            } else {
                model = defaultModel(prov);
            }
            o.put("model", model);
            o.put("api_key", key);
            o.put("user_key", userKey);
            o.put("using_baked", userKey.length() == 0 && key.length() > 0);
            o.put("has_baked", hasBaked() || relayUrl(c).length() > 0);
            o.put("backup_provider", p.getString("backup_provider", BAKED_PROVIDER2));
            o.put("backup_model", p.getString("backup_model", ""));
            o.put("backup_key", p.getString("backup_key", ""));
            o.put("has_backup", bakedKey2().length() > 0
                    || p.getString("backup_key", "").length() > 0);
            o.put("ollama_url", p.getString("ollama_url", "http://127.0.0.1:11434"));
            o.put("relay_url", relayUrl(c));
            o.put("relay_code", p.getString("relay_code", ""));
            o.put("persona", p.getString("persona", defaultPersona(c)));
            o.put("temperature", (double) p.getFloat("temperature", 0.8f));
            o.put("max_tokens", p.getInt("max_tokens", 2048));
            o.put("history_turns", p.getInt("history_turns", 12));
            o.put("tools_on", p.getBoolean("tools_on", true));
            o.put("memory_on", p.getBoolean("memory_on", true));
            o.put("tts_on", p.getBoolean("tts_on", false));
            o.put("agent_on", p.getBoolean("agent_on", true));
        } catch (Exception e) {
            // JSONObject.put only throws on NaN keys
        }
        return o;
    }

    public static void save(Context c, JSONObject in) {
        SharedPreferences.Editor e = sp(c).edit();
        if (in.has("relay_url")) e.putString("relay_url", in.optString("relay_url", ""));
        if (in.has("relay_code")) e.putString("relay_code", in.optString("relay_code", ""));
        if (in.has("backup_provider")) e.putString("backup_provider", in.optString("backup_provider", BAKED_PROVIDER2));
        if (in.has("backup_model")) e.putString("backup_model", in.optString("backup_model", ""));
        if (in.has("backup_key")) e.putString("backup_key", in.optString("backup_key", ""));
        if (in.has("provider")) e.putString("provider", in.optString("provider", DEFAULT_PROVIDER));
        if (in.has("model")) {
            e.putString("model", in.optString("model", ""));
            // tag the model with its provider so load() can detect a stale pairing
            e.putString("model_provider",
                    in.optString("provider", sp(c).getString("provider", DEFAULT_PROVIDER)));
        }
        if (in.has("ollama_url")) e.putString("ollama_url", in.optString("ollama_url", ""));
        if (in.has("persona")) e.putString("persona", in.optString("persona", ""));
        if (in.has("temperature")) e.putFloat("temperature", (float) in.optDouble("temperature", 0.8));
        if (in.has("max_tokens")) e.putInt("max_tokens", in.optInt("max_tokens", 2048));
        if (in.has("tools_on")) e.putBoolean("tools_on", in.optBoolean("tools_on", true));
        if (in.has("memory_on")) e.putBoolean("memory_on", in.optBoolean("memory_on", true));
        if (in.has("tts_on")) e.putBoolean("tts_on", in.optBoolean("tts_on", false));
        if (in.has("agent_on")) e.putBoolean("agent_on", in.optBoolean("agent_on", true));
        // only overwrite when a real, unmasked key arrives
        String k = in.optString("api_key", "");
        if (k.length() > 0 && !k.startsWith("\u2022")) e.putString("api_key", k);
        e.apply();
    }

    /** Drop the user's own key and fall back to the baked in one. */
    public static void clearUserKey(Context c) {
        sp(c).edit().putString("api_key", "").apply();
    }

    public static void resetPersona(Context c) {
        sp(c).edit().putString("persona", defaultPersona(c)).apply();
    }
}
