# MARIA Top Island — Phase 7: Right toolbar icon parity

## Requirement
User supplied screenshot and requested that the four new module icons match Home, Chat, Settings, and Sound in **size, line weight, spacing, button style**, and appear **beside Settings at the right edge, never in the middle**.

## Implementation
- `src/renderer/topIslandV4.js`: Remove the obsolete centrally-positioned `v4-section-tools` strip. Insert the existing four actionable modules (Shortcuts, Reports, Pins, Reminders) in `v4-right-tools` immediately before Settings and Sound. No visible label; retain Persian `aria-label` and `title`. Use consistent outline icons: app grid for Shortcuts, outlined report document, pushpin for Pins, clock for Reminders. Mark the active module `aria-current=page`.
- `src/renderer/topIslandV4.css`: Remove abandoned centered-module CSS. The six right-side buttons all use 36×36 controls, 18×18 SVGs, 1.7px strokes, 3px inter-button spacing, matching neutral colors, transparent resting background and consistent hover/focus. Preserve the reference companion, mini mode, click-only expansion, 5-second idle behavior, and the independent large-avatar visibility setting.
- No changes to Shortcut/Pin/Reminder persistent stores or original user files.

## Verification
- `tests/maria-island-header-character-phase6.test.js` updated with Phase 7 assertions.
- `scripts/phase7-right-icon-smoke.mjs` tests a real, isolated Electron renderer and captures mini/preview/expanded images. In the reference 900×226 preview, all six right-side controls are visible, genuinely hit-testable, 36×36 with 18×18 icons and 1.7px strokes, aligned at y=17 with 39px start increments. The center contains no module buttons. Real CDP pointer clicks open all four correct pages.
- `npm run build` and suite results are to be checked on both feature branch and user's main checkout after a non-destructive hash-verified copy.

## Safety
Existing uncommitted ChatGPT, agent, and other UI files in the main MARIA checkout are unrelated and must never be overwritten by the phase.
