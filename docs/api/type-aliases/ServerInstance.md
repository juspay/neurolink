[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerInstance

# Type Alias: ServerInstance

> **ServerInstance** = `object`

Minimal server instance contract used by `neurolink serve`.

## Properties

### initialize

> **initialize**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### start

> **start**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### stop

> **stop**: () => `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### registerRouteGroup

> **registerRouteGroup**: (`group`) => `void`

#### Parameters

##### group

[`RouteGroup`](RouteGroup.md)

#### Returns

`void`

---

### listRoutes?

> `optional` **listRoutes?**: () => [`RouteDefinition`](RouteDefinition.md)[]

#### Returns

[`RouteDefinition`](RouteDefinition.md)[]
