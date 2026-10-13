# MARIA Phase 5 — Click-only Top Island, optional desktop avatar, smart shortcuts

## User-facing behavior

1. **Default mini**: mini capsule starts at 292×54, with a warm square avatar, 3 status lights and pointer-tracking eyes. Hover merely animates/greets. It **does not expand**.
2. **Click to expand**: clicking the mini character or mini bar opens a clean 900×226 rectangular companion panel with Home / Chat / Add and Settings / Volume controls. The character animates with mouse gaze.
3. **Click module to open**: module icons navigate to their actual content on click only. The toolbar's + follows current page: shortcuts -> shortcut editor, pins -> pin editor, tasks -> reminder editor, reports -> accounting form, home/other -> contextual chooser.
4. **Click elsewhere to dismiss**: Electron main process emits an island blur event when focus leaves the window. The renderer collapses preview or an expanded module to mini when not in an edit dialog or native picker. Escape and clicking the animated mini companion also collapse. The 5-second inactivity timer remains as a secondary fallback.
5. **Large floating anime character hidden by default**: this separate transparent desktop window is **opt-in**. Opening Chat, projects, reminders, full settings and returning from Chat no longer forces it visible. Add a settings card `کاراکتر بزرگ روی دسکتاپ` with a persisted show/hide toggle. Explicit tray Show Avatar / Hide Avatar actions update that preference. Hiding happens immediately and does not delete assets, outfits, faces, or animations.
6. **Chat icon**: dedicated visible speech-bubble icon opens the actual Chat window without resurrecting the floating avatar.
7. **Shortcuts**: plus in Shortcuts opens a smart editor. Choose file/app, directory, or URL, or drop an OS-backed file from Explorer. Confirm detected name, file type and extension, and the unchanged original target path before saving. The shortcut card displays name + kind/extension, with a real Windows icon or image thumbnail loaded via existing IPC; clicking the card opens original target through Windows Shell. Prevent duplicate targets and avoid copying, moving, or deleting original files.
8. **Pins and reminders**: local + opens the correct editor, retaining current persistent stores and permission checks.

## Code

- `src/main/AvatarVisibilityPreferences.js` — persisted opt-in setting, false on missing/corrupt settings.
- `src/main/main.js` — hidden-by-default floating avatar, separated chat surfaces, IPC visibility endpoints, island window blur message.
- `src/main/preload.cjs` — tightly-scoped visibility and blur bridge.
- `src/renderer/islandHoverController.js` — click-only open, pointer activity and inactivity close logic.
- `src/renderer/topIslandV4.js` — contextual +, actual overlay setting, Chat, drop preview and external click handling.
- `src/renderer/shortcutEditorV4.js` — type/format/name/original-target preview.
- `src/renderer/topIslandV4.css` — crisp chat affordance and accessible drop/metadata styling.

## Verification

Automated unit tests are in `tests/maria-avatar-shortcuts-phase5.test.js` and `tests/island-hover-controller.test.js` and existing shortcut/island suites.

Real Electron smoke tests run with an **isolated userData slot**, isolated shortcut store, private Vite port and debugger port:
- `scripts/phase5-live-electron-smoke.mjs`: boot mini; hover does not expand; click does; Chat opens while large avatar remains hidden; settings toggle on/off; shortcut file metadata, persistence and removal; per-section pin and reminder forms; click companion closes.
- `scripts/phase5-real-file-drop-smoke.mjs`: Chromium CDP sets an OS-backed file into a native file input, constructs a DragEvent and drops it into Shortcuts; Electron `webUtils.getPathForFile` returns the actual Windows path; editor previews it before creating and removing a shortcut without changing file bytes.
- `scripts/phase5-blur-smoke.mjs`: CDP mouse focuses the island then Chat takes focus; island collapses and floating avatar stays hidden.

These tests do **not** assert that a physical human performed Explorer drag/drop or assessed every DPI scale. High-resolution 3D/anime artwork itself was not re-rendered: the separate full-body overlay is hidden unless the user enables it. Keep existing user's uncommitted local project files untouched during deployment.
