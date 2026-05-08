[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProviderMetadata

# Type Alias: AuthProviderMetadata

> **AuthProviderMetadata** = `object`

Defined in: [types/auth.ts:1029](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1029)

Provider registration metadata used by AuthProviderRegistry.

Previously defined in `AuthProviderRegistry.ts`; centralised here so all
auth-domain types live in a single canonical file.

## Properties

### type

> **type**: [`AuthProviderType`](AuthProviderType.md)

Defined in: [types/auth.ts:1031](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1031)

Provider type

---

### name

> **name**: `string`

Defined in: [types/auth.ts:1033](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1033)

Human-readable name

---

### description

> **description**: `string`

Defined in: [types/auth.ts:1035](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1035)

Description

---

### version?

> `optional` **version?**: `string`

Defined in: [types/auth.ts:1037](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1037)

Version

---

### documentation?

> `optional` **documentation?**: `string`

Defined in: [types/auth.ts:1039](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1039)

Documentation URL

---

### aliases

> **aliases**: `string`[]

Defined in: [types/auth.ts:1041](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1041)

Provider aliases

---

### features?

> `optional` **features?**: `string`[]

Defined in: [types/auth.ts:1043](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1043)

Features supported by the provider

---

### requiresExternalDependencies?

> `optional` **requiresExternalDependencies?**: `boolean`

Defined in: [types/auth.ts:1045](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1045)

Whether provider requires external dependencies

---

### builtIn?

> `optional` **builtIn?**: `boolean`

Defined in: [types/auth.ts:1047](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1047)

Whether the provider ships built-in (no extra install)
