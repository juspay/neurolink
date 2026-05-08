[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthLifecycle

# Type Alias: AuthLifecycle

> **AuthLifecycle** = `object`

Defined in: [types/auth.ts:1175](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1175)

Provider lifecycle hooks.

## Methods

### healthCheck()?

> `optional` **healthCheck**(): `Promise`\<[`AuthHealthCheck`](AuthHealthCheck.md)\>

Defined in: [types/auth.ts:1177](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1177)

Check provider health

#### Returns

`Promise`\<[`AuthHealthCheck`](AuthHealthCheck.md)\>

---

### initialize()?

> `optional` **initialize**(): `Promise`\<`void`\>

Defined in: [types/auth.ts:1180](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1180)

Initialize the provider

#### Returns

`Promise`\<`void`\>

---

### cleanup()?

> `optional` **cleanup**(): `Promise`\<`void`\>

Defined in: [types/auth.ts:1183](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1183)

Cleanup provider resources

#### Returns

`Promise`\<`void`\>

---

### dispose()?

> `optional` **dispose**(): `Promise`\<`void`\>

Defined in: [types/auth.ts:1186](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1186)

Clean up resources (alias for cleanup)

#### Returns

`Promise`\<`void`\>
