[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BetterAuthConfig

# Type Alias: BetterAuthConfig

> **BetterAuthConfig** = `object`

Defined in: [types/auth.ts:797](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L797)

Better Auth provider configuration

## Properties

### secret

> **secret**: `string`

Defined in: [types/auth.ts:799](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L799)

Better Auth secret

---

### baseUrl

> **baseUrl**: `string`

Defined in: [types/auth.ts:801](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L801)

Better Auth base URL

---

### databaseUrl?

> `optional` **databaseUrl?**: `string`

Defined in: [types/auth.ts:803](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L803)

Database connection string

---

### socialProviders?

> `optional` **socialProviders?**: `object`

Defined in: [types/auth.ts:805](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L805)

Social providers configuration

#### github?

> `optional` **github?**: `object`

##### github.clientId

> **clientId**: `string`

##### github.clientSecret

> **clientSecret**: `string`

#### google?

> `optional` **google?**: `object`

##### google.clientId

> **clientId**: `string`

##### google.clientSecret

> **clientSecret**: `string`

#### discord?

> `optional` **discord?**: `object`

##### discord.clientId

> **clientId**: `string`

##### discord.clientSecret

> **clientSecret**: `string`
