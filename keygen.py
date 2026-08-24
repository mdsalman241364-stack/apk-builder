#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NOVA — API key স্ক্র্যাম্বলার
================================

তোমার key টা এমনভাবে বদলে দেয় যে APK খুললে সোজা পড়া যায় না।

চালাও:
    python3 keygen.py

তারপর যে লাইনটা বের হবে সেটা Cfg.java-তে বসাও।

Termux-এও চলবে:  pkg install python && python keygen.py
"""

import sys


def scramble(key: str) -> str:
    """প্রতিটা অক্ষরকে বদলাতে থাকা একটা সংখ্যা দিয়ে XOR করে, তারপর hex।"""
    out = []
    for i, ch in enumerate(key):
        out.append("%02x" % (ord(ch) ^ ((0x5A + i) & 0xFF)))
    return "".join(out)


def unscramble(hexs: str) -> str:
    """যাচাই করার জন্য — উল্টো কাজ।"""
    out = []
    for i in range(0, len(hexs), 2):
        v = int(hexs[i:i + 2], 16)
        out.append(chr(v ^ ((0x5A + (i // 2)) & 0xFF)))
    return "".join(out)


def main():
    print()
    print("=" * 62)
    print("   NOVA — API key স্ক্র্যাম্বলার")
    print("=" * 62)
    print()

    if len(sys.argv) > 1:
        key = sys.argv[1].strip()
    else:
        print("তোমার API key পেস্ট করো (gsk_... দিয়ে শুরু):")
        print()
        try:
            key = input("  key > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nবাদ দিলাম।")
            return

    if not key:
        print("\n  কিছু দাওনি। বাদ দিলাম।")
        return

    if len(key) < 20:
        print("\n  ⚠️  key টা খুব ছোট মনে হচ্ছে। ঠিক করে কপি করেছ তো?")

    if not (key.startswith("gsk_") or key.startswith("sk-")
            or key.startswith("AIza") or key.startswith("sk-or-")):
        print("\n  ⚠️  চেনা ফরম্যাটে নেই — তবু এগোচ্ছি।")

    hexed = scramble(key)

    # যাচাই — উল্টে গিয়ে আবার একই key পাওয়া যাচ্ছে কিনা
    if unscramble(hexed) != key:
        print("\n  ❌ যাচাইয়ে গণ্ডগোল! ব্যবহার করো না।")
        return

    prov = "groq"
    model = "llama-3.3-70b-versatile"
    if key.startswith("AIza"):
        prov, model = "gemini", "gemma-3-27b-it"
    elif key.startswith("sk-or-"):
        prov, model = "openrouter", "meta-llama/llama-3.3-70b-instruct:free"
    elif key.startswith("sk-"):
        prov, model = "openai", "gpt-4o-mini"

    print()
    print("  ✅ হয়ে গেছে। যাচাইও পাস।")
    print()
    print("─" * 62)
    print("  Cfg.java খোলো, উপরের দিকে এই তিনটা লাইন খুঁজে বদলাও:")
    print("─" * 62)
    print()
    print('    private static final String BAKED_KEY = "%s";' % hexed)
    print('    private static final String BAKED_PROVIDER = "%s";' % prov)
    print('    private static final String BAKED_MODEL = "%s";' % model)
    print()
    print("─" * 62)
    print()
    print("  এরপর Build Studio-তে Run চাপো। ব্যস —")
    print("  কেউ আর API key চাইবে না, অ্যাপ খুললেই কাজ করবে।")
    print()
    print("  ⚠️  মনে রেখো: এটা লুকানো, কিন্তু অজেয় নয়।")
    print("     দক্ষ কেউ APK খুলে বের করতে পারবে।")
    print("     তাই APK শুধু চেনা বন্ধুদের দিও।")
    print()


if __name__ == "__main__":
    main()
