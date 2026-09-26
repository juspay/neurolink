[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / GcpAuthMethodStatus

# Type Alias: GcpAuthMethodStatus

> **GcpAuthMethodStatus** = `object`

Defined in: [types/cli.ts:1741](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1741)

Status of each GCP auth method tried by setup-gcp.

## Properties

### method1

> **method1**: `object`

Defined in: [types/cli.ts:1742](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1742)

#### complete

> **complete**: `boolean`

#### hasCredentials

> **hasCredentials**: `boolean`

#### missingVars

> **missingVars**: `string`[]

---

### method2

> **method2**: `object`

Defined in: [types/cli.ts:1747](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1747)

#### complete

> **complete**: `boolean`

#### hasServiceAccountKey

> **hasServiceAccountKey**: `boolean`

#### missingVars

> **missingVars**: `string`[]

---

### method3

> **method3**: `object`

Defined in: [types/cli.ts:1752](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1752)

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

Defined in: [types/cli.ts:1758](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1758)

#### hasProject

> **hasProject**: `boolean`

#### hasLocation

> **hasLocation**: `boolean`

#### missingVars

> **missingVars**: `string`[]
