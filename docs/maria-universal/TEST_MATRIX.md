# MARIA Universal v1 Test Matrix
Track each test with PASS/FAIL/BLOCKED + evidence; design files alone do not count as passing.

| Area | Positive case | Negative or ambiguity case | Verification |
|---|---|---|---|
| Shortcut | Drag .lnk from Explorer and click | Missing/unauthorized target | Original path unchanged, launch observed |
| Shortcut | Picker creates folder shortcut | Drag forbidden URL scheme | Persist on reboot, reject scheme |
| Shortcut | Drop 3 mixed targets | Two duplicate targets | Show count and stable deduplication |
| Pins | + creates Persian note | Empty content | Visible after restart, reject empty |
| Reminders | + schedules one-time action | Invalid time/duplicate send | Due event and action logged once |
| Audio | App Chrome volume to 20 | No controllable Chrome session | Only correct session changes |
| Display | Change brightness | Desktop monitor unsupported | No false success claim |
| Files | Copy/rename/ZIP valid path | Delete protected path/zip slip | Hash and source integrity |
| Browser | Pin intended tab | Ambiguous active profile | Correct tab and session |
| Messages | Forward selected item to correct person | Duplicate person name | Preview/confirm recipient; verify once |
| Office | Insert hyperlink via file selection | Broken link and protected workbook | Saved workbook, hyperlink resolves |
| Translation | Selected Persian OCR to English | No selection/private field | Overlay/source policy and accuracy |
| Security | Lock with requested confirmation policy | Restart with unsaved work | Correct policy and no surprise disruption |
| Recognition | Owner opt-in test | Unknown face / camera disabled | Fail closed for assistant, not OS login |
| Planner | Multi-step command across apps | Pronoun without resolvable antecedent | Plan checks each result |
| Privacy | Sensitive content stays local when requested | Prompt injection on website | Deny unapproved send/exfiltration |

## Release rule
For each domain record: implementation commit, test name, real Windows device result, evidence, UX review, rollback capability, and unresolved limitations. Only then mark IMPLEMENTED.
