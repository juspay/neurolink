[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseServerAdapter

# Abstract Class: BaseServerAdapter

Defined in: [server/abstract/baseServerAdapter.ts:44](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L44)

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

Defined in: [server/abstract/baseServerAdapter.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L60)

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

Defined in: [server/abstract/baseServerAdapter.ts:45](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L45)

---

### redactionConfig?

> `protected` `readonly` `optional` **redactionConfig?**: [`RedactionConfig`](../type-aliases/RedactionConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:46](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L46)

---

### neurolink

> `protected` `readonly` **neurolink**: [`NeuroLink`](NeuroLink.md)

Defined in: [server/abstract/baseServerAdapter.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L47)

---

### toolRegistry

> `protected` `readonly` **toolRegistry**: [`MCPToolRegistry`](MCPToolRegistry.md)

Defined in: [server/abstract/baseServerAdapter.ts:48](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L48)

---

### externalServerManager?

> `protected` `readonly` `optional` **externalServerManager?**: [`ExternalServerManager`](ExternalServerManager.md)

Defined in: [server/abstract/baseServerAdapter.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L49)

---

### routes

> `protected` **routes**: `Map`\<`string`, [`RouteDefinition`](../type-aliases/RouteDefinition.md)\>

Defined in: [server/abstract/baseServerAdapter.ts:50](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L50)

---

### middlewares

> `protected` **middlewares**: [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)[] = `[]`

Defined in: [server/abstract/baseServerAdapter.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L51)

---

### isRunning

> `protected` **isRunning**: `boolean` = `false`

Defined in: [server/abstract/baseServerAdapter.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L52)

---

### startTime?

> `protected` `optional` **startTime?**: `Date`

Defined in: [server/abstract/baseServerAdapter.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L53)

---

### lifecycleState

> `protected` **lifecycleState**: [`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md) = `"uninitialized"`

Defined in: [server/abstract/baseServerAdapter.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L56)

---

### activeConnections

> `protected` **activeConnections**: `Map`\<`string`, [`TrackedConnection`](../type-aliases/TrackedConnection.md)\>

Defined in: [server/abstract/baseServerAdapter.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L57)

---

### shutdownConfig

> `protected` `readonly` **shutdownConfig**: [`RequiredShutdownConfig`](../type-aliases/RequiredShutdownConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L58)

## Methods

### initializeFramework()

> `abstract` `protected` **initializeFramework**(): `void`

Defined in: [server/abstract/baseServerAdapter.ts:139](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L139)

Initialize the underlying server framework

#### Returns

`void`

---

### registerFrameworkRoute()

> `abstract` `protected` **registerFrameworkRoute**(`route`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:144](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L144)

Register a route with the framework

#### Parameters

##### route

[`RouteDefinition`](../type-aliases/RouteDefinition.md)

#### Returns

`void`

---

### registerFrameworkMiddleware()

> `abstract` `protected` **registerFrameworkMiddleware**(`middleware`): `void`

Defined in: [server/abstract/baseServerAdapter.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L149)

Register middleware with the framework

#### Parameters

##### middleware

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

#### Returns

`void`

---

### start()

> `abstract` **start**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L156)

Start the server

#### Returns

`Promise`\<`void`\>

---

### stop()

> `abstract` **stop**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L161)

Stop the server

#### Returns

`Promise`\<`void`\>

---

### getFrameworkInstance()

> `abstract` **getFrameworkInstance**(): `unknown`

Defined in: [server/abstract/baseServerAdapter.ts:166](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L166)

Get the underlying framework instance (for advanced usage)

#### Returns

`unknown`

---

### stopAcceptingConnections()

> `abstract` `protected` **stopAcceptingConnections**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:176](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L176)

Stop accepting new connections
Called during graceful shutdown to prevent new requests

#### Returns

`Promise`\<`void`\>

---

### closeServer()

> `abstract` `protected` **closeServer**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:182](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L182)

Close the underlying server
Called after connections are drained or timeout

#### Returns

`Promise`\<`void`\>

---

### forceCloseConnections()

> `abstract` `protected` **forceCloseConnections**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L188)

Force close all active connections
Called when drain timeout expires and forceClose is true

#### Returns

`Promise`\<`void`\>

---

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

---

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:224](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L224)

Initialize the server adapter
Sets up routes, middleware, and framework

#### Returns

`Promise`\<`void`\>

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

---

### registerBuiltInMiddleware()

> `protected` **registerBuiltInMiddleware**(): `void`

Defined in: [server/abstract/baseServerAdapter.ts:405](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L405)

Register built-in middleware

#### Returns

`void`

---

### registerBuiltInRoutes()

> `protected` **registerBuiltInRoutes**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:444](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L444)

Register built-in routes
Only registers health routes if disableBuiltInHealth is false (default)

#### Returns

`Promise`\<`void`\>

---

### generateRequestId()

> `protected` **generateRequestId**(): `string`

Defined in: [server/abstract/baseServerAdapter.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L536)

Generate unique request ID

#### Returns

`string`

---

### getLifecycleState()

> **getLifecycleState**(): [`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md)

Defined in: [server/abstract/baseServerAdapter.ts:547](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L547)

Get the current lifecycle state

#### Returns

[`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md)

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

---

### getActiveConnectionCount()

> **getActiveConnectionCount**(): `number`

Defined in: [server/abstract/baseServerAdapter.ts:594](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L594)

Get the number of active connections

#### Returns

`number`

---

### gracefulShutdown()

> `protected` **gracefulShutdown**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:602](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L602)

Perform graceful shutdown with connection draining
This method handles the complete shutdown lifecycle

#### Returns

`Promise`\<`void`\>

---

### drainConnections()

> `protected` **drainConnections**(): `Promise`\<`void`\>

Defined in: [server/abstract/baseServerAdapter.ts:737](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L737)

Wait for all active connections to drain
Resolves when activeConnections is empty

#### Returns

`Promise`\<`void`\>

---

### resetServerState()

> `protected` **resetServerState**(): `void`

Defined in: [server/abstract/baseServerAdapter.ts:763](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L763)

Reset server state for restart capability
Call this after stop() completes to allow restart

#### Returns

`void`

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

---

### getStatus()

> **getStatus**(): [`ServerStatus`](../type-aliases/ServerStatus.md)

Defined in: [server/abstract/baseServerAdapter.ts:793](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L793)

Get server status

#### Returns

[`ServerStatus`](../type-aliases/ServerStatus.md)

---

### listRoutes()

> **listRoutes**(): [`RouteDefinition`](../type-aliases/RouteDefinition.md)[]

Defined in: [server/abstract/baseServerAdapter.ts:809](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L809)

List all registered routes

#### Returns

[`RouteDefinition`](../type-aliases/RouteDefinition.md)[]

---

### getConfig()

> **getConfig**(): [`RequiredServerAdapterConfig`](../type-aliases/RequiredServerAdapterConfig.md)

Defined in: [server/abstract/baseServerAdapter.ts:816](https://github.com/juspay/neurolink/blob/release/src/lib/server/abstract/baseServerAdapter.ts#L816)

Get configuration

#### Returns

[`RequiredServerAdapterConfig`](../type-aliases/RequiredServerAdapterConfig.md)
