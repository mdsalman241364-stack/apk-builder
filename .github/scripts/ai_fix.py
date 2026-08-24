import os, sys, json, re, requests

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL = "gemini-3.7-flash"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={GEMINI_API_KEY}"

def read_log(path):
    with open(path, "r", errors="ignore") as f:
        lines = f.readlines()
    return "".join(lines[-300:])

def find_candidate_files(log_text, project_dir):
    paths = set()
    for m in re.finditer(r'([\w\-/\.]+\.(java|kt|xml|gradle|json|ts|js))', log_text):
        base = os.path.basename(m.group(1))
        for root, dirs, files in os.walk(project_dir):
            dirs[:] = [d for d in dirs if d not in ("node_modules", ".git", "build", ".gradle")]
            for f in files:
                if f == base:
                    paths.add(os.path.join(root, f))
    return list(paths)[:5]

def call_gemini(log_text, files_content):
    prompt = f"""You are an expert Android/Capacitor build error fixer.
A GitHub Actions build failed with this error log (last portion):

{log_text}

Here are the contents of files that might be relevant:

{files_content}

Analyze the root cause and provide the COMPLETE corrected content for any file(s) that need to change to fix this specific error.
Respond ONLY with valid JSON, no markdown fences, no explanation, in this exact format:
{{"fixes": [{{"file": "relative/path/as/shown/above", "content": "full new file content here"}}]}}
If you cannot determine a fix, respond with {{"fixes": []}}.
"""
    body = {"contents": [{"parts": [{"text": prompt}]}]}
    r = requests.post(API_URL, json=body, timeout=120)
    r.raise_for_status()
    data = r.json()
    text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
    if text.startswith("```"):
        text = re.sub(r'^```[a-zA-Z]*\n?', '', text)
        text = re.sub(r'```$', '', text)
    return json.loads(text)

def main():
    log_path = sys.argv[1]
    project_dir = sys.argv[2]

    if not GEMINI_API_KEY:
        print("No GEMINI_API_KEY set, skipping AI fix")
        sys.exit(1)

    log_text = read_log(log_path)
    candidate_files = find_candidate_files(log_text, project_dir)

    files_content = ""
    file_map = {}
    for fp in candidate_files:
        rel = os.path.relpath(fp, project_dir)
        try:
            with open(fp, "r", errors="ignore") as f:
                content = f.read()
            files_content += f"\n--- FILE: {rel} ---\n{content}\n"
            file_map[rel] = fp
        except Exception:
            pass

    if not files_content:
        for name in ["android/app/build.gradle", "android/build.gradle", "android/variables.gradle"]:
            fp = os.path.join(project_dir, name)
            if os.path.exists(fp):
                with open(fp, "r", errors="ignore") as f:
                    content = f.read()
                files_content += f"\n--- FILE: {name} ---\n{content}\n"
                file_map[name] = fp

    try:
        result = call_gemini(log_text, files_content)
    except Exception as e:
        print(f"Gemini call failed: {e}")
        sys.exit(1)

    fixes = result.get("fixes", [])
    if not fixes:
        print("Gemini did not provide a fix")
        sys.exit(1)

    applied = 0
    for fix in fixes:
        rel = fix.get("file")
        content = fix.get("content")
        if not rel or content is None:
            continue
        target_path = file_map.get(rel) or os.path.join(project_dir, rel)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        with open(target_path, "w") as f:
            f.write(content)
        print(f"Applied AI fix to: {rel}")
        applied += 1

    if applied == 0:
        sys.exit(1)
    print(f"Applied {applied} fix(es)")

if __name__ == "__main__":
    main()
