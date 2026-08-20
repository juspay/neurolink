[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerInstance

# Type Alias: ServerInstance

> **ServerInstance** = `object`

Defined in: [types/cli.ts:1589](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1589)

Minimal server instance contract used by `neurolink serve`.

## Properties

### initialize

> **initialize**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1590](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1590)

#### Returns

`Promise`\<`void`\>

---

### start

> **start**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1591](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1591)

#### Returns

`Promise`\<`void`\>

---

### stop

> **stop**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1592](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1592)

#### Returns

`Promise`\<`void`\>

---

### registerRouteGroup

> **registerRouteGroup**: (`group`) => `void`

Defined in: [types/cli.ts:1593](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1593)

#### Parameters

##### group

[`RouteGroup`](RouteGroup.md)

#### Returns

`void`

---

### listRoutes?

> `optional` **listRoutes?**: () => [`RouteDefinition`](RouteDefinition.md)[]

Defined in: [types/cli.ts:1594](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1594)

#### Returns

[`RouteDefinition`](RouteDefinition.md)[]
