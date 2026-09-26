[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Auth0Config

# Type Alias: Auth0Config

> **Auth0Config** = `object`

Auth0 provider configuration

## Properties

### domain

> **domain**: `string`

Auth0 domain (e.g., 'your-tenant.auth0.com')

---

### clientId

> **clientId**: `string`

Auth0 client ID

---

### clientSecret?

> `optional` **clientSecret?**: `string`

Auth0 client secret (for backend operations)

---

### audience?

> `optional` **audience?**: `string`

Auth0 audience (API identifier)

---

### scope?

> `optional` **scope?**: `string`

Auth0 scope

---

### claimsNamespace?

> `optional` **claimsNamespace?**: `string`

Custom namespace for claims

---

### managementApi?

> `optional` **managementApi?**: `object`

Management API configuration

#### clientId

> **clientId**: `string`

#### clientSecret

> **clientSecret**: `string`
