# MARIA — Phase 10: Fixed Accounting Profiles, Reliable Reminders, Safe Synchronization

Date: 2026-10-10

## Immutable UI contract
- The user-approved Top Island **mini capsule** and **rectangular preview with original character** remain unchanged.
- The original Top Island toolbar HTML and original CSS are frozen. New styles are append-only and scoped to expanded-page features. `tests/maria-workflows-phase9.test.js` uses platform-independent frozen SHA-256 signatures.
- Context-sensitive `+` buttons continue to add only the active module's item. Shortcut drag-and-drop operates on the module without a redundant drop card.
- Expanded panel has an explicit lock button to keep it open during drag-and-drop, dialog selection, and interacting with other applications; tapping the character restores mini.

## Reminder: now a real typed operation engine
- Main process: `ReminderActionExecutor.js` and `ReminderStore.js`.
- Supported unattended operations: open trusted HTTP(S) site, open verified non-executable file or folder, open an existing benign shortcut, copy prepared text, or show a notification.
- An untyped/unsafe request (e.g. send a WhatsApp message, delete a file, execute script/program) is **not** blindly run. MARIA displays the instruction in its chat for explicit approval and records a requiresConfirmation result.
- `open_path` for executables/script types prompts for confirmation rather than launching.
- Local precise date/time and daily, weekly, monthly recurrence. One-time actions are disabled once run, execution results saved with timestamp/count, no duplicate success reminder records.
- Missed tasks (>15 min) follow skip/confirmation policy unless user explicitly selected immediate execution. Snooze/pause/resume supported.
- Main reminder pump uses a single-flight one-second interval and an immediate tick at startup, so reminders do not wait up to five seconds per scan.
- Windows toast notification and optional prepared MARIA chat draft; latter is never auto-submitted.

## Accounting: add a file and choose type only
- New report form has just a native Excel file chooser and a selector: **حسابداری** or **باربری**; file name comes from original file name.
- Supported direct scan formats: XLSX and XLSM. XLS and XLSB need a separately verified conversion/import path; the UI does **not** falsely claim they can be scanned.
- For every accounting workbook, uniform profile `maria-invoice-c14-d14-h14-v1`:
  - Data from **row 14** (inclusive), across all sheets by default
  - **C**: plate; **D**: receipt amount; **H**: linked photo/evidence
  - A row containing either plate or amount is checked for both values and an H hyperlink whose local target exists
  - Missing data, missing hyperlink, broken target and existing file status are tracked without editing original workbook
- Existing accounting monitors migrate once to this profile; `accounting-watch.json.before-invoice-template-v1.backup` preserves old monitor definitions/results before changes.
- Transport monitors remain last, even when pinned, and use a pending-template marker. **Transport-specific column rules must be confirmed using the user's forthcoming sample**; invoice rules are not silently applied to transport data.
- Duplicate workbook paths reuse a monitor ID; no duplicated cards for the same workbook.
- Keep completed monitors active (no archive-on-complete for new accounting files).

## Verification
- All 258 Node tests passed after the implementation, plus Vite production build.
- Isolated Electron CDP smoke test (test-only user data and a separate dev slot) verified: mini starts correctly, Tasks and report forms open, a reminder is saved via the form, a scheduled action executes, a normal reminder fires, manual Run works, result persists, the pinned window remains expanded past idle timeout, and the Excel form exposes exactly `path` and `type`.
- Synthetic XLSX contract test verified C/D/H from row 14, ignored row 13, 1 complete record, missing H hyperlink, missing C, missing D, and ordering invoice before transport.

## GitHub / Windows safety
- Frozen pre-phase baseline: `backup/maria-ui-locked-20261010`, commit `6779253`.
- This phase: `feature/maria-workflows-20261010` (pushed separately before local deployment).
- The original checkout `C:\Users\cibesabz\Black-Clover-Live` contains other uncommitted work, so only verified files may be copied from the tested feature branch. NEVER reset, force-checkout, clean or overwrite unrelated local edits.
- The runtime data store, user Excel workbooks, photos, reminders, and source shortcuts never belong in a Git repository.
- Git pushes require internet. Offline use continues locally; any later sync must verify upstream and local changes, then reconcile conflicts rather than overwriting either side.
- A normal Electron installation uses subprocesses; multiple processes are not evidence of duplicate installed apps. Do not delete application installs/worktrees until duplicate installation paths and active binaries are confirmed.
