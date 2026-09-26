[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageWireField

# Type Alias: LocalUsageWireField

> **LocalUsageWireField** = \{ `field`: `number`; `kind`: `"varint"`; `value`: `number`; \} \| \{ `field`: `number`; `kind`: `"bytes"`; `value`: `Uint8Array`; \}

One decoded protobuf field from a Cursor root blob. Wire types 0 (varint)
and 2 (length-delimited) only — the two Cursor actually uses; fixed-width
fields are skipped by the decoder rather than represented.
