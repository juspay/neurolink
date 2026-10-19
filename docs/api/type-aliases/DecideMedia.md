[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecideMedia

# Type Alias: DecideMedia

> **DecideMedia** = `object`

The request body keys prepared media is written under. Set together with
`decisionLimits.media`, which says how much of it a request may carry.

## Properties

### imagesKey

> **imagesKey**: `string`

Written only when the request carries at least one image.

---

### videoKey?

> `optional` **videoKey?**: `string`

Written only when the request carries a video; required exactly when `decisionLimits.media.video` is true.

---

### audioKey?

> `optional` **audioKey?**: `string`

Written only when the request carries audio, as `{ data, format }`; required exactly when `decisionLimits.media.audio` is set.
