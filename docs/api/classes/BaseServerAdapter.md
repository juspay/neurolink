[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseServerAdapter

# Abstract Class: BaseServerAdapter

Defined in: [server/abstract/baseServerAdapter.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L42)

Abstract base class for server adapters
Provides common functionality and defines the interface for framework-specific implementations

## Extends

- `EventEmitter`

## Extended by

- [`ExpressServerAdapter`](ExpressServerAdapter.md)
- [`FastifyServerAdapter`](FastifyServerAdapter.md)
- [`HonoServerAdapter`](HonoServerAdapter.md)
- [`KoaServerAdapter`](KoaServerAdapter.md)

## Constructors

### Constructor

> **new BaseServerAdapter**(`neurolink`, `config?`): `BaseServerAdapter`

Defined in: [server/abstract/baseServerAdapter.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L58)

#### Parameters

##### neurolink

[`NeuroLink`](NeuroLink.md)

##### config?

[`ServerAdapterConfig`](../type-aliases/ServerAdapterConfig.md) = `{}`

#### Returns

`BaseServerAdapter`

#### Overrides

`EventEmitter.constructor`

## Properties

### config

> `protected` `readonly` **config**: [`RequiredServerAdapterConfig`](../type-aliases/RequiredServerAdapterConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L43)

---

### redactionConfig?

> `protected` `readonly` `optional` **redactionConfig?**: [`RedactionConfig`](../type-aliases/RedactionConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L44)

---

### neurolink

> `protected` `readonly` **neurolink**: [`NeuroLink`](NeuroLink.md)

Defined in: [server/abstract/baseServerAdapter.ts:45](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L45)

---

### toolRegistry

> `protected` `readonly` **toolRegistry**: [`MCPToolRegistry`](MCPToolRegistry.md)

Defined in: [server/abstract/baseServerAdapter.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L46)

---

### externalServerManager?

> `protected` `readonly` `optional` **externalServerManager?**: [`ExternalServerManager`](ExternalServerManager.md)

Defined in: [server/abstract/baseServerAdapter.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L47)

---

### routes

> `protected` **routes**: `Map`\<`string`, [`RouteDefinition`](../type-aliases/RouteDefinition.md)\>

Defined in: [server/abstract/baseServerAdapter.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L48)

---

### middlewares

> `protected` **middlewares**: [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)[] = `[]`

Defined in: [server/abstract/baseServerAdapter.ts:49](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L49)

---

### isRunning

> `protected` **isRunning**: `boolean` = `false`

Defined in: [server/abstract/baseServerAdapter.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L50)

---

### startTime?

> `protected` `optional` **startTime?**: `Date`

Defined in: [server/abstract/baseServerAdapter.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L51)

---

### lifecycleState

> `protected` **lifecycleState**: [`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md) = `"uninitialized"`

Defined in: [server/abstract/baseServerAdapter.ts:54](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L54)

---

### activeConnections

> `protected` **activeConnections**: `Map`\<`string`, [`TrackedConnection`](../type-aliases/TrackedConnection.md)\>

Defined in: [server/abstract/baseServerAdapter.ts:55](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L55)

---

### shutdownConfig

> `protected` `readonly` **shutdownConfig**: [`RequiredShutdownConfig`](../type-aliases/RequiredShutdownConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L56)

## Methods

### initializeFramework()

> `abstract` `protected` **initializeFramework**(): `void`

Defined in: [server/abstract/baseServerAdapter.ts:137](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L137)

Initialize the underlying server framework

#### Returns

`void`

---

### registerFrameworkRoute()

> `abstract` `protected` **registerFrameworkRoute**(`route`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:142](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L142)

Register a route with the framework

#### Parameters

##### route

[`RouteDefinition`](../type-aliases/RouteDefinition.md)

#### Returns

`void`

---

### registerFrameworkMiddleware()

> `abstract` `protected` **registerFrameworkMiddleware**(`middleware`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:147](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L147)

Register middleware with the framework

#### Parameters

##### middleware

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

#### Returns

`void`

---

### start()

> `abstract` **start**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:154](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L154)

Start the server

#### Returns

`Promise`\<`void`\>

---

### stop()

> `abstract` **stop**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:159](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L159)

Stop the server

#### Returns

`Promise`\<`void`\>

---

### getFrameworkInstance()

> `abstract` **getFrameworkInstance**(): `unknown`

Defined in: [server/abstract/baseServerAdapter.ts:164](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L164)

Get the underlying framework instance (for advanced usage)

#### Returns

`unknown`

---

### stopAcceptingConnections()

> `abstract` `protected` **stopAcceptingConnections**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:174](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L174)

Stop accepting new connections
Called during graceful shutdown to prevent new requests

#### Returns

`Promise`\<`void`\>

---

### closeServer()

> `abstract` `protected` **closeServer**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:180](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L180)

Close the underlying server
Called after connections are drained or timeout

#### Returns

`Promise`\<`void`\>

---

### forceCloseConnections()

> `abstract` `protected` **forceCloseConnections**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:186](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L186)

Force close all active connections
Called when drain timeout expires and forceClose is true

#### Returns

`Promise`\<`void`\>

---

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:196](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L196)

Initialize the server adapter
Sets up routes, middleware, and framework

#### Returns

`Promise`\<`void`\>

---

### registerRoute()

> **registerRoute**(`route`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:267](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L267)

Register a custom route

#### Parameters

##### route

[`RouteDefinition`](../type-aliases/RouteDefinition.md)

#### Returns

`void`

---

### registerRouteGroup()

> **registerRouteGroup**(`group`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:289](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L289)

Register multiple routes from a route group

#### Parameters

##### group

###### prefix

`string`

###### routes

[`RouteDefinition`](../type-aliases/RouteDefinition.md)[]

###### middleware?

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)[]

#### Returns

`void`

---

### registerMiddleware()

> **registerMiddleware**(`middleware`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:335](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L335)

Register custom middleware

#### Parameters

##### middleware

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

#### Returns

`void`

---

### createContext()

> `protected` **createContext**(`options`): [`ServerContext`](../type-aliases/ServerContext.md)

Defined in: [server/abstract/baseServerAdapter.ts:348](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L348)

Create request context from incoming request

#### Parameters

##### options

###### requestId

`string`

###### method

`string`

###### path

`string`

###### headers

`Record`\<`string`, `string`\>

###### query?

`Record`\<`string`, `string`\>

###### params?

`Record`\<`string`, `string`\>

###### body?

`unknown`

#### Returns

[`ServerContext`](../type-aliases/ServerContext.md)

---

### registerBuiltInMiddleware()

> `protected` **registerBuiltInMiddleware**(): `void`

Defined in: [server/abstract/baseServerAdapter.ts:377](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L377)

Register built-in middleware

#### Returns

`void`

---

### registerBuiltInRoutes()

> `protected` **registerBuiltInRoutes**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:416](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L416)

Register built-in routes
Only registers health routes if disableBuiltInHealth is false (default)

#### Returns

`Promise`\<`void`\>

---

### generateRequestId()

> `protected` **generateRequestId**(): `string`

Defined in: [server/abstract/baseServerAdapter.ts:508](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L508)

Generate unique request ID

#### Returns

`string`

---

### getLifecycleState()

> **getLifecycleState**(): [`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md)

Defined in: [server/abstract/baseServerAdapter.ts:519](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L519)

Get the current lifecycle state

#### Returns

[`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md)

---

### trackConnection()

> `protected` **trackConnection**(`id`, `socket?`, `requestId?`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:529](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L529)

Track a new connection

#### Parameters

##### id

`string`

Unique connection identifier

##### socket?

`unknown`

Optional underlying socket object

##### requestId?

`string`

Optional associated request ID

#### Returns

`void`

---

### untrackConnection()

> `protected` **untrackConnection**(`id`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:552](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L552)

Untrack a connection (when it's completed)

#### Parameters

##### id

`string`

Connection identifier to remove

#### Returns

`void`

---

### getActiveConnectionCount()

> **getActiveConnectionCount**(): `number`

Defined in: [server/abstract/baseServerAdapter.ts:566](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L566)

Get the number of active connections

#### Returns

`number`

---

### gracefulShutdown()

> `protected` **gracefulShutdown**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:574](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L574)

Perform graceful shutdown with connection draining
This method handles the complete shutdown lifecycle

#### Returns

`Promise`\<`void`\>

---

### drainConnections()

> `protected` **drainConnections**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:709](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L709)

Wait for all active connections to drain
Resolves when activeConnections is empty

#### Returns

`Promise`\<`void`\>

---

### resetServerState()

> `protected` **resetServerState**(): `void`

Defined in: [server/abstract/baseServerAdapter.ts:735](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L735)

Reset server state for restart capability
Call this after stop() completes to allow restart

#### Returns

`void`

---

### validateLifecycleState()

> `protected` **validateLifecycleState**(`operation`, `allowedStates`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:749](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L749)

Validate lifecycle state transition

#### Parameters

##### operation

`string`

The operation being performed

##### allowedStates

[`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md)[]

States that allow the operation

#### Returns

`void`

---

### getStatus()

> **getStatus**(): [`ServerStatus`](../type-aliases/ServerStatus.md)

Defined in: [server/abstract/baseServerAdapter.ts:765](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L765)

Get server status

#### Returns

[`ServerStatus`](../type-aliases/ServerStatus.md)

---

### listRoutes()

> **listRoutes**(): [`RouteDefinition`](../type-aliases/RouteDefinition.md)[]

Defined in: [server/abstract/baseServerAdapter.ts:781](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L781)

List all registered routes

#### Returns

[`RouteDefinition`](../type-aliases/RouteDefinition.md)[]

---

### getConfig()

> **getConfig**(): [`RequiredServerAdapterConfig`](../type-aliases/RequiredServerAdapterConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:788](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L788)

Get configuration

#### Returns

[`RequiredServerAdapterConfig`](../type-aliases/RequiredServerAdapterConfig.md)
