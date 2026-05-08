[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SegmentAttribution

# Type Alias: SegmentAttribution

> **SegmentAttribution** = `object`

Defined in: [types/grounding.ts:77](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L77)

Represents attribution information for a specific segment of the AI response.
Maps portions of the generated text to their supporting sources, enabling
fine-grained source attribution throughout the response.

## Example

```ts
const attribution: SegmentAttribution = {
  text: "The API supports RESTful operations",
  startIndex: 0,
  endIndex: 35,
  partIndex: 0,
  supportingSources: [
    { sourceIndex: 0, confidence: 0.95 },
    { sourceIndex: 2, confidence: 0.78 },
  ],
};
```

## Properties

### text

> **text**: `string`

Defined in: [types/grounding.ts:79](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L79)

The actual text content of this segment from the response

---

### startIndex

> **startIndex**: `number`

Defined in: [types/grounding.ts:81](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L81)

Starting character index of this segment in the full response text

---

### endIndex

> **endIndex**: `number`

Defined in: [types/grounding.ts:83](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L83)

Ending character index of this segment in the full response text

---

### partIndex

> **partIndex**: `number`

Defined in: [types/grounding.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L85)

Index of the response part this segment belongs to (for multi-part responses)

---

### supportingSources

> **supportingSources**: [`SegmentSupport`](SegmentSupport.md)[]

Defined in: [types/grounding.ts:87](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/grounding.ts#L87)

Array of sources that support this segment with their confidence scores
