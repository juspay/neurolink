[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoKeyframe

# Type Alias: VideoKeyframe

> **VideoKeyframe** = `object`

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

---

### timestampSec

> `readonly` **timestampSec**: `number`
