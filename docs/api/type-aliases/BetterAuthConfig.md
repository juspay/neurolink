[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BetterAuthConfig

# Type Alias: BetterAuthConfig

> **BetterAuthConfig** = `object`

Defined in: [types/auth.ts:797](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L797)

Better Auth provider configuration

## Properties

### secret

> **secret**: `string`

Defined in: [types/auth.ts:799](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L799)

Better Auth secret

---

### baseUrl

> **baseUrl**: `string`

Defined in: [types/auth.ts:801](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L801)

Better Auth base URL

---

### databaseUrl?

> `optional` **databaseUrl?**: `string`

Defined in: [types/auth.ts:803](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L803)

Database connection string

---

### socialProviders?

> `optional` **socialProviders?**: `object`

Defined in: [types/auth.ts:805](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L805)

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
