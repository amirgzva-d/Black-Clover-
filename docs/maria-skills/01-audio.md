# 01 — Audio & Media Control

**Status:** DESIGN COMPLETE v1 — WAITING FOR LOCAL IMPLEMENTATION  
**Capability family:** 'audio.*', 'media.*'  
**Owner modules:** Brain / Intent Router / Context Engine / Windows Audio Adapter / Media Adapter  
**Offline capable:** yes for Windows audio + local media controls  
**Risk class:** L0-L2 depending on target and automation context  
**Primary platform:** Windows

---

## 1. Purpose

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

## 2. Audio semantic model

MARIA must keep these concepts separate:

### 2.1 Numeric level
- '100' = maximum level.
- '0' = minimum numeric level.
- Numeric level is clamped only after interpretation and validation.
- Internal normalized form may use 0..100 even when the Windows API uses 0.0..1.0.

### 2.2 Mute state
Mute is a boolean state and is NOT treated as identical to volume=0.

Why:
- a user can set volume 0 without requesting mute;
- MARIA must preserve the prior non-zero level;
- 'وصلش کن' / 'صدا رو برگردون' can restore the previous level correctly.

### 2.3 Playback state
'pause/stop/play' is different from muting audio.

Examples:
- 'آهنگو قطع کن' => media.stop or media.pause depending wording/context.
- 'صدای آهنگو قطع کن' => audio.app.mute / target media-session mute.
- 'فیلمو نگه دار' => media.pause.
- 'فیلم رو بی‌صدا کن' => volume/mute, NOT pause.

### 2.4 Target
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

## 3. Canonical intents

### 3.1 Master/system volume
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

### 3.2 Mute
- 'audio.mute'
- 'audio.unmute'
- 'audio.toggle_mute'
- 'audio.mute.restore_previous'

### 3.3 Per-app/session
- 'audio.app.get'
- 'audio.app.set'
- 'audio.app.increase'
- 'audio.app.decrease'
- 'audio.app.mute'
- 'audio.app.unmute'
- 'audio.app.restore_previous'

### 3.4 Device
- 'audio.output.list'
- 'audio.output.get'
- 'audio.output.select'
- 'audio.input.list'
- 'audio.input.get'
- 'audio.input.select'

### 3.5 Microphone
- 'audio.microphone.get'
- 'audio.microphone.mute'
- 'audio.microphone.unmute'
- 'audio.microphone.toggle_mute'
- 'audio.microphone.level.get'
- 'audio.microphone.level.set'
- 'audio.microphone.level.increase'
- 'audio.microphone.level.decrease'

### 3.6 Media transport
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

### 3.7 Advanced / composable audio behavior
- 'audio.duck'
- 'audio.restore_after_duck'
- 'audio.balance.get'
- 'audio.balance.set'

Advanced intents must be capability-gated and only exposed when the selected device/session supports them.

---

## 4. Slots / parameters

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

## 5. Language understanding

### 5.1 Absolute values

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

### 5.2 Relative values

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

### 5.3 Fraction / conceptual values

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

### 5.4 Mute / unmute language

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

### 5.5 Per-application/session language

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

### 5.6 Media playback language

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

### 5.7 Device language

Examples:
- 'صدا رو بفرست روی هدفون'
- 'اسپیکر لپ‌تاپ رو انتخاب کن'
- 'خروجی الان چیه'
- 'چه اسپیکرهایی وصله'
- 'میکروفون لپ‌تاپ رو انتخاب کن'
- 'میکروفون هدست رو فعال کن'
- 'ورودی صدا رو عوض کن'

Aliases such as 'هندزفری', 'هدست', 'اسپیکر', device brand names, and explicit learned names must resolve through the Device Resolver.

### 5.8 Microphone language

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

### 5.9 Gradual / temporary control

Examples:
- 'آروم آروم صدا رو کم کن'
- 'تو پنج ثانیه برسونش به صفر'
- 'کم‌کم تا 30 بیار پایین'
- 'برای یک دقیقه میوتش کن بعد برگردون'
- 'وقتی دارم حرف می‌زنم موزیک رو کم کن'

These compile into audio actions plus scheduler/event conditions where needed.

---

## 6. Normalization pipeline

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

## 7. Typo / noisy speech tolerance

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

## 8. Context resolution

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

## 9. Ambiguity policy

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

## 10. Validation & boundaries

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

## 11. Permission / risk

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

## 12. Execution contract

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

## 13. Windows implementation direction

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

## 14. Verification

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

## 15. Undo / restore

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

## 16. Failure & recovery

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

## 17. Learning

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

## 18. Multi-step composition

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

## 19. Response behavior

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

## 20. Test matrix

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

## 21. Acceptance criteria

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

## 22. Local implementation plan

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

## 23. Official Windows API references

Implementation should be validated against current Microsoft documentation for:
- Core Audio EndpointVolume / IAudioEndpointVolume
- MMDevice / IMMDeviceEnumerator
- Audio sessions / ISimpleAudioVolume
- Windows.Media.Control / GlobalSystemMediaTransportControlsSessionManager

The implementation layer may change as Windows evolves; the canonical MARIA intents must remain stable.
