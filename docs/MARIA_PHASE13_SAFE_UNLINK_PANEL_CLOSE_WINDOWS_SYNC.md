# MARIA 0.7.5 — Safe workbook unlink, close controls, and Windows → GitHub sync

Date: 2026-10-11

## User-visible changes
- In **Reports / Accounting Watch**, every registered workbook has a trash icon next to its sheet settings, details and open buttons. Clicking trash opens an explicit two-step confirmation: **remove only from MARIA**. The original Excel file, its worksheets, linked images, and directories are never deleted, trashed or modified.
- Detail panel includes **Remove from list** too. The already-existing Electron IPC `accounting:remove-monitor` deletes only the monitor definition and cached scan result; it rebuilds file-watch subscriptions and updates the UI. Re-adding the same file works normally.
- Search inside reports by workbook/customer label, invoice number or path, without extra configuration.
- A persistent, small accessible **close button inside the expanded content** works across Settings, Reports, Shortcuts, Pins and Tasks, collapsing to the previously approved mini capsule. The mini and rectangular island topbar markup and mascot appearance are unchanged.
- Modal close, Cancel, backdrop click and Escape have consistent dismissal behavior.
- Full Chat settings close ×, Escape and backdrop dismissal were verified, with focus returned to the settings launcher.
- Fixed a first-time Chat-settings opening race: an IPC request may be delivered before asynchronous chat initialization. The renderer now takes a one-shot pending request after it registers listeners.

## Tests
- Direct Node tests confirm monitor unlink removes its cached records but preserves the original Excel bytes, that a file can be added again, and UI/IPC wiring is present.
- Isolated Electron UI smoke test: actual report search, details ×, sheet-dialog ×, cancel removal, confirmed removal from **copied disposable settings**, five expanded-page close buttons, and return to mini all passed.
- First-launch Chat-settings UI smoke test: settings request survives asynchronous window mount; ×, Escape, backdrop and Chat close all passed.
- On the combined Windows-to-GitHub branch, **291/291 Node tests passed** and Vite production build completed successfully. Tests represent deterministic coverage; live production deployment is verified separately.

## Why this is a genuine Windows-source synchronization
The local developer checkout was based on an older commit but had many changes not in the GitHub working branch. To preserve both sources, the synchronization uses:
1. A **new feature worktree based on current GitHub main**, leaving the dirty Windows developer checkout unchanged.
2. A three-way merge for tracked files against their common ancestor, preserving non-conflicting GitHub changes while resolving overlapping hunks in favor of the latest tested Windows behavior.
3. Explicit preservation checks for GitHub's Persian natural-command corpus, intent engine, ZIP/Extract tools and checked-in tests.
4. Curated source, tests, documentation and safe smoke-test scripts only. Never commit real accounting workbooks, original images, private app settings, authentication profiles, screenshots, local caches or temporary benchmark logs.
5. Full tests and build on the combined branch, backed up remote `main`, then a **non-force fast-forward** main update after checking ancestry.

## Next useful improvements (not automatically implemented in this release)
- An Undo window for accidentally unlinked reports.
- One-time folder re-linking for moved `pic` directories, then automatic validation of broken image targets.
- Change-only alerts when a previously missing receipt/plate image becomes valid.
- Export an error-only Excel/PDF report, including workbook, sheet, date and row.
