[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OtlpEncodedSpan

# Type Alias: OtlpEncodedSpan

> **OtlpEncodedSpan** = `object`

## Description

An encoded span together with the resource and instrumentation scope it was produced under.

## Properties

### span

> **span**: [`OtlpSpan`](OtlpSpan.md)

---

### resource

> **resource**: [`OtlpKeyValue`](OtlpKeyValue.md)[]

---

### scope

> **scope**: `object`

#### name

> **name**: `string`

#### version?

> `optional` **version?**: `string`
