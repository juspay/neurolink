[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BackgroundCommandPageRequest

# Type Alias: BackgroundCommandPageRequest

> **BackgroundCommandPageRequest** = `object`

Defined in: [types/backgroundCommand.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L156)

Character window for a paginated output read.

## Properties

### stream

> **stream**: [`BackgroundCommandStreamName`](BackgroundCommandStreamName.md)

Defined in: [types/backgroundCommand.ts:157](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L157)

---

### offset?

> `optional` **offset?**: `number`

Defined in: [types/backgroundCommand.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L159)

Character offset to start at. Default 0.

---

### limit?

> `optional` **limit?**: `number`

Defined in: [types/backgroundCommand.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/backgroundCommand.ts#L161)

Maximum characters to return. Default 50_000, hard cap 200_000.
