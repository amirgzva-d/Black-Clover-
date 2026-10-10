# MARIA Phase 8 — Simple Smart Shortcuts

## Two simple ways to add
1. Inside Shortcuts, either the page + or the persistent MARIA toolbar + opens the SAME chooser: select Windows file/app, select folder, or paste a website URL/path. Selecting a file or folder automatically identifies and saves it without an advanced form. URLs/typed paths require one Add click. Bare domains such as www.example.com gain HTTPS automatically.
2. Drag and drop up to 16 OS-backed Windows files/folders into the Shortcuts page (or drag HTTP/HTTPS links). The real original paths come from Electron webUtils.getPathForFile. Each valid item is saved in turn. Errors do not cancel other items. The original is never moved, renamed, copied, or deleted.

## Card behavior
- Each card shows the OS file/application icon, or a true thumbnail for image files, plus detected name, kind, extension and original path. Clicking the card opens its saved target. Keyboard focus and accessible names remain supported.
- Secondary options are intentionally hidden behind a three-dot menu: Open, Copy Target, Reveal in Explorer, Pin/Unpin to Top, Advanced Rename/Edit, and Delete Shortcut Only with confirmation.
- Back-end duplicate protection is preserved; UI reports already-added items. Multiple successful drops show a batch summary.
- Path copying and Explorer reveal run in scoped IPC handlers using stored shortcut IDs; reveal validates existence before invoking the OS shell.

## Files
- src/renderer/topIslandV4.js and src/renderer/topIslandV4.css: clean UI, quick add, native drag-drop, previews, context actions and readable cards.
- src/main/main.js and src/main/preload.cjs: secure copy/reveal IPC endpoints.
- tests/maria-shortcuts-simple-phase8.test.js: paths, options, icon wiring and source-file safety.
- scripts/phase8-simple-shortcuts-smoke.mjs: isolated Electron end-to-end flow; native OS File objects, PNG thumb dimensions, XLSX icon, global +, in-page +, URL, duplicate prevention, favorite, copy, advanced edit and untouched original bytes.

## Release notes
- Build and tests must be verified in both feature branch and user's main checkout.
- The Windows dialog API is unchanged and uses Electron showOpenDialog. Native file-picker UI and human Explorer drag/drop are manual acceptance checks; automated CDP uses authentic OS-backed file objects via DOM.setFileInputFiles.
- Preserve every unrelated uncommitted change in the main MARIA working directory.