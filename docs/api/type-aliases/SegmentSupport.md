[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SegmentSupport

# Type Alias: SegmentSupport

> **SegmentSupport** = `object`

Defined in: [types/grounding.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/types/grounding.ts#L53)

Represents the support relationship between a text segment and a source.
Links a specific source (by index) to the segment it supports with a
confidence score indicating the strength of the attribution.

## Example

```ts
const support: SegmentSupport = {
  sourceIndex: 0, // References first source in the sources array
  confidence: 0.92,
};
```

## Properties

### sourceIndex

> **sourceIndex**: `number`

Defined in: [types/grounding.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/types/grounding.ts#L55)

Index into the sources array identifying which source supports this segment

---

### confidence

> **confidence**: `number`

Defined in: [types/grounding.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/grounding.ts#L57)

Confidence score (0-1) for how strongly this source supports the segment
