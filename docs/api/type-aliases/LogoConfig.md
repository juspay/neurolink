[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LogoConfig

# Type Alias: LogoConfig

> **LogoConfig** = `object`

Logo configuration options

## Properties

### data

> **data**: `Buffer` \| `string`

Logo data - Buffer, base64 string, data URI, or file path

---

### position?

> `optional` **position?**: [`LogoPosition`](LogoPosition.md)

Position on slides (default: "bottom-right")

---

### width?

> `optional` **width?**: `number`

Width in inches (default: 1)

---

### height?

> `optional` **height?**: `number`

Height in inches (default: 0.4)

---

### showOn?

> `optional` **showOn?**: `"all-slides"` \| `"title-only"` \| `"title-and-closing"`

Show on all slides or specific types (default: "all-slides")
