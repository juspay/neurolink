[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerInstance

# Type Alias: ServerInstance

> **ServerInstance** = `object`

Defined in: [types/cli.ts:1673](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1673)

Minimal server instance contract used by `neurolink serve`.

## Properties

### initialize

> **initialize**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1674](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1674)

#### Returns

`Promise`\<`void`\>

---

### start

> **start**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1675](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1675)

#### Returns

`Promise`\<`void`\>

---

### stop

> **stop**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1676](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1676)

#### Returns

`Promise`\<`void`\>

---

### registerRouteGroup

> **registerRouteGroup**: (`group`) => `void`

Defined in: [types/cli.ts:1677](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1677)

#### Parameters

##### group

[`RouteGroup`](RouteGroup.md)

#### Returns

`void`

---

### listRoutes?

> `optional` **listRoutes?**: () => [`RouteDefinition`](RouteDefinition.md)[]

Defined in: [types/cli.ts:1678](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1678)

#### Returns

[`RouteDefinition`](RouteDefinition.md)[]
