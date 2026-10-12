# MARIA Cinematic UX — Research and Implementation Gates
**Status:** Design-only branch created on 2026-10-12. No application source files changed here.

## Backup first
GitHub snapshots already created:
- `backup/maria-main-pre-ux-20261012`
- `backup/maria-feature-pre-ux-20261012`

**BLOCKER:** Desktop Commander was offline during this session. These backups cover the commits already present on GitHub, **not uncommitted local Windows files**. Do not begin destructive/overwriting MARIA work until a separately audited local-worktree snapshot is committed or otherwise safely captured. Do not upload secrets, userData, session tokens, personal files, runtime directories or local credentials to this public repository.

## Video review (nine uploaded references)
1. 1000311024 (53s): adaptive notch, runtime task cards, app states.
2. 1000311026 (53s): starting, working, error, upload, success and drag/drop transitions.
3. 1000311030 (12s): Mochi expressions, blink/wink/heart and reactive glow.
4. 1000311034 (8s): 30 illustrated moods/accessories, state-driven expressions.
5. 1000311036 (10s): integrated tool activity, permissions, provider badges, wardrobe.
6. 1000311038 (12s): editable state machine mapping task phases to the avatar.
7. 1000311040 (20s): greeting, working, thinking, upload, dizzy, error, finished, dance animations.
8. 1000311042 (10s): mini-to-expanded notch animation; status/activity and chips.
9. 1000311044 (12s): wardrobe, releases and aspirational integrations.

## Design contract
- **Appearance:** construct a soft superellipse `|x/rx|^n + |y/ry|^n = 1`, `n ~= 2.7`, independent gaze rig/eyes, lightweight specular highlight, optional blush and detachable accessories. Do not substitute a circle or an arbitrary rounded rectangle.
- **Behavior:** mini starts by default; hover only moves the gaze; user **click** opens a clean preview; clicking a module opens its functional page; click-away/Escape or 5 seconds inactivity collapses unless an editor/approval requires protection.
- **Toolbar:** four module actions immediately beside Settings/Sound; all right toolbar buttons 36×36 with 18×18 icons and uniform ~1.7px strokes. Avoid extra center buttons/labels.
- **Events:** execution and tool events drive a single AvatarStateMachine; priority `approval > error > input_required > working > success > idle > decorative`. Known progress only; never invent progress values.
- **Motion:** 100–160ms icon reaction, 240–340ms mini open, 200–280ms module transition, 90–150ms gaze response, event-specific success/error animation under 1s. Honor reduced motion, battery/visibility, keyboard and RTL.
- **Modules:** each of Home, Chat, Shortcuts, Pins, Reminders, Reports, Settings, Files/Projects and Wardrobe needs working domain actions, loading/empty/success/error states, permission UX, accessibility, real tests and sensible motion. Cosmetic animations alone do not qualify as complete.
- **Architecture:** schema-validated Electron IPC → Activity Store + Permission Controller + TopIsland Mode Machine + Avatar State Machine → Shape Renderer/Gaze Rig/Accessories/Motion Budget.
- **Gate order:** (0) backup local Windows work, restore verification; (1) tokens/components/a11y; (2) superellipse avatar rig, gaze, expressions; (3) event-driven Top Island; (4) rich functional modules; (5) wardrobe and verified integrations; (6) performance/visual regression/release.
- **Security:** no automatically granted "Allow Always"; explicit scoped confirmation for sensitive actions. External services shown as connected only after actual handshake.

A longer Persian visual/motion review with video-by-video descriptions and implementation specifications is produced separately as `MARIA_Cinematic_UX_Research_2026-10-12.md` in the conversation. The original nine user-supplied videos are reference material, not copied application assets.
