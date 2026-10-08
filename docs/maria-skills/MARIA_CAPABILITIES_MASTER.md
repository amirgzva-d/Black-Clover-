# MARIA — Master Capability & Skill Specification

**Canonical design file:** YES  
**Branch:** `design/maria-skill-specs`  
**Purpose:** One source of truth for every MARIA capability before local implementation.  
**Local implementation rule:** No capability is marked IMPLEMENTED until it runs and verifies successfully on the user's actual Windows MARIA environment.

## Global rules

Every capability in this file must use the shared MARIA pipeline:

`Normalize → Typo/STT Recovery → Semantic Intent → Slot Extraction → Context Resolution → Confidence → Permission/Risk → Plan → Execute → Verify → Undo/Memory`

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


## Global Language Dataset Standard — 500–1000 Utterances per High-Frequency Intent

For every high-frequency canonical intent in MARIA, the design target is **500–1000 unique utterance examples** for training/evaluation coverage. These examples are NOT runtime if/else rules.

Each intent language pack should cover a balanced mix of:
1. formal Persian
2. colloquial Persian
3. extremely short commands
4. incomplete commands
5. reordered wording
6. polite requests
7. complaints/indirect requests
8. Persian digits
9. Arabic digits
10. Latin digits
11. written numbers
12. percentages
13. fractions
14. relative values
15. vague values
16. repeated follow-ups
17. "این/اون/همونو/قبلی"
18. explicit target
19. implicit active target
20. selected-object references
21. mixed Persian-English
22. keyboard-typed typos
23. missing spaces
24. repeated letters
25. wrong Persian/Arabic characters
26. phonetic STT errors
27. filler/noise words
28. self-correction
29. negation
30. exclusion ("به X دست نزن")
31. multi-action command
32. timed command
33. conditional command
34. undo/restore
35. comparison to previous state
36. source/destination references
37. singular/plural
38. one/many items
39. app/site/device aliases
40. user-learned aliases
41. cross-domain ambiguity
42. negative counterexamples
43. unsupported-target examples
44. permission-denied examples
45. boundary values
46. failure-recovery phrasing
47. confirmations
48. cancellation
49. continuation after a previous turn
50. adversarially similar but wrong intents

Recommended dataset distribution per high-frequency intent:
- 250–400 curated natural utterances
- 150–250 typo/STT/noise variants
- 75–150 context-dependent utterances
- 50–100 negative/counterexample utterances
- 25–75 boundary/failure utterances

Target total: **500 minimum, 1000 preferred** for core daily intents.

Data quality rules:
- deduplicate semantically identical trivial variants;
- preserve truly different syntax and pragmatics;
- keep held-out evaluation data separate from training examples;
- tag every utterance with canonical intent, slots, target, context requirements and expected action;
- do not train executable behavior from user secrets;
- secrets/tokens/passwords/OTP values must be redacted or synthetic in datasets;
- semantic classifier + slot extractor + fuzzy/STT recovery + context resolver remain the runtime architecture.

A LanguagePackBuilder should materialize these examples into versioned training/evaluation packs when MARIA's local training/evaluation pipeline is available.


## Capability status

| # | Capability | Design | Local implementation |
|---|---|---|---|
| 01 | Audio / Media | DESIGN COMPLETE v2 EXTENDED | WAITING FOR LOCAL SYSTEM |
| 02 | Display / Brightness | DESIGN COMPLETE v2 EXTENDED | WAITING FOR LOCAL SYSTEM |
| 03 | Files / Folders | DESIGN COMPLETE v2 EXTENDED | WAITING |
| 04 | App Install / Update | DESIGN COMPLETE v1 | WAITING |
| 05 | Windows Settings | NEXT | WAITING |
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

**Status:** DESIGN COMPLETE v2 EXTENDED — WAITING FOR LOCAL IMPLEMENTATION  
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

### 24. Audio v2 — MARIA's Own Voice / TTS as a First-Class Target

MARIA's own spoken voice must be a separate audio target from Windows master volume, media sessions, microphone state, and app audio.

