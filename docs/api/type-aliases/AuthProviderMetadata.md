[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProviderMetadata

# Type Alias: AuthProviderMetadata

> **AuthProviderMetadata** = `object`

Provider registration metadata used by AuthProviderRegistry.

Previously defined in `AuthProviderRegistry.ts`; centralised here so all
auth-domain types live in a single canonical file.

## Properties

### type

> **type**: [`AuthProviderType`](AuthProviderType.md)

Provider type

---

### name

> **name**: `string`

Human-readable name

---

### description

> **description**: `string`

Description

---

### version?

> `optional` **version?**: `string`

Version

---

### documentation?

> `optional` **documentation?**: `string`

Documentation URL

---

### aliases

> **aliases**: `string`[]

Provider aliases

---

### features?

> `optional` **features?**: `string`[]

Features supported by the provider

---

### requiresExternalDependencies?

> `optional` **requiresExternalDependencies?**: `boolean`

Whether provider requires external dependencies

---

### builtIn?

> `optional` **builtIn?**: `boolean`

Whether the provider ships built-in (no extra install)
