# MARIA — Premium Motion & UX Blueprint
**Reference audit:** 2026-10-12 · 9 MP4 files + 1 superellipse image · **baseline app:** v0.7.5
**Scope:** analysis, architecture and acceptance specification. This document is NOT a claim that the redesign is already implemented.

## Non-negotiable product requirements
- Preserve all pre-existing functionality (chat, Top Island, smart shortcuts, pins, tasks, accounting, file drop, anime/VRM characters, voice, settings and agents) and never silently replace a working pathway with a mock interface.
- Premium does not mean excessive visual noise: refined depth, soft light, hierarchy, expressive character animation, spatial transitions, clear labels and meaningful feedback on every actual operation.
- Maintain separate modes for mascot and user's existing customizable VRM/avatar; do not replace imported user models with Mochi.
- UI language: Persian RTL for prose and correct LTR for code, filenames, paths, timestamps and model names. Scale to 100–200% Windows DPI.

## Reference-by-reference motion audit
### 1000311024.mp4 (~53s): multi-panel island in real workflow
- 0–5s compact bar opens to wide status surface; character appears at left and contextual actions at right.
- 5–12s multitask/status cards become visible; accent colors distinguish independent actions.
- 12–24s errors change the mascot expression and surface text; the bar collapses without removing global availability.
- 26–34s file drag/drop and progress belong to the same floating UI instead of opening a giant blocking modal.
- 35–53s finished status, collapse, and another application in the background: the island must stay useful while focus shifts.
- MARIA mapping: agent monitor, file uploads, contextual actions, background task notifications and transparent verification.

### 1000311026.mp4 (~53s): execution-state narrative
- Status sequence visibly includes start, generating, working, sleep/wait, error, uploading file, working, task finished and drag/drop into a window.
- Motion principle: changing task stage must change text/icon/character consistently; activity may continue in the background.
- MARIA mapping: planner/executor/verifier stages; UI must never claim success before tool verification. Error state remains actionable, not merely decorative.

### 1000311030.mp4 (~12s): personality grammar
- Neutral soft floating squircle with black eyes; expressive waves/arms; eyes closing, blush, glow hue shifts, small badges and celebration particles.
- Named looks implied by frames: idle, greet, shy, thinking, busy, error, success, affection.
- MARIA mapping: avatar expression system, voice-speaking response, prompt wait, happy completion, interactive greeting.

### 1000311034.mp4 (~8s): expression library
- Grid of approximately 30 outfit/emotion variations with identity-preserving eyes/head proportions; states include working, thinking, searching, approvals, question, error, finished, greeting and seasonal outfits.
- MARIA mapping: reusable expression registry with preview, a11y text, labels, color-coded statuses and outfit slot. Do not use a decorative expression to misrepresent actual permission/result status.

### 1000311036.mp4 (~10s): design in real dashboard
- Unified top monitor above a task console and customized mascot; hats change independently from task states (witch, crown, beanie, party, glasses, Santa, pumpkin).
- Status pills, code/task content and compact app cards use distinct priorities and consistent rounding.
- MARIA mapping: Premium Top Island, task card, event timeline and avatar wardrobe system.

### 1000311038.mp4 (~12s): state machine & developer visibility
- Editor-like panel demonstrates named states, preview and transitions for thinking, working, error, happy and idle.
- MARIA mapping: one deterministic state coordinator rather than CSS selectors controlled by unrelated event listeners. Developer inspector should show active state, source event, priority, expiration and last transition.

### 1000311040.mp4 (~20s): character animation states
- Visible options: Greeting, Working, Thinking, Upload, Slap, Dizzy, Question, Error, Finished, Dance.
- Distinct effects: eye arcs and bounce for happiness; colored thought bubble; file icon and morph for upload; spiraled eyes for dizziness; question mark; accent warm for error; green success indicator; expressive dance loop.
- MARIA mapping: reaction animations on actual event triggers; no slap/dizzy animation triggered by routine failure, and no high-intensity motion when reduced motion is enabled.

