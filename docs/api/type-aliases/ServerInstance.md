[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerInstance

# Type Alias: ServerInstance

> **ServerInstance** = `object`

Defined in: [types/cli.ts:1692](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1692)

Minimal server instance contract used by `neurolink serve`.

## Properties

### initialize

> **initialize**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1693](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1693)

#### Returns

`Promise`\<`void`\>

---

### start

> **start**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1694](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1694)

#### Returns

`Promise`\<`void`\>

---

### stop

> **stop**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1695](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1695)

#### Returns

`Promise`\<`void`\>

---

### registerRouteGroup

> **registerRouteGroup**: (`group`) => `void`

Defined in: [types/cli.ts:1696](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1696)

#### Parameters

##### group

[`RouteGroup`](RouteGroup.md)

#### Returns

`void`

---

### listRoutes?

> `optional` **listRoutes?**: () => [`RouteDefinition`](RouteDefinition.md)[]

Defined in: [types/cli.ts:1697](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1697)

#### Returns

[`RouteDefinition`](RouteDefinition.md)[]
