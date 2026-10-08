# 01 — Audio & Media Control

**Status:** IN PROGRESS  
**Capability family:** `audio.*`, `media.*`  
**Offline capable:** yes for core Windows control  
**Risk class:** L0-L1  

## Scope
MARIA must control:
- master Windows output volume
- mute/unmute
- relative and absolute volume
- application/session volume where Windows exposes it
- microphone mute/unmute where supported
- active media playback controls
- selected output/input device where supported
- restoration of a previous level/state

## Canonical intents
- `audio.volume.get`
- `audio.volume.set`
- `audio.volume.increase`
- `audio.volume.decrease`
- `audio.volume.maximum`
- `audio.volume.minimum`
- `audio.volume.half`
- `audio.volume.restore_previous`
- `audio.mute`
- `audio.unmute`
- `audio.toggle_mute`
- `audio.app.set`
- `audio.app.increase`
- `audio.app.decrease`
- `audio.app.mute`
- `audio.app.unmute`
- `audio.output.select`
- `audio.input.select`
- `audio.microphone.mute`
- `audio.microphone.unmute`
- `media.play`
- `media.pause`
- `media.toggle`
- `media.stop`
- `media.next`
- `media.previous`

## Core slots
- `target`: system | active_app | app:<name> | media_session | microphone | output_device:<name> | input_device:<name>
- `value`: 0..100
- `delta`: 1..100
- `unit`: percent | points | adaptive
- `direction`: increase | decrease
- `restore_source`: previous_state | previous_nonzero_level
- `scope`: system | app | media

## Interpretation rules
Examples are NOT exhaustive phrase lists.

### Absolute
- «صدا رو ۳۰ کن»
- «بذار روی هشتاد درصد»
- «صدا 50»
- «تا آخر زیادش کن»
- «صفرش کن»

### Relative
- «۱۰ تا زیاد کن»
- «۲۰ درصد کمتر»
- «یه کم بیارش پایین»
- «خیلی زیادش کن»
- «یک درجه کم کن»

Adaptive defaults must be configurable. Initial recommendation:
- «یه ذره / یک درجه»: 5 points
- «یکم»: 10 points
- «خیلی»: 20 points
These are interpretation defaults, not permanent hard-coded semantics.

### Fractions / conceptual values
- «نصفش کن» => target level 50% of maximum by default
- «ببر نصفِ الان» => current_level * 0.5
- «یک چهارم» => 25%
- «وسط» / «حد وسط» => 50%
Context must distinguish "set to 50%" from "halve current value".

### Mute semantics
Expressions such as «قطع کن»، «بی‌صدا کن»، «میوت کن»، «ساکتش کن»، «صداشو ببند» generally map to mute, not volume=0, unless context explicitly asks for numeric zero.
MARIA should preserve the previous non-zero volume so «برگردون / وصلش کن» can restore appropriately.

### App-specific
- «فقط صدای فیلم رو کم کن»
- «صدای کروم رو قطع کن»
- «موزیک بمونه، فقط بازی رو بی‌صدا کن»
- «صدای تلگرام رو ده تا ببر پایین»

Target resolution order:
1. explicitly named app/session
2. selected/foreground media app
3. active media session
4. system master
If confidence is low between multiple sessions, clarify.

### Noisy / typo / STT examples
Must tolerate variants such as:
- «سدا رو کم کن»
- «صدارو کم کون»
- «صداشو ک م کن»
- «ولومو ببر بالا»
- «volume 30»
- «میوتش کن»
- «کمترش»

Use normalization + fuzzy/semantic interpretation. Do not maintain an ever-growing exact-string if/else table.

## Context examples
If previous turn was «صدای Spotify رو ۳۰ کن» and user says «یه کم بیشتر»، target remains Spotify unless focus/context clearly changed.
If a video is actively playing in Chrome and user says «فقط صدای فیلم رو قطع کن»، prefer that media/app session over master audio.
If user says only «قطعش کن» after discussing Bluetooth, audio must NOT steal the reference.

## Boundaries
- Clamp requested absolute values to 0..100 only after interpreting user intent.
- A request such as «۱۲۰ کن» should normally clarify or explain the 100 maximum instead of silently pretending 120 exists.
- Negative volume is invalid.
- If per-app volume is unavailable, report that instead of changing master volume without permission.

## Verification
After every state-changing action read the resulting Windows/session state and compare with requested state.
Do not say «انجام شد» from executor return alone.

## Undo
Store the immediate prior audio state for reversible actions:
- prior master level
- prior mute state
- prior target app level where available
This powers phrases such as «برگردون مثل قبل».

## Acceptance direction
The final release test suite must include:
- absolute values
- relative values
- vague values
- mute/unmute
- typo/STT cases
- Persian/English mixed input
- app-specific audio
- context carry-over
- ambiguous references
- limits 0/100
- unavailable app/session
- verify and restore behavior

This spec is intentionally marked IN PROGRESS until the full utterance/edge-case/test matrix is completed.
