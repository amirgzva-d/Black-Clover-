# MARIA GitHub-First Update Strategy

GitHub is the canonical source for MARIA code. A Windows machine is a deployment/runtime target, not the authoritative copy.

## Safe synchronization

When the MARIA PC becomes available:

1. Inspect `git status`, current branch and HEAD.
2. Never discard local uncommitted work automatically.
3. Compare local HEAD with GitHub.
4. Reconcile and commit/push valid local changes first.
5. Run tests before promoting changes.
6. Update `main` only after the candidate branch passes CI and runtime checks.
7. Pull the verified GitHub revision back to Windows.
8. Build and run a local smoke test.
9. Keep the last known-good installer/revision for rollback.

## GitHub CI gate

Required checks:
- install dependencies deterministically;
- unit/integration tests;
- production build;
- Windows package build;
- upload build artifact;
- no secrets committed.

Recommended branch flow:

```
feature/* or maria-cognitive-core
        ↓
GitHub CI
        ↓
review / runtime verification
        ↓
main
        ↓
Windows updater
```

## Windows updater behavior

The updater may automatically fetch and compare. It may automatically update only when:
- working tree is clean;
- no merge/rebase is in progress;
- target commit passed required CI;
- rollback point is recorded.

If local edits exist, updater must stop and report instead of resetting.

## Provider credentials

Credentials never go to GitHub.

Provider configuration is stored locally using OS-protected storage. Code may contain provider names, endpoints and default model identifiers, but never API keys, OAuth tokens or session cookies.

Preferred provider order for the free/fallback pool:
1. Gemini when healthy and free quota is available.
2. Qwen Cloud when healthy and free/initial quota is available.
3. Groq free tier.
4. OpenRouter free routing.
5. local Ollama.

ChatGPT account connection remains an independent official provider and may be preferred for eligible heavy public reasoning.

## Release rule

A release is promoted only after:
- GitHub CI passes;
- local Windows smoke test passes;
- action execution is verified;
- provider persistence survives restart;
- updater rollback was tested.

Do not overwrite the known-good local installer automatically.
