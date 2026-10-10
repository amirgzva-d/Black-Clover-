# MARIA — Active Capability Design Queue

**Repository:** amirgzva-d/Black-Clover-  
**Branch:** design/maria-skill-specs  
**Purpose:** Working queue for capabilities designed one-by-one before local Windows implementation.  
**Local implementation status:** WAITING FOR USER SYSTEM ONLINE

## Working rule

Every capability is designed first, reviewed, then kept in GitHub as the canonical implementation target.

Shared execution model:
Normalize → Typo/STT Recovery → Semantic Intent → Slot Extraction → Context Resolution → Capability Resolver → Permission → Planner → Execute → Verify → Undo/Memory.

No capability is implemented locally until the user's Windows MARIA system is online and the design has been synced, tested and verified on the real machine.

## Current queue

1. Smart Quick Launch / Shortcuts — DESIGN LOCKED v1
2. Contextual Plus (+) — DESIGN LOCKED v1
3. Pins add flow — DESIGN LOCKED v1
4. Reminder / Task add flow — DESIGN LOCKED v1
5. Audio — detailed implementation design already in MASTER
6. Display — detailed implementation design already in MASTER
7. Files / Folders — detailed implementation design already in MASTER
8. Remaining capability families — continue one-by-one with the user

---

# 1 — Smart Quick Launch / Shortcut Resolver

## Goal

The user should not need to tell MARIA whether a target is an app, file, folder, URL, project, media item or action. MARIA detects the target type and creates the correct shortcut automatically.

Supported shortcut target classes:
- application/executable
- installed application identity
- file
- folder
- URL/web page
- project/workspace
- document
- media file
- contact/chat
- routine
- MARIA action
- script/command only when policy permits

## Input methods

MARIA must support all of these:
- click/select an item, then press +
- drag & drop an item onto Quick Launch
- drag & drop onto the contextual + target
- choose from file picker
- paste a path
- paste a URL
- voice/text command such as "این رو میانبر کن"
- "این فایل رو بذار تو میانبرها"
- "از این برنامه شورتکات بساز"
- "این پوشه رو پین کن"
- selection-context action from Explorer/Desktop/browser

## Automatic target detection

Resolver order:
1. inspect selected/drop payload
2. classify by shell/file metadata
3. resolve Windows shortcut (.lnk) to its true target
4. distinguish executable vs ordinary file
5. distinguish file vs folder
6. identify known project/workspace formats
7. detect URI/URL
8. inspect installed-app identity when applicable
9. infer media/document subtype for icon/preview only
10. assign canonical shortcut target_type

Canonical intents:
- shortcut.create
- shortcut.create_from_selection
- shortcut.create_from_drop
- shortcut.open
- shortcut.edit
- shortcut.rename
- shortcut.remove
- shortcut.retarget
- shortcut.repair
- shortcut.resolve_target
- shortcut.verify
- shortcut.move_group
- shortcut.assign_hotkey
- shortcut.remove_hotkey

Core slots:
- target_type
- target_identity
- path
- uri
- app_id
- display_name
- icon_source
- working_directory
- arguments
- group
- hotkey
- launch_mode
- follow_target_policy
- verification_method

## Critical requirement: shortcut survives file moves

A shortcut must not rely only on a brittle saved path.

MARIA stores:
- last_known_path
- stable file identity when Windows/filesystem exposes one
- file size/type/creation metadata
- optional content fingerprint for safe non-secret local files
- parent/project identity
- recent-location history
- original shortcut/app identity if target is an installed app

When target path breaks, repair strategy:
1. check stable identity
2. check known move/rename events
3. search recent locations
4. search expected parent/project
5. use metadata/fingerprint match
6. if exactly one high-confidence match exists, repair shortcut
7. if ambiguous, show candidates instead of silently opening the wrong file

When MARIA itself moves/renames a tracked target, Shortcut Registry must update transactionally.

## Drag & Drop behavior

