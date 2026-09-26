[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MultimodalVideoEntry

# Type Alias: MultimodalVideoEntry

> **MultimodalVideoEntry** = `object`

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

Raw video bytes, as detected.

---

### filename

> **filename**: `string`

Display name; may be a full path, so log only its basename.

---

### mimeType

> **mimeType**: `string`

Detected MIME type of `buffer`.

---

### durationSec?

> `optional` **durationSec?**: `number`

Clip length in seconds, when the processor was able to measure it.
