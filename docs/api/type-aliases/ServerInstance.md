[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerInstance

# Type Alias: ServerInstance

> **ServerInstance** = `object`

Defined in: [types/cli.ts:1635](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1635)

Minimal server instance contract used by `neurolink serve`.

## Properties

### initialize

> **initialize**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1636](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1636)

#### Returns

`Promise`\<`void`\>

---

### start

> **start**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1637](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1637)

#### Returns

`Promise`\<`void`\>

---

### stop

> **stop**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1638](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1638)

#### Returns

`Promise`\<`void`\>

---

### registerRouteGroup

> **registerRouteGroup**: (`group`) => `void`

Defined in: [types/cli.ts:1639](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1639)

#### Parameters

##### group

[`RouteGroup`](RouteGroup.md)

#### Returns

`void`

---

### listRoutes?

> `optional` **listRoutes?**: () => [`RouteDefinition`](RouteDefinition.md)[]

Defined in: [types/cli.ts:1640](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1640)

#### Returns

[`RouteDefinition`](RouteDefinition.md)[]
