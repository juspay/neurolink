[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExpressServerAdapter

# Class: ExpressServerAdapter

Defined in: [server/adapters/expressAdapter.ts:30](https://github.com/juspay/neurolink/blob/release/src/lib/server/adapters/expressAdapter.ts#L30)

Express-specific server adapter

## Extends

- [`BaseServerAdapter`](BaseServerAdapter.md)

## Constructors

### Constructor

> **new ExpressServerAdapter**(`neurolink`, `config?`): `ExpressServerAdapter`

Defined in: [server/adapters/expressAdapter.ts:36](https://github.com/juspay/neurolink/blob/release/src/lib/server/adapters/expressAdapter.ts#L36)

#### Parameters

##### neurolink

[`NeuroLink`](NeuroLink.md)

##### config?

[`ServerAdapterConfig`](../type-aliases/ServerAdapterConfig.md) = `{}`

#### Returns

`ExpressServerAdapter`

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`constructor`](BaseServerAdapter.md#constructor)

## Properties

### config

> `protected` `readonly` **config**: [`RequiredServerAdapterConfig`](../type-aliases/RequiredServerAdapterConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L45)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`config`](BaseServerAdapter.md#config)

---

### redactionConfig?

> `protected` `readonly` `optional` **redactionConfig?**: [`RedactionConfig`](../type-aliases/RedactionConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:46](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L46)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`redactionConfig`](BaseServerAdapter.md#redactionconfig)

---

### neurolink

> `protected` `readonly` **neurolink**: [`NeuroLink`](NeuroLink.md)

Defined in: [server/abstract/baseServerAdapter.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L47)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`neurolink`](BaseServerAdapter.md#neurolink)

---

### toolRegistry

> `protected` `readonly` **toolRegistry**: [`MCPToolRegistry`](MCPToolRegistry.md)

Defined in: [server/abstract/baseServerAdapter.ts:48](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L48)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`toolRegistry`](BaseServerAdapter.md#toolregistry)

---

### externalServerManager?

> `protected` `readonly` `optional` **externalServerManager?**: [`ExternalServerManager`](ExternalServerManager.md)

Defined in: [server/abstract/baseServerAdapter.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L49)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`externalServerManager`](BaseServerAdapter.md#externalservermanager)

---

### routes

> `protected` **routes**: `Map`\<`string`, [`RouteDefinition`](../type-aliases/RouteDefinition.md)\>

Defined in: [server/abstract/baseServerAdapter.ts:50](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L50)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`routes`](BaseServerAdapter.md#routes)

---

### middlewares

> `protected` **middlewares**: [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)[] = `[]`

Defined in: [server/abstract/baseServerAdapter.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L51)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`middlewares`](BaseServerAdapter.md#middlewares)

---

### isRunning

> `protected` **isRunning**: `boolean` = `false`

Defined in: [server/abstract/baseServerAdapter.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L52)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`isRunning`](BaseServerAdapter.md#isrunning)

---

### startTime?

> `protected` `optional` **startTime?**: `Date`

Defined in: [server/abstract/baseServerAdapter.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L53)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`startTime`](BaseServerAdapter.md#starttime)

---

### lifecycleState

> `protected` **lifecycleState**: [`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md) = `"uninitialized"`

Defined in: [server/abstract/baseServerAdapter.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L56)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`lifecycleState`](BaseServerAdapter.md#lifecyclestate)

---

### activeConnections

> `protected` **activeConnections**: `Map`\<`string`, [`TrackedConnection`](../type-aliases/TrackedConnection.md)\>

Defined in: [server/abstract/baseServerAdapter.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L57)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`activeConnections`](BaseServerAdapter.md#activeconnections)

---

### shutdownConfig

> `protected` `readonly` **shutdownConfig**: [`RequiredShutdownConfig`](../type-aliases/RequiredShutdownConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L58)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`shutdownConfig`](BaseServerAdapter.md#shutdownconfig)

## Methods

### importFrameworkDependency()

> `protected` **importFrameworkDependency**\<`T`\>(`pkg`, `framework`): `Promise`\<`T`\>

Defined in: [server/abstract/baseServerAdapter.ts:206](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L206)

Import an optional framework dependency (express/fastify/koa and their
plugins), converting a missing package into a [MissingDependencyError](MissingDependencyError.md)
instead of letting the framework's `Cannot find package` propagate raw.

Delegates to tryImport for the actual resolution and message
formatting, then re-wraps only the "package genuinely absent" case — the
one `tryImport` signals by attaching the loader's own module-not-found
error as `cause` — into the adapter-specific error type. Any other
failure (installed but broken, non-package specifier) passes through
unchanged, matching `tryImport`'s own contract.

#### Type Parameters

##### T

`T`

#### Parameters

##### pkg

`string`

##### framework

`string`

#### Returns

`Promise`\<`T`\>

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`importFrameworkDependency`](BaseServerAdapter.md#importframeworkdependency)

---

### registerRoute()

> **registerRoute**(`route`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:295](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L295)

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

Defined in: [server/abstract/baseServerAdapter.ts:317](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L317)

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

Defined in: [server/abstract/baseServerAdapter.ts:363](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L363)

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

Defined in: [server/abstract/baseServerAdapter.ts:376](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L376)

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

Defined in: [server/abstract/baseServerAdapter.ts:405](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L405)

Register built-in middleware

#### Returns

`void`

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`registerBuiltInMiddleware`](BaseServerAdapter.md#registerbuiltinmiddleware)

---

### registerBuiltInRoutes()

> `protected` **registerBuiltInRoutes**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L444)

Register built-in routes
Only registers health routes if disableBuiltInHealth is false (default)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`registerBuiltInRoutes`](BaseServerAdapter.md#registerbuiltinroutes)

---

### generateRequestId()

> `protected` **generateRequestId**(): `string`

Defined in: [server/abstract/baseServerAdapter.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L536)

Generate unique request ID

#### Returns

`string`

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`generateRequestId`](BaseServerAdapter.md#generaterequestid)

---

### getLifecycleState()

> **getLifecycleState**(): [`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md)

Defined in: [server/abstract/baseServerAdapter.ts:547](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L547)

Get the current lifecycle state

#### Returns

[`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`getLifecycleState`](BaseServerAdapter.md#getlifecyclestate)

---

### trackConnection()

> `protected` **trackConnection**(`id`, `socket?`, `requestId?`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:557](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L557)

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

Defined in: [server/abstract/baseServerAdapter.ts:580](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L580)

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

Defined in: [server/abstract/baseServerAdapter.ts:594](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L594)

Get the number of active connections

#### Returns

`number`

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`getActiveConnectionCount`](BaseServerAdapter.md#getactiveconnectioncount)

---

### gracefulShutdown()

> `protected` **gracefulShutdown**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:602](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L602)

Perform graceful shutdown with connection draining
This method handles the complete shutdown lifecycle

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`gracefulShutdown`](BaseServerAdapter.md#gracefulshutdown)

---

### drainConnections()

> `protected` **drainConnections**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:737](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L737)

Wait for all active connections to drain
Resolves when activeConnections is empty

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`drainConnections`](BaseServerAdapter.md#drainconnections)

---

### resetServerState()

> `protected` **resetServerState**(): `void`

Defined in: [server/abstract/baseServerAdapter.ts:763](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L763)

Reset server state for restart capability
Call this after stop() completes to allow restart

#### Returns

`void`

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`resetServerState`](BaseServerAdapter.md#resetserverstate)

---

### validateLifecycleState()

> `protected` **validateLifecycleState**(`operation`, `allowedStates`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:777](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L777)

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

Defined in: [server/abstract/baseServerAdapter.ts:793](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L793)

Get server status

#### Returns

[`ServerStatus`](../type-aliases/ServerStatus.md)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`getStatus`](BaseServerAdapter.md#getstatus)

---

### listRoutes()

> **listRoutes**(): [`RouteDefinition`](../type-aliases/RouteDefinition.md)[]

Defined in: [server/abstract/baseServerAdapter.ts:809](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L809)

List all registered routes

#### Returns

[`RouteDefinition`](../type-aliases/RouteDefinition.md)[]

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`listRoutes`](BaseServerAdapter.md#listroutes)

---

### getConfig()

> **getConfig**(): [`RequiredServerAdapterConfig`](../type-aliases/RequiredServerAdapterConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:816](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L816)

Get configuration

#### Returns

[`RequiredServerAdapterConfig`](../type-aliases/RequiredServerAdapterConfig.md)

#### Inherited from

[`BaseServerAdapter`](BaseServerAdapter.md).[`getConfig`](BaseServerAdapter.md#getconfig)

---

### initializeFramework()

> `protected` **initializeFramework**(): `void`

Defined in: [server/adapters/expressAdapter.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/server/adapters/expressAdapter.ts#L43)

Initialize Express framework asynchronously

#### Returns

`void`

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`initializeFramework`](BaseServerAdapter.md#initializeframework)

---

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [server/adapters/expressAdapter.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/server/adapters/expressAdapter.ts#L167)

Override initialize to ensure async framework setup

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`initialize`](BaseServerAdapter.md#initialize)

---

### registerFrameworkRoute()

> `protected` **registerFrameworkRoute**(`route`): `void`

Defined in: [server/adapters/expressAdapter.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/server/adapters/expressAdapter.ts#L187)

Register route with Express

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

Defined in: [server/adapters/expressAdapter.ts:396](https://github.com/juspay/neurolink/blob/release/src/lib/server/adapters/expressAdapter.ts#L396)

Register middleware with Express

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

Defined in: [server/adapters/expressAdapter.ts:459](https://github.com/juspay/neurolink/blob/release/src/lib/server/adapters/expressAdapter.ts#L459)

Start the Express server

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`start`](BaseServerAdapter.md#start)

---

### stop()

> **stop**(): `Promise`\<`void`\>

Defined in: [server/adapters/expressAdapter.ts:540](https://github.com/juspay/neurolink/blob/release/src/lib/server/adapters/expressAdapter.ts#L540)

Stop the Express server with graceful shutdown

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`stop`](BaseServerAdapter.md#stop)

---

### stopAcceptingConnections()

> `protected` **stopAcceptingConnections**(): `Promise`\<`void`\>

Defined in: [server/adapters/expressAdapter.ts:577](https://github.com/juspay/neurolink/blob/release/src/lib/server/adapters/expressAdapter.ts#L577)

Stop accepting new connections

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`stopAcceptingConnections`](BaseServerAdapter.md#stopacceptingconnections)

---

### closeServer()

> `protected` **closeServer**(): `Promise`\<`void`\>

Defined in: [server/adapters/expressAdapter.ts:587](https://github.com/juspay/neurolink/blob/release/src/lib/server/adapters/expressAdapter.ts#L587)

Close the underlying server

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`closeServer`](BaseServerAdapter.md#closeserver)

---

### forceCloseConnections()

> `protected` **forceCloseConnections**(): `Promise`\<`void`\>

Defined in: [server/adapters/expressAdapter.ts:607](https://github.com/juspay/neurolink/blob/release/src/lib/server/adapters/expressAdapter.ts#L607)

Force close all active connections

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`forceCloseConnections`](BaseServerAdapter.md#forcecloseconnections)

---

### getFrameworkInstance()

> **getFrameworkInstance**(): `unknown`

Defined in: [server/adapters/expressAdapter.ts:623](https://github.com/juspay/neurolink/blob/release/src/lib/server/adapters/expressAdapter.ts#L623)

Get the Express app instance

#### Returns

`unknown`

#### Overrides

[`BaseServerAdapter`](BaseServerAdapter.md).[`getFrameworkInstance`](BaseServerAdapter.md#getframeworkinstance)
