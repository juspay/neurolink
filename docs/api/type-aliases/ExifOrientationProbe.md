[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExifOrientationProbe

# Type Alias: ExifOrientationProbe

> **ExifOrientationProbe** = `"absent"` \| `"present"` \| `"inconclusive"`

Defined in: [types/file.ts:63](https://github.com/juspay/neurolink/blob/release/src/lib/types/file.ts#L63)

What a bounded header probe could establish about an image's EXIF
orientation tag, without decoding the image or reading all of its bytes.

`"inconclusive"` is not a failure — it is the honest answer whenever the
prefix ran out before the parse reached a verdict, or the container is one
this probe does not parse. Callers must treat it as "find out the expensive
way", never as "no tag".
