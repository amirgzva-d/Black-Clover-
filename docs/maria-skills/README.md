# MARIA Skill Specifications

This directory is the design source of truth for MARIA's desktop-agent capabilities.

## Goal
Every capability is designed completely before local implementation. Each specification must cover:
- canonical intents/actions
- slots and parameters
- direct, relative, numeric, percentage, colloquial, short and incomplete commands
- common misspellings and noisy speech-to-text forms
- semantic/fuzzy matching expectations
- context resolution and ambiguity handling
- validation and limits
- permissions and risk level
- execution flow
- verification after execution
- undo/rollback behavior when possible
- offline/online behavior
- failure handling and recovery
- multi-step agent composition
- test cases and acceptance criteria
- Windows integration notes
- implementation status and sync status

## Workflow
1. Design and review a capability in this branch.
2. Mark the spec as DESIGN-APPROVED only when complete.
3. When the user's local MARIA system is available, reconcile local/GitHub state first.
4. Implement approved specs on the local system.
5. Run automated + real-machine tests.
6. Sync implementation back to GitHub through a safe branch/PR flow.
7. Only then mark the capability IMPLEMENTED/VERIFIED.

## Safety rule
GitHub specifications are the source of truth, but they do not imply that a capability has already been installed on the user's PC. Local execution requires the system to be available and must be verified separately.
