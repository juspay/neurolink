[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoProviderConfig

# Type Alias: VideoProviderConfig

> **VideoProviderConfig** = `object`

How one provider handles an attached video.

The table lives in `adapters/videoFormatSupport.ts`; this is its row shape.
`apiType` names the mechanism that is actually implemented, not the one a
provider theoretically offers — Gemini also exposes a resumable Files API
for clips beyond the inline ceiling, and until that is wired up calling this
row "files-api" would misdescribe what happens to a 200 MB upload.

## Properties

### supportsNativeVideo

> `readonly` **supportsNativeVideo**: `boolean`

Whether raw video bytes can be handed to this provider at all.

---

### apiType

> `readonly` **apiType**: `"inline"` \| `"frame-extraction"`

How the video reaches the model.

---

### maxSizeMB

> `readonly` **maxSizeMB**: `number`

Inline source-byte budget for the whole request, in MB. A clip is
delivered natively only while its bytes plus every inline part already in
the request stay within it; otherwise it falls back to keyframes.
Meaningless when `supportsNativeVideo` is false, and set to 0 there rather
than to a number that reads like a real limit.

---

### maxDurationSec

> `readonly` **maxDurationSec**: `number`

Longest clip accepted natively, in seconds. 0 when not applicable.

---

### supportsAudio

> `readonly` **supportsAudio**: `boolean`

Whether the provider hears the video's audio track as well as seeing it.

---

### recommendedFrameCount

> `readonly` **recommendedFrameCount**: `number`

Keyframe budget to aim for when this provider gets frames instead of the
video. Advisory: an explicit `videoOptions.frames` always wins.
