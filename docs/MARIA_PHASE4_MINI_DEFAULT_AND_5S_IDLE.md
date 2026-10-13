# MARIA Top Island — Phase 4: default mini and 5-second inactivity

## Visual states

- `peek`: always the first state at launch (292x54 native Electron window). A deep-black mini capsule with soft purple underglow, a 34px warm-white/orange-tinted square face at the left, a brighter violet live indicator, and two dim gray dots. The character never obscures other windows outside these bounds.
- `preview`: on real cursor movement over the mini capsule and after 180ms, expand to the 900x226 reference rectangle. Left toolbar: Home / Chat / Add. Right toolbar: Settings / Sound. A softly backlit white face with two separate eyes and two floating oval hands animates in the center; no unrelated extra tile strip.
- `expanded`: only after a deliberate click on a module icon. The corresponding real page/list/settings are loaded in 1000x560 (or fitted to screen).
- Click on blank rectangle to hold it; click directly on the character at any open state to close to mini immediately. When mini, an explicit character click can also open its preview.
- Auto-hide on **5 seconds without mouse/keyboard interaction**, even when pinned or in expanded details. Updating a field, moving the pointer, or clicking resets the countdown. A focused form, open modal, or active editable field delays collapse until it is safe.
- After a character click closes the view, no immediate re-open from synthetic Electron resize/mouse events: another genuine exit and re-entry is required.
- Existing voice mute, hover greeting, independently animated hands and gaze-tracking eyes remain supported.

## Integration

- `src/agent` and other user work remain unchanged.
- `src/main/main.js` sets 292x54 mini bounds and a safe minimum native width of 260px.
- `src/renderer/topIslandV4.js` always starts with `pinned:false` and `collapseDelayMs:5000` regardless of stale preferences; event handlers distinguish background, avatar, and module icon clicks.
- `src/renderer/islandHoverController.js` implements explicit inactivity deadlines with injected timers for deterministic tests.
- `src/renderer/topIslandV4.css` adds the reference mini capsule and finishing touches to the larger reference panel.
- Test coverage: `tests/island-hover-controller.test.js`, `tests/top-island-v4.test.js`, `tests/maria-island-ux-phase3.test.js`; `scripts/phase4-mini-island-smoke.mjs` performs isolated Electron CDP visual/integration checks.

## Acceptance criteria

1. Fresh launch first renders 292x54 `peek`; no saved pinned state should restore an expanded window.
2. Pointer hold opens 900x226 rectangle, not a full page.
3. Background click pins the rectangle; character click closes it to the original mini.
4. Hovering an icon does not open its content; clicking Settings or another module opens the actual section.
5. A click-pinned module collapses to mini after five seconds without input; do not destroy data.
6. Text entry and open dialogs are protected; no auto-close while actively editing.
7. No original files or unrelated edits may be overwritten; sync after verifying hashes.
8. Run the relevant automated tests, the Electron smoke test and Vite build; keep existing MARIA Electron sessions running unless explicitly asked to restart.
