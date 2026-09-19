[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerInstance

# Type Alias: ServerInstance

> **ServerInstance** = `object`

Defined in: [types/cli.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1655)

Minimal server instance contract used by `neurolink serve`.

## Properties

### initialize

> **initialize**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1656](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1656)

#### Returns

`Promise`\<`void`\>

---

### start

> **start**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1657](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1657)

#### Returns

`Promise`\<`void`\>

---

### stop

> **stop**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1658](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1658)

#### Returns

`Promise`\<`void`\>

---

### registerRouteGroup

> **registerRouteGroup**: (`group`) => `void`

Defined in: [types/cli.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1659)

#### Parameters

##### group

[`RouteGroup`](RouteGroup.md)

#### Returns

`void`

---

### listRoutes?

> `optional` **listRoutes?**: () => [`RouteDefinition`](RouteDefinition.md)[]

Defined in: [types/cli.ts:1660](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1660)

#### Returns

[`RouteDefinition`](RouteDefinition.md)[]
