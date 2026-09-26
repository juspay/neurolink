[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageWithAltText

# Type Alias: ImageWithAltText

> **ImageWithAltText** = `object`

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

Image data as Buffer, base64 string, URL, or data URI

---

### altText?

> `optional` **altText?**: `string`

Alternative text for accessibility (screen readers, SEO)
