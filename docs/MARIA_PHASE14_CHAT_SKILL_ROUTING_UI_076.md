# MARIA 0.7.6 — Chat execution routing, skills, visual polish

Date: 2026-10-11

## What was wrong

1. The chat renderer attached `provider: 'chatgpt'` for **any** selection other than `online:...`; consequently the `auto` option was forced into ChatGPT and did not reach the router's Auto logic.
2. The chat renderer waited for account/provider checks and local conversation loading *before* wiring its UI, making the first open look blank or unresponsive.
3. The Persian corpus's **350,000 generated examples are training/test phrasings**, not independently implemented Windows actions. MARIA has 350 intent/recipe families, but only 61 core intents are directly classified; 247 tools are registered. Model selection, permissions, target resolution, execution and verification still govern whether an action is achievable.
4. A model could respond `done` with no tool calls, or only the action-book search tool, and the chat sometimes marked the turn as successful despite no requested action running.
5. Text referring to local files and folders could be incorrectly interpreted as a public web research request.
6. Catalog canonicalization could substitute a different example app's static name if used as an executable command for a target-requiring intent.

## Fixes

- Added `chatProviderSelection.js` with a stable provider mapping for `auto`, explicit `chatgpt:...`, `online:gemini` and other providers, local and cloud Ollama, applied consistently to send and retry.
- Async chat hydration: the chat shell and handlers render immediately; account/provider status fetch runs separately.
- Persian typo repair is consulted for direct fast actions while preventing catalog examples from filling user-specific target arguments. Added read/extract verbs to action intent recognition.
- Browser research explicitly discriminates local-file lookups from public web search.
- Tool execution is distinguished from model prose and discovery-only tools. Reply and persisted message status now record actual tool outcomes; unexecuted action requests are reported as incomplete.
- When a private local task is issued with ChatGPT selected, **no private content is sent to the cloud**. MARIA can use the local planner if installed; this is never misrepresented as a ChatGPT action. Other cloud providers already follow the same `allowOnline` privacy gate.
- Chat offers a compact Skills information dialog with registered counts and a clear warning that registration does not guarantee connection/execution.
- New polished dark violet ChatGPT-inspired chat visual language, keyboard-safe dialogs, readable content, responsive sidebar and composer, consistent with Top Island's ink/violet theme. **The accepted mini character and topbar have not been changed.**

## Verification

- Unit tests for Auto/Gemini/ChatGPT/Ollama routing, real vs simulated tool success, private fallback, colloquial Persian app names, unintended web search and tool registry exposure.
- Isolated Electron UI smoke verifies quick first open, Skills dialog, Auto selection, settings close and violet theme.
- Full project tests and production build are required before committing and packaging.

## Current limitations

- Gemini, ChatGPT account plan SDK and third-party services require their own valid supported connection. This change cannot grant provider quotas or API access.
- 247 registered tool names and 350 recipe/intent families are **not** 247 guaranteed real-time working actions. Some actions require specific target details, installed apps, UI inspection, external services or explicit confirmation.
- The ChatGPT-plan SDK currently returns text and uses JSON tool-call instructions with strict host allowlisting rather than native direct function calling; Gemini's compatible API can use native tool calls when available.
- Private account data, workbook contents and local files are never silently sent to cloud models.
- The interface is inspired by general modern chat UX, not a pixel-for-pixel copy of the official ChatGPT app.

## Next improvements

- Per-tool capability health checks with explanation of failed prerequisites, permission state, real result and retry guidance.
- Grounded local target resolver for incomplete Persian file/app references; explicit ambiguity handling before acting.
- Benchmark tests on the 350,000 synthetic examples plus a separate manually curated holdout of realistic colloquial messages.
- Optional consent-based cloud planning for non-sensitive command paraphrases without leaking private file contents.