#### Canonical target
- \`assistant_voice\`
- aliases: \`maria_voice\`, \`tts_output\`

#### Canonical intents
- \`assistant.voice.volume.get\`
- \`assistant.voice.volume.set\`
- \`assistant.voice.volume.increase\`
- \`assistant.voice.volume.decrease\`
- \`assistant.voice.mute\`
- \`assistant.voice.unmute\`
- \`assistant.voice.toggle_mute\`
- \`assistant.voice.restore_previous\`
- \`assistant.voice.mode.text_only\`
- \`assistant.voice.mode.voice_and_text\`
- \`assistant.voice.rate.get\`
- \`assistant.voice.rate.set\`
- \`assistant.voice.rate.increase\`
- \`assistant.voice.rate.decrease\`
- \`assistant.voice.pitch.get\`
- \`assistant.voice.pitch.set\`
- \`assistant.voice.select\`
- \`assistant.voice.style.set\`

Rate/pitch/voice/style are capability-gated by the active TTS engine.

#### Semantic separation
- "خودت ساکت" => mute MARIA TTS only; MARIA continues working and can still show text.
- "فقط بنویس" => text-only response mode, not Windows mute.
- "کل سیستم ساکت" => system master mute.
- "Chrome ساکت" => Chrome/session mute.
- "حرف نزن" => MARIA voice output disabled; does not stop task execution.
- "متوقف شو" / "همه کارها رو متوقف کن" => Agent emergency-stop intent, NOT voice mute.
- "آروم‌تر حرف بزن" can mean lower TTS volume or slower speech. Resolve from context/preference; if genuinely ambiguous, clarify once and learn the user's choice.
- "صداتو عوض کن" => voice/persona TTS selection, not volume.

#### Phrase bank — MARIA mute/text-only
The intent model must recognize, among many others:
- "ماریا ساکت"
- "ساکت باش"
- "الان ساکت"
- "فعلا حرف نزن"
- "دیگه با صدا جواب نده"
- "فقط تایپ کن"
- "فقط بنویس"
- "جواب رو فقط متن بده"
- "صداتو ببند"
- "خودتو میوت کن"
- "خودت mute"
- "حرف نزن ولی کارو انجام بده"
- "بی‌صدا کار کن"
- "صدا نداشته باش"
- "لازم نیست حرف بزنی"
- "جواب صوتی نده"
- "صدات خاموش"
- "ویست رو قطع کن"
- noisy/typo variants such as "ساکت باص", "حرف نزنن", "صداتو قط کن", "فقط بنویث"

#### Phrase bank — MARIA unmute/voice return
- "دوباره حرف بزن"
- "صداتو وصل کن"
- "حالا با صدا جواب بده"
- "از میوت در بیا"
- "صدات برگرده"
- "ویس رو روشن کن"
- "مثل قبل حرف بزن"
- "حالت صوتی رو فعال کن"
- "دیگه فقط متن نباشه"
- "بخون برام"
- "این دفعه صوتی بگو"

#### Phrase bank — MARIA voice volume
- "صدای خودتو 20 کن"
- "صدات رو ۵۰ درصد کن"
- "یکم آروم‌تر"
- "صدای خودت خیلی بلنده"
- "یه ذره صداتو کم کن"
- "صدات رو زیاد کن"
- "بلندتر حرف بزن"
- "تا آخر صداتو زیاد کن"
- "نصف صدای خودت"
- "صدات رو نصف الان کن"
- "ده تا صدای خودتو ببر بالا"
- "باز یکم کمتر"
- "همین صدای خودت رو کم کن"
- "نه سیستم نه، صدای خودت"
- "فقط صدای ماریا تغییر کنه"

#### Phrase bank — speech rate
- "کندتر حرف بزن"
- "آهسته‌تر بخون"
- "خیلی تند حرف می‌زنی"
- "سرعت حرف زدنت رو کم کن"
- "کمی سریع‌تر"
- "تندتر بخون"
- "سرعتت معمولی"
- "برگرد روی سرعت پیش‌فرض"

#### Phrase bank — voice/persona
- "صداتو عوض کن"
- "با صدای قبلی حرف بزن"
- "صدای پیش‌فرضت"
- "صدای دخترانه رو فعال کن"
- "این ویس رو انتخاب کن"
- "برگرد روی صدای اصلی ماریا"

#### MARIA voice state
Keep separate state:
- tts_enabled
- tts_volume
- tts_rate
- tts_pitch
- tts_voice_id
- tts_style
- response_mode: text_only | voice_and_text | voice_preferred
- previous_voice_snapshot

No system volume API should be called for a pure assistant-voice request unless the user explicitly targets the system.

---

### 25. Audio v2 — Expanded Utterance Coverage Framework

For every audio intent, evaluation data must be generated across ALL of these language families:

1. direct imperative
2. polite request
3. conversational complaint
4. shorthand / one-word
5. incomplete phrase
6. reordered words
7. Persian written numbers
8. Latin digits
9. Persian digits
10. percentages
11. fractions
12. relative values
13. vague values
14. repeated follow-up
15. pronoun/deictic reference
16. explicit app/device target
17. implicit foreground target
18. mixed Persian-English
19. typo noise
20. ASR/STT phonetic noise
21. extra filler words
22. correction ("نه، فقط...")
23. negation ("به سیستم دست نزن")
24. compound command
25. temporal command
26. conditional command
27. undo/restore
28. comparison ("از قبلی کمتر")
29. constraint ("فقط همین برنامه")
30. cross-domain ambiguous phrase

Each canonical intent must have a curated seed bank plus generated paraphrases. Generated paraphrases are evaluation/training material only; runtime must still use semantic intent recognition rather than exact-string matching.

Minimum evaluation target for high-frequency intents:
- 50+ curated human-style Persian variants per intent
- 50+ noisy/typo/STT variants per intent
- 25+ context-dependent variants per intent
- 20+ negative/cross-domain counterexamples per intent

High-frequency audio intents include:
- system set/increase/decrease
- mute/unmute
- app/session set/increase/decrease/mute
- assistant voice mute/unmute/set
- play/pause/stop
- microphone mute/unmute
- output select
- restore/undo

---

### 26. Audio v2 — Skill / Agent Package

The local implementation should expose independent reusable skills:

#### AudioMasterSkill
Owns master endpoint level and mute.

#### AudioSessionSkill
Owns per-app/session volume and mute.

#### AssistantVoiceSkill
Owns MARIA TTS volume, response mode, rate, pitch, voice and restore.

#### AudioDeviceSkill
Owns input/output enumeration, aliases and switching.

#### MicrophoneSkill
Owns mic state/level with privacy gates.

#### MediaTransportSkill
Owns media play/pause/seek/track operations.

#### AudioContextResolver
Resolves "این", "اون", "همونو", "فقط فیلم", foreground app, active media and previous target.

#### AudioLanguageAgent
Performs normalization, fuzzy/ASR recovery, semantic intent classification and slot extraction. It emits canonical actions only; it never executes OS mutations.

#### AudioVerifier
Reads post-action state and produces verified/partial/failed results.

#### AudioUndoManager
Stores bounded reversible snapshots.

These components must register in MARIA's shared Skill Registry / Tool Registry rather than being hard-wired into the chat UI.


---

## 02 — Display / Brightness / Monitor Control

**Status:** DESIGN COMPLETE v1 — WAITING FOR LOCAL IMPLEMENTATION  
**Capability family:** `display.*`, `brightness.*`, `monitor.*`  
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
- `display.brightness.get`
- `display.brightness.set`
- `display.brightness.increase`
- `display.brightness.decrease`
- `display.brightness.maximum`
- `display.brightness.minimum`
- `display.brightness.half_max`
- `display.brightness.scale_current`
- `display.brightness.restore_previous`
- `display.brightness.fade`

#### 3.2 Monitor discovery/state
- `display.monitor.list`
- `display.monitor.get_active`
- `display.monitor.identify`
- `display.monitor.get_primary`
- `display.monitor.set_primary`

#### 3.3 Monitor power
- `display.power.off`
- `display.power.wake`
- `display.power.restore_previous`

#### 3.4 Night Light / color temperature
- `display.night_light.get`
- `display.night_light.enable`
- `display.night_light.disable`
- `display.night_light.toggle`
- `display.color_temperature.get`
- `display.color_temperature.set`

These intents are capability-gated. Use only supported/documented mechanisms or a reliable UI/settings adapter; do not make undocumented registry edits the primary implementation.

#### 3.5 Adaptive brightness / ambient light
- `display.adaptive_brightness.get`
- `display.adaptive_brightness.enable`
- `display.adaptive_brightness.disable`
- `display.adaptive_brightness.set_target`

Only when hardware/driver support is detected.

#### 3.6 Topology
- `display.topology.get`
- `display.topology.extend`
- `display.topology.duplicate`
- `display.topology.internal_only`
- `display.topology.external_only`
- `display.topology.restore_previous`

#### 3.7 Resolution / refresh / orientation
- `display.resolution.get`
- `display.resolution.list_supported`
- `display.resolution.set`
- `display.refresh_rate.get`
- `display.refresh_rate.list_supported`
- `display.refresh_rate.set`
- `display.orientation.get`
- `display.orientation.set`

#### 3.8 Scale / HDR
- `display.scale.get`
- `display.scale.set`
- `display.hdr.get`
- `display.hdr.enable`
- `display.hdr.disable`
- `display.hdr.toggle`

These are capability-gated and require extra validation because Windows/driver support varies.

---

### 4. Slots / parameters

Shared slots:
- `target`
  - `primary_monitor`
  - `internal_display`
  - `external_display`
  - `monitor:<stable_id>`
  - `monitor_index:<n>`
  - `all_monitors`
  - `active_context_monitor`
- `value`: normalized numeric value
- `delta`: change magnitude
- `unit`: `points` | `percent` | `adaptive`
- `fraction`
- `width`
- `height`
- `refresh_hz`
- `orientation`: landscape | portrait | landscape_flipped | portrait_flipped
- `scale_percent`
- `topology`: extend | duplicate | internal_only | external_only
- `duration_ms`
- `temporary_until`
- `restore_source`
- `confidence`
- `source`: voice | text | routine | event

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
- WMI `WmiMonitorBrightness` for current supported levels/state
- `WmiMonitorBrightnessMethods.WmiSetBrightness` for supported internal-monitor brightness control

#### External monitor brightness
For physical monitors that support VESA MCCS/DDC-CI:
- High-Level Monitor Configuration APIs such as `GetMonitorBrightness` / `SetMonitorBrightness`
- capability detection is mandatory

Microsoft notes that physical-monitor configuration depends on monitor MCCS implementation and may behave inconsistently on arbitrary monitors. Therefore external-monitor control must be hardware-tested before MARIA marks it supported.

#### Display topology/modes
Use Windows Display Configuration APIs:
- `QueryDisplayConfig`
- `SetDisplayConfig`
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


### 33. Display v2 — Profiles / Modes

Profiles are semantic MARIA presets. They must be explicit, inspectable, reversible, and hardware-aware.

#### Canonical intents
- \`display.profile.get\`
- \`display.profile.apply\`
- \`display.profile.study\`
- \`display.profile.reading\`
- \`display.profile.normal\`
- \`display.profile.balanced\`
- \`display.profile.windows_recommended\`
- \`display.profile.night_comfort\`
- \`display.profile.presentation\`
- \`display.profile.restore_previous\`
- \`display.profile.create_custom\`
- \`display.profile.update_custom\`

#### Study / Reading profile
"حالت مطالعه" is a MARIA profile, not assumed to be one exact built-in Windows switch.

It may combine, according to device support and user preference:
- moderate brightness
- optional Night Light / warmer color
- Windows recommended resolution
- Windows recommended scaling
- comfortable refresh mode
- distraction/focus settings through the separate Focus/Automation capability
- optional text-size/accessibility preference
- optional app-specific reading settings when composed with Browser/Office skills

It MUST NOT silently change multiple disruptive settings the first time. The first application can preview proposed changes or use a conservative default. Once the user explicitly approves a profile, MARIA may reuse it.

Language examples:
- "حالت مطالعه رو فعال کن"
- "مود مطالعه"
- "برای درس خوندن تنظیمش کن"
- "صفحه رو برای مطالعه مناسب کن"
- "reading mode"
- "حالت خوندن"
- "برای کتاب خوندن بهترش کن"
- "چشمم اذیت نشه حالت مطالعه"
- "یه حالت مناسب درس بذار"
- typo/STT: "حالت مطالغه", "مود مطالع", "ریدینگ مود"

#### Normal / Balanced profile
Examples:
- "حالت معمولی"
- "برگرد معمولی"
- "normal"
- "balanced"
- "متعادلش کن"
- "حالت متناسب"
- "نه خیلی روشن نه تاریک"
- "برگرد روی تنظیم روزمره"
- "مود عادی"

This is a MARIA user/profile concept. It may store a user-approved everyday snapshot.

#### Windows Recommended / Default profile
Examples:
- "دیفالت ویندوز بذار"
- "برگرد تنظیمات پیشنهادی ویندوز"
- "Windows default"
- "recommended settings"
- "رزولوشن پیشنهادی"
- "اسکیل پیشنهادی ویندوز"
- "هرچی خود ویندوز پیشنهاد میده"
- "تنظیم استاندارد ویندوز"
- "برگرد روی حالت اصلی ویندوز"

Semantics:
- resolution => use Windows/native "Recommended" mode when discoverable.
- scaling => prefer Windows recommended/default scaling where discoverable.
- brightness => if a Windows brightness policy/ALS policy exists, use policy restore rather than inventing a brightness number.
- topology => do NOT arbitrarily change monitor topology merely because user asked for "Windows default"; preserve current topology unless the phrase/context explicitly includes display layout.
- Night Light/HDR => preserve current state unless "همه تنظیمات تصویر رو دیفالت کن" is explicitly and safely scoped.

Microsoft Support notes that Windows typically marks recommended resolution and scale options. The local adapter should query/resolve the recommended mode instead of hard-coding values.

#### Night / Eye-comfort profile
Examples:
- "حالت شب"
- "برای شب مناسبش کن"
- "چشمم اذیت نشه"
- "گرم‌ترش کن"
- "نور آبی کمتر"
- "night comfort"

Must distinguish from merely enabling Windows Night Light.

#### Restore previous profile
Examples:
- "برگرد قبل"
- "تنظیم قبلی صفحه"
- "پروفایل قبلی"
- "از حالت مطالعه درش بیار"
- "همونی که قبلش بود"

Always snapshot before applying a multi-setting profile.

---

### 34. Display v2 — Larger Language Matrix

Every high-frequency display intent must include broad seed/evaluation coverage across:
- direct
- polite
- colloquial
- complaint
- shorthand
- typo
- STT noise
- numbers
- relative values
- vague values
- fractions
- selected monitor
- monitor by physical position
- learned alias
- multi-monitor plural
- correction
- negation
- cross-domain ambiguity
- profile/mode wording
- Windows-default/recommended wording
- restore/undo
- conditional/time-based phrasing

Minimum evaluation target:
- 50+ curated natural Persian variants for each high-frequency intent
- 50+ typo/STT variants
- 25+ context-dependent variants
- 20+ negative/cross-domain counterexamples

High-frequency display intents:
- brightness set/increase/decrease
- monitor power off
- night light enable/disable
- profile study/normal/windows-recommended
- topology extend/duplicate
- resolution recommended/set
- restore previous

Representative extended phrase bank:

Brightness increase:
- "نور رو بیشتر کن"
- "روشن‌ترش کن"
- "یه کم نور بده"
- "خیلی تاریکه"
- "ده تا ببر بالا"
- "باز یه ذره"
- "نور این صفحه بیشتر"
- "فقط مانیتور دوم روشن‌تر"
- "براینتس بالا"
- "نور صفه زیاد"

Brightness decrease:
- "نور کم"
- "کمترش کن"
- "یه خورده تاریک‌تر"
- "چشممو میزنه کمش کن"
- "ده تا پایین"
- "خیلی روشنه"
- "فقط همین صفحه کم شه"
- "brightness down"
- "روشناییشو بیار پایین"

Recommended/default:
- "دیفالت کن"
- "استاندارد کن"
- "بذار خود ویندوز"
- "تنظیم پیشنهادی"
- "recommended"
- "تنظیم اصلی"
- "برگرد فابریک ویندوز"
- "مثل اول ویندوز"
- "رزولوشن و اسکیل استاندارد"
- "هرچی مناسب این مانیتوره بذار"

Study:
- "مطالعه"
- "حالت مطالعه"
- "برای درس"
- "برای خوندن"
- "reading"
- "study mode"
- "چشم راحت"
- "مود کتاب"
- "برای متن خوندن"
- "حالت درس خوندن"

Context corrections:
- "نه نور رو میگم"
- "نه تم نه، خود صفحه"
- "نه مانیتور دوم، لپ‌تاپ"
- "نه رزولوشن، اسکیل"
- "فقط همین یکی"
- "به اون یکی دست نزن"
- "همه به جز اصلی"

---

### 35. Display v2 — Skill / Agent Package

#### BrightnessSkill
Internal/external brightness get/set/relative/fade/policy restore.

#### MonitorResolverSkill
Stable monitor identity, physical arrangement, friendly names and aliases.

#### DisplayProfileSkill
Study/Reading/Normal/Balanced/Windows Recommended/Night/custom profiles with snapshots.

#### DisplayTopologySkill
Extend/duplicate/internal/external/primary-display operations with rollback.

#### DisplayModeSkill
Resolution, refresh rate and orientation.

#### DisplayComfortSkill
Night Light, color-temperature, adaptive/ALS and eye-comfort integrations where supported.

#### DisplayLanguageAgent
Normalization, typo/STT recovery, semantic intent and slot extraction. No direct OS mutation.

#### DisplayVerifier
Re-queries actual state after change.

#### DisplayRollbackManager
Stores safe snapshots and timed rollback for risky mode/topology changes.

All modules register through shared Skill Registry and declare:
- capabilities
- supported hardware
- risk level
- confirmation policy
- verification method
- undo support
- offline availability


### 36. Official Windows implementation references

Validate the local implementation against current Microsoft documentation for:
- WmiMonitorBrightness
- WmiMonitorBrightnessMethods / WmiSetBrightness
- GetMonitorBrightness / SetMonitorBrightness
- Monitor Configuration APIs
- QueryDisplayConfig
- SetDisplayConfig

Canonical MARIA intents remain stable even if the Windows adapter implementation changes.


---

## 03 — Files / Folders / Local Storage Intelligence

**Status:** DESIGN COMPLETE v1 — WAITING FOR LOCAL IMPLEMENTATION  
**Capability family:** \`file.*\`, \`folder.*\`, \`path.*\`, \`storage.*\`  
**Owner modules:** Brain / Intent Router / Context Engine / File Resolver / File Operation Adapter / Content Reader / Verifier / Undo Manager  
**Offline capable:** yes for local/network-mounted storage available to Windows  
**Risk class:** L0-L5 depending on read/write/delete/protected-path operation  
**Primary platform:** Windows

### 1. Purpose

MARIA must understand natural requests about local files and folders without relying on exact command strings.

Core scope:
- create folders/files
- open/reveal files and folders
- search/find by name, type, extension, path, date, size, content and context
- rename
- copy
- move
- duplicate
- delete to Recycle Bin
- permanent delete only with strict confirmation
- restore when possible
- copy path/name/content
- read supported text-like files
- open with a requested application
- show properties
- select/refer to current Explorer selection
- resolve Desktop/Downloads/Documents and user aliases
- bulk operations
- conflict handling
- ordering/filtering
- safe folder organization
- archive hand-off to archive skill
- content/file hand-off to Office/Translation/Browser/etc.
- typo/STT/context handling
- verification/undo
- multi-step plans and routines

Examples are language data, not an exact-string if/else table.

---

### 2. Semantic object model

Every file request resolves into:
- operation
- one or more source items
- optional destination
- optional new name
- optional application
- optional content query
- optional scope/location
- optional filters
- conflict policy
- risk/permission
- context reference
- verification rule
- undo strategy

Canonical item types:
- file
- folder
- shortcut
- archive
- drive
- removable drive
- network path
- selected Explorer item
- recent item
- downloaded item
- generated item
- unknown/reparse-point item

---

### 3. Canonical intents

#### 3.1 Create
- \`folder.create\`
- \`folder.create_nested\`
- \`file.create_empty\`
- \`file.create_text\`

#### 3.2 Open / reveal / launch
- \`file.open\`
- \`file.open_with\`
- \`folder.open\`
- \`file.reveal_in_explorer\`
- \`path.open\`

#### 3.3 Search / resolve
- \`file.find\`
- \`folder.find\`
- \`file.find_recent\`
- \`file.find_downloaded\`
- \`file.find_by_type\`
- \`file.find_by_content\`
- \`file.find_by_date\`
- \`file.find_by_size\`
- \`path.resolve_alias\`

#### 3.4 Rename
- \`file.rename\`
- \`folder.rename\`
- \`items.rename_batch\`

#### 3.5 Copy / duplicate
- \`file.copy\`
- \`folder.copy\`
- \`items.copy\`
- \`file.duplicate\`
- \`folder.duplicate\`

#### 3.6 Move
- \`file.move\`
- \`folder.move\`
- \`items.move\`

#### 3.7 Delete / restore
- \`file.delete_recycle\`
- \`folder.delete_recycle\`
- \`items.delete_recycle\`
- \`file.delete_permanent\`
- \`folder.delete_permanent\`
- \`items.delete_permanent\`
- \`recycle.restore_last\`
- \`recycle.open\`

#### 3.8 Read / copy information
- \`file.read_text\`
- \`file.copy_content\`
- \`file.copy_path\`
- \`file.copy_name\`
- \`file.get_properties\`
- \`file.get_location\`
- \`file.get_size\`
- \`file.get_modified_time\`

#### 3.9 Explorer / selection
- \`explorer.get_selection\`
- \`explorer.open_location\`
- \`explorer.refresh\`
- \`explorer.select_item\`

#### 3.10 Organization
- \`folder.list\`
- \`folder.sort_view\`
- \`folder.organize_items\`
- \`folder.group_items\`
- \`items.filter\`

#### 3.11 Archive hand-off
- \`archive.zip\`
- \`archive.extract\`
- \`archive.inspect\`

The archive executor belongs to Capability 18, but File Brain must understand these requests and route them correctly.

---

### 4. Shared slots / parameters

- \`source_items\`: one or many resolved stable paths/items
- \`source_reference\`: explicit_path | selected | this | that | last_created | last_downloaded | recent | search_result
- \`destination\`
- \`new_name\`
- \`extension\`
- \`application\`
- \`location_scope\`: current_folder | desktop | downloads | documents | drive | all_user_files | explicit_path
- \`query\`
- \`content_query\`
- \`file_type\`
- \`min_size\`, \`max_size\`
- \`date_after\`, \`date_before\`
- \`recursive\`
- \`include_hidden\`
- \`include_system\`
- \`conflict_policy\`: ask | skip | overwrite | rename_copy | merge
- \`delete_mode\`: recycle | permanent
- \`sort_by\`: name | type | modified | created | size
- \`sort_direction\`: asc | desc
- \`batch_scope\`
- \`confidence\`
- \`source\`: voice | text | routine | event
- \`undo_snapshot_id\`

---

### 5. Create folder/file language

Folder examples:
- "یه پوشه بساز"
- "فولدر جدید بساز"
- "روی دسکتاپ یه پوشه به اسم پروژه بساز"
- "داخل Downloads پوشه تصاویر درست کن"
- "تو این پوشه یکی به اسم Backup بساز"
- "پوشه پروژه/عکس/نهایی رو بساز"
- "یه فولدر خالی اینجا"
- "New Folder بساز"
- "فولدر پروزه درست کن" (typo)
- "پوشه جدبد" (typo/incomplete)

Text file examples:
- "یه فایل متنی بساز"
- "تو این پوشه notes.txt بساز"
- "این متن رو تو یه فایل ذخیره کن"
- "یه فایل خالی به اسم test ایجاد کن"

Rules:
- nested path creation must validate every component.
- invalid Windows filename characters must be caught.
- reserved device names must not silently be used.
- if extension is omitted, do not invent one unless intent clearly implies a text file or learned preference.

---

### 6. Open / reveal / open-with language

Examples:
- "این فایل رو باز کن"
- "فایل اکسل رو باز کن"
- "اون PDF رو بیار"
- "آخرین فایلی که دانلود کردم باز کن"
- "پروژه ماریا رو باز کن"
- "این پوشه رو باز کن"
- "محل فایل رو نشون بده"
- "تو اکسپلورر نشونش بده"
- "فایل رو با VS Code باز کن"
- "این عکس رو با Photoshop باز کن"
- "PDF رو با Edge باز کن"
- "همین رو با برنامه دیگه باز کن"
- "Open with فتوشاپ"
- typo/STT: "فایلو باز کون", "اکسل رو واز کن", "وی اس کد بازش"

Semantic distinction:
- open file => launch associated application.
- reveal => open containing folder and select item.
- open-with => explicit application target.
- open folder => Explorer/location navigation.
- "بازش کن" inherits the last resolved item only while context is valid.

---

### 7. Find/Search language

MARIA must support layered search.

#### By name
- "فایل قرارداد رو پیدا کن"
- "هرچی اسمش Maria هست پیدا کن"
- "پوشه پروژه سایت کجاست"
- "اون فایل که اسمش invoice بود"

#### By type/extension
- "همه PDFهای این پوشه"
- "فایل‌های اکسل دسکتاپ"
- "عکس‌های PNG"
- "ویدئوهای mp4"
- "فقط فایل‌های py پروژه"

#### By date
- "فایل‌های امروز"
- "چیزی که دیروز دانلود کردم"
- "آخرین PDF"
- "فایل‌های هفته قبل"
- "جدیدترین نسخه پروژه"

#### By size
- "فایل‌های خیلی حجیم"
- "بزرگ‌ترین فایل Downloads"
- "فایل‌های بالای 1 گیگ"
- "چیزهای بیشتر از 500 مگ"

#### By content
- "فایلی که داخلش نوشته invoice 2026 رو پیدا کن"
- "توی پروژه بگرد این تابع کجا نوشته شده"
- "کدوم txt این شماره رو داره"

#### Contextual
- "همون فایل اکسل دیروزی"
- "فایلی که قبل‌تر باز کردیم"
- "آخرین چیزی که دانلود شد"
- "این فایلی که سلکت کردم"

Search order may use:
1. explicit path/scope
2. selected/current folder
3. learned project locations
4. known user folders
5. Windows indexed search when available
6. bounded recursive filesystem search
7. content index/tool when required

Never silently scan the entire machine with an expensive recursive content search when a narrower scope is available.

---

### 8. Rename language

Examples:
- "اسم این فایل رو عوض کن"
- "بذارش final.pdf"
- "اسم پوشه رو پروژه جدید کن"
- "این رو Rename کن به backup"
- "پسوند رو دست نزن فقط اسمش عوض شه"
- "اسم همه اینا رو مرتب کن"
- "به اول اسم این فایل‌ها 2026 اضافه کن"
- "شماره‌گذاریشون کن"
- "فقط این یکی اسمش بشه logo-final"
- typo: "اسمشو عوض کون", "رینیمش کن", "تقییر اسم"

Rules:
- preserve extension by default when user changes "name" unless they explicitly target extension.
- extension changes are a separate semantic mutation and may affect usability.
- batch rename requires preview when pattern can affect many items.
- collisions must use conflict policy; never silently overwrite another item because of rename.

---

### 9. Copy / duplicate language

Examples:
- "این فایل رو کپی کن"
- "یه کپی ازش بگیر"
- "از این پوشه بکاپ بگیر"
- "این رو کپی کن تو دسکتاپ"
- "همه این فایل‌ها رو ببر یه نسخه تو Backup"
- "این فایل بمونه، یه نسخه‌ش بره اونجا"
- "Duplicate کن"
- "یه نسخه با اسم copy بساز"
- "فقط همین سه تا رو کپی کن"
- "از پوشه پروژه یه نسخه تو درایو D بساز"

Semantic distinction:
- copy/duplicate leaves source in place.
- move removes source from original location after successful transfer.
- "ببر یه نسخه" => copy, not move.
- "منتقل کن" => move.
- "بکاپ بگیر" may mean copy/snapshot/archive; resolve based on destination/context.

Conflict policies:
- ask
- skip
- overwrite only with explicit permission
- rename-copy ("file (2).ext")
- merge folders after policy evaluation

For large operations, progress must be observable and cancellation supported when adapter permits.

---

### 10. Move language

Examples:
- "این رو ببر Downloads"
- "منتقلش کن دسکتاپ"
- "این پوشه رو جابجا کن"
- "فایل‌های انتخاب شده برن تو Archive"
- "این فایل رو از C ببر D"
- "همه عکس‌ها رو ببر پوشه Images"
- "نه کپی نکن، منتقلش کن"
- "move کن به این مسیر"
- typo: "جابجا کون", "منتکل کن"

Rules:
- verify destination copy/create before considering source move complete.
- cross-volume moves may internally become copy+delete; result must still be verified.
- moving protected/in-use files requires stricter handling.
- never move a source into its own descendant path.

---

### 11. Delete / Recycle Bin / permanent delete

#### Recycle delete examples
- "این فایل رو حذف کن"
- "بندازش سطل آشغال"
- "این پوشه رو پاک کن"
- "این سه تا رو حذف کن"
- "فایل قدیمی رو بردار"
- "بفرست Recycle Bin"
- typo: "هزف کن", "پاکش کون"

Default safety policy:
- ordinary "حذف/پاک کن" => Recycle Bin when supported.
- MARIA should prefer reversible deletion for user files.

#### Permanent delete examples
- "برای همیشه پاکش کن"
- "کامل حذف کن"
- "Permanent delete"
- "از سطل هم ردش کن"
- "طوری پاک کن که نره Recycle Bin"

Permanent deletion is high risk:
- explicit confirmation required for non-trivial items.
- show exact item(s), count and approximate total size before bulk permanent deletion.
- protected/system/project-critical paths require elevated safety checks.

#### Restore examples
- "برگردونش"
- "فایل حذف شده رو برگردون"
- "آخرین چیزی که پاک کردم restore"
- "از سطل آشغال برش گردون"

Restoration depends on Recycle Bin metadata/state. If unavailable, never claim success.

---

### 12. Read file / copy content / path

#### Read
- "این فایل رو بخون"
- "داخلش چی نوشته"
- "متن فایل رو برام بخون"
- "این txt رو باز نکن فقط محتواشو بخون"
- "README رو بخون"

#### Copy content
- "متن این فایل رو کپی کن"
- "محتواشو بذار کلیپ‌بورد"
- "همه متنش رو کپی کن"
- "فقط خط‌های انتخاب شده رو کپی کن" => Selection/Clipboard hand-off when applicable

#### Copy path
- "آدرس این فایل رو کپی کن"
- "مسیرشو بده"
- "Path رو کپی کن"
- "اسم فایل رو کپی کن"
- "مسیر پوشه رو بذار کلیپ‌بورد"

Rules:
- large/binary files are not blindly read as text.
- detect supported text/structured formats and hand off rich formats to their owning skill.
- Office/PDF/image reading may use Office/PDF/OCR capabilities rather than raw bytes.
- path copy and content copy are separate intents.

---

### 13. Current selection / deictic references

MARIA must resolve:
- "این فایل"
- "این پوشه"
- "اون یکی"
- "همینا"
- "این سه تا"
- "فایلی که انتخاب کردم"
- "همون قبلی"
- "اون که الان روش کلیک کردم"

Context sources:
1. Explorer current selection
2. current foreground file dialog selection if safely accessible
3. last explicit file/folder
4. last successful file operation
5. active application document path
6. recent search result
7. learned project context

Do not apply destructive actions to "این" when there is no unique current selection.

---

### 14. Path aliases / natural locations

Built-in aliases:
- دسکتاپ / Desktop
- دانلود / Downloads
- اسناد / Documents
- عکس‌ها / Pictures
- ویدئوها / Videos
- موزیک / Music
- خانه / User profile
- سطل آشغال / Recycle Bin

User-learned aliases:
- "پروژه ماریا"
- "پروژه سایت"
- "فولدر کار"
- "بکاپ"
- "فایل‌های شرکت"

Example:
"وقتی میگم پروژه ماریا منظورم D:\\Projects\\Maria هست."

Aliases bind to stable canonical paths and must be editable/reversible.

---

### 15. Conflict resolution

Possible conflicts:
- destination file already exists
- folder exists
- rename collision
- read-only item
- file locked/in use
- permission denied
- invalid path
- path too long for a specific downstream tool
- source/destination same item
- move into descendant
- network/removable destination disappears

MARIA policies:
- low-confidence overwrite is forbidden.
- never silently overwrite important content.
- for simple direct user commands, use configured default conflict policy.
- for bulk operations, preview conflicts or summarize before execution.
- "جایگزین کن" => overwrite intent.
- "اگه هست ردش کن" => skip.
- "اسم جدید بده" / "کپی جدا بساز" => rename_copy.
- "پوشه‌ها رو ادغام کن" => merge only after item-level conflict policy is known.

---

### 16. Protected/sensitive path policy

Sensitive examples:
- Windows system directories
- Program Files application trees
- boot/system files
- other users' profile data
- app databases while apps are running
- repository metadata and project configuration when bulk deleting
- hidden/system/reparse-point paths

Rules:
- detect protected/system attributes and known protected locations.
- refuse unsafe assumptions.
- direct explicit user intent may still require elevated confirmation/privilege.
- do not recursively follow reparse points/junctions by default.
- do not interpret a symlink/junction target as an ordinary child path without explicit policy.

---

### 17. Normalization / typo / STT

Pipeline:
1. Unicode normalization
2. Persian/Arabic letter normalization
3. digit normalization
4. spacing/ZWNJ normalization
5. path token preservation
6. extension preservation
7. app/file entity extraction
8. fuzzy spelling recovery
9. ASR phonetic recovery
10. intent classification
11. slot/path parsing
12. context resolution
13. confidence/risk
14. execution
15. verification

Representative noisy examples:
- "فایلو باز کون"
- "پوشه جدبد بساز"
- "اسمشو تقییر بده"
- "کپی کن تو دسکتاپپ"
- "جابجا کون دانلود"
- "هزفش کن"
- "رینیمش کن"
- "پی دی اف دیروزی رو پیذا کن"
- "اکسل اخری"
- "فولدر پروزه ماریا"
- "پط فایل رو کپی کن"

Filename/path tokens get conservative correction. MARIA must not typo-correct a real filename into a different existing file without strong evidence.

---

### 18. Large language-coverage framework

Every high-frequency file intent gets evaluation variants across:
1. imperative
2. polite
3. conversational
4. shorthand
5. incomplete
6. reordered
7. filler-heavy
8. Persian-English mixed
9. typo
10. STT
11. explicit path
12. natural location alias
13. selected item
14. last item
15. recent item
16. plural/batch
17. numeric count
18. date reference
19. type/extension
20. content-based reference
21. negation
22. correction
23. conflict instruction
24. conditional
25. timed
26. undo
27. cross-domain ambiguity
28. inaccessible item
29. multiple matches
30. protected target

Minimum evaluation target for high-frequency intents:
- 75+ curated natural variants per intent family
- 50+ typo/STT variants
- 30+ context-dependent variants
- 25+ negative/counterexample cases
- 20+ boundary/error cases

Priority intent families:
- find
- open
- create folder
- rename
- copy
- move
- recycle delete
- permanent delete
- copy path/content
- selected-item resolution

---

### 19. Ambiguity policy

Examples that require resolution:
- "فایل پروژه رو باز کن" when multiple files match.
- "این رو پاک کن" with no selection.
- "ببرش اونجا" when destination is unclear.
- "اسمشو final کن" when multiple selected items exist.
- "آخرین فایل" when multiple sources have same timestamp.

Suggested:
- >=0.92 + low-risk unique target => execute.
- 0.80..0.91 => execute only for reversible non-destructive actions when target is unique.
- destructive/bulk/protected operations use stricter rules regardless of score.
- multiple plausible files => show/ask concise disambiguation, favor recent/contextually relevant candidates without pretending certainty.

---

### 20. Permission / risk

L0 read-only:
- search/find
- list
- properties
- copy path
- read supported file content

L1 reversible/non-destructive:
- open
- create folder/file
- copy
- duplicate

L2 state-changing/reversible:
- rename
- move
- recycle-bin delete
- bulk organization with clear preview

L3 potentially disruptive:
- overwrite
- bulk rename/move
- operations on active project/application files
- network/removable destinations

L4 destructive:
- permanent delete
- broad recursive deletion
- overwrite many files

L5 protected/system-critical:
- system/boot/protected OS paths
- destructive elevated operations

Confirmation depends on directness, reversibility, scope and target sensitivity.

---

### 21. Execution contract

Normalized payload example:

    intent: file.move
    source_items:
      - C:\\Users\\...\\Downloads\\report.xlsx
    destination: D:\\Work\\Reports
    conflict_policy: ask
    source: voice
    confidence: 0.98
    risk: L2
    undo_snapshot_id: ...

Executor never reparses natural language.

---

### 22. Windows implementation direction

Primary user-visible file operations should prefer Windows Shell semantics when appropriate.

Use \`IFileOperation\` for Shell-style:
- create
- copy
- move
- rename
- delete
- progress/error callbacks
- multi-item operations

Important:
- queued operations are actually executed by \`PerformOperations\`.
- after execution, check abort/cancellation state rather than assuming success.
- direct filesystem APIs/.NET can be used for controlled internal operations where Shell behavior is unnecessary.
- use stable canonical paths and refresh item identity after rename/move.
- Explorer selection integration should be isolated behind an adapter.
- search may use Windows Search/index when available, then bounded fallback scanning.

For change monitoring/automation, a watcher such as .NET \`FileSystemWatcher\` may observe changes in selected scopes, but verification must still query final filesystem state.

---

### 23. Verification

Every mutation:
- create => path exists and type matches.
- copy => destination item exists; optionally compare size/hash according to policy.
- move => destination exists AND old source no longer exists at old path.
- rename => new path exists AND old path absent.
- recycle delete => source absent; recycle metadata may be checked where supported.
- permanent delete => source absent.
- open => process/document activation can be best-effort verified.
- copy path/content => clipboard content must match intended payload.

Large file integrity:
- default verify metadata/size.
- hash verification available for important transfer/backup operations.
- never hash huge files automatically when unnecessary.

---

### 24. Undo / rollback

Possible undo:
- rename => rename back if no conflict
- move => move back
- create => remove newly created item safely if unchanged
- recycle delete => restore when Recycle Bin supports it
- copy => optionally remove created copy if untouched
- batch operation => store operation journal

Undo journal fields:
- operation_id
- original path
- new path
- item identity/fingerprint
- operation time
- conflict policy
- reversible_until
- verification state

Do not undo blindly if the target changed since the operation.

---

### 25. Failure / recovery

Locked file:
- identify process when safe/available.
- report "فایل در حال استفاده است".
- do not force-close apps without a separate explicit intent.

Permission denied:
- distinguish ordinary access denial from elevation requirement.
- do not silently elevate.

Destination unavailable:
- removable/network drive disappeared => pause/fail safely, never redirect elsewhere.

Partial batch:
- report succeeded/failed counts.
- keep item-level results.
- offer retry only for failed subset.

Operation canceled:
- treat as canceled, not success, even if low-level API call returned nominal success.

---

### 26. Multi-step composition

Examples:

"آخرین فایل اکسل Downloads رو پیدا کن و ببر تو پوشه گزارش‌ها":
1. search Downloads for xlsx/xls
2. sort by recent
3. resolve unique item
4. resolve Reports alias/path
5. move
6. verify
7. snapshot undo

"این سه فایل رو کپی کن تو Backup بعد زیپشون کن":
1. get selection
2. copy
3. verify copied items
4. hand off copied items to Archive skill
5. verify archive

"پروژه ماریا رو باز کن و README رو بخون":
1. resolve project alias
2. open folder/project
3. find README
4. read supported text
5. return content/summary through conversation

"فایل دیروزی رو پیدا کن، اسمش رو final کن و با Excel بازش کن":
1. find by date/context
2. rename preserving extension
3. verify
4. open_with Excel
5. verify best-effort

---

### 27. Skill / Agent package

#### FileResolverAgent
Resolves paths, aliases, selections, recent items, search results and ambiguous references.

#### FileSearchSkill
Name/type/date/size/content search with index + bounded fallback.

#### FileOperationSkill
Create/copy/move/rename/delete using Shell/native adapters.

#### FileOpenSkill
Open/open-with/reveal/location navigation.

#### FileContentSkill
Safe text/metadata reading and copy-content/path/name actions.

#### RecycleBinSkill
Reversible delete and restore workflows.

#### FileConflictResolver
Overwrite/skip/rename-copy/merge policies.

#### FileLanguageAgent
Normalization, typo/STT recovery, semantic classification and slot extraction. No filesystem mutation.

#### FileVerifier
Post-operation filesystem/state checks.

#### FileUndoManager
Operation journal and safe reversible rollback.

#### FilePolicyGuard
Protected/system/reparse-point risk evaluation.

All register through MARIA Skill Registry / Tool Registry.

---

### 28. Response behavior

Normal:
- "پوشه ساخته شد."
- "فایل به Desktop منتقل شد."
- "اسمش شد final.xlsx."
- "سه فایل کپی شدند."
- "فایل رفت داخل Recycle Bin."

Disambiguation:
- "سه فایل با این اسم پیدا کردم؛ کدوم؟"

Partial:
- "از ۱۲ فایل، ۱۰ تا منتقل شدند؛ ۲ تا در حال استفاده‌اند."

Verification failure:
- "فرمان اجرا شد اما فایل مقصد ایجاد نشد؛ عملیات را موفق حساب نکردم."

No false success.

---

### 29. Test matrix

Create:
- F-A01 folder current location
- F-A02 folder Desktop
- F-A03 nested path
- F-A04 invalid name
- F-A05 existing folder conflict

Open:
- F-B01 explicit file
- F-B02 selected file
- F-B03 open-with
- F-B04 reveal
- F-B05 missing item

Search:
- F-C01 name
- F-C02 extension
- F-C03 today/yesterday
- F-C04 size
- F-C05 content
- F-C06 multiple matches
- F-C07 recent downloaded
- F-C08 alias scope

Rename:
- F-D01 file preserve extension
- F-D02 folder
- F-D03 explicit extension change
- F-D04 collision
- F-D05 batch preview

Copy:
- F-E01 file
- F-E02 folder
- F-E03 multi-item
- F-E04 overwrite conflict
- F-E05 removable destination loss
- F-E06 verify size/hash policy

Move:
- F-F01 same volume
- F-F02 cross volume
- F-F03 destination missing
- F-F04 move into descendant rejected
- F-F05 partial batch

Delete:
- F-G01 recycle file
- F-G02 recycle folder
- F-G03 restore last
- F-G04 permanent explicit + confirm
- F-G05 protected path blocked/escalated safely
- F-G06 ambiguous "این رو پاک کن" no selection => no action

Read/copy:
- F-H01 text read
- F-H02 binary not raw-read
- F-H03 copy path
- F-H04 copy content
- F-H05 large file policy

Typos/STT:
- F-I01 "فایلو باز کون"
- F-I02 "اسمشو تقییر بده"
- F-I03 "جابجا کون"
- F-I04 "پی دی اف دیروزی"
- F-I05 mixed English paths/app names

Context:
- F-J01 selected item "این"
- F-J02 last searched file "همونو"
- F-J03 stale context
- F-J04 correction "نه اون یکی"
- F-J05 last downloaded

Undo/verify:
- F-K01 undo rename
- F-K02 undo move
- F-K03 restore recycle
- F-K04 changed target blocks unsafe undo
- F-K05 low-level nominal success but aborted => not success

---

### 30. Acceptance criteria

Files/Folders v1 is locally releasable only when:

1. high-frequency intents survive Persian colloquial, typo and STT evaluation.
2. selected-item and recent-item references resolve reliably.
3. copy and move remain semantically distinct.
4. ordinary delete defaults to reversible Recycle Bin where supported.
5. permanent deletion always follows strict safety policy.
6. rename preserves extension unless explicitly changed.
7. conflicts never silently overwrite important existing files.
8. reparse points/protected paths are handled safely.
9. all mutations are verified.
10. reversible operations create undo journal entries.
11. partial batch operations report item-level failures.
12. no operation silently redirects to a different destination when a drive disappears.
13. Shell operations correctly detect aborted/canceled executions.
14. real integration tests pass on the user's Windows MARIA environment.
15. only then status changes to IMPLEMENTED.

---

### 31. Local implementation plan

When the user's system is online:
1. inspect current MARIA file/tools architecture.
2. add FileResolverAgent and stable path model.
3. integrate Explorer selection adapter.
4. implement find/open/create.
5. implement Shell IFileOperation adapter.
6. implement copy/move/rename.
7. add Recycle Bin delete/restore.
8. add conflict policies.
9. add protected-path guard.
10. add content/path copy/read.
11. add verifier.
12. add undo journal.
13. connect context and aliases.
14. run the full test matrix against real files/drives.
15. test network/removable/locked/permission cases.
16. mark only passing features IMPLEMENTED.

---


### 32. Files v2 — Archive / ZIP / Extract Routing

Archive operations are understood by File Brain and executed by ArchiveSkill.

Canonical intents:
- \`archive.create\`
- \`archive.zip\`
- \`archive.extract\`
- \`archive.extract_here\`
- \`archive.extract_to\`
- \`archive.list_contents\`
- \`archive.test_integrity\`
- \`archive.add_items\`
- \`archive.remove_items\`
- \`archive.rename_entry\`
- \`archive.convert_container\`

Representative language:
- "این پوشه رو زیپ کن"
- "از این فایل‌ها یه zip بساز"
- "همه اینا رو فشرده کن"
- "زیپش کن و بذار دسکتاپ"
- "اسم فایل زیپ بشه backup"
- "این zip رو باز کن"
- "اکسترکتش کن"
- "اینجا استخراج کن"
- "داخل یه پوشه جدید درش بیار"
- "تو Downloads اکسترکت کن"
- "محتویات زیپ رو نشون بده"
- "بدون استخراج ببین داخلش چیه"
- "این آرشیو سالمه؟"
- "فایل جدید رو به همین آرشیو اضافه کن"
- "این یکی رو از آرشیو بردار"
- noisy: "اکسترک کن", "زیپش کون", "استخراجش کن", "فشردش کن"

Supported archive types are capability-gated:
- ZIP as baseline
- TAR/GZIP where available
- 7z/RAR only when a safe compatible local tool/library is installed and registered

Security:
- protect against path traversal/Zip Slip
- reject extraction paths escaping destination
- inspect suspicious absolute/parent-relative entries
- preserve a list of created files for undo/cleanup
- do not automatically execute extracted files

Verification:
- create => archive exists and can be reopened
- extract => expected entries exist
- integrity test => adapter reports valid or exact failure
- partial extraction => report item-level result

---

### 33. Files v2 — True Format Conversion

Changing a filename extension is NOT considered conversion.

Canonical intents:
- \`file.convert\`
- \`image.convert\`
- \`audio.convert\`
- \`video.convert\`
- \`document.convert\`
- \`spreadsheet.convert\`
- \`archive.convert_container\`

Examples:
- "این عکس رو PNG کن"
- "JPG رو WebP کن"
- "این ویدیو رو MP4 کن"
- "صداشو MP3 کن"
- "این Word رو PDF کن"
- "Excel رو CSV کن"
- "این فایل رو به فرمت مناسب تبدیل کن"
- "پسوندشو فقط عوض نکن، واقعاً تبدیلش کن"
- "نسخه اصلی بمونه، یه خروجی PDF بساز"
- "جای قبلی ذخیره کن"
- "با کیفیت اصلی تبدیل کن"
- "حجمش کمتر بشه ولی کیفیت زیاد خراب نشه"

ConversionRegistry must declare explicit source→target support. Never claim universal conversion.

Possible implementation backends, capability-gated:
- images: trusted image codecs/libraries
- audio/video: FFmpeg or another registered media converter
- office documents: application/API-supported export when available
- spreadsheets: native Excel/Office export when available
- archives: registered archive backend

Slots:
- source
- target_format
- output_path
- preserve_original
- quality
- bitrate
- resolution
- codec
- page_range
- sheet
- overwrite_policy

Rules:
- preserve original by default.
- destructive in-place replacement requires explicit request.
- unsupported source→target pair => explain, do not rename extension.
- metadata preservation should be configurable.
- conversion output must be opened/probed to verify format where feasible.

Language dataset target for archive/convert high-frequency intents: 500–1000 examples each under the global standard.


### 34. Official Windows implementation references

Validate local behavior against current Microsoft documentation for:
- IFileOperation
- CopyItem / CopyItems
- MoveItem / MoveItems
- RenameItem / RenameItems
- DeleteItem / DeleteItems
- PerformOperations / GetAnyOperationsAborted
- FileSystemWatcher when scoped change monitoring is needed

Canonical MARIA intents remain stable even if the platform adapter changes.


---

## 04 — App Install / Update / Account & Web-App Access

**Status:** DESIGN COMPLETE v1 — WAITING FOR LOCAL IMPLEMENTATION  
**Capability family:** \`app.*\`, \`package.*\`, \`install.*\`, \`update.*\`, \`account.*\`, \`auth.*\`, \`webapp.*\`  
**Owner modules:** App Resolver / Package Source Resolver / Download Verifier / Installer Skill / Update Skill / Browser Agent / Account Session Agent / Verification Code Broker / Permission Guard / Verifier  
**Offline capable:** partial; installed-app inspection is offline, discovery/download/account login requires network  
**Risk class:** L0–L5  
**Primary platform:** Windows + authorized browser/account integrations

### 1. Purpose

MARIA must be able to:
- detect whether an app is installed
- open it if installed
- discover a safe official source if not installed
- download/install with user-approved scope
- choose/install to a requested path when the installer/package supports it
- update installed apps
- verify installed version
- open web versions when appropriate
- use an already-authorized browser profile/session
- navigate to sites such as Pinterest or ChatGPT
- sign in using an explicitly selected user account
- retrieve a one-time verification code from an explicitly authorized mailbox integration when permitted
- enter that code into the intended login flow
- notify the user about incoming account messages/events through the Email/Automation capabilities
- interact with authorized web apps and desktop apps through shared Browser/App Automation
- never store user passwords or OTPs in normal memory/logs

### 2. Canonical intents

App state:
- \`app.get_installed\`
- \`app.find_installed\`
- \`app.open\`
- \`app.open_or_install\`
- \`app.get_version\`
- \`app.get_install_location\`

Discovery/install:
- \`app.search_official\`
- \`app.download_installer\`
- \`app.install\`
- \`app.install_to_path\`
- \`app.install_silent\`
- \`app.install_store\`
- \`app.install_package_manager\`
- \`app.cancel_install\`
- \`app.repair\`
- \`app.uninstall\`

Update:
- \`app.check_update\`
- \`app.update\`
- \`app.update_all_approved\`
- \`app.rollback_update\`

Web/app routing:
- \`webapp.open\`
- \`webapp.open_in_browser\`
- \`webapp.open_desktop_app\`
- \`webapp.choose_best_surface\`

Account/auth:
- \`account.select\`
- \`account.sign_in\`
- \`account.sign_out\`
- \`account.session.get\`
- \`auth.request_code\`
- \`auth.retrieve_code_authorized_mailbox\`
- \`auth.enter_code\`
- \`auth.complete_login\`
- \`auth.cancel_login\`

### 3. Natural language examples

Install/open:
- "Pinterest رو باز کن"
- "پینترست دارم؟"
- "اگه نصبه بازش کن، اگه نیست نصبش کن"
- "Pinterest ندارم نصبش کن"
- "نسخه ویندوزش رو پیدا کن"
- "اگه برنامه نداره نسخه وب رو باز کن"
- "از سایت اصلیش بگیر"
- "از Microsoft Store نصب کن"
- "با winget نصبش کن"
- "تو مسیر D:\\Apps نصبش کن"
- "مثل دفعه قبل نصبش کن"
- typo/STT: "پینترس", "پین ترست", "نصبش کون", "ورژن ویندوز"

Update:
- "آپدیتش کن"
- "نسخه جدید داره؟"
- "آخرین نسخه رو نصب کن"
- "همه برنامه‌هایی که تأیید کردم آپدیت کن"
- "فقط Pinterest رو آپدیت کن"
- "اگه نسخه جدید امنه نصبش کن"
- "برگرد نسخه قبلی" (only when rollback is actually supported)

Browser/web:
- "برو Pinterest"
- "پینترست رو تو Chrome باز کن"
- "با همون پروفایل کروم من بازش کن"
- "نسخه وبش رو بیار"
- "ChatGPT رو تو برنامه باز کن"
- "ChatGPT رو تو Chrome بیار"
- "اگر برنامه بازه همون رو بیار جلو"

### 4. Install source priority

Default trust priority:
1. Microsoft Store / Windows package source when authentic and appropriate
2. official vendor domain/repository
3. trusted package manager source with verified publisher/package identity
4. other sources only with explicit user approval

Never silently download an installer from arbitrary search-result mirrors.

Package resolver records:
- package name
- publisher
- source
- version
- architecture
- signature/hash if available
- installer type
- requested scope
- install path support
- reboot requirement

### 5. Installer types / paths

Recognize:
- MSIX/AppX
- MSI
- EXE installers
- Store packages
- package-manager manifests
- portable archives

"Install to D:\\Apps" is best-effort and only valid if package/installer supports custom location.
MARIA must not claim a custom path was used if the installer ignores it.

### 6. Download and security verification

Before execution:
- validate source URL/domain
- prefer HTTPS
- verify Authenticode/digital signature when applicable
- compare publisher identity where available
- verify package-manager metadata/hash where available
- scan through available Windows security mechanisms when appropriate
- never auto-run an untrusted unsigned binary merely because it downloaded successfully

Results:
- trusted_verified
- publisher_verified
- hash_verified
- source_verified_only
- unverified_requires_user_decision
- blocked

### 7. Pinterest / website example plan

User:
"برو Pinterest؛ اگه برنامه ندارم نصبش کن، وگرنه بازش کن."

Planner:
1. resolve Pinterest entity
2. inspect installed apps/PWA
3. if installed => open
4. else choose official web/PWA/store route
5. if user requested install => install approved package/PWA when available
6. verify launch
7. preserve selected browser profile/session context

User:
"تو Chrome وارد Pinterest شو."

Planner:
1. open authorized Chrome profile
2. navigate to official Pinterest site
3. inspect existing session
4. if already signed in => stop login flow
5. if not signed in => Account Session Agent begins authorized login

### 8. Account selection

MARIA must distinguish:
- browser profile
- site account
- email mailbox
- OS account

Examples:
- "با این ایمیل وارد شو"
- "با حساب کاریم"
- "همون Gmail قبلی"
- "با اکانت دوم"
- "با پروفایل Chrome شخصی"

Account aliases may be learned only as non-secret identifiers.
Never store plaintext passwords in MARIA memory.

### 9. Login and one-time verification codes

Authorized flow:

1. user explicitly chooses/authorizes an account.
2. site requests verification code.
3. Verification Code Broker receives the expected site/domain + destination mailbox identity.
4. MARIA uses an authorized Gmail/Email connector or explicitly authorized mailbox session.
5. search only the narrow relevant recent verification message.
6. extract the one-time code.
7. hold it in ephemeral secure memory only.
8. enter it into the exact active login flow.
9. discard/redact code after use.
10. verify login success.
11. never write OTP into long-term memory, logs, training datasets, analytics or chat history when avoidable.

Examples:
- "کد که به جیمیل میاد خودت بردار بزن"
- "اگه Pinterest کد خواست از Gmail بیار"
- "کد ورود رو از ایمیلم بردار"
- "اون کد جدید رو بذار اینجا"
- "کد همین سایت رو وارد کن"

Safety:
- no bypass of MFA or security checks.
- only user's explicitly authorized mailbox/account.
- do not retrieve unrelated codes.
- do not auto-approve security prompts that require physical/user confirmation.
- CAPTCHA/biometric/physical-security prompts remain user-mediated when required.
- codes must be scoped to expected service and recent time window.
- if multiple codes exist, do not guess.

### 10. Email notifications / "برات ایمیل اومده"

This capability composes with Email + Automation:
- email.read_unread
- email.find_recent
- email.notify_new
- email.summarize
- auth.retrieve_code_authorized_mailbox

Examples:
- "اگه ایمیل جدید اومد بهم بگو"
- "ایمیل‌های مهم رو بخون"
- "کد Pinterest اومد خبرم کن"
- "پیام حسابم رو بخون"

Persistent monitoring requires an explicit connected mailbox and an automation/event watcher.

### 11. ChatGPT interaction

Supported surfaces may include:
- ChatGPT desktop app when installed/authorized
- ChatGPT in an authorized browser profile

Canonical routing:
- \`webapp.chatgpt.open\`
- \`webapp.chatgpt.select_surface\`
- \`webapp.chatgpt.open_chat\`
- \`webapp.chatgpt.type_message\`
- \`webapp.chatgpt.send_message\`
- \`webapp.chatgpt.read_response\`
- \`webapp.chatgpt.copy_response\`

Examples:
- "ChatGPT رو باز کن"
- "نسخه برنامه رو بیار"
- "تو Chrome ChatGPT رو باز کن"
- "برو این چت"
- "این متن رو بنویس"
- "جوابش رو برام بخون"
- "جواب رو کپی کن"

This is authorized UI automation. It must not attempt to extract hidden credentials/session tokens.

### 12. Browser/app context

Context resolver tracks:
- current browser profile
- current site/domain
- current logged-in account identity label
- active desktop app
- last selected account
- last successful auth flow
- expected verification service
- current login step

Short follow-ups:
- "با اون یکی ایمیل"
- "همون حساب شخصی"
- "کدش رو بیار"
- "حالا بزن ادامه"
- "جوابشو بخون"

must resolve only while the auth/task context remains live.

### 13. Credential / secret policy

MARIA Memory may store:
- account nickname
- email address identifier if user chooses
- browser profile name
- preferred account per service

MARIA Memory must NOT store:
- plaintext password
- OTP/verification code
- recovery code
- session cookie
- access token
- refresh token
- secret key

Use OS/browser/connector credential stores and active sessions where possible.

### 14. Permissions / confirmations

L0:
- inspect whether app installed
- get version
- open official website

L1:
- open installed app
- open authorized browser profile

L2:
- download verified installer
- check updates

L3:
- install/update app
- modify system-wide installation
- sign in using already authorized account/session

L4:
- uninstall
- execute unverified installer
- automated email-code retrieval + entry when not explicitly enabled for that service/workflow

L5:
- destructive/elevated system changes
- unsafe/unverified binary execution

### 15. Verification

Install:
- package registered / executable exists
- reported version matches requested/available version
- app launches when safe to test

Update:
- version changes and app remains launchable

Login:
- site/app shows authenticated account state matching intended account

OTP:
- code is used only in expected flow
- success verified, then ephemeral secret destroyed/redacted

Browser:
- verify correct official domain, not lookalike domain

### 16. Undo / rollback

Possible:
- cancel in-progress download/install when supported
- uninstall newly installed app if user explicitly requests rollback
- update rollback only if package supports known safe rollback
- sign out of newly created web session
- close PWA/shortcut created by install process

Do not promise rollback for installers that do not support it.

### 17. Failure recovery

No app:
- route to official install/web option.

Installer doesn't support requested path:
- tell user and use supported default only with permission.

Login code not found:
- refresh narrow mailbox search once.
- verify expected destination.
- do not scan unrelated old security emails broadly.
- ask user if flow requires a different mailbox.

Wrong account already logged in:
- do not sign out automatically if it may destroy unsaved context; clarify/switch profile safely.

CAPTCHA/biometric prompt:
- hand control to user for the required step, then resume.

### 18. Language dataset targets

For these high-frequency intents, target **750–1000 utterances each**:
- app.open_or_install
- app.install
- app.update
- webapp.open
- account.select
- account.sign_in
- auth.retrieve_code_authorized_mailbox
- auth.enter_code
- webapp.chatgpt.open
- webapp.chatgpt.type_message

For lower-frequency intents, target at least 500.

All follow the Global Language Dataset Standard.

### 19. Skill / Agent package

#### AppResolverAgent
Maps spoken names/aliases to installed apps, packages, PWAs or web apps.

#### PackageSourceResolver
Finds trusted official/store/package-manager candidates.

#### InstallerSkill
Downloads/installs approved packages and tracks progress.

#### UpdateSkill
Version discovery and verified update.

#### DownloadVerifier
Source/signature/hash/publisher checks.

#### BrowserAgent
Authorized browser navigation and UI control.

#### AccountSessionAgent
Account/profile selection and login state.

#### VerificationCodeBroker
Narrow, ephemeral retrieval/use of OTP codes from explicitly authorized mail integrations.

#### AuthPolicyGuard
Prevents secret persistence, wrong-domain entry, unauthorized mailbox access and unsafe MFA automation.

#### WebAppAutomationSkill
Pinterest/ChatGPT/other authorized web-app workflows.

#### AppVerifier
Post-install/update/open/login verification.

All register through MARIA Skill Registry / Tool Registry.

### 20. Test matrix

Install:
- installed app => opens, no reinstall
- missing app => official source
- custom path supported
- custom path unsupported
- unsigned/unverified installer
- package-manager install
- Store/PWA fallback
- cancel install
- install failure
- verify version

Update:
- up-to-date
- update available
- signature mismatch
- rollback supported/unsupported

Pinterest/browser:
- existing logged-in session
- no session
- correct profile
- wrong profile
- official domain validation
- PWA vs browser selection

Auth:
- password manager/browser handles credential
- OTP requested
- authorized Gmail contains one matching recent code
- multiple codes => no guess
- code expired
- wrong service email ignored
- login success
- CAPTCHA => user handoff
- secret not persisted

ChatGPT:
- desktop app available
- browser fallback
- open selected chat
- type/send/read/copy response
- wrong account/profile protection

### 21. Acceptance criteria

1. "open/install if missing" flows are idempotent.
2. official/trusted source priority works.
3. no arbitrary mirror installer is auto-executed.
4. requested install path is verified, not assumed.
5. app/version state is verified after install/update.
6. browser automation validates official domain.
7. account aliases never contain passwords.
8. OTP is ephemeral and service-scoped.
9. no OTP/password/token appears in persistent MARIA memory/logs.
10. CAPTCHA/biometric/security-key steps hand off safely.
11. logged-in state is verified against intended account.
12. ChatGPT/Pinterest automation uses authorized app/browser sessions only.
13. language packs reach 500–1000 utterances per important intent.
14. real Windows/browser/account integration tests pass before IMPLEMENTED.

### 22. Local implementation plan

When the MARIA Windows system is online:
1. inspect installed-app inventory and current launcher.
2. add AppResolverAgent.
3. add trusted package source discovery.
4. integrate Store/WinGet/installer adapters.
5. add DownloadVerifier.
6. add installer progress + cancel + verifier.
7. integrate browser profile/session resolver.
8. add Pinterest web/PWA workflow.
9. integrate authorized Gmail/Email source for narrow OTP retrieval.
10. add VerificationCodeBroker with ephemeral secret handling.
11. add ChatGPT app/browser workflow.
12. generate/version 500–1000 utterance language packs.
13. run install/update/login/OTP test matrix.
14. only then mark capability IMPLEMENTED.

