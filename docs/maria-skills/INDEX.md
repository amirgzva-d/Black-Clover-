# MARIA Capability Design Index

**Canonical source of truth:** \`MARIA_CAPABILITIES_MASTER.md\`

From this point forward, every new capability specification is appended to the single master file so the local MARIA system can ingest one document when it comes online.

| # | Capability | Master status | Local implementation |
|---|---|---|---|
| 01 | Audio / media control | DESIGN COMPLETE v1 | WAITING FOR LOCAL SYSTEM |
| 02 | Display / brightness | DESIGN COMPLETE v1 | WAITING FOR LOCAL SYSTEM |
| 03 | Files & folders | NEXT | WAITING |
| 04 | App install / update | QUEUED | WAITING |
| 05 | Windows settings | QUEUED | WAITING |
| 06 | Troubleshooting / repair | QUEUED | WAITING |
| 07 | Web search / research | QUEUED | WAITING |
| 08 | Browser automation | QUEUED | WAITING |
| 09 | YouTube / web media | QUEUED | WAITING |
| 10 | Messaging / forwarding | QUEUED | WAITING |
| 11 | Timed / conditional actions | QUEUED | WAITING |
| 12 | Power / lock / security | QUEUED | WAITING |
| 13 | Excel / Office automation | QUEUED | WAITING |
| 14 | Desktop organization | QUEUED | WAITING |
| 15 | Selection / clipboard intelligence | QUEUED | WAITING |
| 16 | Translation / OCR / screen translation | QUEUED | WAITING |
| 17 | Screenshot / screen understanding | QUEUED | WAITING |
| 18 | Downloads / format conversion / archive | QUEUED | WAITING |
| 19 | Web-app automation incl. ChatGPT | QUEUED | WAITING |
| 20 | Face presence (future) | FUTURE | WAITING |
| 21 | Gesture control (future) | FUTURE | WAITING |
| 22 | Multi-step planner / routines | QUEUED | WAITING |

## Global understanding requirements
Every capability must support semantic understanding instead of exact-string matching, including colloquial phrasing, misspellings, incomplete commands, Persian/English mixing, speech-recognition errors, relative values, pronouns/references, learned aliases and context-aware targets.

## Implementation gate
No spec is considered implemented until it is tested on the user's actual MARIA Windows environment and its result is verified.
