# Black Clover — Maria Windows AI Desktop Assistant

Local-first Windows 11 AI companion with Persian text/voice, a VRM avatar, durable local memory, live web research tools, guarded computer-control tools, and an optional online AI brain with automatic local fallback.

## Architecture
`Renderer (Maria + VRM + voice) -> Electron IPC -> Agent -> Brain Router -> Online AI (optional) / Ollama local -> Tool Registry -> Windows + Research + Memory`

Maria never executes raw model text as a shell command. It can only call registered tools. Sensitive/destructive operations require host confirmation.

## Requirements
- Windows 11
- Node.js 22+
- Ollama installed and running
- Recommended starting local model for an 8 GB RAM machine: `qwen3:4b` (choose a smaller quantized model if needed)

## Install
```powershell
ollama pull qwen3:4b
git clone https://github.com/amirgzva-d/Black-Clover-.git
cd Black-Clover-
npm install
npm test
npm run dev
```

## Hybrid AI brain
The default brain is local Ollama, so core chat and local computer actions do not require an AI API subscription.

If an online provider is configured, Maria tries the online brain first and automatically falls back to local Ollama when the internet/provider fails.

### Optional DeepSeek
Set these Windows user environment variables, then restart the app:
```powershell
[Environment]::SetEnvironmentVariable('DEEPSEEK_API_KEY','YOUR_KEY','User')
[Environment]::SetEnvironmentVariable('DEEPSEEK_MODEL','deepseek-flash','User')
```
The default endpoint is `https://api.deepseek.com`. You can override it with `DEEPSEEK_BASE_URL`.

### Optional Qwen / Alibaba Cloud Model Studio
Qwen requires an API key and a region/workspace-specific OpenAI-compatible Base URL:
```powershell
[Environment]::SetEnvironmentVariable('DASHSCOPE_API_KEY','YOUR_KEY','User')
[Environment]::SetEnvironmentVariable('QWEN_BASE_URL','YOUR_OPENAI_COMPATIBLE_BASE_URL','User')
[Environment]::SetEnvironmentVariable('QWEN_MODEL','qwen-plus','User')
```
When both Qwen and DeepSeek are configured, Qwen currently has priority. Remove its variables if you want DeepSeek to be selected instead.

Never commit API keys to GitHub.

## Memory
Maria stores durable lightweight memory locally in the user's application-data area (`BlackClover/memory.json`). The model can explicitly remember/recall important preferences and the agent also captures clear phrases such as “remember this”. Relevant memories are retrieved into later conversations.

This local memory is intentionally lightweight for an 8 GB RAM computer. Cloud sync/vector embeddings can be added later without replacing the memory interface.

## Live research
The tool registry includes:
- live public web search
- public web-page reading with private/local network addresses blocked
- Wikipedia background search

These tools allow the AI to research current information instead of pretending all knowledge is inside the model. Search-provider failure does not disable local computer control.

## Network behavior
The UI checks connectivity periodically. On an online/offline transition Maria reacts briefly in her Persian/isekai personality. If an online brain is configured and becomes unavailable, the Brain Router automatically continues with Ollama.

## Voice and character
- Persian speech input when Chromium/Windows SpeechRecognition is available
- Persian voice selection and configurable TTS prosody
- speech interruption and chunked long responses
- VRM loading with Three.js + `@pixiv/three-vrm`
- idle breathing, blinking, pointer gaze, listening/speaking states, early lip-sync pulses and adaptive facial emotion expressions when the VRM supports them

Put the final VRM model at `public/models/Model_MOSO.vrm`.

## Wellbeing reminder
The renderer tracks active interaction locally and can make one playful short-break suggestion after roughly 30 minutes of active use. It never sleeps, locks, shuts down, or interrupts the computer automatically; system actions still require the user's request/approval.

## Implemented capability groups
- Local/optional online AI brain with fallback
- Persistent memory and recall
- Live research tools
- Persian conversation/personality/voice
- Windows power, volume, brightness, media and settings controls
- App discovery/launch/close and WinGet search/install/uninstall/upgrade
- File/folder read, create, rename, copy, move, search and delete
- Clipboard and screenshots
- Window focus, keyboard, mouse and scrolling
- Browser/search/social web shortcuts
- Modular tool registry and multi-step tool loop
- VRM visual states and early expression/lip-sync foundation
- Automated tests and build checks

## Still requires real-machine validation
CI can verify code, unit tests and builds but cannot prove hardware/OS-specific behavior on your machine. After installation, validate microphone access, installed Windows voices, monitor brightness support, WinGet, UAC-sensitive actions, real application windows, Ollama performance, VRM expressions and website/account flows.

## Security model
Read-only and low-risk actions can run directly. Sensitive/destructive actions are marked `sensitive` and require confirmation. Do not replace this architecture with unrestricted execution of arbitrary model-generated PowerShell.
