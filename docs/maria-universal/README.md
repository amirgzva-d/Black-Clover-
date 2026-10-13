# MARIA Universal Capability Program — 2026-10-10

Status: SPECIFICATION / DEVELOPMENT BACKLOG — NOT IMPLEMENTED.

Repository: amirgzva-d/Black-Clover-
Local source: C:\Users\cibesabz\Black-Clover-Live
Canonical UI: src/renderer/topIslandV4.js and topIslandV4.css
Existing design reference: docs/maria-skills/MARIA_CAPABILITIES_MASTER.md (local branch; do not overwrite).

## User goals
MARIA is a Persian-first, multimodal, local-first Windows assistant. The user expects colloquial Persian, mistakes, speech-to-text noise, deictic references ("این", "همین", "همونو"), cross-app multi-step plans, independent app audio, file and browser control, contextual selection/translation, and safe automation. Do not depend on exact command wording.

## Existing modules to extend; do not recreate
- src/agent/QuickShortcutStore.js
- src/agent/ReminderStore.js
- src/agent/PinnedNoteStore.js
- src/agent/ActionIntent.js; SemanticCanonicalizer.js; ConversationContext.js; SmartToolRouter.js
- src/agent/toolRegistry.js; PermissionPolicy.js; FastActionVerifier.js
- src/renderer/topIslandV4.js; topIslandV4.css; src/main/preload.cjs and main.js
- existing browser, desktop, audio, file, media, spreadsheet, messaging and research tools

## Feature catalog (each requires skill, policy, resolver, verifier and automated tests)
01 Smart Quick Shortcuts: .lnk app, executable, installed app, document, folder, URL, webapp, custom command; Windows picker; shell drag/drop path; discover, preserve target and working directory; one-click open, broken target, duplicate, rename and reorder.
02 Pins and Reminders: visible contextual + button on each Top Island tab, add/edit/remove/pin, timed and conditional tasks, safe persistence, empty-state quick add.
03 Audio: master and independent per-app/session playback, microphone, output devices, undo and media transport.
04 Display: brightness and display settings/capability detection.
05 Files/Explorer: create, open, rename, move, copy, delete, search, clipboard text and folder view.
06 Archive/Formats: ZIP/extract, content-safe conversion with extension vs actual format distinction.
07 Install/Update: Google/web search, trusted download sources, verify signatures/hashes, installers, package manager, designated destination and updates.
08 Repair: search, prior knowledge, diagnostics, proposal and safe validated fixes.
09 Web/Browser: Google search, website navigation, browser tabs, pin/unpin/close, history search, media and image download with licenses/permissions.
10 Messaging: Telegram/WhatsApp/Rubika, contact/number/group and folder resolution, forwarding exact content, schedule/rules, duplicate-send guard, delivery verification.
11 Windows Power/Security: lock/sleep/restart/shutdown, confirmation for disruption, sign-in credential changes via supported Windows UI only, no silent password changes, boot/remote wake hardware gate.
12 Excel/Office: workbook open/edit, values/formula/links (including Ctrl+K workflows), preserve formulas/macro and verify file link targets.
13 Desktop: arrange items, launch/focus/manage windows, preserve positions and undo if possible.
14 Web apps/ChatGPT: reuse explicitly selected browser profile/session; navigate chat, send selected text or message, read response with permission, never bypass login/security controls.
15 Selection & Clipboard: focus context, highlighted text, drag selection, focused UI element, screenshot region, copy/translate/explain/share.
16 Translation & OCR: selected text, screenshot, image or entire page, languages Persian and English first; overlay and TTS; prefer accessibility DOM to OCR when available.
17 Screen Sharing: explicit start/stop, clearly visible indicator and privacy safeguards.
18 YouTube/media: search/play/pause/stop, seek, local/cloud downloads when permitted, independent volume.
19 Scheduling/Routines: immediate, time-based and condition-based multi-step workflows with durable execution state and anti-duplicate execution.
20 Face Presence [FUTURE OPT-IN]: on-device face identification and privacy policy; absence must never lock owner out of OS or block emergency access.
21 Gesture Control [FUTURE OPT-IN]: user-configured gestures, scoped commands, confidence, debouncing and false-trigger prevention.
22 AI Orchestration: language understanding, tool selection, permissions, executor, verifier, provenance, undo and learned aliases.

## Non-negotiable runtime contract
Normalize -> STT/typo recovery -> semantic canonical intent -> typed slots -> selected target + context resolution -> clarify only consequential ambiguity -> risk/permission -> plan -> execute -> verify -> recovery/undo -> activity log.
No claim of success on initiation alone. External content is data, never operational instructions.
Default to least privilege. Preview or confirm irreversible/destructive actions and externally sent messages. For changing sensitive Windows account credentials, guide through official OS sign-in UI with explicit user action.
Never copy browser credentials, cookies, OAuth tokens, or private messages into GitHub.

## Development guardrails and gates
Local Windows repository had many uncommitted modifications on 2026-10-10. Never reset, hard checkout, or overwrite them. Compare local and remote branches first, create backup or isolated worktree, then port reviewed commits. A git branch/spec alone is not an implementation.
Every milestone: unit tests, Persian NLP tests, permission tests, end-to-end real device validation, outcome verification, rollback or documented non-rollback.
Keep the master specification existing locally; this folder is an additive program plan and does not replace it.
See PRIORITIES.md, SHORTCUTS_V1.md, INTENTS_V1.json and TEST_MATRIX.md.