Dropping:
- EXE/app → app shortcut
- file → file shortcut
- folder → folder shortcut
- URL/text URL → web shortcut
- .lnk → resolve and store true target + original metadata
- multiple items → batch-create preview, then commit
- unsupported payload → explain what cannot be used

Drop preview shows:
- detected type
- name
- current location
- icon
- optional group
- optional custom hotkey

## Selection behavior

If user selects an item and presses +:
- Quick Launch page → create shortcut
- Pins page → create Pin
- Tasks page → create Reminder/Task/Automation
- Accounting page → add watched file/workflow as defined by that module
- other modules → invoke that module's contextual add action

The global + never blindly opens one generic form.

## Shortcut open verification

After click/open:
- app: verify process/window when feasible
- file: verify shell open request succeeded and associated app was launched when observable
- folder: verify Explorer navigation
- URL: verify browser navigation when integration is available
- project/workspace: verify target app/workspace state

Do not claim success if target is missing or launch fails.

## Safety

- ordinary file/folder/app shortcut creation: low risk
- shortcut to destructive/script action: policy-gated
- shortcuts must never embed plaintext passwords/tokens
- untrusted downloaded executable gets trust/source warning before first launch
- target repair must never silently retarget to a low-confidence match

---

# 2 — Contextual Plus (+)

## Principle

The + button means "add something to the page I am currently in", not one universal action.

Context examples:
- Quick Launch → Add Shortcut
- Pins → Add Pin
- Tasks/Reminder → Add Reminder / Task / Scheduled Action / Automation
- Notes → Add Note
- Routine → New Routine
- Accounting Watch → Add watched workbook/customer workflow
- Projects → Add Project
- future modules → register their own + provider

Canonical intents:
- ui.contextual_add.invoke
- ui.contextual_add.preview
- ui.contextual_add.commit
- ui.contextual_add.cancel

Context provider contract:
- module_id
- supported_create_types
- default_create_type
- selection_aware
- drop_aware
- validation
- permission_class
- create_handler
- verify_handler

If a page supports multiple types, + opens a compact type chooser.
If there is a clear single type, + goes directly to the add flow.

---

# 3 — Pins: add flow

Pins must support adding new content from +.

Input:
- typed text
- selected text
- clipboard
- URL
- file
- folder
- image/media
- Excel/workbook reference
- message/conversation reference
- project/workspace
- prompt
- routine/action reference

Canonical intents:
- pin.create
- pin.create_from_selection
- pin.create_from_clipboard
- pin.create_from_drop
- pin.edit
- pin.delete
- pin.open
- pin.copy
- pin.move
- pin.change_type
- pin.archive
- pin.restore

The + button on Pins always enters this creation system.

---

# 4 — Reminder / Task / Automation: add flow

The user must always be able to add new items from +.

Creation types:
- Reminder
- Task/Todo
- Alarm
- Timer
- Scheduled Action
- Recurring Action
- Conditional Automation
- Routine trigger

Examples:
- "20 دقیقه دیگه یادم بنداز..."
- "فردا ساعت 8..."
- "هر روز..."
- "وقتی دانلود تموم شد..."
- "اگر اینترنت وصل شد..."
- "جمعه این پیام رو بفرست..."

Canonical intents:
- reminder.create
- reminder.edit
- reminder.delete
- reminder.complete
- reminder.snooze
- task.create
- task.edit
- task.complete
- timer.create
- timer.pause
- timer.resume
- timer.cancel
- alarm.create
- schedule.create
- automation.create
- automation.pause
- automation.resume
- automation.delete

The + flow must expose the right fields without forcing the user to know these internal types. Natural language can fill the form automatically.

---

# 5 — Local synchronization rule

When the user's MARIA Windows system becomes available:
1. fetch/sync this branch and the master capability specification
2. inspect the current local implementation before changing code
3. map existing healthy components to the approved specs
4. implement missing pieces
5. run unit/integration tests
6. run real Windows interaction tests
7. verify UI behavior on the real display
8. compare local and GitHub state
9. commit/push verified implementation
10. only then mark the capability IMPLEMENTED

Designs in this file are not proof of local implementation.

