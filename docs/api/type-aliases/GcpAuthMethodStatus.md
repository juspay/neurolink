[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GcpAuthMethodStatus

# Type Alias: GcpAuthMethodStatus

> **GcpAuthMethodStatus** = `object`

Defined in: [types/cli.ts:1678](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1678)

Status of each GCP auth method tried by setup-gcp.

## Properties

### method1

> **method1**: `object`

Defined in: [types/cli.ts:1679](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1679)

#### complete

> **complete**: `boolean`

#### hasCredentials

> **hasCredentials**: `boolean`

#### missingVars

> **missingVars**: `string`[]

---

### method2

> **method2**: `object`

Defined in: [types/cli.ts:1684](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1684)

#### complete

> **complete**: `boolean`

#### hasServiceAccountKey

> **hasServiceAccountKey**: `boolean`

#### missingVars

> **missingVars**: `string`[]

---

### method3

> **method3**: `object`

Defined in: [types/cli.ts:1689](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1689)

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

Defined in: [types/cli.ts:1695](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1695)

#### hasProject

> **hasProject**: `boolean`

#### hasLocation

> **hasLocation**: `boolean`

#### missingVars

> **missingVars**: `string`[]
