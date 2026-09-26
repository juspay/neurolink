[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthLifecycle

# Type Alias: AuthLifecycle

> **AuthLifecycle** = `object`

Provider lifecycle hooks.

## Methods

### healthCheck()?

> `optional` **healthCheck**(): `Promise`\<[`AuthHealthCheck`](AuthHealthCheck.md)\>

Check provider health

#### Returns

`Promise`\<[`AuthHealthCheck`](AuthHealthCheck.md)\>

---

### initialize()?

> `optional` **initialize**(): `Promise`\<`void`\>

Initialize the provider

#### Returns

`Promise`\<`void`\>

---

### cleanup()?

> `optional` **cleanup**(): `Promise`\<`void`\>

Cleanup provider resources

#### Returns

`Promise`\<`void`\>

---

### dispose()?

> `optional` **dispose**(): `Promise`\<`void`\>

Clean up resources (alias for cleanup)

#### Returns

`Promise`\<`void`\>
