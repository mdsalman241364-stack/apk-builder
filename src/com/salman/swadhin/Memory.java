package com.salman.swadhin;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Swadhin AI - local memory.
 * Chats, messages, long term facts and notes. Everything stays on the phone.
 */
public class Memory extends SQLiteOpenHelper {

    private static Memory inst;

    public static synchronized Memory get(Context c) {
        if (inst == null) inst = new Memory(c.getApplicationContext());
        return inst;
    }

    private Memory(Context c) {
        super(c, "swadhin.db", null, 1);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE chats(id INTEGER PRIMARY KEY AUTOINCREMENT,"
                + "title TEXT, created INTEGER)");
        db.execSQL("CREATE TABLE messages(id INTEGER PRIMARY KEY AUTOINCREMENT,"
                + "chat_id INTEGER, role TEXT, content TEXT, created INTEGER)");
        db.execSQL("CREATE TABLE facts(id INTEGER PRIMARY KEY AUTOINCREMENT,"
                + "key TEXT UNIQUE, value TEXT, created INTEGER)");
        db.execSQL("CREATE TABLE notes(id INTEGER PRIMARY KEY AUTOINCREMENT,"
                + "body TEXT, created INTEGER)");
        db.execSQL("CREATE INDEX idx_msg ON messages(chat_id)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int a, int b) {
        // single version so far
    }

    // ---------------- chats ----------------

    public long newChat(String title) {
        ContentValues v = new ContentValues();
        v.put("title", title);
        v.put("created", System.currentTimeMillis());
        return getWritableDatabase().insert("chats", null, v);
    }

    public JSONArray listChats() {
        JSONArray out = new JSONArray();
        Cursor c = getReadableDatabase().rawQuery(
                "SELECT c.id, c.title, (SELECT COUNT(*) FROM messages m WHERE m.chat_id=c.id) n "
                        + "FROM chats c ORDER BY c.id DESC LIMIT 80", null);
        try {
            while (c.moveToNext()) {
                JSONObject o = new JSONObject();
                o.put("id", c.getLong(0));
                o.put("title", c.getString(1));
                o.put("n", c.getInt(2));
                out.put(o);
            }
        } catch (Exception e) {
            // ignore malformed row
        } finally {
            c.close();
        }
        return out;
    }

    public void renameChat(long id, String title) {
        if (title.length() > 60) title = title.substring(0, 60);
        ContentValues v = new ContentValues();
        v.put("title", title);
        getWritableDatabase().update("chats", v, "id=?", new String[]{String.valueOf(id)});
    }

    public void deleteChat(long id) {
        String[] a = new String[]{String.valueOf(id)};
        getWritableDatabase().delete("messages", "chat_id=?", a);
        getWritableDatabase().delete("chats", "id=?", a);
    }

    public int countMessages(long chatId) {
        Cursor c = getReadableDatabase().rawQuery(
                "SELECT COUNT(*) FROM messages WHERE chat_id=?",
                new String[]{String.valueOf(chatId)});
        int n = 0;
        if (c.moveToFirst()) n = c.getInt(0);
        c.close();
        return n;
    }

    // ---------------- messages ----------------

    public void addMessage(long chatId, String role, String content) {
        ContentValues v = new ContentValues();
        v.put("chat_id", chatId);
        v.put("role", role);
        v.put("content", content);
        v.put("created", System.currentTimeMillis());
        getWritableDatabase().insert("messages", null, v);
    }

    public JSONArray getMessages(long chatId) {
        JSONArray out = new JSONArray();
        Cursor c = getReadableDatabase().rawQuery(
                "SELECT role, content FROM messages WHERE chat_id=? ORDER BY id ASC LIMIT 300",
                new String[]{String.valueOf(chatId)});
        try {
            while (c.moveToNext()) {
                JSONObject o = new JSONObject();
                o.put("role", c.getString(0));
                o.put("content", c.getString(1));
                out.put(o);
            }
        } catch (Exception e) {
            // ignore
        } finally {
            c.close();
        }
        return out;
    }

    /** Last N turns, oldest first - ready to feed the model. */
    public JSONArray recentTurns(long chatId, int turns) {
        JSONArray rev = new JSONArray();
        Cursor c = getReadableDatabase().rawQuery(
                "SELECT role, content FROM messages WHERE chat_id=? ORDER BY id DESC LIMIT ?",
                new String[]{String.valueOf(chatId), String.valueOf(turns * 2)});
        try {
            while (c.moveToNext()) {
                JSONObject o = new JSONObject();
                o.put("role", c.getString(0));
                o.put("content", c.getString(1));
                rev.put(o);
            }
        } catch (Exception e) {
            // ignore
        } finally {
            c.close();
        }
        JSONArray out = new JSONArray();
        for (int i = rev.length() - 1; i >= 0; i--) out.put(rev.optJSONObject(i));
        return out;
    }

    // ---------------- facts ----------------

    public void remember(String key, String value) {
        if (key.length() > 80) key = key.substring(0, 80);
        if (value.length() > 600) value = value.substring(0, 600);
        ContentValues v = new ContentValues();
        v.put("key", key);
        v.put("value", value);
        v.put("created", System.currentTimeMillis());
        getWritableDatabase().insertWithOnConflict("facts", null, v,
                SQLiteDatabase.CONFLICT_REPLACE);
    }

    public void forget(String key) {
        getWritableDatabase().delete("facts", "key=?", new String[]{key});
    }

    public JSONArray facts() {
        JSONArray out = new JSONArray();
        Cursor c = getReadableDatabase().rawQuery(
                "SELECT key, value FROM facts ORDER BY created DESC LIMIT 60", null);
        try {
            while (c.moveToNext()) {
                JSONObject o = new JSONObject();
                o.put("key", c.getString(0));
                o.put("value", c.getString(1));
                out.put(o);
            }
        } catch (Exception e) {
            // ignore
        } finally {
            c.close();
        }
        return out;
    }

    /** Facts formatted for the system prompt. Header text comes from strings.xml. */
    public String factsBlock(Context ctx) {
        JSONArray f = facts();
        if (f.length() == 0) return "";
        StringBuilder sb = new StringBuilder("\n\n");
        sb.append(ctx.getString(R.string.mem_header)).append("\n");
        for (int i = 0; i < f.length(); i++) {
            JSONObject o = f.optJSONObject(i);
            if (o == null) continue;
            sb.append("- ").append(o.optString("key")).append(": ")
                    .append(o.optString("value")).append("\n");
        }
        return sb.toString();
    }

    // ---------------- notes ----------------

    public void addNote(String body) {
        ContentValues v = new ContentValues();
        v.put("body", body);
        v.put("created", System.currentTimeMillis());
        getWritableDatabase().insert("notes", null, v);
    }

    public JSONArray searchNotes(String q) {
        JSONArray out = new JSONArray();
        Cursor c = getReadableDatabase().rawQuery(
                "SELECT id, body FROM notes WHERE body LIKE ? ORDER BY id DESC LIMIT 20",
                new String[]{"%" + q + "%"});
        try {
            while (c.moveToNext()) {
                JSONObject o = new JSONObject();
                o.put("id", c.getLong(0));
                o.put("body", c.getString(1));
                out.put(o);
            }
        } catch (Exception e) {
            // ignore
        } finally {
            c.close();
        }
        return out;
    }

/**
     * Search every message in every conversation.
     *
     * This is what lets the model answer "what did we decide about X last week".
     * Results carry the chat title and date so it can cite when something was said.
     */
    public JSONArray searchAll(String q) {
        JSONArray out = new JSONArray();
        if (q == null || q.trim().length() == 0) return out;
        Cursor c = null;
        try {
            c = getReadableDatabase().rawQuery(
                    "SELECT m.role, m.content, m.created, c.title, c.id "
                  + "FROM messages m JOIN chats c ON c.id = m.chat_id "
                  + "WHERE m.content LIKE ? ORDER BY m.created DESC LIMIT 20",
                    new String[]{"%" + q.trim() + "%"});
            java.text.SimpleDateFormat f =
                    new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.US);
            while (c.moveToNext()) {
                JSONObject o = new JSONObject();
                o.put("role", c.getString(0));
                String body = c.getString(1);
                if (body != null && body.length() > 400) {
                    // centre the excerpt on the hit, not on the start of the message
                    int at = body.toLowerCase(java.util.Locale.US)
                                 .indexOf(q.trim().toLowerCase(java.util.Locale.US));
                    int from = at > 120 ? at - 120 : 0;
                    int to = from + 400;
                    if (to > body.length()) to = body.length();
                    body = (from > 0 ? "..." : "") + body.substring(from, to) + "...";
                }
                o.put("text", body);
                o.put("when", f.format(new java.util.Date(c.getLong(2))));
                o.put("chat", c.getString(3));
                o.put("chat_id", c.getLong(4));
                out.put(o);
            }
        } catch (Exception e) {
            // return whatever was collected
        } finally {
            if (c != null) c.close();
        }
        return out;
    }

    /** Rough token budget helper: how much history exists for this chat. */
    public int chatChars(long chatId) {
        Cursor c = null;
        try {
            c = getReadableDatabase().rawQuery(
                    "SELECT SUM(LENGTH(content)) FROM messages WHERE chat_id=?",
                    new String[]{String.valueOf(chatId)});
            if (c.moveToFirst()) return c.getInt(0);
        } catch (Exception e) {
            // ignore
        } finally {
            if (c != null) c.close();
        }
        return 0;
    }

    public JSONArray listNotes() {
        return searchNotes("");
    }
}
