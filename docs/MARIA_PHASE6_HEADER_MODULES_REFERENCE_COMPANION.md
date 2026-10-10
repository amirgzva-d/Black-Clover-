# MARIA Phase 6 — Top-bar modules and reference companion visual correction

Date: 2026-10-10

## User feedback

The existing rectangle displayed only Home, Chat, +, Settings and Sound, with no clickable shortcuts/pins/reminders/report icons in the header. The companion face was not close to the supplied white rounded-rectangle reference and the floating hands were not placed correctly.

## Implemented

- The four full modules **Shortcuts, Reports, Pins, Reminders** now render as a dedicated `v4-section-tools` navigation **inside the top header** of both Preview and Expanded. Every item has an icon, Persian label, accessible label, tooltip, focus/hover style and active state.
- Home / Chat / contextual + remain at the top left; Settings and Sound at the top right. The mini capsule intentionally hides section navigation, preserving the small idle design.
- Only clicking an icon opens the full real module. Hover on the mini capsule does not open a preview, and click elsewhere collapses according to the previous interaction contract.
- The reference preview's white companion has a softer squircle face, 2 independently tracking black eyes, no unwanted mouth mark, an isolated low rounded left hand, and a slightly tilted higher right hand, with subtle warm lighting. Hands do not touch/overlap the face and are not joined by visible stems.
- The separate large desktop anime avatar stays opt-in and hidden by default, as requested earlier. No media assets are replaced.
- A user-provided static reference picture does not contain executable animation data: expressions and motion are approximations of its visual style, not a recovered exact original asset.

## Tests

- `tests/maria-island-header-character-phase6.test.js` checks DOM structure, CSS behavior, independent character elements, always-small default.
- `scripts/phase6-visual-smoke.mjs` runs in dedicated Electron/Vite dev slot with user data isolated: screenshot mini and preview, verify 4 visible buttons can actually be hit, test pointer-driven click on Shortcuts, plus click navigation to Pins, Reminders and Reports; back to mini with Escape.
- Retain existing Phase 5 tests for shortcuts, avatar visibility, modal + and current click-only behavior.

## Non-destructive deployment

Push to the existing feature branch, then copy only the touched files to the currently running MARIA source tree after verifying that the latter still matches the previous branch revision byte-for-byte. Do not commit or modify unrelated agent/ChatGPT code in the main local checkout. Test before restarting the user's MARIA app.
