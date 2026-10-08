# MARIA Capability Design Index

Branch purpose: design-first specifications before local implementation.

| # | Capability | Spec | Design status | Local implementation |
|---|---|---|---|---|
| 01 | Audio / media control | `01-audio.md` | IN PROGRESS | WAITING FOR LOCAL SYSTEM |
| 02 | Display / brightness | `02-display.md` | QUEUED | WAITING |
| 03 | Files & folders | `03-files-folders.md` | QUEUED | WAITING |
| 04 | App install / update | `04-install-update.md` | QUEUED | WAITING |
| 05 | Windows settings | `05-windows-settings.md` | QUEUED | WAITING |
| 06 | Troubleshooting / repair | `06-troubleshooting.md` | QUEUED | WAITING |
| 07 | Web search / research | `07-web-research.md` | QUEUED | WAITING |
| 08 | Browser automation | `08-browser.md` | QUEUED | WAITING |
| 09 | YouTube / web media | `09-youtube-media.md` | QUEUED | WAITING |
| 10 | Messaging / forwarding | `10-messaging.md` | QUEUED | WAITING |
| 11 | Timed / conditional actions | `11-conditional-actions.md` | QUEUED | WAITING |
| 12 | Power / lock / security | `12-power-security.md` | QUEUED | WAITING |
| 13 | Excel / Office automation | `13-office-excel.md` | QUEUED | WAITING |
| 14 | Desktop organization | `14-desktop.md` | QUEUED | WAITING |
| 15 | Selection / clipboard intelligence | `15-selection-clipboard.md` | QUEUED | WAITING |
| 16 | Translation / OCR / screen translation | `16-translation.md` | QUEUED | WAITING |
| 17 | Screenshot / screen understanding | `17-screen-agent.md` | QUEUED | WAITING |
| 18 | Downloads / format conversion / archive | `18-download-convert-archive.md` | QUEUED | WAITING |
| 19 | Web-app automation incl. ChatGPT | `19-web-app-agent.md` | QUEUED | WAITING |
| 20 | Face presence (future) | `20-face-presence.md` | FUTURE | WAITING |
| 21 | Gesture control (future) | `21-gesture-control.md` | FUTURE | WAITING |
| 22 | Multi-step planner / routines | `22-planner-routines.md` | QUEUED | WAITING |

## Global understanding requirements
Every capability must support semantic understanding instead of exact-string matching, including colloquial phrasing, misspellings, incomplete commands, Persian/English mixing, speech recognition errors, relative values, pronouns/references, learned aliases and context-aware targets.

## Implementation gate
No spec is considered implemented until it is tested on the user's actual MARIA Windows environment and its result is verified.
