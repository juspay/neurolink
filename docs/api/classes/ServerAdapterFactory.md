[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAdapterFactory

# Class: ServerAdapterFactory

Defined in: [server/factory/serverAdapterFactory.ts:20](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/factory/serverAdapterFactory.ts#L20)

Factory for creating server adapters
Supports multiple web frameworks with consistent API

## Constructors

### Constructor

> **new ServerAdapterFactory**(): `ServerAdapterFactory`

#### Returns

`ServerAdapterFactory`

## Methods

### registerAdapter()

> `static` **registerAdapter**(`framework`, `adapterClass`): `void`

Defined in: [server/factory/serverAdapterFactory.ts:32](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/factory/serverAdapterFactory.ts#L32)

Register an adapter class for a framework

#### Parameters

##### framework

[`ServerFramework`](../type-aliases/ServerFramework.md)

##### adapterClass

(`neurolink`, `config?`) => [`BaseServerAdapter`](BaseServerAdapter.md)

#### Returns

`void`

---

### create()

> `static` **create**(`options`): `Promise`\<[`BaseServerAdapter`](BaseServerAdapter.md)\>

Defined in: [server/factory/serverAdapterFactory.ts:49](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/factory/serverAdapterFactory.ts#L49)

Create a server adapter for the specified framework
Uses dynamic imports to avoid bundling unused frameworks

#### Parameters

##### options

[`ServerAdapterFactoryOptions`](../type-aliases/ServerAdapterFactoryOptions.md)

#### Returns

`Promise`\<[`BaseServerAdapter`](BaseServerAdapter.md)\>

---

### createHono()

> `static` **createHono**(`neurolink`, `config?`): `Promise`\<[`BaseServerAdapter`](BaseServerAdapter.md)\>

Defined in: [server/factory/serverAdapterFactory.ts:104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/factory/serverAdapterFactory.ts#L104)

Create a Hono server adapter (convenience method)
Hono is the recommended framework for its multi-runtime support

#### Parameters

##### neurolink

[`NeuroLink`](NeuroLink.md)

##### config?

[`ServerAdapterConfig`](../type-aliases/ServerAdapterConfig.md)

#### Returns

`Promise`\<[`BaseServerAdapter`](BaseServerAdapter.md)\>

---

### createExpress()

> `static` **createExpress**(`neurolink`, `config?`): `Promise`\<[`BaseServerAdapter`](BaseServerAdapter.md)\>

Defined in: [server/factory/serverAdapterFactory.ts:118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/factory/serverAdapterFactory.ts#L118)

Create an Express server adapter (convenience method)

#### Parameters

##### neurolink

[`NeuroLink`](NeuroLink.md)

##### config?

[`ServerAdapterConfig`](../type-aliases/ServerAdapterConfig.md)

#### Returns

`Promise`\<[`BaseServerAdapter`](BaseServerAdapter.md)\>

---

### createFastify()

> `static` **createFastify**(`neurolink`, `config?`): `Promise`\<[`BaseServerAdapter`](BaseServerAdapter.md)\>

Defined in: [server/factory/serverAdapterFactory.ts:133](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/factory/serverAdapterFactory.ts#L133)

Create a Fastify server adapter (convenience method)
Fastify is known for high performance and low overhead

#### Parameters

##### neurolink

[`NeuroLink`](NeuroLink.md)

##### config?

[`ServerAdapterConfig`](../type-aliases/ServerAdapterConfig.md)

#### Returns

`Promise`\<[`BaseServerAdapter`](BaseServerAdapter.md)\>

---

### createKoa()

> `static` **createKoa**(`neurolink`, `config?`): `Promise`\<[`BaseServerAdapter`](BaseServerAdapter.md)\>

Defined in: [server/factory/serverAdapterFactory.ts:148](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/factory/serverAdapterFactory.ts#L148)

Create a Koa server adapter (convenience method)
Koa provides elegant middleware composition

#### Parameters

##### neurolink

[`NeuroLink`](NeuroLink.md)

##### config?

[`ServerAdapterConfig`](../type-aliases/ServerAdapterConfig.md)

#### Returns

`Promise`\<[`BaseServerAdapter`](BaseServerAdapter.md)\>

---

### isSupported()

> `static` **isSupported**(`framework`): `framework is ServerFramework`

Defined in: [server/factory/serverAdapterFactory.ts:162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/factory/serverAdapterFactory.ts#L162)

Check if a framework is supported

#### Parameters

##### framework

`string`

#### Returns

`framework is ServerFramework`

---

### getSupportedFrameworks()

> `static` **getSupportedFrameworks**(): `object`[]

Defined in: [server/factory/serverAdapterFactory.ts:169](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/factory/serverAdapterFactory.ts#L169)

Get list of supported frameworks

#### Returns

`object`[]

---

### getRecommendedFramework()

> `static` **getRecommendedFramework**(): [`ServerFramework`](../type-aliases/ServerFramework.md)

Defined in: [server/factory/serverAdapterFactory.ts:202](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/factory/serverAdapterFactory.ts#L202)

Get recommended framework based on runtime

#### Returns

[`ServerFramework`](../type-aliases/ServerFramework.md)
