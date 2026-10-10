# MARIA Phase 1 — Smart Shortcuts, Add Actions, Avatar Island

Status: implementation specification; NOT a completed feature. Date: 2026-10-10.
Preserve local uncommitted changes. Do not overwrite user files or relocate shortcut targets.

## Smart shortcuts
- Add button on shortcuts page opens native picker for file or application, folder picker, URL entry, or drag-and-drop target.
- Identify targets by actual filesystem stat, .lnk resolution, executable metadata, URL parsing; avoid extension-only guesses.
- Shortcut records: id, label, kind (app/file/folder/url), originalTarget, resolvedTarget, arguments, icon, createdAt.
- Opening uses Windows Shell association (shell.openPath for files/folders; openExternal for validated http/https); app launch with validated executable and arguments.
- Never move, rename, copy, or delete the original target when adding a shortcut. Detect broken targets and offer relink.
- Drag/drop: use Electron File.path via preload-approved bridge; support URLs and plain text; preview before save.
- Deduplicate by normalized target, preserve unicode paths, reject unsupported protocols and unsafe executable parameters.
- UI must show shortcut type, edit/remove actions and errors. Tests: exe, lnk, pdf, xlsx, folder, URL, Unicode, missing target, duplicate, drag/drop.

## Pins and reminders
- One contextual + button creates a pin on Pins page, reminder/action on Reminders page, shortcut on Shortcuts page.
- Create forms must open reliably, focus first input, validate, save, refresh, show success/error, work by keyboard.
- Existing stores: PinnedNoteStore, ReminderStore; use existing APIs rather than duplicate storage.
- Confirm before destructive removal; no accidental scheduled action execution.

## Avatar and Top Island
- User-provided images are visual references, not assets licensed for copying.
- Avatar reference: friendly rounded white head, two independent blinking eyes, small animated hands/arms, no eye overlap or clipping.
- Idle: compact purple softly breathing/glowing capsule, subdued sleepy face.
- Hover: smoothly expand to full rectangular control panel; on click toggle pinned state; on mouseleave collapse only if not pinned, focused, modal-open, or working.
- Working/thinking: subtle active glow, animated eye tracking, pulse; success and error distinct. Respect reduced-motion setting.
- Transparent Electron overlay must not block clicks outside actual island. Mouse enter/leave and click-through boundaries must be tested.
- State machine: peek, compact, expanded, pinned, thinking, speaking; transitions deterministic; cancel idle timer on interaction.
- Prevent focus stealing and infinite expand/collapse loop; respect existing sound mute and user interaction.

## Acceptance gate
Only mark complete after unit tests, integration tests, real Windows click/drag/drop tests, screenshot review at multiple display scales, and verifying local Git status + GitHub sync.
Next: inspect existing topIslandV4.js, topIslandV4.css, main/preload IPC, QuickShortcutStore, reminder/pin routes, and tests before implementing.

## Implementation log — 2026-10-10
- Added src/agent/ShortcutTargetResolver.js: filesystem stat, .lnk targets, http(s) URL validation, safety checks.
- Main-process native file/folder dialog + resolve IPC + deduplicated creation + shortcut update validation.
- Preload safely exposes native drag-drop path via Electron webUtils.getPathForFile.
- Added shortcutEditorV4.js with file/folder pickers, URL input, drag/drop, inferred type preview, non-destructive delete.
- Added contextual + buttons in shortcuts, pins and tasks.
- Top Island hover expand, click-to-pin, idle peek; eye blinking and arm animations + reactive colors.
- Test results: 217/217 node tests passed and npm.cmd run build succeeded.
- Known remaining acceptance work: interactive manual verification of Electron drag/drop, hover/pin on real Windows desktop at multiple DPI; supplied character art not yet received; current arms are stylized CSS.
- The stage is implemented and automatically tested but not yet end-to-end certified.
