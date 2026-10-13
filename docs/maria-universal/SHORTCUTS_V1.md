# Smart Shortcut Skill v1 — design / implementation contract

## UX
Top Island V4 -> Shortcuts -> always-visible '+' plus drop-zone. Also allow '+' in Pins and Tasks with page-specific create form. Dragging a Windows File Explorer item into the app should create a shortcut, not move/copy/delete its actual target.
Accepted inputs: shell path, a dropped file URL list, URL typed/pasted, native file/folder picker, app search selection, manual command with advanced approval.
After adding: show title, icon, detected kind, target summary and health; allow edit/pin/group/reorder/remove. Click opens the referenced original. Offer Open location and Revalidate.
Treat multiple dropped items as separate shortcuts only after explicit user gesture, with duplicate reporting.
Native Windows .lnk resolution must verify path and optionally keep original .lnk so Windows shell semantics work. File extension alone cannot conclusively identify an installed program; .url and http(s) have distinct semantics. Dragging a shortcut never changes the source location.
UNC/network targets: retain but show unavailable if disconnected; do not auto-delete. Never trust unvalidated URL schemes or treat dropped text as executable shell code.

## Canonical intents
shortcut.create, shortcut.create_from_drop, shortcut.create_from_picker,
shortcut.detect_type, shortcut.open, shortcut.validate, shortcut.update,
shortcut.remove, shortcut.pin, shortcut.unpin, shortcut.reorder, shortcut.open_location.
pins.create, pins.update, pins.remove, pins.list.
reminder.create, reminder.update, reminder.cancel, reminder.list.
schedule.action.create, schedule.action.cancel.

## Typed arguments
Shortcut: {source:'drop'|'picker'|'paste'|'voice', target:string, kind:'auto'|'app'|'file'|'folder'|'url'|'webapp'|'media'|'command', label?:string, workingDirectory?:string, group?:string}
Reminders: {text:string, dueAt:ISO8601, timezone:string, recurrence?:string, enabled:boolean}
Pins: {title?:string,text:string,tags?:string[],pinned?:boolean}

## Resolver steps
1 Receive OS drag/drop event or picker selection (not clipboard guessing).
2 Decode input paths/file:// URLs carefully with Unicode, percent-encoding and UNC.
3 Validate allowed URL protocols (http/https); reject javascript:, data:, shell injection.
4 Query fs.stat on a path; classify directory, .lnk/.url, executable, document/media; preserve original path.
5 For app targets select explicit installed app identity when possible.
6 Create record using existing store and verify persistence.
7 Open via existing guarded IPC/open route; verify app/window/file launch where observable; do not claim success just because shell launch returned.
8 If missing target, show repair UI for locating replacement, never silently retarget.

## Test cases
- Desktop .lnk, native executable, documents, images, MP4, workbook, folders and URL.
- Persian characters, spaces, parentheses, UNC offline and long paths.
- Duplicate drops, invalid drops, multiple files, dropped text/HTML and forbidden schemes.
- Drag does not modify source; no accidental installation or execution during create.
- Shortcut click, broken app, moved target, wrong app handler and permission denied.
- '+' in shortcuts, pins, tasks; app restart persistence and accessibility keyboard path.
