# MARIA 0.7.3 — Persian Natural Commands / 1000 Utterances per Action

Date: 2026-10-10 | Branch: `feature/maria-persian-1000-intents-20261010`

## Goal / هدف
عبارت‌های فارسی غلط‌دار، محاوره‌ای، با ترتیب متغیر و ادامه‌دار باید به یک «دستور پایدار» نگاشت شوند. هدف حفظ‌کردن هزاران جمله به‌عنوان Regex اجرایی نیست. موتور فارسی ابتدا واژه‌ها را با احتیاط اصلاح می‌کند، موضوع و فعل را تطبیق می‌دهد، Intent استاندارد تعیین می‌کند و سپس از Skill Registry، Tool Registry، PermissionPolicy و FastActionVerifier استفاده می‌کند.

## Components
- `src/agent/PersianSurface.js`: Persian/Arabic Unicode, Persian digits, conservative typo repair, opaque paths/URLs/filenames/quoted payload protection, negative/explanatory/conditional/per-app guard.
- `src/agent/PersianIntentCatalog.js`: **61 stable action intents** with canonical phrasing, risk, required target and tool.
- `src/agent/PersianIntentEngine.js`: deterministic lexical intent recognizer; safely requires clarification for competing interpretations. New object/action pairs do not grant blanket permission.
- `src/agent/PersianActionCorpus.js`: corpus generator. Its corpus includes **61 core intents + 289 pre-existing semantic recipes**.
- `data/persian-intents/maria-fa-1000-per-action.jsonl.gz`: **350,000 distinct synthetic utterances** (1,000 per action), tagged by stable action ID. These samples cover polite forms, reordered verb/object phrases, colloquial alternatives and selected typos; they are **not** a claim of unlimited semantic understanding or 100% real-world voice accuracy.
- `data/persian-intents/manifest.json`: counts, per-action preview, compression and SHA-256 checksum for audit.
- `scripts/generate-persian-1000-corpus.mjs`: regenerate deterministically.
- `scripts/benchmark-fa-intents.mjs`: benchmark all 61,000 generated utterances for **core** intents; output to `data/persian-intents/benchmark-core.json`.
- `src/agent/Agent.js`: uses new understanding in actual direct execution and Skill planner, not just UI suggestions. Negative imperatives are not executed. Safe direct commands route via existing real tool and verifier; critical commands go through permission confirmation; ambiguous, contextual, and risky targets still rely on planner/checkpoint.
- `src/agent/archiveTools.js`: working ZIP / Extract for explicit local paths, never overwrites, preserves original, refuses path traversal/symlinks and oversized archives. Both tools explicitly require permission for persistent writes.

## Examples / نمونه‌ها
- «سدا رو یه کم بیار پایین»، «ولوم رو کمتر کن» → `audio.volume.down` → `volume_down`.
- «صدای کروم رو کم کن» → `audio.app.down`, **not** Windows master volume. Requires app-specific verified UI control; if unavailable, report limitation.
- «روسنایی رو بیشتر کن» → `display.brightness.up`.
- «تلخرامو باز کن» → `apps.launch`, resolve installed application.
- «فایل example.txt رو حزف کن» → `files.delete` → must resolve target and request confirmation; never choose arbitrary similarly named file.
- «این عکس رو ترجمه کن» → `translation.image` → inspect image and proceed through planner.
- «فردا انجام بده» / «وقتی وقتش شد» / «نه الان» → scheduler semantics; **do not execute now**.
- «سیستم رو خاموش نکن» / «چطور خاموشش کنم؟» / «متن «خاموش کن» رو بخون» → **never** launch shutdown immediately.

## Verification status
- `node --test tests/*.test.js`: **282 passed, 0 failed** in isolated feature worktree before version bump.
- `npm run build`: **PASS** (Vite warning about a large avatar chunk is non-fatal).
- Generated corpus audit: **350,000 unique strings**, 1,000 per action, gzip integrity and checksum tested.
- Final benchmark after last disambiguation patch: rerun `node scripts/benchmark-fa-intents.mjs`; the benchmark covers generated data, not real spontaneous speech.
- Hand-written independent held-out examples and negative/conditional tests included.
- Explicit chat-agent integration tests ensure no deletion/shutdown without permission, no quoted-command execution, and no system-wide audio changes for per-app requests.

## Non-goals and safety contract
1. 1,000 synthetic phrases per action provide examples and QA coverage—not 1,000 executable hardcoded rules and not full verification of every accent, ASR error, or Windows environment.
2. A missing target, conflicting objects, uncertain app/contact, payment or deletion request must stop or ask for clarification. Messenger sending follows recipient-and-content confirmation and verifies delivery separately.
3. Context and voice command understanding are different from having permission or capability to operate a specific application; never pretend tools completed a task.
4. Source files, user data, installed apps and local worktree edits must not be deleted, reset or overwritten.
5. **Do not modify the mini and rectangular Top Island visual appearance.** Only these independent agent/skill and test files change in this phase.

## Deployment and synchronisation
- Source of truth: GitHub feature branch; integrate into `main` only if remote `main` is an ancestor and push is non-force.
- Local Windows original checkout: `C:\Users\cibesabz\Black-Clover-Live` has extensive independent uncommitted work. Never use `git reset --hard`, `checkout -f`, `git clean` or copy the entire worktree on top of it.
- Use per-file baseline comparisons and 3-way merge to preserve unrelated edits. Back up local files before even conflict-free integration, run full tests and build, then package/install 0.7.3 into the **existing installation path** only after successful backup and validation. The installed app data is not in Git.
