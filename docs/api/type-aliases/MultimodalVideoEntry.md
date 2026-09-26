[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalVideoEntry

# Type Alias: MultimodalVideoEntry

> **MultimodalVideoEntry** = `object`

Defined in: [types/file.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L100)

One video file destined for native delivery to a provider.

Mirrors [MultimodalAudioEntry](MultimodalAudioEntry.md): the bytes travel rather than the path,
because whether a video is sent at all is decided per provider, after
detection has already read the file.

`durationSec` rides along because the native-delivery gate is expressed in
seconds as well as bytes, and re-probing the container at dispatch time
would mean a second ffprobe run for something the processor already
measured. It is optional: probing can fail (no ffmpeg, an exotic container),
and an unknown duration must not by itself disqualify a clip that is
comfortably under the size ceiling.

## Properties

### buffer

> **buffer**: `Buffer`

Defined in: [types/file.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L102)

Raw video bytes, as detected.

---

### filename

> **filename**: `string`

Defined in: [types/file.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L104)

Display name; may be a full path, so log only its basename.

---

### mimeType

> **mimeType**: `string`

Defined in: [types/file.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L106)

Detected MIME type of `buffer`.

---

### durationSec?

> `optional` **durationSec?**: `number`

Defined in: [types/file.ts:108](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L108)

Clip length in seconds, when the processor was able to measure it.
