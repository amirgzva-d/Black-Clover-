# MARIA — Canonical Windows working version

**Date**: 2026-10-12
**Installed unified app**: Black Clover Maria v0.8.0-beta.3
**Windows installation**: C:\\Users\\cibesabz\\AppData\\Local\\Programs\\Black Clover Maria\\Black Clover Maria.exe
**Canonical source working tree**: C:\\Users\\cibesabz\\Black-Clover-Live
**GitHub development branch (published source)**: feature/maria-premium-motion-ux-2026-10-12
**Latest GitHub release**: https://github.com/amirgzva-d/Black-Clover-/releases/tag/maria-v0.8.0-beta.3-video-1030

## Scope of the single evolving version
All future user-provided videos must be implemented in the **same canonical source**, then verified via tests, actual Electron smoke, packaging and version upgrades. Do not fork a separate app for each video. Treat earlier 0.7.5, 0.7.6 and beta.1/.2 release packages as recovery history, not alternative active builds.

## Verified work for reference video 1000311030.mp4
- 720×900, 30fps, 12.118sec reference, sampled at 0.5sec intervals.
- 12-shot replay storyboard matching major emotional transitions. Special appearance in src/renderer/companionFilm1030.js and src/renderer/companionFilm1030.css.
- Purple thought bubble, cyan working, amber warning, mint confirmation and affection with heart eyes/floating hearts; head/eye/blush/arms and subtle shadows.
- Play/Stop controls and phase preview in the existing Motion Studio. Demo expression state is isolated from actual backend execution.
- 283 automated tests passed, full sequence passed Electron CDP native developer-profile smoke, screenshot evidence checked, successful production build and installed ASAR verification.
- Installed version updated from 0.7.6 in place. Windows uninstall registry reports 0.8.0-beta.3; installed app.asar package.json and bundled renderer CSS/JS verified.
- Installer package SHA256: d21ef44b6cc74c171de94f41596bbcd1faa5f9e88178aafd576fbdf00e286e89 (Windows x64).

## Rollback safety
- Pre-video protected source files: C:\\Users\\cibesabz\\MARIA_Backups\\VIDEO_1030_PRE_CHANGE_20261012
- Full 0.7.6 installed executable folder and app user data (local only): C:\\Users\\cibesabz\\MARIA_Backups\\INSTALLED_076_BEFORE_VIDEO1030_20261012
- Previous pre-UX and beta.1/.2 installers remain stored under MARIA_Backups. No secret user data is uploaded to GitHub.
- The original Git working tree retains unrelated uncommitted user work; do not reset, clean, checkout over, or force-push it.

## Outstanding acceptance
Installation and package integrity are verified, but the installed packaged app was **not** put through a full UI-runtime smoke using the live user's profile. The complete set of reference films is not yet frame-perfect; each one should be iteratively improved on this common baseline. Imported user VRM models, external integrations and uncommon Windows workflows need independent functional testing. All installed unsigned Windows packages can trigger SmartScreen. Be precise: version beta.3 is the verified unified milestone, not a claim that every visual/functional detail is 100% complete.
