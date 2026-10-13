# MARIA Premium Motion v0.8.0-beta.1 — Implementation & QA
Date: 2026-10-12 · Windows x64 · source: C:\\Users\\cibesabz\\Black-Clover-Live
**This milestone is a working, tested improvement, NOT a claim of complete pixel-perfect parity with all nine films.**

## Safety / preserved baseline
- PRE-UX complete local project copy: C:\\Users\\cibesabz\\MARIA_Backups\\PRE_UX_COPY_20261012_124021\\Black-Clover-Live
- Baseline GitHub archive with pre-UX source changes: archive/maria-pre-ux-2026-10-12 (commit e5042a1).
- Independent MARIA 0.7.5 fallback installer: GitHub Release maria-v0.7.5-preux-working-20261012 (SHA256 844A1BB1261E4B6F98BAF68E43B44ECE153D0EFE3B23B074093761DA83D06976).
- No destructive Git reset, file deletion, application uninstall, or mutation to desktop-installed data took place in this milestone. Existing Windows package remains intact.

## Implemented on the Windows source tree
1. New **CompanionStateMachine** and motion director with priority, interruption, timeout, teardown, history and backend event adapter. Native tool results do not claim success unless verified.
2. Reference-based superellipse geometry (Lamé exponent 2.7, 96-segment relative polygon) with glossy layered face, eye tracking, blinking, cheeks and task-state badges.
3. Original expressive states: idle, greeting, thinking, searching, working, uploading, listening, speaking, waiting, approval, question, shy, happy, surprised, dizzy, dancing, success, error and offline.
4. Eight independent outfits: classic, studio, wizard, crown, headphones, beanie, party, night. Outfit preference persists separately from motion state.
5. In-app Motion Studio: usable settings entry, live large mascot stage, 18 states preview, eight wardrobe selectors, animation intensity full/subtle/none and Windows reduced-motion preference.
6. Real backend state mapping for ui-state, tool, thinking, approval, error, voice and scheduled action events, without breaking existing Top Island actions.
7. Additive premium colors, shadows, focus indicators and hover feedback for the real shortcut, pins, reminders, accounting and home modules.
8. Chat premium style layer that retains existing model selection, chat routing, history, composer, account and permission controls.
9. Original branded multi-resolution ICO/PNG based on 2.7 superellipse, included in electron-builder Windows packaging.
10. Regression suites and Electron CDP scripts for Top Island Motion Studio, character interactions, settings persistence and chat DOM styling.

## Test evidence on the machine
- Automated Node suite: 273 passing, zero failing, zero skipped.
- CDP live renderer script: scripts/premium-motion-cdp-smoke.mjs: peek -> preview -> expanded -> Motion Studio; verified 18 states / 8 outfits, upload badge, wizard outfit persistence and disabled animations.
- CDP chat script: scripts/premium-chat-cdp-smoke.mjs: chat shell, composer, sidebar, at least eight action controls and the premium background style confirmed.
- Screenshots and JSON smoke report: C:\\Users\\cibesabz\\MARIA_Backups\\PREMIUM_MOTION_SMOKE
- Vite production build succeeded. Installer output, SHA256, GitHub release and installer start-up require separate verification before being called complete.

## Outstanding — explicit acceptance work
- Frame-accurate dynamic comparisons against each of the nine MP4 reference videos have not been established as 100% matches; reference designs are not source assets.
- Real third-party integrations showcased in videos (editor/GitHub event subscriptions etc.) still depend on availability and API permissions. Cosmetic badges must never be portrayed as real completed integrations.
- Full real-world module-by-module flows (file drag-and-drop, accounting workbook writes, notification scheduling, multi-monitor/DPI, offline/low-GPU, 3D imported avatars and speech) require further integration and manual desktop acceptance tests.
- Three.js/VRM avatar chunk remains ~860 KB minified and Vite warns about code splitting. Needs profiling and modular load optimization in next stage.
- Comprehensive user-visible installation smoke and performance/FPS benchmark for final setup are not yet complete.

## Rollback and release discipline
Continue feature work on GitHub branch feature/maria-premium-motion-ux-2026-10-12, not on main or the frozen archive. Keep alpha/beta package names separate from the v0.7.5 fallback. Do not replace an installed working copy without validated migration and a rollback plan.