### 1000311042.mp4 (~10s): implementation / notch transformation
- Tiny resting mascot expands into a wide black floating island; character migrates with the expansion while the right side gains real action/status modules.
- MARIA mapping: preserve pointer hit areas, content continuity, focus, monitor bounds and drag/drop while morphing peek → preview → expanded.

### 1000311044.mp4 (~12s): progressive disclosure of capabilities
- 'What's new' list reveals integrations incrementally; mascot clothing/emotion remains distinct from text. Example showcased: editor integration, repository alerts, local models, media, outfits, platform builds.
- MARIA mapping: versioned release notes and searchable feature catalog, with each advertised capability wired to real available actions or labeled as planned.

### 1000311032.jpg: measurable face construction
- Front silhouette: superellipse |x/rx|^n + |y/ry|^n = 1, **n = 2.7**; wider than tall, with **rx≈1.14R** and **ry≈0.88R** (dimensions from reference).
- Badge anchored near upper-left (-0.72R, -0.72R), eye positions approximately symmetric ±0.37 normalized horizontal radius, subtle vertical pitch ≈-0.12.
- Glossy highlight above right-center, a soft blush region below each eye, ground shadow and soft rim light.
- Real implementation: parametric SVG mesh or Three.js geometry with physically coherent highlights; variable radius, eye tracking, blink timing and device-pixel-ratio aware rendering. Keep text and controls native and accessible.

## Proposed MARIA design system
- **Surface family:** ink/graphite desktop shell + translucent restrained layered cards; thin cool borders; meaningful highlights for focus; premium soft shadow, no distracting gradients.
- **Accent roles:** blue = active/working, violet = thinking, cyan = question/information, amber = waiting/approval, red = recoverable error, green = verified success. Colors never carry meaning alone.
- **Shape grammar:** character superellipse n≈2.7; small controls 10–14px rounded; cards 16–22px; Top Island smooth continuous outline; visual consistency across all modules.
- **Typography:** high-quality Persian RTL with legible fallbacks and a distinct monospace for numbers/code; 14px+ equivalent regular body; stable tabular numerals.
- **Icons:** single vector system (24px grid, consistent stroke and optical weight), expressive only where semantically useful, visible focus/hover/pressed/disabled/working/error states.
- **Motion tokens (targets to test, not measured source values):** click 80–120ms, hover 120–180ms, micro-feedback 160–240ms, compact↔preview 260–360ms, preview↔expanded 350–500ms, character reaction 500–950ms. Transform/opacity first, composited when possible.
- **Ambient motion:** soft 2–3% idle bobbing, occasional natural blink, cursor gaze capped and damped; disable decorative effects on inactive windows and low-resource mode.
- **Accessibility:** prefers-reduced-motion, keyboard navigation and escape behavior; color contrast, narration via aria-live (not repeated spam), minimum logical hit target, safe animation pauses.
- **Performance:** avoid always-on heavy render loops; budget GPU/CPU; lazy load VRM/3D assets and wardrobe textures; share state timeline; test at low FPS and multiple monitors.

## Implementation architecture and actual baseline observations
- Current integration surface: src/renderer/topIslandV4.js (993 lines) and topIslandV4.css (~83kB compiled), plus islandHoverController.js and shortcutEditorV4.js.
- Existing working capabilities include peek/preview/expanded, contextual quick actions, pointer tracking, real shortcut drag-drop, approvals, settings, task accounting monitor, and native Electron bridge. These MUST be preserved.
- Current event mapping is broadly coupled to a global onEvent handler and setCharacter(data-state); isolate motion from business logic to remove conflicting states.
- Preserve Electron/Windows safety: permission prompts, verified tool outcomes, protected native pickers, minimized focus disruption and existing 5s collapse behavior unless the user changes the setting.
- Existing avatar layer uses Three.js/VRM; premium Mochi-style companion can be an alternative lightweight mode with identical task-state semantics.

