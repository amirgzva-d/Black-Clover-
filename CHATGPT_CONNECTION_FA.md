# MARIA – ChatGPT sign-in and optional OpenAI API

## ChatGPT plan (no separate API key)
1. Run the desktop app on Windows, open **Settings → Continue with ChatGPT**.
2. The **official OpenAI login** opens in your browser. Sign in and explicitly approve the requested ChatGPT plan usage permission.
3. Return to MARIA. A green **ChatGPT • متصل** indicator appears when the account granted plan sharing.
4. Keep the model picker on **Auto • Maria**, or select a returned ChatGPT model. Manage usage via the settings button.
5. When plan limits are reached, choose another available provider or a local model. The ChatGPT plan is subject to eligibility and usage limits, not unlimited.

Requirements: an eligible ChatGPT Plus/Pro plan, working internet, Windows secure credential storage, and a compatible locally running/open-source application. The OAuth login does **not** import ChatGPT conversations, account memory or API credits. Do not paste ChatGPT cookies or access tokens into the UI.

## Command execution
Simple commands (audio, opening apps etc.) continue to use MARIA's fast, local safe-action rules. For nontrivial tool requests MARIA can use connected ChatGPT to interpret instructions into a **JSON tool proposal**, which is validated against the host tool allowlist and MARIA's existing permission/confirmation layer. It **cannot** execute arbitrary assistant text as a shell command. Command execution succeeds only if the corresponding MARIA tool supports the target app, and risky operations require confirmation. Sign-in's text-only SDK is not equivalent to built-in OpenAI hosted Computer Use.

## Optional paid OpenAI API
For those who later purchase separate OpenAI API credit:
1. Open **Settings → OpenAI API** or use **API** next to the **Projects** heading.
2. Paste your personal **OpenAI API key** into the masked input and select GPT-6 Luna (economical), GPT-6.1 Sol or GPT-6 Astra.
3. Click **ذخیره و بررسی اتصال**. The key is encrypted using Electron's OS secure storage and never reaches renderer state after saving.
4. Choose **OpenAI API • کلید شخصی** from the chat model picker; otherwise Auto prefers a connected eligible ChatGPT plan if available.

API billing is **separate from ChatGPT Plus**. API model prices and limits are controlled by OpenAI. No API key is needed for ChatGPT plan sign-in. No keys are committed to the public GitHub repository.

## Privacy and rollback
Private local files and sensitive user data are excluded from automatic ChatGPT plan routing by MARIA's privacy gate. Old chat history is preserved in local storage, not deleted. The chat UI has a familiar two-column layout but is **MARIA**, not the official ChatGPT app; unsupported ChatGPT product features are not claimed as implemented.

Backup branch: `backup/maria-pre-chatgpt-2026-10-08`. Feature branch: `feat/maria-chatgpt-plan-api-20261008`.

Official documentation: https://developers.openai.com/siwc/quickstart
