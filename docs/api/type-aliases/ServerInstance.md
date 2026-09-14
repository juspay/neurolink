[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerInstance

# Type Alias: ServerInstance

> **ServerInstance** = `object`

Defined in: [types/cli.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1650)

Minimal server instance contract used by `neurolink serve`.

## Properties

### initialize

> **initialize**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1651](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1651)

#### Returns

`Promise`\<`void`\>

---

### start

> **start**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1652](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1652)

#### Returns

`Promise`\<`void`\>

---

### stop

> **stop**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1653](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1653)

#### Returns

`Promise`\<`void`\>

---

### registerRouteGroup

> **registerRouteGroup**: (`group`) => `void`

Defined in: [types/cli.ts:1654](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1654)

#### Parameters

##### group

[`RouteGroup`](RouteGroup.md)

#### Returns

`void`

---

### listRoutes?

> `optional` **listRoutes?**: () => [`RouteDefinition`](RouteDefinition.md)[]

Defined in: [types/cli.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1655)

#### Returns

[`RouteDefinition`](RouteDefinition.md)[]
