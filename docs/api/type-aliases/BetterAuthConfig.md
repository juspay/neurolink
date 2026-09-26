[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BetterAuthConfig

# Type Alias: BetterAuthConfig

> **BetterAuthConfig** = `object`

Better Auth provider configuration

## Properties

### secret

> **secret**: `string`

Better Auth secret

---

### baseUrl

> **baseUrl**: `string`

Better Auth base URL

---

### databaseUrl?

> `optional` **databaseUrl?**: `string`

Database connection string

---

### socialProviders?

> `optional` **socialProviders?**: `object`

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
