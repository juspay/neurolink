[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BoundedZipEntry

# Type Alias: BoundedZipEntry

> **BoundedZipEntry** = `object`

Defined in: [types/processor.ts:947](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L947)

The slice of an adm-zip entry the bounded reader depends on.

Structural rather than adm-zip's own `IZipEntry` so the reader states what it
actually needs — the compressed bytes and the header fields it refuses to
trust — instead of importing a library type it would then have to satisfy in
full when building a test double.

## Properties

### getCompressedData

> **getCompressedData**: () => `Buffer`

Defined in: [types/processor.ts:948](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L948)

#### Returns

`Buffer`

---

### header

> **header**: `object`

Defined in: [types/processor.ts:949](https://github.com/juspay/neurolink/blob/release/src/lib/types/processor.ts#L949)

#### method

> **method**: `number`

#### crc

> **crc**: `number`
