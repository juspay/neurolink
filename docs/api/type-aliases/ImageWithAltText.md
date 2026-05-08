[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageWithAltText

# Type Alias: ImageWithAltText

> **ImageWithAltText** = `object`

Defined in: [types/multimodal.ts:358](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L358)

Image data with optional alt text for accessibility
Use this when you need to provide alt text for screen readers and SEO

## Example

```typescript
const imageWithAlt: ImageWithAltText = {
  data: imageBuffer,
  altText: "A dashboard showing quarterly sales trends",
};
```

## Properties

### data

> **data**: `Buffer` \| `string`

Defined in: [types/multimodal.ts:360](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L360)

Image data as Buffer, base64 string, URL, or data URI

---

### altText?

> `optional` **altText?**: `string`

Defined in: [types/multimodal.ts:362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/multimodal.ts#L362)

Alternative text for accessibility (screen readers, SEO)
