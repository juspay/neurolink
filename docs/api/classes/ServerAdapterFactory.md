[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerAdapterFactory

# Class: ServerAdapterFactory

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

Check if a framework is supported

#### Parameters

##### framework

`string`

#### Returns

`framework is ServerFramework`

---

### getSupportedFrameworks()

> `static` **getSupportedFrameworks**(): `object`[]

Get list of supported frameworks

#### Returns

`object`[]

---

### getRecommendedFramework()

> `static` **getRecommendedFramework**(): [`ServerFramework`](../type-aliases/ServerFramework.md)

Get recommended framework based on runtime

#### Returns

[`ServerFramework`](../type-aliases/ServerFramework.md)
