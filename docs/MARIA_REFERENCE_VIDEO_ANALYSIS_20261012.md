# MARIA — Reference Motion & UI/UX Analysis (2026-10-12)
## Source inventory (uploaded by user)
Nine videos inspected using timeline samples, not assumed to be functioning source code:
- 1000311024.mp4 — 52.97 s, 808×720, 30 fps: desktop notch + mobile widget integration and mode transitions.
- 1000311026.mp4 — 52.97 s, 720×720, 30 fps: explicitly labeled state-machine demonstrations for greeting, idle, working, sleep, error, uploading, finished, drag/drop.
- 1000311030.mp4 — 12 s, 720×900, 30 fps: mascot appearance and expressions.
- 1000311034.mp4 — 8 s, 720×900, 30 fps: expression variants and accessories.
- 1000311036.mp4 — 10 s, 720×900, 30 fps: dashboard design system, status, mascot skins and card layout.
- 1000311038.mp4 — 12 s, 720×900, 30 fps: implementation scene with code, mascot preview and state controls (visual reference only).
- 1000311040.mp4 — 20 s, 720×900, 30 fps: animation state showcase.
- 1000311042.mp4 — 10 s, 720×900, 30 fps: desktop top-edge implementation and expanded overlay.
- 1000311044.mp4 — 12 s, 720×900, 30 fps: product capabilities and mascot accessories.

## Reference image
Superellipse / squircle white face: |x/rx|^2.7 + |y/ry|^2.7 = 1. Eyes aligned on rounded surface, dark oval pupils; soft highlights; independently movable small floating hands. Not a plain border-radius rectangle. Geometry, eye placement, hover response, shadow and lighting should be implemented with parametric SVG/Canvas or lightweight 3D rather than copying a raster screenshot. Keep source artwork distinct and avoid reproducing logos/trademarks.

## Detailed time-ordered review: 1000311026.mp4
00:00–00:05: greeting / idle startup; dark top notch is primary anchor; white floating face and restrained warm glow. Requirement: on-load compact mode with short greeting that does not steal keyboard focus.
00:05–00:11: idle → working, compact avatar changes color and the bar expands to an information-rich dashboard. Requirement: status-driven, not timer-driven, transitions. Show active task title and accessible text; animation supports status but does not replace it.
00:11–00:16: working → sleep / quiet; the face relaxes, panel returns to notch. Requirement: minimize on inactivity without cancelling jobs, maintain durable task state.
00:16–00:25: working → error; face tint warms pink/red, bar presents a concise diagnostic with retry/details. Requirement: semantic error categories and safe recovery; no decorative-only warning.
00:25–00:34: upload sequence; task panel becomes progress rail, file manager shown below; right-side small control group remains visible. Requirement: real drag/drop target, type/size validation, progress, cancel and verification; no pretend upload success.
00:34–00:41: active work → annoyed / finished; compact or expanded panel can show multi-task chips and completion. Requirement: success/failure tied to actual tool outcomes and task IDs.
00:41–00:53: finished → drag/drop into windows; compact avatar shrinks back to notch while desktop app remains usable. Requirement: drag feedback and true external window drop behavior where Electron supports it; never claim OS integration without real tests.

## 1000311024.mp4: interaction mapping
0–10 s: compact and expanded desktop surface, action chips, and companion.
10–20 s: mini state, user feedback and quick tools; mobile adaptations shown as separate reference, not a requirement to embed mobile UI in Windows.
20–33 s: task in progress and progress bar; side rail status pills.
33–43 s: return to actionable dashboard and small top notch.
43–53 s: coexistence with another application, drag-to-window and focus management.
Key distinction: animation should reflect app state and user interaction; avoid continuous decorative loops.

## Remaining videos: initial motion-language review
1030 (12 s): expression/lighting changes without changing mascot silhouette; small wave, blink, head tilt, eyes track pointer with clamped offsets.
1034 (8 s): many expressions and hats/glasses; use a scalable, layered asset registry; ensure accessibility and avoid huge spritesheet overhead.
1036 (10 s): dense but readable multi-card control center; prioritize hierarchy, progress, status, recent actions and fast access.
1038 (12 s): state and motion controls; isolate state machine from rendering, define states as data and transitions with tests.
1040 (20 s): distinct emotion/activity states including greeting, working, thinking, upload, sleep, error; each requires entry/exit motion, reduced-motion alternative, and semantic text.
1042 (10 s): top notch expansion without obstructing the desktop; anchor to monitor safe area; pointer intent, delayed close, pin/unpin, escape and focus handling.
1044 (12 s): layered mascot costume and feature list; outfits should not alter click targets or interfere with app functionality.

## Proposed MARIA architecture (not implemented yet)
- Design tokens: radii/superellipse, surface colors, 8px spacing grid, typography, shadows, focus outlines, easing and motion durations.
- `CompanionAvatar`: parametric geometry, layered face/accessories, eye gaze, gesture/arms, semantic emotion.
- `AvatarStateMachine`: idle, greeting, thinking, working, uploading, success, warning, error, sleep; validated transitions and event sources.
- `IslandInteractionController`: peek, preview, expanded, pinned, dismiss; keyboard and mouse consistency.
- `ActivityTimeline`: real task progress, status, errors and completion; no fake percentages.
- `MotionSystem`: performant transform/opacity animations, throttled pointer tracking, prefers-reduced-motion support.
- `ModuleShell`: shared navigation, contextual actions, consistent icons, loading/empty/error/success states for Chat, Shortcuts, Pins, Reminders, Reports, Settings, Library.
- `UIQualityGate`: screenshot diff at multiple DPI/scales, keyboard tests, drag/drop, memory, CPU/GPU usage, hit targets, screen-reader labels, offline/error and recovery.

## Acceptance criteria
Every module must have a purposeful empty state, a functional primary action, a real loading/progress state where relevant, failure and recovery, consistent iconography, keyboard navigation and mouse interaction, safe data handling, and measurable performance. A visually attractive static mock is not a completed module.

## Preservation boundary
The backup branch `backup/maria-pre-visual-overhaul-20261012` at commit `0f0e04bc0b5a3820dc8672e676be534a4faa5e99` is the pre-overhaul source baseline. Original user working tree must not be reset or force-merged. Installer is separately built from that snapshot.
