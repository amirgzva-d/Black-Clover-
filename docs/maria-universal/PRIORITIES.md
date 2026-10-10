# Build order and acceptance
Status: planned; none of these items are claimed implemented by this document.

P0 Foundations: inspect working tree; map local/remote changes; preserve all uncommitted work; verify build/test baseline and UI IPC methods. No destructive cleanup.

P1 Smart shortcuts: auto-detect target type, drag/drop, native picker, link path preservation, open with one click, duplicate/missing-target feedback. Extend existing QuickShortcutStore and Top Island V4. Acceptance: .exe, .lnk, .txt/.xlsx, folder, URL, multiple dropped items, Unicode/Persian paths, broken paths, relaunch persist.

P2 Pins/reminders: + button in each relevant page (shortcuts/pins/tasks), context-aware modal; fix failures to add notes and reminders, verify persistence and scheduling. Acceptance: create/edit/remove, re-open app, invalid fields, timezone, repeated tasks and permissions.

P3 Audio/brightness: separate master and application audio; do not change master when app control fails. Real device capability tests. Display adapter with monitors and laptop hardware gates.

P4 Windows files/archives/apps: folder/file create, rename, copy/move, delete recycle bin where possible; ZIP/extract with zip-slip mitigation; install/update trusted packages with confirmations.

P5 Web, tabs, YouTube, app websites: approved browser profile, active tab, history, selected regions, data capture and provenance.

P6 Messaging and scheduling: exact destination resolution, staged content preview, permission, idempotency and verification. Conditional scheduling should not silently send unexpected messages.

P7 Excel/Office and desktop organization: preserve file integrity, hyperlink validation, link target resolution and safe backups.

P8 Screen selection, OCR, translation and TTS: text/DOM first, screenshot OCR fallback, selection and whole-page overlays, languages, clipboard, app transfer.

P9 Security, face presence, gestures, screen sharing: explicit opt-in, visual indicators, privacy, test opt-out and emergency disable.

Across all stages: accurate Persian variants and typos, multi-step contextual planner, evaluation sets with hard negatives, accessibility-friendly UI and regression tests.
