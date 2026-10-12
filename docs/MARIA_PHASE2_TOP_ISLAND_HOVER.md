# MARIA Top Island — Phase 2: Three-stage hover and responsive character

**Implementation state:** Feature code integrated into isolated Phase 1 feature worktree, automated tests performed. This document is not a claim that all Windows resolutions or user workflows have been manually verified.

## Interaction contract

- Peek: 420×56 compact purple capsule with small character, no full-page controls.
- Preview: 900×226 general rectangular panel containing MARIA face, toolbar controls and compact module buttons; user obtains this state after moving the mouse onto the compact bar.
- Expanded: 1000×560 when hovering a module icon in the preview, or a module icon in the top bar; the relevant content renders without requiring click.
- Click on the character/body: toggle persistence (pin). Click on a module: enter expanded and pin it.
- Escape: close modal first; otherwise unpin and collapse expanded to preview, then preview to peek.
- Mouse leave: if not pinned, expanded returns to preview after a small transition delay; preview collapses after configurable delay (2/3/5/10 seconds or never).
- While an interactive form/modal/input has focus, automatically collapsing must defer.
- Keep Windows click/drag surfaces outside island unobstructed by shrinking its native BrowserWindow.

## Avatar and animation contract

- Native mini character retains rounded white face and independent black pupils.
- When cursor moves, both eyes track horizontally/vertically, head tilts/shifts slightly, and left/right arms respond with a subtle floating animation.
- Idle capsule uses restrained purple lighting. Thinking/working state animates floating and glow; error state has distinct border lighting.
- Respect prefers-reduced-motion. Never turn sound on automatically; continue using existing mute preferences.
- Unlike the previous implementation, resizing the Electron window must not itself count as intentional hover: pointer movement gates the peek-to-preview transition.

## Implementation

- `src/renderer/islandHoverController.js`: standalone, injected timer-based state machine with cancellation of pending module opens, pinning, and delayed collapse.
- `src/renderer/topIslandV4.js`: pointer-driven wiring, modular Hover targets, preview content, global state sync, contextual addition, character gaze vars.
- `src/renderer/topIslandV4.css`: responsive preview and facial/body/hand motion.
- `src/main/main.js`: Electron native `preview` window bounds, configurable Vite dev port for isolated testing; keep production defaults compatible.
- `tests/island-hover-controller.test.js`: state transitions and timer determinism.
- `scripts/phase2-final-smoke.mjs`: real Electron CDP smoke for preview, moving eyes/head, module hover, pin persistence.

## Test evidence

- Unit: 8 interaction-controller cases plus all 7 Phase 1 UI/shortcut cases pass.
- Electron: independent dev slot confirmed 2 eyes/2 arms, nonzero cursor-driven head/eye offset, preview/expanded transitions, module Shortcuts shown with hover, pinned expanded persists after 3 seconds off island.
- Build Vite: succeeds.
- Larger full-suite test run against the older dedicated feature branch encountered unrelated assertions about ChatGPT UI state already diverging from local development, so this phase should not be advertised as passing the entire suite.
- Remaining manual checks: Windows Explorer Drag & Drop, native file/folder picker, display scaling/high DPI, click-through boundaries around transparent Electron window, optional exact new character art.
