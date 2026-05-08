[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FastifyServerAdapter

# Class: FastifyServerAdapter

Defined in: [server/adapters/fastifyAdapter.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/adapters/fastifyAdapter.ts#L37)

Fastify-specific server adapter
Provides high-performance HTTP server with schema validation

## Extends

- [`BaseServerAdapter`](BaseServerAdapter.md)

## Constructors

### Constructor

> **new FastifyServerAdapter**(`neurolink`, `config?`): `FastifyServerAdapter`

Defined in: [server/adapters/fastifyAdapter.ts:41](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/adapters/fastifyAdapter.ts#L41)

#### Parameters

##### neurolink

[`NeuroLink`](NeuroLink.md)

##### config?

[`ServerAdapterConfig`](../type-aliases/ServerAdapterConfig.md) = `{}`

#### Returns

`FastifyServerAdapter`

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`constructor`](BaseServerAdapter.md#constructor)

## Properties

### config

> `protected` `readonly` **config**: [`RequiredServerAdapterConfig`](../type-aliases/RequiredServerAdapterConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:43](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L43)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`config`](BaseServerAdapter.md#config)

---

### redactionConfig?

> `protected` `readonly` `optional` **redactionConfig?**: [`RedactionConfig`](../type-aliases/RedactionConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L44)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`redactionConfig`](BaseServerAdapter.md#redactionconfig)

---

### neurolink

> `protected` `readonly` **neurolink**: [`NeuroLink`](NeuroLink.md)

Defined in: [server/abstract/baseServerAdapter.ts:45](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L45)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`neurolink`](BaseServerAdapter.md#neurolink)

---

### toolRegistry

> `protected` `readonly` **toolRegistry**: [`MCPToolRegistry`](MCPToolRegistry.md)

Defined in: [server/abstract/baseServerAdapter.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L46)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`toolRegistry`](BaseServerAdapter.md#toolregistry)

---

### externalServerManager?

> `protected` `readonly` `optional` **externalServerManager?**: [`ExternalServerManager`](ExternalServerManager.md)

Defined in: [server/abstract/baseServerAdapter.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L47)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`externalServerManager`](BaseServerAdapter.md#externalservermanager)

---

### routes

> `protected` **routes**: `Map`\<`string`, [`RouteDefinition`](../type-aliases/RouteDefinition.md)\>

Defined in: [server/abstract/baseServerAdapter.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L48)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`routes`](BaseServerAdapter.md#routes)

---

### middlewares

> `protected` **middlewares**: [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)[] = `[]`

Defined in: [server/abstract/baseServerAdapter.ts:49](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L49)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`middlewares`](BaseServerAdapter.md#middlewares)

---

### isRunning

> `protected` **isRunning**: `boolean` = `false`

Defined in: [server/abstract/baseServerAdapter.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L50)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`isRunning`](BaseServerAdapter.md#isrunning)

---

### startTime?

> `protected` `optional` **startTime?**: `Date`

Defined in: [server/abstract/baseServerAdapter.ts:51](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L51)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`startTime`](BaseServerAdapter.md#starttime)

---

### lifecycleState

> `protected` **lifecycleState**: [`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md) = `"uninitialized"`

Defined in: [server/abstract/baseServerAdapter.ts:54](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L54)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`lifecycleState`](BaseServerAdapter.md#lifecyclestate)

---

### activeConnections

> `protected` **activeConnections**: `Map`\<`string`, [`TrackedConnection`](../type-aliases/TrackedConnection.md)\>

Defined in: [server/abstract/baseServerAdapter.ts:55](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L55)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`activeConnections`](BaseServerAdapter.md#activeconnections)

---

### shutdownConfig

> `protected` `readonly` **shutdownConfig**: [`RequiredShutdownConfig`](../type-aliases/RequiredShutdownConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L56)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`shutdownConfig`](BaseServerAdapter.md#shutdownconfig)

## Methods

### registerRoute()

> **registerRoute**(`route`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:267](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L267)

Register a custom route

#### Parameters

##### route

[`RouteDefinition`](../type-aliases/RouteDefinition.md)

#### Returns

`void`

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`registerRoute`](BaseServerAdapter.md#registerroute)

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

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`registerRouteGroup`](BaseServerAdapter.md#registerroutegroup)

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

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`registerMiddleware`](BaseServerAdapter.md#registermiddleware)

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

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`createContext`](BaseServerAdapter.md#createcontext)

---

### registerBuiltInMiddleware()

> `protected` **registerBuiltInMiddleware**(): `void`

Defined in: [server/abstract/baseServerAdapter.ts:377](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L377)

Register built-in middleware

#### Returns

`void`

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`registerBuiltInMiddleware`](BaseServerAdapter.md#registerbuiltinmiddleware)

---

### registerBuiltInRoutes()

> `protected` **registerBuiltInRoutes**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:416](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L416)

Register built-in routes
Only registers health routes if disableBuiltInHealth is false (default)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`registerBuiltInRoutes`](BaseServerAdapter.md#registerbuiltinroutes)

---

### generateRequestId()

> `protected` **generateRequestId**(): `string`

Defined in: [server/abstract/baseServerAdapter.ts:508](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L508)

Generate unique request ID

#### Returns

`string`

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`generateRequestId`](BaseServerAdapter.md#generaterequestid)

---

### getLifecycleState()

> **getLifecycleState**(): [`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md)

Defined in: [server/abstract/baseServerAdapter.ts:519](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L519)

Get the current lifecycle state

#### Returns

[`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`getLifecycleState`](BaseServerAdapter.md#getlifecyclestate)

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

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`trackConnection`](BaseServerAdapter.md#trackconnection)

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

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`untrackConnection`](BaseServerAdapter.md#untrackconnection)

---

### getActiveConnectionCount()

> **getActiveConnectionCount**(): `number`

Defined in: [server/abstract/baseServerAdapter.ts:566](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L566)

Get the number of active connections

#### Returns

`number`

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`getActiveConnectionCount`](BaseServerAdapter.md#getactiveconnectioncount)

---

### gracefulShutdown()

> `protected` **gracefulShutdown**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:574](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L574)

Perform graceful shutdown with connection draining
This method handles the complete shutdown lifecycle

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`gracefulShutdown`](BaseServerAdapter.md#gracefulshutdown)

---

### drainConnections()

> `protected` **drainConnections**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:709](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L709)

Wait for all active connections to drain
Resolves when activeConnections is empty

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`drainConnections`](BaseServerAdapter.md#drainconnections)

---

### resetServerState()

> `protected` **resetServerState**(): `void`

Defined in: [server/abstract/baseServerAdapter.ts:735](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L735)

Reset server state for restart capability
Call this after stop() completes to allow restart

#### Returns

`void`

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`resetServerState`](BaseServerAdapter.md#resetserverstate)

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

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`validateLifecycleState`](BaseServerAdapter.md#validatelifecyclestate)

---

### getStatus()

> **getStatus**(): [`ServerStatus`](../type-aliases/ServerStatus.md)

Defined in: [server/abstract/baseServerAdapter.ts:765](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L765)

Get server status

#### Returns

[`ServerStatus`](../type-aliases/ServerStatus.md)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`getStatus`](BaseServerAdapter.md#getstatus)

---

### listRoutes()

> **listRoutes**(): [`RouteDefinition`](../type-aliases/RouteDefinition.md)[]

Defined in: [server/abstract/baseServerAdapter.ts:781](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L781)

List all registered routes

#### Returns

[`RouteDefinition`](../type-aliases/RouteDefinition.md)[]

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`listRoutes`](BaseServerAdapter.md#listroutes)

---

### getConfig()

> **getConfig**(): [`RequiredServerAdapterConfig`](../type-aliases/RequiredServerAdapterConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:788](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/abstract/baseServerAdapter.ts#L788)

Get configuration

#### Returns

[`RequiredServerAdapterConfig`](../type-aliases/RequiredServerAdapterConfig.md)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`getConfig`](BaseServerAdapter.md#getconfig)

---

### initializeFramework()

> `protected` **initializeFramework**(): `void`

Defined in: [server/adapters/fastifyAdapter.ts:49](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/adapters/fastifyAdapter.ts#L49)

Initialize Fastify framework
Called by base class but actual initialization happens in initializeFrameworkAsync

#### Returns

`void`

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`initializeFramework`](BaseServerAdapter.md#initializeframework)

---

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [server/adapters/fastifyAdapter.ts:227](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/adapters/fastifyAdapter.ts#L227)

Override initialize to ensure async framework setup

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`initialize`](BaseServerAdapter.md#initialize)

---

### registerFrameworkRoute()

> `protected` **registerFrameworkRoute**(`route`): `void`

Defined in: [server/adapters/fastifyAdapter.ts:238](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/adapters/fastifyAdapter.ts#L238)

Register route with Fastify

#### Parameters

##### route

[`RouteDefinition`](../type-aliases/RouteDefinition.md)

#### Returns

`void`

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`registerFrameworkRoute`](BaseServerAdapter.md#registerframeworkroute)

---

### registerFrameworkMiddleware()

> `protected` **registerFrameworkMiddleware**(`middleware`): `void`

Defined in: [server/adapters/fastifyAdapter.ts:415](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/adapters/fastifyAdapter.ts#L415)

Register middleware with Fastify

#### Parameters

##### middleware

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

#### Returns

`void`

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`registerFrameworkMiddleware`](BaseServerAdapter.md#registerframeworkmiddleware)

---

### start()

> **start**(): `Promise`\<`void`\>

Defined in: [server/adapters/fastifyAdapter.ts:482](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/adapters/fastifyAdapter.ts#L482)

Start the Fastify server

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`start`](BaseServerAdapter.md#start)

---

### stop()

> **stop**(): `Promise`\<`void`\>

Defined in: [server/adapters/fastifyAdapter.ts:546](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/adapters/fastifyAdapter.ts#L546)

Stop the Fastify server with graceful shutdown

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`stop`](BaseServerAdapter.md#stop)

---

### stopAcceptingConnections()

> `protected` **stopAcceptingConnections**(): `Promise`\<`void`\>

Defined in: [server/adapters/fastifyAdapter.ts:581](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/adapters/fastifyAdapter.ts#L581)

Stop accepting new connections

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`stopAcceptingConnections`](BaseServerAdapter.md#stopacceptingconnections)

---

### closeServer()

> `protected` **closeServer**(): `Promise`\<`void`\>

Defined in: [server/adapters/fastifyAdapter.ts:589](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/adapters/fastifyAdapter.ts#L589)

Close the underlying server

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`closeServer`](BaseServerAdapter.md#closeserver)

---

### forceCloseConnections()

> `protected` **forceCloseConnections**(): `Promise`\<`void`\>

Defined in: [server/adapters/fastifyAdapter.ts:603](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/adapters/fastifyAdapter.ts#L603)

Force close all active connections

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`forceCloseConnections`](BaseServerAdapter.md#forcecloseconnections)

---

### getFrameworkInstance()

> **getFrameworkInstance**(): `unknown`

Defined in: [server/adapters/fastifyAdapter.ts:621](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/adapters/fastifyAdapter.ts#L621)

Get the Fastify instance

#### Returns

`unknown`

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`getFrameworkInstance`](BaseServerAdapter.md#getframeworkinstance)
