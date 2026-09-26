[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoKeyframe

# Type Alias: VideoKeyframe

> **VideoKeyframe** = `object`

Defined in: [types/processor.ts:859](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L859)

One extracted keyframe and the moment it came from.

Internal to extraction: `ProcessedVideo` splits this back into the parallel
`keyframes` / `keyframeTimestampsSec` arrays its existing consumers expect.
Keeping the pair together while frames are being read and encoded is what
makes a dropped frame impossible to mislabel — the alternative is
reconstructing timestamps from an interval after the fact, which is wrong
for every frame following a failed encode.

## Properties

### buffer

> `readonly` **buffer**: `Buffer`

Defined in: [types/processor.ts:860](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L860)

---

### timestampSec

> `readonly` **timestampSec**: `number`

Defined in: [types/processor.ts:861](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L861)
