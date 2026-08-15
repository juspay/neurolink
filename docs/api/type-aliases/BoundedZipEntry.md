[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BoundedZipEntry

# Type Alias: BoundedZipEntry

> **BoundedZipEntry** = `object`

Defined in: [types/processor.ts:928](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L928)

The slice of an adm-zip entry the bounded reader depends on.

Structural rather than adm-zip's own `IZipEntry` so the reader states what it
actually needs — the compressed bytes and the header fields it refuses to
trust — instead of importing a library type it would then have to satisfy in
full when building a test double.

## Properties

### getCompressedData

> **getCompressedData**: () => `Buffer`

Defined in: [types/processor.ts:929](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L929)

#### Returns

`Buffer`

---

### header

> **header**: `object`

Defined in: [types/processor.ts:930](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/processor.ts#L930)

#### method

> **method**: `number`

#### crc

> **crc**: `number`
