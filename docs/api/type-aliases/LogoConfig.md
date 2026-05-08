[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LogoConfig

# Type Alias: LogoConfig

> **LogoConfig** = `object`

Defined in: [types/ppt.ts:1332](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1332)

Logo configuration options

## Properties

### data

> **data**: `Buffer` \| `string`

Defined in: [types/ppt.ts:1334](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1334)

Logo data - Buffer, base64 string, data URI, or file path

---

### position?

> `optional` **position?**: [`LogoPosition`](LogoPosition.md)

Defined in: [types/ppt.ts:1336](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1336)

Position on slides (default: "bottom-right")

---

### width?

> `optional` **width?**: `number`

Defined in: [types/ppt.ts:1338](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1338)

Width in inches (default: 1)

---

### height?

> `optional` **height?**: `number`

Defined in: [types/ppt.ts:1340](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1340)

Height in inches (default: 0.4)

---

### showOn?

> `optional` **showOn?**: `"all-slides"` \| `"title-only"` \| `"title-and-closing"`

Defined in: [types/ppt.ts:1342](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L1342)

Show on all slides or specific types (default: "all-slides")
