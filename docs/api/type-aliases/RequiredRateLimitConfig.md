[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequiredRateLimitConfig

# Type Alias: RequiredRateLimitConfig

> **RequiredRateLimitConfig** = `object`

Defined in: [types/server.ts:142](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L142)

Required rate limit configuration

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [types/server.ts:143](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L143)

---

### windowMs

> **windowMs**: `number`

Defined in: [types/server.ts:144](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L144)

---

### maxRequests

> **maxRequests**: `number`

Defined in: [types/server.ts:145](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L145)

---

### message

> **message**: `string`

Defined in: [types/server.ts:146](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L146)

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Defined in: [types/server.ts:147](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L147)

---

### keyGenerator?

> `optional` **keyGenerator?**: (`ctx`) => `string`

Defined in: [types/server.ts:148](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/server.ts#L148)

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`string`
