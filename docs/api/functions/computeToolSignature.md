[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / computeToolSignature

# Function: computeToolSignature()

> **computeToolSignature**(`name`, `tool`): `string`

Defined in: [core/toolDedup.ts:104](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/core/toolDedup.ts#L104)

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
