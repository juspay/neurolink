[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / Auth0Config

# Type Alias: Auth0Config

> **Auth0Config** = `object`

Defined in: [types/auth.ts:649](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L649)

Auth0 provider configuration

## Properties

### domain

> **domain**: `string`

Defined in: [types/auth.ts:651](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L651)

Auth0 domain (e.g., 'your-tenant.auth0.com')

---

### clientId

> **clientId**: `string`

Defined in: [types/auth.ts:653](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L653)

Auth0 client ID

---

### clientSecret?

> `optional` **clientSecret?**: `string`

Defined in: [types/auth.ts:655](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L655)

Auth0 client secret (for backend operations)

---

### audience?

> `optional` **audience?**: `string`

Defined in: [types/auth.ts:657](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L657)

Auth0 audience (API identifier)

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/auth.ts:659](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L659)

Auth0 scope

---

### claimsNamespace?

> `optional` **claimsNamespace?**: `string`

Defined in: [types/auth.ts:661](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L661)

Custom namespace for claims

---

### managementApi?

> `optional` **managementApi?**: `object`

Defined in: [types/auth.ts:663](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L663)

Management API configuration

#### clientId

> **clientId**: `string`

#### clientSecret

> **clientSecret**: `string`
