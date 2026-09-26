[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerInstance

# Type Alias: ServerInstance

> **ServerInstance** = `object`

Defined in: [types/cli.ts:1698](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1698)

Minimal server instance contract used by `neurolink serve`.

## Properties

### initialize

> **initialize**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1699](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1699)

#### Returns

`Promise`\<`void`\>

---

### start

> **start**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1700](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1700)

#### Returns

`Promise`\<`void`\>

---

### stop

> **stop**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1701](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1701)

#### Returns

`Promise`\<`void`\>

---

### registerRouteGroup

> **registerRouteGroup**: (`group`) => `void`

Defined in: [types/cli.ts:1702](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1702)

#### Parameters

##### group

[`RouteGroup`](RouteGroup.md)

#### Returns

`void`

---

### listRoutes?

> `optional` **listRoutes?**: () => [`RouteDefinition`](RouteDefinition.md)[]

Defined in: [types/cli.ts:1703](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1703)

#### Returns

[`RouteDefinition`](RouteDefinition.md)[]
