[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageWithAltText

# Type Alias: ImageWithAltText

> **ImageWithAltText** = `object`

Defined in: [types/multimodal.ts:422](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/multimodal.ts#L422)

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

Defined in: [types/multimodal.ts:424](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/multimodal.ts#L424)

Image data as Buffer, base64 string, URL, or data URI

---

### altText?

> `optional` **altText?**: `string`

Defined in: [types/multimodal.ts:426](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/multimodal.ts#L426)

Alternative text for accessibility (screen readers, SEO)
