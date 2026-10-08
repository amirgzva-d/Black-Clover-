# MARIA — Master Capability & Skill Specification

**Canonical design file:** YES  
**Branch:** \`design/maria-skill-specs\`  
**Purpose:** One source of truth for every MARIA capability before local implementation.  
**Local implementation rule:** No capability is marked IMPLEMENTED until it runs and verifies successfully on the user's actual Windows MARIA environment.

## Global rules

Every capability in this file must use the shared MARIA pipeline:

\`Normalize → Typo/STT Recovery → Semantic Intent → Slot Extraction → Context Resolution → Confidence → Permission/Risk → Plan → Execute → Verify → Undo/Memory\`

Global requirements:
- Natural-language understanding, not exact-string if/else matching.
- Persian formal/colloquial, short/incomplete commands, Persian-English mixing.
- Common typos and speech-recognition errors.
- Numeric, relative, fractional and vague expressions.
- Context references such as "این", "اون", "همونو", "کمترش", "قبلی".
- Stable canonical intents and typed slots.
- Capability detection before execution.
- Verification after state-changing actions.
- Undo/rollback where possible.
- No false "done" response.
- Safe learning of preferences/aliases, never self-modifying executable code.
- Multi-step Planner/Routine compatibility.
- Real-device integration tests before implementation status is considered complete.

## Capability status

| # | Capability | Design | Local implementation |
|---|---|---|---|
| 01 | Audio / Media | DESIGN COMPLETE v1 | WAITING FOR LOCAL SYSTEM |
| 02 | Display / Brightness | DESIGN COMPLETE v1 | WAITING FOR LOCAL SYSTEM |
| 03 | Files / Folders | NEXT | WAITING |
| 04 | App Install / Update | QUEUED | WAITING |
| 05 | Windows Settings | QUEUED | WAITING |
| 06 | Troubleshooting / Repair | QUEUED | WAITING |
| 07 | Web Search / Research | QUEUED | WAITING |
| 08 | Browser Automation | QUEUED | WAITING |
| 09 | YouTube / Web Media | QUEUED | WAITING |
| 10 | Messaging / Forwarding | QUEUED | WAITING |
| 11 | Timed / Conditional Actions | QUEUED | WAITING |
| 12 | Power / Lock / Security | QUEUED | WAITING |
| 13 | Excel / Office | QUEUED | WAITING |
| 14 | Desktop Organization | QUEUED | WAITING |
| 15 | Selection / Clipboard | QUEUED | WAITING |
| 16 | Translation / OCR | QUEUED | WAITING |
| 17 | Screen Understanding | QUEUED | WAITING |
| 18 | Download / Convert / Archive | QUEUED | WAITING |
| 19 | Web-App Agent | QUEUED | WAITING |
| 20 | Face Presence | FUTURE | WAITING |
| 21 | Gesture Control | FUTURE | WAITING |
| 22 | Planner / Routines | QUEUED | WAITING |

---

## 01 — Audio & Media Control

**Status:** DESIGN COMPLETE v1 — WAITING FOR LOCAL IMPLEMENTATION  
**Capability family:** 'audio.*', 'media.*'  
**Owner modules:** Brain / Intent Router / Context Engine / Windows Audio Adapter / Media Adapter  
**Offline capable:** yes for Windows audio + local media controls  
**Risk class:** L0-L2 depending on target and automation context  
**Primary platform:** Windows

---

### 1. Purpose

MARIA must understand natural Persian voice/text requests about sound without depending on exact phrases.

The skill must support:
- system master volume
- mute / unmute
- absolute volume
- relative volume
- vague/adaptive changes
- fractions and conceptual values
- per-application/session volume
- active-video / active-music volume
- media play / pause / stop / next / previous
- microphone mute / unmute
- input/output device inspection and switching
- current audio state queries
- restore / undo
- gradual/fade changes
- context-aware target resolution
- mixed Persian/English commands
- spelling errors and speech-to-text errors
- multi-step plans and routines

Examples are evaluation/training examples, NOT an exact-string command table.

---

### 2. Audio semantic model

MARIA must keep these concepts separate:

#### 2.1 Numeric level
- '100' = maximum level.
- '0' = minimum numeric level.
- Numeric level is clamped only after interpretation and validation.
- Internal normalized form may use 0..100 even when the Windows API uses 0.0..1.0.

#### 2.2 Mute state
Mute is a boolean state and is NOT treated as identical to volume=0.

Why:
- a user can set volume 0 without requesting mute;
- MARIA must preserve the prior non-zero level;
- 'وصلش کن' / 'صدا رو برگردون' can restore the previous level correctly.

#### 2.3 Playback state
'pause/stop/play' is different from muting audio.

Examples:
- 'آهنگو قطع کن' => media.stop or media.pause depending wording/context.
- 'صدای آهنگو قطع کن' => audio.app.mute / target media-session mute.
- 'فیلمو نگه دار' => media.pause.
- 'فیلم رو بی‌صدا کن' => volume/mute, NOT pause.

#### 2.4 Target
Every audio action must resolve a target:
- system master
- active application
- named application
- active media session
- named media session
- microphone
- named input device
- named output device
- system sounds/notifications when addressable
- communication session when addressable

---

### 3. Canonical intents

#### 3.1 Master/system volume
- 'audio.volume.get'
- 'audio.volume.set'
- 'audio.volume.increase'
- 'audio.volume.decrease'
- 'audio.volume.maximum'
- 'audio.volume.minimum'
- 'audio.volume.half_max'
- 'audio.volume.scale_current'
- 'audio.volume.fade'
- 'audio.volume.restore_previous'

#### 3.2 Mute
- 'audio.mute'
- 'audio.unmute'
- 'audio.toggle_mute'
- 'audio.mute.restore_previous'

#### 3.3 Per-app/session
- 'audio.app.get'
- 'audio.app.set'
- 'audio.app.increase'
- 'audio.app.decrease'
- 'audio.app.mute'
- 'audio.app.unmute'
- 'audio.app.restore_previous'

#### 3.4 Device
- 'audio.output.list'
- 'audio.output.get'
- 'audio.output.select'
- 'audio.input.list'
- 'audio.input.get'
- 'audio.input.select'

#### 3.5 Microphone
- 'audio.microphone.get'
- 'audio.microphone.mute'
- 'audio.microphone.unmute'
- 'audio.microphone.toggle_mute'
- 'audio.microphone.level.get'
- 'audio.microphone.level.set'
- 'audio.microphone.level.increase'
- 'audio.microphone.level.decrease'

#### 3.6 Media transport
- 'media.get_active'
- 'media.get_state'
- 'media.play'
- 'media.pause'
- 'media.toggle'
- 'media.stop'
- 'media.next'
- 'media.previous'
- 'media.seek.forward'
- 'media.seek.backward'
- 'media.seek.to'
- 'media.restart_current'

#### 3.7 Advanced / composable audio behavior
- 'audio.duck'
- 'audio.restore_after_duck'
- 'audio.balance.get'
- 'audio.balance.set'

Advanced intents must be capability-gated and only exposed when the selected device/session supports them.

---

### 4. Slots / parameters

### Shared slots

- 'target'
  - 'system'
  - 'active_app'
  - 'app:<name>'
  - 'active_media'
  - 'media:<name>'
  - 'microphone'
  - 'output_device:<name>'
  - 'input_device:<name>'
  - 'system_sounds'
- 'value': integer/float interpreted into 0..100
- 'delta': positive change magnitude
- 'unit': 'points' | 'percent' | 'adaptive'
- 'direction': 'increase' | 'decrease'
- 'relative_base': 'current' | 'maximum'
- 'fraction': e.g. 0.5, 0.25, 0.75
- 'duration_ms': for fade/duck/temporary actions
- 'device_name'
- 'app_name'
- 'media_source'
- 'channel': 'left' | 'right' | 'all'
- 'restore_source': 'immediate_previous' | 'previous_nonzero' | 'routine_snapshot'
- 'confirmation_mode': 'none' | 'contextual'
- 'confidence': 0..1

### Defaults

Adaptive amounts are user-tunable and learnable.

Initial defaults:
- 'یه ذره' / 'ذره‌ای' / 'یک درجه' => 5 points
- 'یکم' / 'یه کم' => 10 points
- 'خیلی' => 20 points
- 'تا آخر' => 100
- 'حد وسط' / 'وسط' => 50
- 'نصفِ صدا' => 50% of maximum by default
- 'نصفِ الان' / 'نصفش نسبت به الان' => current * 0.5

MARIA may learn the user's preferred adaptive step, but must not silently change a clearly numeric command.

---

### 5. Language understanding

#### 5.1 Absolute values

Examples:
- 'صدا رو 30 کن'
- 'صدا سی'
- 'بذار روی ۳۰'
- 'ولوم 70'
- 'volume رو ببر روی 45'
- 'صدای سیستم روی هشتاد درصد'
- 'تا آخر زیادش کن'
- 'آخرش کن'
- 'ماکزیمم کن'
- 'صدا صفر'
- 'ببر روی صفر'
- 'حد وسط'
- 'بذار نصف'

Expected normalization:
- numeric forms in Persian or Latin digits are equivalent;
- written numbers should be parsed;
- 'درصد' and bare 0..100 numbers are supported;
- a bare number inherits the most recent audio target only when context is strong.

#### 5.2 Relative values

Examples:
- '10 تا زیاد کن'
- 'ده درجه بیشتر'
- '20 درصد کم کن'
- 'یه ذره ببر بالا'
- 'یکم کمتر'
- 'خیلی کمه بیشترش کن'
- 'زیاده یه خورده بیارش پایین'
- 'دو درجه کم'
- 'پنج تا دیگه'
- 'باز یکم بیشتر'

Rules:
- '10 تا زیاد کن' means current + 10 points unless the user explicitly says 'ده درصدِ مقدار فعلی'.
- changes never wrap around 0/100.
- repeated short commands inherit the previous target/action.

#### 5.3 Fraction / conceptual values

Examples:
- 'نصفش کن'
- 'صدا نصف'
- 'یک چهارمش کن'
- 'سه چهارم'
- 'ببر وسط'
- 'بذار یک سوم'
- 'نصفِ الانش کن'
- 'دو برابرش کن'

Interpretation:
- 'نصفش کن' with no qualifier => 50/100 when referring to target level.
- 'نصف الان' => current * 0.5.
- 'دو برابر' => current * 2, capped at 100 after explaining/capturing the bounded result if necessary.
- when linguistic context cannot distinguish target=50 from halve-current, MARIA asks a short clarification rather than guessing.

#### 5.4 Mute / unmute language

Mute examples:
- 'صدا رو قطع کن'
- 'قطعش کن'
- 'بی‌صداش کن'
- 'میوت کن'
- 'mute'
- 'ساکتش کن'
- 'صداشو ببند'
- 'هیچی ازش پخش نشه'
- 'صدای اینو کامل ببند'
- 'فقط این برنامه ساکت'

Unmute examples:
- 'وصلش کن'
- 'صدا رو وصل کن'
- 'از میوت درش بیار'
- 'unmute'
- 'صداشو برگردون'
- 'دوباره صدا داشته باشه'
- 'همون صدای قبلی رو برگردون'

Important:
- 'قطعش کن' is context-sensitive. It can mean media stop, audio mute, Bluetooth off, network disconnect, etc.
- Audio owns this phrase only when the discourse/selected target is clearly audio/media.

#### 5.5 Per-application/session language

Examples:
- 'فقط صدای Chrome رو کم کن'
- 'کروم رو بی‌صدا کن'
- 'صدای Spotify روی 20'
- 'تلگرام ده تا کمتر'
- 'صدای بازی بمونه ولی موزیکو قطع کن'
- 'فقط فیلم کم بشه، صدای سیستم دست نزن'
- 'این ویدئو رو بی‌صدا کن'
- 'صدای برنامه‌ای که جلو بازه نصف'
- 'فقط همین پنجره صداش کم شه'

Rules:
- do not silently fall back to master volume when a requested app/session cannot be controlled;
- if multiple sessions exist for the same app, prefer the audible/current media session;
- if the same app has multiple indistinguishable sessions and changing all could be surprising, clarify or apply the configured user preference.

#### 5.6 Media playback language

Play:
- 'پخش کن'
- 'ادامه بده'
- 'play'
- 'راهش بنداز'
- 'فیلم رو ادامه بده'

Pause:
- 'پاز کن'
- 'pause'
- 'نگهش دار'
- 'فعلا وایسش کن'
- 'فیلم رو متوقف نگه دار'

Stop:
- 'استاپ کن'
- 'کامل متوقفش کن'
- 'stop'
- 'پخشش رو ببند'

Next/previous:
- 'بعدی'
- 'آهنگ بعد'
- 'برو بعدی'
- 'قبلی'
- 'آهنگ قبلی'

Seek:
- 'ده ثانیه جلو'
- '30 ثانیه عقب'
- 'ببر دقیقه 12'
- 'از اول'
- 'برگرد اول فیلم'

Media actions require a controllable media session. Browser DOM automation is a fallback capability owned by the Browser/Web Media skill, not the first implementation path.

#### 5.7 Device language

Examples:
- 'صدا رو بفرست روی هدفون'
- 'اسپیکر لپ‌تاپ رو انتخاب کن'
- 'خروجی الان چیه'
- 'چه اسپیکرهایی وصله'
- 'میکروفون لپ‌تاپ رو انتخاب کن'
- 'میکروفون هدست رو فعال کن'
- 'ورودی صدا رو عوض کن'

Aliases such as 'هندزفری', 'هدست', 'اسپیکر', device brand names, and explicit learned names must resolve through the Device Resolver.

#### 5.8 Microphone language

Examples:
- 'میکروفون رو قطع کن'
- 'میکروفونم میوت'
- 'مایک رو ببند'
- 'میک رو وصل کن'
- 'میکروفون رو 70 کن'
- 'ورودی صدا رو کمتر کن'

Privacy rule:
- direct user-requested microphone unmute may execute;
- background/routine-triggered microphone unmute must require explicit user permission.

#### 5.9 Gradual / temporary control

Examples:
- 'آروم آروم صدا رو کم کن'
- 'تو پنج ثانیه برسونش به صفر'
- 'کم‌کم تا 30 بیار پایین'
- 'برای یک دقیقه میوتش کن بعد برگردون'
- 'وقتی دارم حرف می‌زنم موزیک رو کم کن'

These compile into audio actions plus scheduler/event conditions where needed.

---

### 6. Normalization pipeline

Before intent classification:

1. Unicode normalization.
2. Normalize Persian/Arabic variants:
   - ي -> ی
   - ك -> ک
3. Normalize Persian/Arabic/Latin digits.
4. Normalize common spacing/ZWNJ variants:
   - 'صدا رو', 'صدارو', 'صدا‌رو'
5. Normalize repeated punctuation/noise.
6. Preserve meaningful app/device/entity names.
7. Run fuzzy spelling recovery.
8. Run speech-to-text confusion recovery.
9. Run semantic intent classification.
10. Resolve target from context.
11. Parse numeric/value expressions.
12. Score confidence.
13. Validate capability and safety.
14. Execute.
15. Verify actual resulting state.

Do NOT turn normalization into a huge list of exact phrases.

---

### 7. Typo / noisy speech tolerance

Representative input:
- 'سدا رو کم کن'
- 'صدارو کم کون'
- 'صداشو کمکن'
- 'ولومم رو ببر بالا'
- 'ولومو بیار پاین'
- 'میوتش کون'
- 'میکرفن رو قطع کن'
- 'اسپاتیفای صداش ۲۰'
- 'کرم صداشو ببند'
- 'volume رو ۳۰ ک'
- 'کمترش'
- 'بیشتر'
- 'صدا... ده تا بالا'
- 'صدای همین... قطع'

MARIA should combine:
- character-level fuzzy match;
- phonetic/STT similarity;
- semantic embedding/classification;
- slot extraction;
- recent-context resolution.

Entity names must be matched conservatively so fuzzy correction does not confuse two installed applications or devices.

---

### 8. Context resolution

### Context sources
- current foreground process
- currently audible audio sessions
- active Windows media session
- last successful audio target
- last explicit app/device target
- last media target
- conversation subject
- user learned aliases
- current routine/plan
- connected input/output devices

### Target priority

When target is explicit:
1. exact named target
2. learned alias
3. fuzzy unique installed-app/device match

When target is implicit:
1. last explicitly referenced target in the same task
2. selected/foreground media app when user says 'این/همین'
3. active system media session
4. foreground app if it has an audio session
5. master system volume only when no narrower target is implied

Master volume must NOT steal ambiguous commands from another domain.

### Examples

Previous:
'صدای Spotify رو 30 کن'
Then:
'یه کم بیشتر'
=> Spotify +10.

Previous:
'بلوتوث رو قطع کن'
Then:
'وصلش کن'
=> Bluetooth, NOT audio.

A Chrome video is playing:
'فقط صدای فیلم رو ببند'
=> Chrome/media session mute, NOT system master mute.

Multiple Chrome media sessions:
'این یکی رو کم کن'
=> use selected/foreground context if available; otherwise clarify.

---

### 9. Ambiguity policy

Suggested initial confidence policy:

- >= 0.90: execute low-risk reversible audio action.
- 0.75..0.89: execute only if target is unique and action is reversible; otherwise clarify.
- < 0.75: clarify.
- destructive/privacy-sensitive or background-triggered microphone changes use stricter policy regardless of score.

Clarification must be short.

Examples:
- 'صدای کدوم رو کم کنم؛ کل سیستم یا Chrome؟'
- 'منظورت 50 از 100 هست یا نصف مقدار فعلی؟'
- 'دو تا دستگاه با اسم مشابه پیدا کردم؛ کدوم؟'

Do not ask questions when a unique safe target is already clear from context.

---

### 10. Validation & boundaries

### Numeric
- valid normalized level: 0..100.
- negative values are invalid.
- values above 100 are not real Windows percentage levels.
- '120 کن' should normally respond that maximum is 100 and ask/offer 100, rather than silently representing 120.

### Device/session
- unavailable target => report target not available.
- no audio endpoint => report and troubleshoot.
- inactive/disconnected device => do not pretend success.
- per-app control unavailable => do not change master volume as a hidden fallback.
- unsupported media action => report capability limitation for that session and optionally hand off to Browser/App Automation.

### Race conditions
If a device/session disappears between resolution and execution:
1. refresh endpoints/sessions once;
2. re-resolve exact target;
3. retry once when safe;
4. otherwise report failure.

---

### 11. Permission / risk

### L0 — read only
- get volume
- get mute state
- list devices
- get active media

No confirmation.

### L1 — reversible local change
- set/increase/decrease master volume
- app volume
- mute/unmute speakers
- media play/pause/next
- output device switch

Direct user request: execute without extra confirmation.

### L2 — privacy/communication-sensitive
- unmute microphone from automation/background trigger
- changing call/communication audio during an active call
- persistent automatic audio routing rule

Require permission when not directly and unambiguously requested.

---

### 12. Execution contract

Normalized action payload should include:

- 'intent'
- 'target'
- 'value'
- 'delta'
- 'unit'
- 'duration_ms'
- 'source': 'voice' | 'text' | 'routine' | 'event'
- 'context_id'
- 'confidence'
- 'requires_confirmation'
- 'requested_by_user'
- 'undo_snapshot_id'

Example semantic payload:

    intent: audio.app.decrease
    target: app:chrome
    delta: 10
    unit: points
    source: voice
    confidence: 0.97

The executor must never parse the original natural-language sentence again.

---

### 13. Windows implementation direction

Primary implementation must use native state APIs rather than simulated keyboard volume keys.

### Master volume
Use Windows Core Audio EndpointVolume:
- 'IMMDeviceEnumerator'
- 'IMMDevice'
- 'IAudioEndpointVolume'
- 'IAudioEndpointVolumeCallback'

### Per-app/session volume
Use Windows audio sessions:
- 'IAudioSessionManager2'
- session enumeration
- 'ISimpleAudioVolume'
- process/session metadata for target mapping

### Endpoints
Use MMDevice enumeration for active render/capture devices.
Track default endpoints and endpoint-change notifications.

### Media transport
Use 'Windows.Media.Control' / 'GlobalSystemMediaTransportControlsSessionManager' for sessions that expose System Media Transport Controls.

### Fallback principle
Simulated multimedia keys may be a compatibility fallback only after capability detection, never the primary control path.

### Capability detection
At startup and when devices change, maintain:
- available output endpoints
- available input endpoints
- default endpoint
- controllable audio sessions
- active media sessions
- supported transport actions

---

### 14. Verification

Every state-changing action must verify the actual resulting state.

Examples:
- set master to 40 => read master volume and compare within adapter tolerance.
- mute Chrome => read session mute state.
- switch output => verify intended endpoint became selected/default for the chosen scope.
- pause media => re-read playback state.
- next track => verify media metadata/state changed when available.

Never say 'انجام شد' solely because an API call returned success.

Result states:
- 'verified_success'
- 'executed_unverified'
- 'partial_success'
- 'failed'
- 'target_disappeared'
- 'unsupported'

User-facing wording should reflect these states accurately.

---

### 15. Undo / restore

Before a reversible change, capture an audio snapshot.

Snapshot may contain:
- master volume
- master mute state
- selected output device
- target app/session level
- target app/session mute
- microphone state when appropriate

Commands:
- 'مثل قبلش کن'
- 'برگردون'
- 'همون صدای قبلی'
- 'Undo'
- 'تنظیم قبلی رو برگردون'

Rules:
- undo defaults to the immediately preceding compatible audio action.
- keep a short bounded undo stack.
- never restore a device/session that no longer exists without revalidation.
- routine execution can create one routine-level snapshot for rollback.

---

### 16. Failure & recovery

Examples:

### No matching app
User: 'صدای فوتوشاپ رو کم کن'
No Photoshop session exists.
MARIA:
- must not lower system volume;
- can say the app currently has no controllable audio session.

### Device missing
User: 'بفرست روی هدفون'
No active headphone endpoint.
MARIA:
- refresh endpoint list;
- report it is not connected/available.

### Media session unsupported
User: 'ده ثانیه جلو'
Session has no supported seek control.
MARIA:
- hand off to Browser/App Automation if the owning app is controllable there;
- otherwise report limitation.

### Verification mismatch
Requested 40 but resulting state is 55:
- retry once if adapter indicates transient failure;
- re-read state;
- report failure if still wrong.

---

### 17. Learning

Safe learning targets:
- preferred adaptive step ('یکم' = 5/10/etc.)
- preferred default output device
- aliases for app/device names
- user's preferred interpretation of ambiguous fraction wording after explicit correction
- common target after repeated explicit choices

Examples:
- 'وقتی میگم هدفون منظورم Sony WH-1000XM هست.'
- 'از این به بعد یکم یعنی پنج تا.'

Learning record should contain:
- rule
- source
- confidence
- created_at
- last_used_at
- reversible/editable flag

Learning must never rewrite executable audio code.

---

### 18. Multi-step composition

Audio must compose cleanly with Planner/Routines.

Examples:

'حالت کار'
1. open VS Code
2. open Chrome
3. set system volume 30
4. play Spotify
5. set Spotify volume 20
6. verify each step

'شب بخیر'
1. pause active media
2. lower system volume
3. enable selected quiet routine
4. continue other non-audio routine actions

'برای یک دقیقه ساکتش کن بعد برگردون'
1. capture snapshot
2. mute target
3. schedule restore
4. verify mute
5. later restore snapshot
6. verify restore

'وقتی من شروع کردم حرف زدن موزیک رو کم کن'
=> compose voice-activity event + audio.duck + restore_after_duck.

---

### 19. Response behavior

MARIA should keep routine audio acknowledgements short.

Examples:
- 'روی ۳۰ گذاشتم.'
- 'صدای Chrome ده تا کمتر شد.'
- 'میوت شد.'
- 'صدای قبلی برگشت.'

For failed verification:
- 'دستور اجرا شد ولی مقدار صدا تغییر نکرد؛ دوباره بررسی کردم و هنوز روی ۵۵ است.'

Do not spam technical API details unless the user asks.

---

### 20. Test matrix

At minimum the local implementation must include automated/unit intent tests plus real Windows integration tests.

### A. Absolute
A01 'صدا رو 30 کن' => system=30  
A02 'ولوم هفتاد' => system=70  
A03 'volume 45' => system=45  
A04 'تا آخر' with active audio context => 100  
A05 'حد وسط' => 50  

### B. Relative
B01 'ده تا بیشتر' => +10  
B02 '۲۰ درصد کمتر' => -20 points by default semantic policy  
B03 'یه کم کمش کن' => adaptive decrease  
B04 'باز یه کم' => repeats previous direction/target  
B05 at 98 +10 => bounded 100  

### C. Fractions
C01 'نصفش کن' => 50% maximum by default  
C02 'نصف الان' at 80 => 40  
C03 'یک چهارم' => 25  
C04 'دو برابرش کن' at 30 => 60  
C05 ambiguous fraction phrasing => clarify  

### D. Mute
D01 'صدا رو قطع کن' => master mute  
D02 'وصلش کن' after D01 => unmute/restore  
D03 volume=0 then 'وصلش کن' => follow restore semantics, not assume mute  
D04 'کروم رو میوت کن' => app mute  
D05 'فیلمو قطع کن' => media stop/pause context, NOT audio mute  

### E. App/session
E01 'صدای Spotify 20'  
E02 'تلگرام ده تا کمتر'  
E03 'فقط فیلم رو بی‌صدا کن'  
E04 missing app session => no master fallback  
E05 duplicate sessions => resolve/clarify safely  

### F. Typos/STT
F01 'سدا رو کم کن'  
F02 'صدارو کم کون'  
F03 'ولومو بیار پاین'  
F04 'میکرفن رو قط کن'  
F05 mixed 'Chrome صداش mute'  

### G. Context
G01 Spotify target then 'بیشتر' => Spotify  
G02 Bluetooth topic then 'وصلش کن' => NOT audio  
G03 active Chrome video + 'این رو ساکت کن' => Chrome/media  
G04 previous audio action expired/context changed => avoid stale target  
G05 learned device alias => correct device  

### H. Device
H01 list outputs  
H02 get current output  
H03 switch to unique headset  
H04 missing headset  
H05 two similarly named devices => clarify  

### I. Microphone
I01 direct 'مایک رو میوت کن'  
I02 direct 'مایک رو وصل کن'  
I03 background routine requests unmute => permission gate  
I04 get mic state  
I05 unavailable mic => report  

### J. Media
J01 play  
J02 pause  
J03 next  
J04 previous  
J05 seek supported session  
J06 unsupported seek => handoff/failure, no fake success  

### K. Verify/undo
K01 set volume and verify  
K02 mute and verify  
K03 adapter returns success but state unchanged => no false success  
K04 undo master change  
K05 undo app change  
K06 session disappeared before undo => safe failure  

### L. Boundaries
L01 -5 => invalid  
L02 120 => explain max / ask or map only with explicit policy  
L03 0 => numeric minimum  
L04 100 => maximum  
L05 no output endpoint => diagnostic response  

---

### 21. Acceptance criteria

Audio v1 is releasable only when:

1. Core intent classification passes >= 98% on the curated audio evaluation set.
2. Typo/STT evaluation passes the agreed robustness threshold.
3. No per-app request silently changes master volume.
4. 'mute', 'volume=0', and 'media stop' remain semantically distinct.
5. Context carry-over correctly preserves target across short follow-ups.
6. Cross-domain context prevents audio from stealing generic commands like 'قطعش کن'.
7. Every state-changing action implements verification.
8. Reversible volume/mute actions support undo.
9. App/device disappearance is handled without false success.
10. Direct user microphone control works while automated unmute remains permission-gated.
11. Core Windows master/app audio works offline.
12. Real Windows integration tests pass on the user's MARIA system before status changes to IMPLEMENTED.

---

### 22. Local implementation plan

When the user's Windows system is available:

1. Inspect MARIA's current action/intent architecture.
2. Add a Windows Audio Adapter behind the shared Tool/Skill interface.
3. Implement master volume + mute first.
4. Add endpoint enumeration and output/input state.
5. Add per-session/app volume resolver.
6. Add Media Session adapter.
7. Connect Intent Router to this canonical schema.
8. Add context carry-over.
9. Add verifier + undo snapshots.
10. Run the full real-device test matrix.
11. Fix driver/device-specific issues.
12. Only then mark the feature IMPLEMENTED.

---

### 23. Official Windows API references

Implementation should be validated against current Microsoft documentation for:
- Core Audio EndpointVolume / IAudioEndpointVolume
- MMDevice / IMMDeviceEnumerator
- Audio sessions / ISimpleAudioVolume
- Windows.Media.Control / GlobalSystemMediaTransportControlsSessionManager

The implementation layer may change as Windows evolves; the canonical MARIA intents must remain stable.

---

## 02 — Display / Brightness / Monitor Control

**Status:** DESIGN COMPLETE v1 — WAITING FOR LOCAL IMPLEMENTATION  
**Capability family:** \`display.*\`, \`brightness.*\`, \`monitor.*\`  
**Owner modules:** Brain / Intent Router / Context Engine / Display Resolver / Windows Display Adapter  
**Offline capable:** yes for core Windows/local monitor control  
**Risk class:** L0-L3 depending on topology/resolution/persistent changes  
**Primary platform:** Windows

### 1. Purpose

MARIA must understand natural requests about the screen/display without relying on exact phrases.

This capability covers:
- brightness read/set/increase/decrease
- vague/adaptive brightness changes
- fractions and conceptual brightness values
- per-monitor brightness
- laptop/internal vs external monitor resolution
- monitor power off/on where supported
- Night Light / warm-color mode where supported
- adaptive brightness / ambient-light control where supported
- display topology: extend / duplicate / internal-only / external-only
- primary monitor selection
- resolution
- refresh rate
- orientation
- scale/DPI where safely supported
- HDR state where supported
- monitor identification/listing
- restore/undo
- temporary/scheduled display changes
- context-aware target resolution
- typo/STT tolerance
- Persian/English mixed commands
- multi-step routines

Examples below are semantic training/evaluation examples, not a hard-coded phrase table.

---

### 2. Semantic distinctions

MARIA must keep these concepts separate.

#### 2.1 Brightness vs monitor power
- "نور رو صفر کن" => numeric brightness minimum.
- "صفحه رو خاموش کن" => monitor/display power off, not brightness=0.
- "سیستم رو خاموش کن" => Power skill, not Display skill.
- "صفحه رو روشن کن" => wake/restore display where supported, not PC power-on.

#### 2.2 Brightness vs theme
- "نور صفحه رو کم کن" => brightness.
- "صفحه رو تاریک‌تر کن" => usually brightness if physical display context is active.
- "تم رو دارک کن" => UI/theme skill, not brightness.
- "این سایت رو تاریک کن" => browser/site theme when context points to a webpage.

#### 2.3 Night Light vs brightness
Night Light changes color temperature/warmth; it does not mean lowering brightness.

Examples:
- "نور شب رو روشن کن" => night-light capability.
- "نور صفحه رو کم کن" => brightness.
- "صفحه زردتر بشه" => color temperature/night-light style intent when supported.

#### 2.4 Resolution vs scale
- Resolution changes pixel mode.
- Scale changes UI scaling/DPI.
- MARIA must never interpret "بزرگش کن" as one of these without context.

#### 2.5 Physical monitors
"مانیتور اول", "صفحه لپ‌تاپ", "مانیتور سمت راست", "مانیتور اصلی", and brand/model names may resolve to different physical displays.

---

### 3. Canonical intents

#### 3.1 Brightness
- \`display.brightness.get\`
- \`display.brightness.set\`
- \`display.brightness.increase\`
- \`display.brightness.decrease\`
- \`display.brightness.maximum\`
- \`display.brightness.minimum\`
- \`display.brightness.half_max\`
- \`display.brightness.scale_current\`
- \`display.brightness.restore_previous\`
- \`display.brightness.fade\`

#### 3.2 Monitor discovery/state
- \`display.monitor.list\`
- \`display.monitor.get_active\`
- \`display.monitor.identify\`
- \`display.monitor.get_primary\`
- \`display.monitor.set_primary\`

#### 3.3 Monitor power
- \`display.power.off\`
- \`display.power.wake\`
- \`display.power.restore_previous\`

#### 3.4 Night Light / color temperature
- \`display.night_light.get\`
- \`display.night_light.enable\`
- \`display.night_light.disable\`
- \`display.night_light.toggle\`
- \`display.color_temperature.get\`
- \`display.color_temperature.set\`

These intents are capability-gated. Use only supported/documented mechanisms or a reliable UI/settings adapter; do not make undocumented registry edits the primary implementation.

#### 3.5 Adaptive brightness / ambient light
- \`display.adaptive_brightness.get\`
- \`display.adaptive_brightness.enable\`
- \`display.adaptive_brightness.disable\`
- \`display.adaptive_brightness.set_target\`

Only when hardware/driver support is detected.

#### 3.6 Topology
- \`display.topology.get\`
- \`display.topology.extend\`
- \`display.topology.duplicate\`
- \`display.topology.internal_only\`
- \`display.topology.external_only\`
- \`display.topology.restore_previous\`

#### 3.7 Resolution / refresh / orientation
- \`display.resolution.get\`
- \`display.resolution.list_supported\`
- \`display.resolution.set\`
- \`display.refresh_rate.get\`
- \`display.refresh_rate.list_supported\`
- \`display.refresh_rate.set\`
- \`display.orientation.get\`
- \`display.orientation.set\`

#### 3.8 Scale / HDR
- \`display.scale.get\`
- \`display.scale.set\`
- \`display.hdr.get\`
- \`display.hdr.enable\`
- \`display.hdr.disable\`
- \`display.hdr.toggle\`

These are capability-gated and require extra validation because Windows/driver support varies.

---

### 4. Slots / parameters

Shared slots:
- \`target\`
  - \`primary_monitor\`
  - \`internal_display\`
  - \`external_display\`
  - \`monitor:<stable_id>\`
  - \`monitor_index:<n>\`
  - \`all_monitors\`
  - \`active_context_monitor\`
- \`value\`: normalized numeric value
- \`delta\`: change magnitude
- \`unit\`: \`points\` | \`percent\` | \`adaptive\`
- \`fraction\`
- \`width\`
- \`height\`
- \`refresh_hz\`
- \`orientation\`: landscape | portrait | landscape_flipped | portrait_flipped
- \`scale_percent\`
- \`topology\`: extend | duplicate | internal_only | external_only
- \`duration_ms\`
- \`temporary_until\`
- \`restore_source\`
- \`confidence\`
- \`source\`: voice | text | routine | event

Initial adaptive brightness defaults:
- "یه ذره" => 5 points
- "یکم" => 10 points
- "خیلی" => 20 points
- "نصف" => 50% maximum by default
- "نصف الان" => current * 0.5
- "تا آخر" => maximum supported brightness
- "کمترین" => minimum supported brightness

Adaptive defaults must be user-tunable and learnable.

---

### 5. Brightness language understanding

#### 5.1 Absolute
Examples:
- "نور صفحه رو 30 کن"
- "روشنایی ۷۰"
- "brightness 50"
- "بذار روی هشتاد درصد"
- "نور تا آخر"
- "حداکثر روشنایی"
- "کمترین نور"
- "نور نصف"
- "بذار وسط"

Expected:
- Persian/Arabic/Latin digits are equivalent.
- written numbers are parsed.
- bare 0..100 numbers inherit the last display target only with strong context.
- supported hardware levels may be discrete; executor maps to closest supported level and verifier reports actual result.

#### 5.2 Relative
Examples:
- "ده تا نور رو زیاد کن"
- "۱۰ درصد کمتر"
- "یه کم روشن‌تر"
- "خیلی تاریکه بیشترش کن"
- "یه ذره کمش کن"
- "باز یکم"
- "دو درجه بیارش پایین"

Rules:
- relative changes apply to the current resolved monitor.
- no wraparound.
- repeated short commands preserve target/direction when context remains active.

#### 5.3 Fractions/concepts
Examples:
- "نصفش کن"
- "نور یک چهارم"
- "سه چهارمش کن"
- "نصف الان"
- "دو برابرش کن"

Same semantic distinction as Audio:
- "نصف" generally means target=50% maximum.
- "نصف الان" means current*0.5.
- if ambiguous and impactful, clarify.

---

### 6. Multi-monitor language

Examples:
- "نور مانیتور دوم رو کم کن"
- "فقط صفحه لپ‌تاپ روشن‌تر"
- "مانیتور سمت راست 40"
- "هر دو رو نصف کن"
- "فقط مانیتور اصلی رو خاموش کن"
- "کدوم صفحه اصلیه؟"
- "این یکی رو اصلی کن"
- "اسم مانیتورها رو بگو"
- "صفحه سامسونگ رو 70 کن"

Display Resolver sources:
1. stable display/monitor identifiers
2. Windows topology information
3. internal/external classification
4. primary display flag
5. monitor friendly name/model
6. physical arrangement (left/right/above/below)
7. foreground window's monitor
8. last explicit display target
9. learned aliases

If "این مانیتور" is said while a window/selection clearly belongs to one monitor, use that monitor.
If not unique, clarify.

---

### 7. Monitor power language

Examples:
- "صفحه رو خاموش کن"
- "مانیتور رو بخوابون"
- "فقط مانیتور خاموش شه، سیستم روشن بمونه"
- "صفحه‌ها رو خاموش کن"
- "نمایشگر دوم رو خاموش کن"
- "صفحه رو دوباره روشن کن"

Rules:
- never route "صفحه رو خاموش کن" to system shutdown.
- monitor-off must not automatically lock PC unless user requests both.
- waking a physical external monitor may depend on hardware/driver state; verifier must detect unsupported cases.
- "خاموشی صفحه بعد از 5 دقیقه" is a power-policy/scheduled setting, not an immediate monitor-off intent.

---

### 8. Night Light / color temperature language

Examples:
- "نور شب رو روشن کن"
- "Night Light رو فعال کن"
- "صفحه گرم‌تر شه"
- "زردیش رو بیشتر کن"
- "نور آبی کمتر"
- "نور شب رو خاموش کن"
- "شب‌ها خودکار روشنش کن"

Rules:
- distinguish Windows Night Light from physical monitor color temperature.
- if direct programmatic control is not reliably available on the target Windows version, route through a supported Settings/UI adapter rather than pretending a low-level API exists.
- scheduled Night Light composes with Automation/Scheduler.
- do not alter brightness unless explicitly requested.

---

### 9. Adaptive brightness / ambient light

Examples:
- "نور خودکار رو روشن کن"
- "روشنایی خودکار خاموش"
- "با نور محیط تنظیمش کن"
- "Adaptive brightness رو فعال کن"

Rules:
- feature exists only on supported hardware/driver configurations.
- absence of ambient-light support must be reported.
- manual brightness override and automatic policy must have explicit restore semantics.

---

### 10. Topology / projector modes

Examples:
- "صفحه رو Extend کن"
- "روی هر دو مانیتور جدا باشه"
- "Duplicate کن"
- "هر دو یه چیز نشون بدن"
- "فقط لپ‌تاپ"
- "فقط مانیتور دوم"
- "برگردون حالت قبلی"
- "مانیتور دوم رو فعال کن"

Normalized:
- extend => independent desktop across displays
- duplicate => mirror where compatible
- internal_only => internal panel only
- external_only => external display path only

Topology changes are higher-impact than brightness:
- capture previous topology first.
- validate at least one usable display path remains.
- prefer Windows-supported topology/display configuration APIs.
- rollback if verification fails and a safe rollback path exists.

---

### 11. Resolution language

Examples:
- "رزولوشن رو 1920 در 1080 کن"
- "1080p کن"
- "بذار روی 2560x1440"
- "رزولوشن مانیتور دوم رو کم کن"
- "بهترین رزولوشن رو بزار"
- "رزولوشن پیشنهادی ویندوز"
- "رزولوشن قبلی رو برگردون"

Rules:
- resolve exact target monitor.
- match only supported modes.
- "بهترین/پیشنهادی" should prefer Windows/native recommended mode when determinable.
- never invent unsupported modes.
- risky topology/mode changes require rollback snapshot.
- if display becomes unusable, automatic timed rollback is strongly preferred.

---

### 12. Refresh rate

Examples:
- "رفرش ریت رو 144 کن"
- "روی 60 هرتز"
- "بیشترین هرتزی که ساپورت می‌کنه"
- "مانیتور دوم 75Hz"
- "رفرش قبلی رو برگردون"

Rules:
- list supported rates for the current resolution/target.
- do not choose a refresh rate unsupported by that exact mode.
- "بیشترین" means highest supported mode that passes adapter validation, not an arbitrary number.

---

### 13. Orientation

Examples:
- "صفحه رو عمودی کن"
- "Portrait کن"
- "افقی کن"
- "مانیتور دوم رو 90 درجه بچرخون"
- "برعکسش کن"
- "جهت قبلی رو برگردون"

Context must distinguish:
- physical display orientation
- rotating an image/document inside an app

---

### 14. Scale / DPI

Examples:
- "اسکیل رو 125 درصد کن"
- "همه چیز صفحه بزرگ‌تر بشه"
- "متن‌ها و آیکون‌ها 150 درصد"
- "Scaling مانیتور دوم رو عوض کن"

Ambiguity:
"همه چیز رو بزرگ کن" is not enough by itself if app zoom, browser zoom, Windows scaling, or resolution are all plausible.

Rules:
- change only supported scaling values.
- warn/verify when sign-out or app restart may be needed.
- do not fake immediate success when Windows reports a deferred effect.

---

### 15. HDR

Examples:
- "HDR رو روشن کن"
- "HDR مانیتور دوم خاموش"
- "این صفحه HDR داره؟"
- "HDR رو برگردون"

Rules:
- hardware, cable, mode and Windows support must be detected.
- if unavailable, explain capability state.
- no silent fallback to changing brightness or color temperature.

---

### 16. Normalization pipeline

Before intent classification:
1. Unicode normalization.
2. normalize Arabic/Persian letter variants.
3. normalize Persian/Arabic/Latin digits.
4. normalize spacing/ZWNJ.
5. normalize common display vocabulary variants.
6. preserve model/device names.
7. typo fuzzy recovery.
8. STT confusion recovery.
9. semantic intent classification.
10. entity/monitor resolution.
11. numeric/unit parsing.
12. context resolution.
13. confidence scoring.
14. capability check.
15. permission/risk check.
16. execute.
17. verify.

---

### 17. Typo / STT tolerance

Representative noisy inputs:
- "نور صفه رو کم کن"
- "روشنای رو ۳۰ کن"
- "براینتس رو زیاد کن"
- "brightness رو ۴۰ کون"
- "مانیتور دومو کم نور تر"
- "رزولوشن ۱۹۲۰ در ۱۰۸۰"
- "ریفرش ریت صد و چهل چهار"
- "نایت لایت روشن"
- "اکستندش کن"
- "دوپلیکیت کن"
- "صفه خاموش"

Use:
- fuzzy text matching
- phonetic/STT similarity
- semantic classifier
- monitor/entity resolver
- recent context

Never aggressively fuzzy-match two real monitors with similar names; ambiguity must remain visible.

---

### 18. Context rules

Context sources:
- last explicit display target
- foreground window's monitor
- current cursor/selection monitor where safely available
- primary display
- Windows active display topology
- monitor arrangement
- current capability conversation
- previous successful display action
- user aliases

Examples:

Previous:
"نور مانیتور دوم رو 30 کن"
Then:
"یه کم بیشتر"
=> same monitor + adaptive increase.

Previous:
"رزولوشن مانیتور دوم رو بگو"
Then:
"1440p کن"
=> same monitor.

Previous:
"تم رو دارک کن"
Then:
"تاریک‌ترش کن"
=> likely theme/UI context, not brightness, unless context explicitly moved to physical display.

Previous:
"سیستم رو خاموش کن"
Then:
"نه فقط صفحه"
=> cancel/replace with display power off, not PC shutdown.

---

### 19. Ambiguity policy

Suggested policy:
- >=0.90 + reversible low-risk action => execute.
- 0.75..0.89 => execute only when target/action is unique and reversible.
- <0.75 => clarify.
- topology/resolution/refresh/scale changes use stricter target validation regardless of confidence.

Short clarifications:
- "کدوم مانیتور؛ لپ‌تاپ یا مانیتور دوم؟"
- "منظورت نور صفحه‌ست یا Night Light؟"
- "می‌خوای مانیتور خاموش شه یا کل سیستم؟"
- "بزرگ‌تر یعنی Scale ویندوز یا Zoom همین برنامه؟"

---

### 20. Validation & boundaries

Brightness:
- normalized policy 0..100.
- actual hardware may expose a discrete supported-level list.
- map only to an actual supported level and verify.
- external monitors may not support software brightness control.

Resolution:
- only supported target modes.
- exact target must exist.
- timed rollback recommended for risky changes.

Refresh:
- must be supported for current/selected mode.

Topology:
- ensure at least one valid usable path remains.
- prevent accidental all-display loss when possible.

Scale:
- supported values only.
- deferred/restart-required states must be represented honestly.

Night Light/HDR:
- capability detection first.
- no undocumented/brittle hidden fallback represented as reliable support.

---

### 21. Permission / risk

L0 — read-only:
- get brightness
- list monitors
- get topology
- get resolution/refresh/HDR state

L1 — reversible local:
- brightness changes
- Night Light toggle
- monitor power off
- orientation if target is explicit

L2 — disruptive display changes:
- resolution
- refresh rate
- primary monitor
- scale
- HDR when mode transitions are disruptive

L3 — topology/persistent changes with risk of losing visible output:
- external-only/internal-only/complex topology change
- persistent automation that changes topology while unattended

For direct explicit user commands, avoid redundant confirmation when rollback safety is strong; otherwise use confirmation for high-impact ambiguous changes.

---

### 22. Execution contract

Normalized payload fields:
- intent
- target
- value
- delta
- unit
- width
- height
- refresh_hz
- orientation
- scale_percent
- topology
- duration_ms
- source
- context_id
- confidence
- requires_confirmation
- undo_snapshot_id

Example:

    intent: display.brightness.decrease
    target: monitor:internal
    delta: 10
    unit: points
    source: voice
    confidence: 0.98

The executor receives normalized semantics only; it must not reinterpret natural language.

---

### 23. Windows implementation direction

#### Internal/laptop brightness
Prefer Windows-supported monitor brightness mechanisms where available:
- WMI \`WmiMonitorBrightness\` for current supported levels/state
- \`WmiMonitorBrightnessMethods.WmiSetBrightness\` for supported internal-monitor brightness control

#### External monitor brightness
For physical monitors that support VESA MCCS/DDC-CI:
- High-Level Monitor Configuration APIs such as \`GetMonitorBrightness\` / \`SetMonitorBrightness\`
- capability detection is mandatory

Microsoft notes that physical-monitor configuration depends on monitor MCCS implementation and may behave inconsistently on arbitrary monitors. Therefore external-monitor control must be hardware-tested before MARIA marks it supported.

#### Display topology/modes
Use Windows Display Configuration APIs:
- \`QueryDisplayConfig\`
- \`SetDisplayConfig\`
- stable source/target mapping
- capture current topology/mode before mutation

#### Night Light / some modern settings
Do not build core behavior around undocumented registry writes. Use a supported Settings/UI automation adapter or documented API when available for the installed Windows version.

#### Capability registry
MARIA should maintain per-monitor capabilities:
- can_get_brightness
- can_set_brightness
- supported_brightness_levels
- can_power_control
- supported_resolutions
- supported_refresh_rates
- supported_orientations
- supports_hdr
- supports_ddc_ci
- is_internal
- is_primary
- friendly_name
- stable_id

---

### 24. Verification

Every state-changing action must verify real state.

Examples:
- brightness=40 => re-read actual brightness.
- monitor2 resolution=1920x1080 => re-query mode.
- extend => re-query active topology.
- primary monitor change => re-query primary status.
- orientation => re-query display mode.
- monitor power off => best available state/behavior verification; mark unverified when Windows/hardware cannot expose a reliable state.

Result states:
- verified_success
- executed_unverified
- partial_success
- unsupported
- failed
- rollback_performed
- target_disappeared

Never say "انجام شد" if verification failed.

---

### 25. Undo / rollback

Before mutable display actions, capture a snapshot:
- brightness per target
- primary display
- active topology
- resolution
- refresh rate
- orientation
- scale where retrievable
- Night Light/HDR state where supported

Commands:
- "برگردون"
- "مثل قبل"
- "تنظیم صفحه قبلی"
- "Undo"
- "رزولوشن قبلی"
- "نور قبلی"

For resolution/topology/refresh:
- prefer automatic timed rollback if the new configuration cannot be verified or if user interaction becomes unavailable.
- never loop endlessly between broken modes.

---

### 26. Failure & recovery

No software brightness support:
- do not fake brightness by applying a dark overlay unless user explicitly chooses an overlay feature.
- report that the monitor does not expose controllable hardware brightness.

External DDC/CI failure:
1. re-enumerate physical monitor once.
2. retry once only when safe.
3. mark unsupported/unreliable if repeated.
4. offer manual/OS settings route.

Mode-change failure:
1. re-query current topology.
2. attempt safe rollback from snapshot.
3. verify rollback.
4. report exact state.

Monitor disappears:
- refresh topology.
- do not apply the action to another display by index accidentally.
- stable ID beats positional index.

---

### 27. Learning

Safe learned preferences:
- "یکم نور" preferred delta
- default display target
- aliases like "مانیتور کار" => specific stable monitor ID
- preferred topology for "حالت کار"
- preferred night brightness
- preferred display setup on charger/battery when explicitly approved

Learning record:
- rule
- explicit/observed source
- confidence
- stable target identifier
- last_used_at
- reversible/editable

Never let learned aliases bind only to transient monitor index when a stable ID is available.

---

### 28. Multi-step composition

Examples:

"حالت کار":
1. detect monitors
2. topology extend
3. make external display primary
4. set laptop brightness 40
5. set external monitor brightness 65 if supported
6. verify all
7. continue app-opening routine

"شب بخیر":
1. lower brightness
2. enable Night Light if supported
3. optionally schedule display-off
4. preserve system state according to routine

"پنج دقیقه دیگه صفحه رو خاموش کن":
=> Scheduler + display.power.off.

"وقتی لپ‌تاپ از برق کشیده شد نور رو 30 کن":
=> power event + display.brightness.set.

---

### 29. Response behavior

Routine success responses should be short:
- "نور روی ۳۰ قرار گرفت."
- "فقط مانیتور دوم روی ۶۰ شد."
- "حالت Extend فعال شد."
- "رزولوشن قبلی برگشت."

Failure:
- "این مانیتور کنترل نرم‌افزاری روشنایی را در اختیار ویندوز نمی‌گذارد."
- "حالت جدید اعمال نشد؛ تنظیم قبلی را برگرداندم."

Technical API details only when requested.

---

### 30. Test matrix

#### A. Brightness absolute
D-A01 "نور رو 30 کن" => internal=30
D-A02 "brightness 70" => 70
D-A03 "نور نصف" => 50
D-A04 "تا آخر" => maximum
D-A05 actual hardware discrete levels => nearest supported + verified

#### B. Relative
D-B01 "ده تا بیشتر" => +10
D-B02 "یه کم کمش کن" => adaptive
D-B03 repeated "باز یکم" => same target
D-B04 at upper bound +20 => bounded
D-B05 target lost => no wrong-monitor fallback

#### C. Typos/STT
D-C01 "نور صفه کم"
D-C02 "روشنای ۴۰"
D-C03 "براینتس رو ببر بالا"
D-C04 "مانیتور دمو کم نور"
D-C05 Persian-English mixed

#### D. Context
D-D01 monitor2 then "کمتر" => monitor2
D-D02 theme context then "تاریک‌تر" => not stolen by brightness
D-D03 "نه فقط صفحه" after power shutdown discussion => display power
D-D04 foreground monitor resolution follow-up
D-D05 stale context expires safely

#### E. Multi-monitor
D-E01 internal brightness
D-E02 external supported DDC/CI
D-E03 external unsupported
D-E04 all monitors
D-E05 two similar monitor names => clarify

#### F. Power
D-F01 screen off only
D-F02 all monitors off
D-F03 monitor-specific off when supported
D-F04 wake unsupported => honest result
D-F05 ensure no system shutdown

#### G. Topology
D-G01 extend
D-G02 duplicate
D-G03 internal-only
D-G04 external-only
D-G05 bad topology => rollback

#### H. Resolution/refresh
D-H01 supported resolution
D-H02 unsupported resolution rejected
D-H03 recommended/native mode
D-H04 supported refresh
D-H05 unsupported refresh rejected
D-H06 verify/rollback

#### I. Orientation/scale/HDR
D-I01 portrait
D-I02 restore orientation
D-I03 supported scale
D-I04 deferred scale result represented accurately
D-I05 HDR unsupported
D-I06 HDR supported toggle + verify

#### J. Night/adaptive
D-J01 night-light enable
D-J02 disable
D-J03 unsupported control path
D-J04 adaptive brightness supported
D-J05 adaptive brightness unsupported

#### K. Undo/verification
D-K01 brightness undo
D-K02 topology undo
D-K03 resolution rollback
D-K04 executor success but state mismatch => no false success
D-K05 monitor removed before restore

---

### 31. Acceptance criteria

Display v1 is design-complete now, but locally releasable only when:

1. brightness intent evaluation is robust to colloquial Persian, typos and STT noise.
2. brightness, power, theme and Night Light remain semantically distinct.
3. multi-monitor target resolution uses stable IDs and never silently jumps to another display.
4. internal brightness works offline where Windows exposes support.
5. unsupported external monitor brightness produces no fake success.
6. all mode/topology changes are verified.
7. risky mode/topology changes have rollback.
8. unsupported resolution/refresh values are never forced.
9. context carry-over works for short follow-ups.
10. cross-domain context prevents Display from stealing unrelated "خاموشش کن/تاریکش کن" commands.
11. real hardware tests pass on the user's MARIA machine.
12. only then status may change from WAITING FOR LOCAL IMPLEMENTATION to IMPLEMENTED.

---

### 32. Local implementation plan

When the user's Windows system is online:

1. inspect current MARIA Intent/Skill/Tool Registry.
2. add Windows Display Adapter.
3. enumerate displays and build stable Display Resolver.
4. implement internal brightness get/set + verify.
5. capability-test external displays for DDC/CI brightness.
6. implement brightness context/undo.
7. add topology QueryDisplayConfig/SetDisplayConfig.
8. add resolution/refresh/orientation with rollback.
9. capability-gate Night Light/scale/HDR adapters.
10. connect Planner/Routines.
11. execute the full real-device test matrix.
12. store machine-specific capability profile.
13. mark only passing features IMPLEMENTED.

---

### 33. Official Windows implementation references

Validate the local implementation against current Microsoft documentation for:
- WmiMonitorBrightness
- WmiMonitorBrightnessMethods / WmiSetBrightness
- GetMonitorBrightness / SetMonitorBrightness
- Monitor Configuration APIs
- QueryDisplayConfig
- SetDisplayConfig

Canonical MARIA intents remain stable even if the Windows adapter implementation changes.
