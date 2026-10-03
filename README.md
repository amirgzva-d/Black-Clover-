# Black Clover — Windows AI Desktop Assistant

Local-first Windows 11 AI assistant with a static VRM avatar, Persian text/voice input, Ollama brain, and a guarded multi-step tool loop.

## Architecture
`Renderer (VRM + chat + voice) -> Electron IPC -> Agent -> Ollama -> Tool Registry -> Windows`

The AI never executes raw model text as a shell command. It can only call registered tools. Sensitive operations require explicit confirmation.

## Requirements
- Windows 11
- Node.js 22+
- Ollama installed and running
- Start with `qwen3:4b`; use a smaller model if necessary on 8 GB RAM.

## Install
```powershell
ollama pull qwen3:4b
git clone https://github.com/amirgzva-d/Black-Clover-.git
cd Black-Clover-
npm install
npm test
npm run dev
```

## VRM character
Put the user's VRM binary at `public/models/Model_MOSO.vrm`. Until it exists, the UI displays a placeholder. The renderer uses Three.js + `@pixiv/three-vrm`. Animation is intentionally deferred.

## Implemented foundation
- Electron shell with context isolation and sandboxed renderer
- Persian chat UI
- Browser-provided speech recognition when available
- Local Ollama provider
- Bounded multi-step agent/tool loop
- System info, process listing, app discovery/launch, URL opening
- Confirmed shutdown/restart tools
- Tool-result feedback to the model
- Basic tests

## Remaining milestones
This is a foundation, not a claim of a universal 100% computer agent. Still required: visual computer-use (screenshot/vision/mouse/keyboard), file/workspace tools, browser automation, software install/uninstall, scheduler, local STT/TTS, coding workspace automation, persistence, packaging, and end-to-end Windows testing.

## Security model
Read-only and low-risk actions can run directly. Destructive/system actions are `sensitive` and require per-action confirmation. Do not replace this with unrestricted execution of model-generated PowerShell.
