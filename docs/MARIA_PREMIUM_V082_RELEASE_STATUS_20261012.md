# MARIA 0.8.0-beta.2 — Premium Motion & UI Integration
Date: 2026-10-12 · Windows x64 · latest audited source branch: feature/maria-premium-motion-ux-2026-10-12

## Product and preservation
This is a **beta milestone**, not a claim of 100% pixel-perfect parity with all nine reference videos.
The original pre-upgrade Windows installer 0.7.5, version 0.8.0-beta.1, and independent GitHub source archive remain intact.
A further SHA-256 verified source-file backup was made before beta.2: `C:\Users\cibesabz\MARIA_Backups\PRE_BETA2_20261012`.
The default installed app was not uninstalled, force-closed or silently overwritten.

## Actually integrated
1. **Real native Island morph**: cancellable frame scheduler, smooth easing across peek (292x54), preview (900px) and expanded (1000px); preserves real Electron controls and a stable target rectangle. Animation can be disabled by the environment switch `MARIA_REDUCE_ISLAND_MOTION=1`.
2. **Multi-monitor persistence**: a floating island that was moved to another display uses the work area of its current display for subsequent layouts; it does not reset to the primary display when opening a module.
3. **Adaptive VRM renderer**: skips the expensive Three.js draw/update when hidden; nominal 30 FPS at rest, up to 45 FPS during activity, 20 FPS when reduced motion is requested, and a smaller pixel-density cap. Renderer is now dynamically imported only for the actual avatar surface.
4. **Smart native file drop**: when a dropped file or HTTPS link arrives outside the shortcuts page, the user gets three real actions: open MARIA chat with the path, create a native shortcut via the actual Electron bridge, or save a reference as an actual pin. No file is moved, deleted, or uploaded as a side effect.
5. **Safety checks on the drop path**: untrusted script schemes, invalid strings, local loopback URLs and oversized link fields do not gain an auto-open pathway. All actions require a click.
6. **Honest feature catalog**: 12 cards with search, status filters and links to actual features. Planned capabilities are explicitly marked as unavailable, without dead action buttons.
7. **Visual QA fixes**: the native file-drop choice dialog gained proper full-width action cards and readable file URL wrapping. A broken overlapping dialog was corrected after inspecting an actual Electron screenshot.
8. All features from 0.8.0-beta.1 remain: soft n=2.7 superellipse mascot, 18 states, eight outfits, Motion Studio with live avatar preview, UI status binding, premium chat and module theme, original Windows icon.
9. The main app retains real accounting, reminders, quick launches, voice, 3D avatar import, provider connections and permissions from the earlier working source. None were replaced by illustrative placeholders.

## Validation evidence
- Source automated suite: **279 passed, 0 failed** after beta.2 changes.
- Node unit tests cover native easing/cancellation, clipping to monitor bounds, reduced motion, drop safety, actual pin payloads, feature labels and availability status.
- Electron CDP on separate dev profile **9598** checked: peek 292x54, preview 900, expanded 1000, feature catalog 12 items, filters, working quick launch navigation and file-drop actions.
- Distinct live Electron integration test created both a real Pin and a real Shortcut via exposed IPC and then removed the QA entries. Results were verified against the corresponding stores, without changing the real installed user's data.
- Before fix, the drop-dialog options overlapped; after CSS remediation an actual screenshot confirmed separate legible action rows.
- Vite production build succeeded.
- **Important:** AV/GPU utilization under demanding 3D scenes, all accessory combinations, fully packaged installer startup and exact cross-platform reference-frame timing still need controlled acceptance tests. An unsigned Windows binary can trigger SmartScreen.

## Reference intent and outstanding work
The reference videos show many combinations beyond the 18 functional runtime states. The current companion renderer is a lightweight DOM/CSS pseudo-3D version, not the original artists' 3D asset or a frame-perfect recreation. Original references are not extracted/re-used as third-party code. More detailed visual animation comparison, production animation timing/FX, native notification improvements and complete voice/VRM synchronized motions remain distinct development tasks.
Editor integration and GitHub alert subscriptions are listed as *planned* unless an actual authorized connector is configured. Mobile builds are likewise marked planned.
Both the existing **0.7.5 fallback** and **0.8.0-beta.1** release artifacts are preserved.

## Rollback and operating instructions
Test beta.2 as a separate build before replacing the existing installation, ideally with a separate Windows user profile or preserved app data.
The isolated dev-test profile is `BlackCloverLiveDev-motionbeta2-isolated` under Windows AppData.
Release is not considered final until end-to-end installation validation, automated visual comparison, high-DPI and multiple display validation, crash/restart recovery and verification of every user action have passed.
