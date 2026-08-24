# NOVA-AIDE — Project Instructions

Rules for any AI agent working on this project. These outrank your own habits.

## General

- Preserve existing functionality. Do not remove features without being asked.
- Read a file before you edit it. Search before you create.
- Prefer small, targeted edits over rewriting a file.
- Never claim something succeeded unless the tool output says it did.

## Build constraints — read this first

This project is built in **AIDE on a phone**, not Android Studio.

- **No Gradle.** The layout is classic: `src/`, `res/`, `assets/`,
  `AndroidManifest.xml`, `project.properties`.
- **No AndroidX, no external libraries.** Plain `Activity`, `findViewById`,
  `org.json`. Adding a dependency breaks the build.
- **Old `android.jar`.** API-29+ symbols do not resolve at compile time.
  Use string literals instead of constants, e.g.
  `new Intent("android.settings.MANAGE_APP_ALL_FILES_ACCESS_PERMISSION")`,
  and guard with `Build.VERSION.SDK_INT`.
- **No `<queries>`** in the manifest — the old aapt rejects it.

## Language

- **No Bengali string literals in Java.** Every Bengali string lives in
  `res/values/strings.xml` or in `assets/ui.html`. Java reads them via
  `getString(R.string.x)`. Bengali inside `server/worker.js` is fine.
- Source files are UTF-8. Compile with `-encoding UTF-8`.

## Where things live

| What | File |
|---|---|
| Keys, endpoints, default models | `src/com/salman/swadhin/Cfg.java` |
| Whole UI | `assets/ui.html` |
| All user-visible text | `res/values/strings.xml` |
| JS bridge, permissions, download | `src/com/salman/swadhin/MainActivity.java` |
| Streaming, tool loop, retries | `src/com/salman/swadhin/Brain.java` |
| Tool registry and dispatch | `src/com/salman/swadhin/Tools.java` |
| Coding tools | `src/com/salman/swadhin/CodeTools.java` |
| Path guard, project root | `src/com/salman/swadhin/Workspace.java` |
| sqlite memory | `src/com/salman/swadhin/Memory.java` |
| Relay worker | `server/worker.js` |

## Adding a tool

Four things, all required, or it silently misbehaves:

1. Implementation method.
2. A branch in `Tools.run()`.
3. An entry in `Tools.schemas()` with a `t_<name>` description string.
4. A **`run_<name>`** string in `strings.xml` — this is the progress label the
   user sees. Missing it shows a blank chip.
5. An icon in `TOOLIC` in `assets/ui.html`.

## Editing files

- Never write outside the workspace root; `Workspace.resolve` enforces this.
- `create_file` must not overwrite. `edit_file` must not act on an ambiguous
  match. Do not relax either rule.

## Honesty

- There is no compiler on the phone. `build_check` is a structural check only.
  Never report a build as successful.
- Never expose an API key in the UI, in logs, or in a committed file.
- If a tool returns ERROR, say so plainly instead of describing the intended
  outcome.

## Verifying a change

From `/home/user`:

```
python3 verify/mkstubs.py
mkdir -p /tmp/stub/com/salman/swadhin
# regenerate R.java from strings.xml, copy src/*.java, then:
cd /tmp/stub && javac -encoding UTF-8 -nowarn -source 8 -target 8 -d out $(find . -name '*.java')
java -cp out AgentTest              # 67 coding-agent tests
node verify/t.js                    # 17 UI tests
node server/test-worker.mjs         # 16
node server/test-rotation.mjs       # 15
node server/test-update.mjs         # 9
node server/test-addkey.mjs         # 11  (delete .k.tmp.mjs afterwards)
```

Also check: every `R.string.x` in Java and `s('x')` in `ui.html` exists in
`strings.xml`, and `strings.xml` still parses as XML.
