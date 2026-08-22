[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / computeToolSignature

# Function: computeToolSignature()

> **computeToolSignature**(`name`, `tool`): `string`

Defined in: [core/toolDedup.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/core/toolDedup.ts#L104)

Build a canonical, order-insensitive signature string for a named tool.

The signature is composed of:

- the tool's name
- a normalised description (lowercased, whitespace-collapsed)
- sorted parameter property names (with types when available)

Stable regardless of property declaration order in the schema.

## Parameters

### name

`string`

### tool

`Tool`

## Returns

`string`
