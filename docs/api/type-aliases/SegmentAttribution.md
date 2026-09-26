[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SegmentAttribution

# Type Alias: SegmentAttribution

> **SegmentAttribution** = `object`

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

The actual text content of this segment from the response

---

### startIndex

> **startIndex**: `number`

Starting character index of this segment in the full response text

---

### endIndex

> **endIndex**: `number`

Ending character index of this segment in the full response text

---

### partIndex

> **partIndex**: `number`

Index of the response part this segment belongs to (for multi-part responses)

---

### supportingSources

> **supportingSources**: [`SegmentSupport`](SegmentSupport.md)[]

Array of sources that support this segment with their confidence scores
