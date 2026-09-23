[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GcpAuthMethodStatus

# Type Alias: GcpAuthMethodStatus

> **GcpAuthMethodStatus** = `object`

Defined in: [types/cli.ts:1733](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1733)

Status of each GCP auth method tried by setup-gcp.

## Properties

### method1

> **method1**: `object`

Defined in: [types/cli.ts:1734](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1734)

#### complete

> **complete**: `boolean`

#### hasCredentials

> **hasCredentials**: `boolean`

#### missingVars

> **missingVars**: `string`[]

---

### method2

> **method2**: `object`

Defined in: [types/cli.ts:1739](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1739)

#### complete

> **complete**: `boolean`

#### hasServiceAccountKey

> **hasServiceAccountKey**: `boolean`

#### missingVars

> **missingVars**: `string`[]

---

### method3

> **method3**: `object`

Defined in: [types/cli.ts:1744](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1744)

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

Defined in: [types/cli.ts:1750](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1750)

#### hasProject

> **hasProject**: `boolean`

#### hasLocation

> **hasLocation**: `boolean`

#### missingVars

> **missingVars**: `string`[]
