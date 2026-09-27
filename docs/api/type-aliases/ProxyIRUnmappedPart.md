[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIRUnmappedPart

# Type Alias: ProxyIRUnmappedPart

> **ProxyIRUnmappedPart** = `object`

A wire element no codec could represent, carried forward verbatim.

The alternative is dropping it, which is how a translation layer loses tool
calls: silently, and only visibly as a downstream rejection. `raw` keeps the
original so a renderer can pass it through or a test can assert on it, and
`reason` records why it could not be mapped.

## Properties

### kind

> **kind**: `"unmapped"`

---

### sourceKind

> **sourceKind**: `string`

---

### reason

> **reason**: `string`

---

### raw

> **raw**: `unknown`
