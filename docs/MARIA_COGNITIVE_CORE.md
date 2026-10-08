# MARIA Cognitive Core

This document is the canonical development plan for MARIA.

## Product goal

MARIA is not a phrase-to-command bot. It is a personal Windows agent that can understand natural Persian/English input, plan multi-step work, execute verified actions, preserve context, learn preferences, work offline for core tasks, and use online models/research when available.

Canonical flow:

```
Text / Voice / Wake Word
        ↓
Context Engine
        ↓
Brain Core
        ↓
Planner
        ↓
Intent Router
        ↓
Skill Registry
        ↓
Permission Engine
        ↓
Executor
        ↓
Verifier
        ↓
Memory / Learning
        ↓
Response
```

## Core engines

- Brain Core — decides what the user really wants.
- Context Engine — active app, conversation, current task and references.
- Intent Engine — maps many phrasings/typos to stable intents.
- Planner — decomposes multi-step requests.
- Skill Registry — capabilities as data-driven skills, not hardcoded phrases.
- Executor — performs Windows/browser/file/app actions.
- Verifier — checks the requested result actually happened.
- Memory — working, conversation, preference, episodic, semantic, procedural, routine and relationship memory.
- Learning Engine — learns corrections/preferences with confidence, never self-modifies code freely.
- Knowledge Hub — local, personal and live knowledge through retrieval/search.
- Event Engine — battery, internet, idle time, meetings, app state and other proactive signals.
- Permission Engine — risk-aware confirmations.
- Update Manager — Core / Brain / Skill / Knowledge / Voice / Personality / Integration / UI packs.
- Update Advisor — proposes useful capabilities from repeated failures and usage.
- Personality Engine — Normal, Happy, Playful, Focus, Sleepy, Worried, Jealous, Angry, Caring.
- Voice Engine — wake word, speech recognition and TTS.

## Delivery order

1. Voice + Wake Word
2. Complete Windows control
3. Apps + files
4. Reminder / Alarm / Timer / Todo
5. Memory
6. Personality + Emotion System
7. Proactive Event Engine
8. Calendar + Email
9. Routines + Automation
10. Screenshot / Clipboard / Context Awareness

UI changes are secondary until capability quality is strong.

## Priority capabilities

### Critical

1. Wake Word: "Maria" without clicking.
2. Windows control: audio, brightness, Wi-Fi, Bluetooth, lock, sleep, restart, shutdown.
3. App launching.
4. Window management: close, minimize, maximize, restore, switch, snap, foreground.
5. Real reminders.
6. Alarm / timer / stopwatch.
7. Daily Todo.
8. Personal memory.
9. Smart clipboard.
10. File management.

### High

11. Live web search.
12. Calendar.
13. Email.
14. Screenshot Assistant.
15. Fast translation.

## Skill contract

A skill is a semantic capability family, not a sentence.

```yaml
intent_id: open_app

examples:
  - کروم رو باز کن
  - مرورگر رو اجرا کن
  - Chrome رو بیار بالا

slots:
  app_name: required

risk: L1
offline: true
handler: apps.open

verify:
  method: process_running

undo:
  supported: true

confirmation:
  required: false
```

Semantic normalization must handle typos, colloquial Persian, word-order changes, Persian/English mixing and incomplete phrasing.

Example:

```
"کرومو باز کن"
"مرورگر رو بیار"
"Chrome اجرا شه"
"برو تو کروم"
        ↓
intent: open_app
app: chrome
confidence: 0.98
```

## Risk levels

| Level | Example | Default behavior |
|---|---|---|
| L0 | read battery/status | direct |
| L1 | open Chrome | direct |
| L2 | reversible file change | execute with undo support |
| L3 | delete file | confirm |
| L4 | send email/message | confirm |
| L5 | install/uninstall/sensitive system action | explicit confirmation |

Models must not invent a permission refusal when MARIA has a valid tool. Tool-capable requests must be routed to the executor. Real OS/policy restrictions must still be respected.

## Verifier rule

Never report success only because a tool was called.

Examples:
- Open Photoshop → verify process/window exists.
- Change volume → read actual volume.
- Move file → verify destination exists.
- Start project → inspect process/output.
- Send message/email → verify delivery checkpoint when supported.

## Multi-step planning

Example:

"فایل پروژه دیروز رو پیدا کن، بازش کن، سایت رو اجرا کن و اگر ارور داشت بهم بگو."

Plan:
1. Locate project.
2. Open project.
3. Detect project type.
4. Run project.
5. Monitor output.
6. Detect error.
7. Explain error.
8. Offer a verified fix.

## Routine Engine

Examples:

### Work mode
- Open VS Code.
- Open Chrome.
- Open configured project.
- Set volume.
- Reduce distracting notifications.

### Good night
- Summarize tomorrow.
- Read tomorrow reminders.
- Switch MARIA to sleep state.
- Apply configured audio/notification behavior.

MARIA may propose a routine after repeated patterns, but only creates it after user approval.

## Proactive Assistant

Examples:
- Low battery.
- Internet offline/online.
- Meeting in 10 minutes.
- Long continuous computer usage.
- Relevant unfinished task.

Proactive behavior must be configurable, rate-limited and non-intrusive.

## Offline / Online policy

Offline must keep working:
- Windows control
- apps
- files
- reminders
- timer/alarm
- Todo
- routines
- local memory
- core voice commands
- base personality

Online enables:
- stronger model routing
- web search/research
- cloud integrations
- current knowledge
- complex synthesis

## Model/provider routing

Preferred architecture:

- Direct deterministic Windows actions → local fast path.
- Simple stable factual lookups → grounded extraction.
- Current/research/troubleshooting → live web + strong available model.
- Heavy freeform reasoning → strongest healthy connected cloud model.
- Private/local file context → local/tool-only by default.

Provider UI should support:
1. ChatGPT account connection where officially available.
2. Google Gemini API key setup.
3. Qwen Cloud API key setup.
4. Groq fallback.
5. OpenRouter Free fallback.
6. Ollama local fallback.

Auto • MARIA chooses among healthy providers and must survive quota/health failures.

## Memory model

- Working Memory
- Conversation Memory
- Preference Memory
- Episodic Memory
- Semantic Memory
- Procedural Memory
- Routine Memory
- Relationship Memory

Learned assumptions require confidence. One observation must not become a permanent fact.

## Update architecture

Update packs:
- Core Update
- Brain Update
- Skill Pack
- Knowledge Pack
- Voice Pack
- Personality Pack
- Integration Pack
- UI Pack

GitHub is the source of truth. Windows update flow:

```
GitHub
  ↓
fetch / compare
  ↓
check local git state
  ↓
test
  ↓
build
  ↓
runtime smoke test
  ↓
promote update
  ↓
rollback on failure
```

Never overwrite a dirty/conflicted working tree automatically.

## Definition of done for a feature

A capability is not complete until:
- natural language variants are tested;
- tool execution works;
- permissions are correct;
- result is verified;
- failure response is useful;
- offline/online behavior is known;
- regression tests exist;
- npm test passes;
- build passes;
- runtime smoke test passes where applicable.

## Long-term scale

- v1: ~100 semantic intents.
- v2: ~250 skills.
- v3: skill packs.
- v4: routine learning.
- v5: multi-step agent workflows.
- mature MARIA: personalized skill ranking and proactive recommendations without uncontrolled self-modifying code.
