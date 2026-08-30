[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerInstance

# Type Alias: ServerInstance

> **ServerInstance** = `object`

Defined in: [types/cli.ts:1631](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1631)

Minimal server instance contract used by `neurolink serve`.

## Properties

### initialize

> **initialize**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1632](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1632)

#### Returns

`Promise`\<`void`\>

---

### start

> **start**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1633](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1633)

#### Returns

`Promise`\<`void`\>

---

### stop

> **stop**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1634](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1634)

#### Returns

`Promise`\<`void`\>

---

### registerRouteGroup

> **registerRouteGroup**: (`group`) => `void`

Defined in: [types/cli.ts:1635](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1635)

#### Parameters

##### group

[`RouteGroup`](RouteGroup.md)

#### Returns

`void`

---

### listRoutes?

> `optional` **listRoutes?**: () => [`RouteDefinition`](RouteDefinition.md)[]

Defined in: [types/cli.ts:1636](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1636)

#### Returns

[`RouteDefinition`](RouteDefinition.md)[]
