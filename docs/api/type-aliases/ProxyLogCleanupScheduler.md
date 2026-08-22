[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLogCleanupScheduler

# Type Alias: ProxyLogCleanupScheduler

> **ProxyLogCleanupScheduler** = `object`

Defined in: [types/proxy.ts:3002](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3002)

Lifecycle handle for non-blocking proxy log retention.

## Properties

### trigger

> **trigger**: () => `boolean`

Defined in: [types/proxy.ts:3003](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3003)

#### Returns

`boolean`

---

### stop

> **stop**: () => `Promise`\<`void`\>

Defined in: [types/proxy.ts:3004](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L3004)

#### Returns

`Promise`\<`void`\>
