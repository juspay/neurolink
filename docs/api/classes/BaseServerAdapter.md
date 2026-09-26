[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseServerAdapter

# Abstract Class: BaseServerAdapter

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

---

### redactionConfig?

> `protected` `readonly` `optional` **redactionConfig?**: [`RedactionConfig`](../type-aliases/RedactionConfig.md)

---

### neurolink

> `protected` `readonly` **neurolink**: [`NeuroLink`](NeuroLink.md)

---

### toolRegistry

> `protected` `readonly` **toolRegistry**: [`MCPToolRegistry`](MCPToolRegistry.md)

---

### externalServerManager?

> `protected` `readonly` `optional` **externalServerManager?**: [`ExternalServerManager`](ExternalServerManager.md)

---

### routes

> `protected` **routes**: `Map`\<`string`, [`RouteDefinition`](../type-aliases/RouteDefinition.md)\>

---

### middlewares

> `protected` **middlewares**: [`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)[] = `[]`

---

### isRunning

> `protected` **isRunning**: `boolean` = `false`

---

### startTime?

> `protected` `optional` **startTime?**: `Date`

---

### lifecycleState

> `protected` **lifecycleState**: [`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md) = `"uninitialized"`

---

### activeConnections

> `protected` **activeConnections**: `Map`\<`string`, [`TrackedConnection`](../type-aliases/TrackedConnection.md)\>

---

### shutdownConfig

> `protected` `readonly` **shutdownConfig**: [`RequiredShutdownConfig`](../type-aliases/RequiredShutdownConfig.md)

## Methods

### initializeFramework()

> `abstract` `protected` **initializeFramework**(): `void`

Initialize the underlying server framework

#### Returns

`void`

---

### registerFrameworkRoute()

> `abstract` `protected` **registerFrameworkRoute**(`route`): `void`

Register a route with the framework

#### Parameters

##### route

[`RouteDefinition`](../type-aliases/RouteDefinition.md)

#### Returns

`void`

---

### registerFrameworkMiddleware()

> `abstract` `protected` **registerFrameworkMiddleware**(`middleware`): `void`

Register middleware with the framework

#### Parameters

##### middleware

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

#### Returns

`void`

---

### start()

> `abstract` **start**(): `Promise`\<`void`\>

Start the server

#### Returns

`Promise`\<`void`\>

---

### stop()

> `abstract` **stop**(): `Promise`\<`void`\>

Stop the server

#### Returns

`Promise`\<`void`\>

---

### getFrameworkInstance()

> `abstract` **getFrameworkInstance**(): `unknown`

Get the underlying framework instance (for advanced usage)

#### Returns

`unknown`

---

### stopAcceptingConnections()

> `abstract` `protected` **stopAcceptingConnections**(): `Promise`\<`void`\>

Stop accepting new connections
Called during graceful shutdown to prevent new requests

#### Returns

`Promise`\<`void`\>

---

### closeServer()

> `abstract` `protected` **closeServer**(): `Promise`\<`void`\>

Close the underlying server
Called after connections are drained or timeout

#### Returns

`Promise`\<`void`\>

---

### forceCloseConnections()

> `abstract` `protected` **forceCloseConnections**(): `Promise`\<`void`\>

Force close all active connections
Called when drain timeout expires and forceClose is true

#### Returns

`Promise`\<`void`\>

---

### importFrameworkDependency()

> `protected` **importFrameworkDependency**\<`T`\>(`pkg`, `framework`): `Promise`\<`T`\>

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

Initialize the server adapter
Sets up routes, middleware, and framework

#### Returns

`Promise`\<`void`\>

---

### registerRoute()

> **registerRoute**(`route`): `void`

Register a custom route

#### Parameters

##### route

[`RouteDefinition`](../type-aliases/RouteDefinition.md)

#### Returns

`void`

---

### registerRouteGroup()

> **registerRouteGroup**(`group`): `void`

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

Register custom middleware

#### Parameters

##### middleware

[`MiddlewareDefinition`](../type-aliases/MiddlewareDefinition.md)

#### Returns

`void`

---

### createContext()

> `protected` **createContext**(`options`): [`ServerContext`](../type-aliases/ServerContext.md)

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

Register built-in middleware

#### Returns

`void`

---

### registerBuiltInRoutes()

> `protected` **registerBuiltInRoutes**(): `Promise`\<`void`\>

Register built-in routes
Only registers health routes if disableBuiltInHealth is false (default)

#### Returns

`Promise`\<`void`\>

---

### generateRequestId()

> `protected` **generateRequestId**(): `string`

Generate unique request ID

#### Returns

`string`

---

### getLifecycleState()

> **getLifecycleState**(): [`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md)

Get the current lifecycle state

#### Returns

[`ServerLifecycleState`](../type-aliases/ServerLifecycleState.md)

---

### trackConnection()

> `protected` **trackConnection**(`id`, `socket?`, `requestId?`): `void`

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

Get the number of active connections

#### Returns

`number`

---

### gracefulShutdown()

> `protected` **gracefulShutdown**(): `Promise`\<`void`\>

Perform graceful shutdown with connection draining
This method handles the complete shutdown lifecycle

#### Returns

`Promise`\<`void`\>

---

### drainConnections()

> `protected` **drainConnections**(): `Promise`\<`void`\>

Wait for all active connections to drain
Resolves when activeConnections is empty

#### Returns

`Promise`\<`void`\>

---

### resetServerState()

> `protected` **resetServerState**(): `void`

Reset server state for restart capability
Call this after stop() completes to allow restart

#### Returns

`void`

---

### validateLifecycleState()

> `protected` **validateLifecycleState**(`operation`, `allowedStates`): `void`

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

Get server status

#### Returns

[`ServerStatus`](../type-aliases/ServerStatus.md)

---

### listRoutes()

> **listRoutes**(): [`RouteDefinition`](../type-aliases/RouteDefinition.md)[]

List all registered routes

#### Returns

[`RouteDefinition`](../type-aliases/RouteDefinition.md)[]

---

### getConfig()

> **getConfig**(): [`RequiredServerAdapterConfig`](../type-aliases/RequiredServerAdapterConfig.md)

Get configuration

#### Returns

[`RequiredServerAdapterConfig`](../type-aliases/RequiredServerAdapterConfig.md)
