[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FirebaseConfig

# Type Alias: FirebaseConfig

> **FirebaseConfig** = `object`

Defined in: [types/auth.ts:690](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L690)

Firebase provider configuration

## Properties

### projectId

> **projectId**: `string`

Defined in: [types/auth.ts:692](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L692)

Firebase project ID

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/auth.ts:694](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L694)

Firebase API key

---

### serviceAccount?

> `optional` **serviceAccount?**: `object`

Defined in: [types/auth.ts:696](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L696)

Service account credentials

#### clientEmail

> **clientEmail**: `string`

#### privateKey

> **privateKey**: `string`

---

### databaseURL?

> `optional` **databaseURL?**: `string`

Defined in: [types/auth.ts:701](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L701)

Firebase database URL

---

### rolesClaimKey?

> `optional` **rolesClaimKey?**: `string`

Defined in: [types/auth.ts:703](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L703)

Custom claims key for roles

---

### permissionsClaimKey?

> `optional` **permissionsClaimKey?**: `string`

Defined in: [types/auth.ts:705](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L705)

Custom claims key for permissions
