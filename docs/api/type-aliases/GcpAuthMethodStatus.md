[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GcpAuthMethodStatus

# Type Alias: GcpAuthMethodStatus

> **GcpAuthMethodStatus** = `object`

Defined in: [types/cli.ts:1632](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1632)

Status of each GCP auth method tried by setup-gcp.

## Properties

### method1

> **method1**: `object`

Defined in: [types/cli.ts:1633](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1633)

#### complete

> **complete**: `boolean`

#### hasCredentials

> **hasCredentials**: `boolean`

#### missingVars

> **missingVars**: `string`[]

---

### method2

> **method2**: `object`

Defined in: [types/cli.ts:1638](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1638)

#### complete

> **complete**: `boolean`

#### hasServiceAccountKey

> **hasServiceAccountKey**: `boolean`

#### missingVars

> **missingVars**: `string`[]

---

### method3

> **method3**: `object`

Defined in: [types/cli.ts:1643](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1643)

#### complete

> **complete**: `boolean`

#### hasClientEmail

> **hasClientEmail**: `boolean`

#### hasPrivateKey

> **hasPrivateKey**: `boolean`

#### missingVars

> **missingVars**: `string`[]

---

### common

> **common**: `object`

Defined in: [types/cli.ts:1649](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1649)

#### hasProject

> **hasProject**: `boolean`

#### hasLocation

> **hasLocation**: `boolean`

#### missingVars

> **missingVars**: `string`[]
