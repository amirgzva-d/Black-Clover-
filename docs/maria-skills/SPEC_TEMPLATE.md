# Capability Spec Template

**Status:** DRAFT  
**Capability ID:** `domain.capability`  
**Owner module:**  
**Offline capable:** yes/no/partial  
**Risk class:** L0-L5  

## 1. Purpose
What this capability lets MARIA understand and do.

## 2. Canonical intents
List stable internal intents such as:
- `domain.action.set`
- `domain.action.increase`
- `domain.action.decrease`

## 3. Slots / parameters
For every intent define:
- required / optional slots
- accepted types
- numeric ranges
- units
- defaults
- adaptive values
- target resolution

## 4. Language understanding
Cover:
- formal Persian
- colloquial Persian
- very short commands
- incomplete commands
- reordered words
- synonyms
- English/Persian mixed commands
- common typos
- speech-to-text mistakes
- numbers in Persian/English digits
- percentages
- relative expressions
- vague words such as «یکم»، «خیلی»، «نصف»، «قبلی»
- implicit references such as «همونو»، «این»، «اون»، «کمترش کن»

Do not hard-code only phrases. Examples are training/evaluation data for semantic intent recognition.

## 5. Context rules
Define how MARIA resolves:
- current active app
- selected text/file/object
- last referenced object
- last successful action
- media currently playing
- conversation context
- user preferences and learned aliases

## 6. Ambiguity policy
Specify when to:
- act automatically
- infer with confidence threshold
- ask a short clarification
- refuse unsafe assumptions

## 7. Validation & boundaries
Range checks, unavailable targets, unsupported devices/apps, malformed paths, duplicates, etc.

## 8. Permission / risk
Define risk L0-L5 and confirmation requirements.
Sensitive/destructive/external actions need stronger confirmation.

## 9. Execution contract
Exact normalized action payload expected by the executor.

## 10. Verification
How MARIA proves the requested change actually happened.

## 11. Undo / rollback
How to restore previous state where possible.

## 12. Failure & recovery
Fallbacks, retry rules, troubleshooting and user-facing messages.

## 13. Multi-step composition
How this skill participates in agent plans and routines.

## 14. Telemetry / learning
What can be learned safely:
- explicit aliases
- preferred targets
- repeated routines
- corrections
Never let learning silently rewrite executable code.

## 15. Test matrix
Positive, negative, typo, ambiguity, context, boundary, offline, permission and verification tests.

## 16. Acceptance criteria
Concrete pass/fail requirements for release.
