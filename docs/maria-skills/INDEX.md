# MARIA Capability Design Index

**Canonical source of truth:** `MARIA_CAPABILITIES_MASTER.md`

From this point forward, every new capability specification is appended to the single master file so the local MARIA system can ingest one document when it comes online.

| # | Capability | Master status | Local implementation |
|---|---|---|---|
| 01 | Audio / media control | DESIGN COMPLETE v2 EXTENDED | WAITING FOR LOCAL SYSTEM |
| 02 | Display / brightness | DESIGN COMPLETE v2 EXTENDED | WAITING FOR LOCAL SYSTEM |
| 03 | Files & folders | DESIGN COMPLETE v2 EXTENDED | WAITING |
| 04 | App install / update | DESIGN COMPLETE v2 EXTENDED | WAITING |
| 05 | Windows settings | DESIGN COMPLETE v1 | WAITING |
| 06 | Troubleshooting / repair | DESIGN COMPLETE v1 | WAITING |
| 07 | Web search / research | DESIGN COMPLETE v1 | WAITING |
| 08 | Browser automation | DESIGN COMPLETE v1 ADVANCED | WAITING |
| 09 | YouTube / web media | DESIGN COMPLETE v1 ADVANCED | WAITING |
| 10 | Messaging / forwarding | DESIGN COMPLETE v1 ADVANCED | WAITING |
| 11 | Timed / conditional actions | DESIGN COMPLETE v1 ADVANCED | WAITING |
| 12 | Power / lock / security | DESIGN COMPLETE v1 ADVANCED | WAITING |
| 13 | Excel / Office automation | DESIGN COMPLETE v1 ADVANCED | WAITING |
| 14 | Desktop organization | DESIGN COMPLETE v1 ADVANCED | WAITING |
| 15 | Selection / clipboard intelligence | DESIGN COMPLETE v1 ADVANCED | WAITING |
| 16 | Translation / OCR / screen translation | DESIGN COMPLETE v1 ADVANCED | WAITING |
| 17 | Screenshot / screen understanding | DESIGN COMPLETE v1 ADVANCED | WAITING |
| 18 | Downloads / format conversion / archive | DESIGN COMPLETE v1 ADVANCED | WAITING |
| 19 | Web-app automation incl. ChatGPT | DESIGN COMPLETE v1 ADVANCED | WAITING |
| 20 | Face presence (future) | DESIGN COMPLETE v1 FUTURE-ADVANCED | WAITING |
| 21 | Gesture control (future) | DESIGN COMPLETE v1 FUTURE-ADVANCED | WAITING |
| 22 | Multi-step planner / routines | DESIGN COMPLETE v1 ADVANCED | WAITING |

## Global understanding requirements
Every capability must support semantic understanding instead of exact-string matching, including colloquial phrasing, misspellings, incomplete commands, Persian/English mixing, speech-recognition errors, relative values, pronouns/references, learned aliases and context-aware targets.

## Implementation gate
No spec is considered implemented until it is tested on the user's actual MARIA Windows environment and its result is verified.


## Final design review status
- Primary 22-capability roadmap: **DESIGN COMPLETE**
- Next: **FINAL CROSS-CAPABILITY REVIEW**
- Scope: deferred Email/Notification experience, Coucou-inspired interaction patterns, cross-skill consistency, missing capabilities, language-pack coverage, permission/risk alignment, verifier/undo coverage, and local implementation readiness.