### Proposed modules
1. CompanionStateMachine: normalized events, hierarchy, deterministic reducer, expiration, interruption and recovery.
2. CompanionMotionDirector: state → eye/face/body/badge/effect/timing; cancel stale animations and support reduced motion.
3. CompanionGeometryRenderer: scalable superellipse 2.7, shading, blink/gaze, accessories.
4. IslandLayoutController: peek, compact, preview, expanded; preserves click, hover, focus, resize, drag-drop.
5. PremiumDesignTokens and IconRegistry: consistent iconography, shape, type, contrast and status treatment.
6. TaskStageAdapter: normalizes agent/desktop actions into planning, waiting_approval, executing, verifying, completed, failed, offline.
7. MotionDiagnostics: dev-only timeline and screenshots for state/transition regression.
8. User preferences: mascot vs VRM, animation intensity, sounds, outfits, reduced-motion, high-contrast.

## Product-level UX targets
- **Top Island:** polished shape morph, adaptive content density, persistent live status, verification-aware success and approval buttons; real modules must remain clickable.
- **Chat / models:** premium message cards, tool invocation timeline, retry diagnostics, image/file cards, clear model routing and connection state; nothing can become a fake chat.
- **Shortcuts / files:** true app/file/folder/link detection, native file icon resolution, drag-drop, searchable grid, hover affordances, real destination preserved and rich empty/error states.
- **Reminders / pinned notes:** expressive scheduling timeline, working action buttons, readable priorities and snooze/complete feedback.
- **Accounting:** severity cards, verified source links, progress, mismatch/duplicate/absent evidence states; preserve actual workbook operations.
- **Character / wardrobe:** expressive emotion catalog, outfits and user-imported VRM retained, consistent expression mapping for speech and tasks.
- **Voice and notifications:** talking/listening states with subtle mouth/reactive indicator, no intrusive loop, non-destructive status.
- **Settings / permissions:** discoverable grouping, tested toggles, permission explanations, reversible actions and visible confirmation.

## Acceptance checklist and rollout
1. Before UI edits, keep immutable local copy plus GitHub source snapshot plus separate v0.7.5 installer; verify hashes and 267 baseline automated tests.
2. Build isolated motion/geometry prototype and screenshot/video storyboard for approval, with fallback for missing GPU/model and low-resource PCs.
3. Wire normalized events into real agent and Electron backend; test every displayed status against actual state.
4. Migrate Top Island, then chat/shortcuts/reminders/accounting, then avatar/outfits/voice/settings. Preserve previous controls while upgrading one module at a time.
5. Regression tests: mouse, keyboard, focus, drag-drop, multi-monitor, DPI 100–200%, right-to-left, small screen, hover transitions, 5s idle behavior, file dialogs, approvals, crash recovery, offline tools.
6. Compare screenshot/video against reference by frame and inspect eye tracking, morph silhouette, blur, sharp text, hitboxes, animation timing and accessible fallbacks.
7. End each change with test pass, production build, packaged app smoke test, feature completeness matrix and a separately named installer. No 'complete' label until verified.

## Known quality gaps found at baseline
- Electron-builder reports the default Electron icon because app icon is not set: premium app icon and installer icon need design and correct Windows ICO packaging.
- Vite reports an avatar JavaScript chunk ~860kB minified (>500kB warning): consider code splitting, runtime lazy-loading and measurement.
- Current UI uses a sizable single topIslandV4.js file with event-and-render coupling; a modular state/motion architecture is needed before large visual refactoring.
- Asset quality, 3D optimization, full lifecycle smoke testing and 1:1 reference comparisons have not yet been proven; remain explicit acceptance work, not claims.

**Reference policy:** create an original MARIA visual identity that faithfully expresses reference quality, motion principles and interaction behavior without silently borrowing a third-party project's code or protected asset files.
