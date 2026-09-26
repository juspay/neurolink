[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseAuthProvider

# Abstract Class: BaseAuthProvider

BaseAuthProvider - Abstract base class for all auth providers

Subclasses must implement:

- authenticateToken() - Validate and decode JWT/access tokens

Optionally override:

- getUser() - Fetch user by ID from provider
- updateUserRoles() - Update user roles in provider
- updateUserPermissions() - Update user permissions in provider
- dispose() - Clean up resources

## Implements

- [`AuthProvider`](../type-aliases/AuthProvider.md)

## Constructors

### Constructor

> **new BaseAuthProvider**(`config`): `BaseAuthProvider`

#### Parameters

##### config

[`AuthProviderConfig`](../type-aliases/AuthProviderConfig.md)

#### Returns

`BaseAuthProvider`

## Properties

### type

> `abstract` `readonly` **type**: [`AuthProviderType`](../type-aliases/AuthProviderType.md)

Provider type identifier

#### Implementation of

`AuthProvider.type`

---

### config

> `readonly` **config**: [`AuthProviderConfig`](../type-aliases/AuthProviderConfig.md)

Provider configuration

#### Implementation of

`AuthProvider.config`

---

### sessionStorage

> `protected` **sessionStorage**: [`SessionStorage`](../type-aliases/SessionStorage.md)

---

### sessionConfig

> `protected` **sessionConfig**: [`SessionConfig`](../type-aliases/SessionConfig.md)

---

### rbacConfig

> `protected` **rbacConfig**: [`RBACConfig`](../type-aliases/RBACConfig.md)

---

### emitter

> `protected` **emitter**: `EventEmitter`\<`DefaultEventMap`\>

## Methods

### authenticateToken()

> `abstract` **authenticateToken**(`token`, `context?`): `Promise`\<[`TokenValidationResult`](../type-aliases/TokenValidationResult.md)\>

Validate and authenticate a token
Subclasses must implement provider-specific token validation

#### Parameters

##### token

`string`

##### context?

[`AuthRequestContext`](../type-aliases/AuthRequestContext.md)

#### Returns

`Promise`\<[`TokenValidationResult`](../type-aliases/TokenValidationResult.md)\>

#### Implementation of

`AuthProvider.authenticateToken`

---

### extractToken()

> **extractToken**(`context`): `Promise`\<`string` \| `null`\>

Extract token using configured strategy

Attempts extraction in order:

1. Header (Authorization: Bearer <token> by default)
2. Cookie
3. Query parameter
4. Custom function

#### Parameters

##### context

[`AuthRequestContext`](../type-aliases/AuthRequestContext.md)

Request context containing headers, cookies, etc.

#### Returns

`Promise`\<`string` \| `null`\>

Extracted token or null if not found

#### Implementation of

`AuthProvider.extractToken`

---

### createSession()

> **createSession**(`user`, `context?`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)\>

Create a new session for an authenticated user

Session duration and metadata are derived from `this.sessionConfig` and
the optional `context`. This matches the `AuthSessionManager` type
signature: `createSession(user, context?)`.

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

##### context?

[`AuthRequestContext`](../type-aliases/AuthRequestContext.md)

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)\>

#### Implementation of

`AuthProvider.createSession`

---

### validateSession()

> **validateSession**(`sessionId`): `Promise`\<[`SessionValidationResult`](../type-aliases/SessionValidationResult.md)\>

Validate an existing session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`SessionValidationResult`](../type-aliases/SessionValidationResult.md)\>

---

### refreshSession()

> **refreshSession**(`sessionId`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)\>

Refresh a session (extend expiration)

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)\>

#### Implementation of

`AuthProvider.refreshSession`

---

### revokeSession()

> **revokeSession**(`sessionId`): `Promise`\<`void`\>

Revoke a session

Marks the session as invalid rather than deleting it immediately.
This keeps a tombstone so that "revoked" is distinguishable from
"not found" during subsequent validation attempts.

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

---

### revokeAllSessions()

> **revokeAllSessions**(`userId`): `Promise`\<`void`\>

Revoke all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

---

### authorize()

> **authorize**(`user`, `options`): `Promise`\<[`AuthorizationResult`](../type-aliases/AuthorizationResult.md)\>

Check if a user is authorized for specific roles/permissions

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

##### options

###### roles?

`string`[]

###### permissions?

`string`[]

###### requireAllRoles?

`boolean`

#### Returns

`Promise`\<[`AuthorizationResult`](../type-aliases/AuthorizationResult.md)\>

---

### isSuperAdmin()

> `protected` **isSuperAdmin**(`user`): `boolean`

Check if user is a super admin

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

#### Returns

`boolean`

---

### getEffectiveRoles()

> `protected` **getEffectiveRoles**(`user`): `Set`\<`string`\>

Get effective roles including inherited roles from hierarchy (transitive)

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

#### Returns

`Set`\<`string`\>

---

### getEffectivePermissions()

> `protected` **getEffectivePermissions**(`user`): `Set`\<`string`\>

Get effective permissions including role-based permissions

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

#### Returns

`Set`\<`string`\>

---

### parseJWT()

> `protected` **parseJWT**(`token`): [`TokenClaims`](../type-aliases/TokenClaims.md) \| `null`

Parse JWT token (without validation)

#### Parameters

##### token

`string`

#### Returns

[`TokenClaims`](../type-aliases/TokenClaims.md) \| `null`

---

### isTokenExpired()

> `protected` **isTokenExpired**(`claims`, `clockTolerance?`): `boolean`

Check if token is expired

#### Parameters

##### claims

[`TokenClaims`](../type-aliases/TokenClaims.md)

##### clockTolerance?

`number` = `0`

#### Returns

`boolean`

---

### isTokenNotYetValid()

> `protected` **isTokenNotYetValid**(`claims`, `clockTolerance?`): `boolean`

Check if token is not yet valid

#### Parameters

##### claims

[`TokenClaims`](../type-aliases/TokenClaims.md)

##### clockTolerance?

`number` = `0`

#### Returns

`boolean`

---

### extractUserFromClaims()

> `protected` **extractUserFromClaims**(`claims`, `options?`): [`AuthUser`](../type-aliases/AuthUser.md)

Extract user from token claims

#### Parameters

##### claims

[`TokenClaims`](../type-aliases/TokenClaims.md)

##### options?

###### rolesClaimKey?

`string`

###### permissionsClaimKey?

`string`

###### idClaimKey?

`string`

#### Returns

[`AuthUser`](../type-aliases/AuthUser.md)

---

### getUser()?

> `optional` **getUser**(`_userId`): `Promise`\<[`AuthUser`](../type-aliases/AuthUser.md) \| `null`\>

Get user by ID
Override in subclass if provider supports user lookup

#### Parameters

##### \_userId

`string`

#### Returns

`Promise`\<[`AuthUser`](../type-aliases/AuthUser.md) \| `null`\>

#### Implementation of

`AuthProvider.getUser`

---

### updateUserRoles()?

> `optional` **updateUserRoles**(`_userId`, `_roles`): `Promise`\<[`AuthUser`](../type-aliases/AuthUser.md)\>

Update user roles
Override in subclass if provider supports role updates.
Returns the user with updated roles.

#### Parameters

##### \_userId

`string`

##### \_roles

`string`[]

#### Returns

`Promise`\<[`AuthUser`](../type-aliases/AuthUser.md)\>

#### Implementation of

`AuthProvider.updateUserRoles`

---

### updateUserPermissions()?

> `optional` **updateUserPermissions**(`_userId`, `_permissions`): `Promise`\<[`AuthUser`](../type-aliases/AuthUser.md)\>

Update user permissions
Override in subclass if provider supports permission updates.
Returns the user with updated permissions.

#### Parameters

##### \_userId

`string`

##### \_permissions

`string`[]

#### Returns

`Promise`\<[`AuthUser`](../type-aliases/AuthUser.md)\>

#### Implementation of

`AuthProvider.updateUserPermissions`

---

### dispose()

> **dispose**(): `Promise`\<`void`\>

Clean up resources

#### Returns

`Promise`\<`void`\>

#### Implementation of

`AuthProvider.dispose`

---

### authorizeUser()

> **authorizeUser**(`user`, `permission`): `Promise`\<[`AuthorizationResult`](../type-aliases/AuthorizationResult.md)\>

Check if a user is authorized to perform an action

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

##### permission

`string`

#### Returns

`Promise`\<[`AuthorizationResult`](../type-aliases/AuthorizationResult.md)\>

#### Implementation of

`AuthProvider.authorizeUser`

---

### authorizeRoles()

> **authorizeRoles**(`user`, `roles`): `Promise`\<[`AuthorizationResult`](../type-aliases/AuthorizationResult.md)\>

Check if user has specific roles

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

##### roles

`string`[]

#### Returns

`Promise`\<[`AuthorizationResult`](../type-aliases/AuthorizationResult.md)\>

#### Implementation of

`AuthProvider.authorizeRoles`

---

### authorizePermissions()

> **authorizePermissions**(`user`, `permissions`): `Promise`\<[`AuthorizationResult`](../type-aliases/AuthorizationResult.md)\>

Check if user has all specified permissions

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

##### permissions

`string`[]

#### Returns

`Promise`\<[`AuthorizationResult`](../type-aliases/AuthorizationResult.md)\>

#### Implementation of

`AuthProvider.authorizePermissions`

---

### getSession()

> **getSession**(`sessionId`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

Get an existing session by ID

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md) \| `null`\>

#### Implementation of

`AuthProvider.getSession`

---

### destroySession()

> **destroySession**(`sessionId`): `Promise`\<`void`\>

Invalidate/destroy a session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`AuthProvider.destroySession`

---

### getUserSessions()

> **getUserSessions**(`userId`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)[]\>

Get all active sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)[]\>

#### Implementation of

`AuthProvider.getUserSessions`

---

### destroyAllUserSessions()

> **destroyAllUserSessions**(`userId`): `Promise`\<`void`\>

Invalidate all sessions for a user (global logout)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

#### Implementation of

`AuthProvider.destroyAllUserSessions`

---

### authenticateRequest()

> **authenticateRequest**(`context`): `Promise`\<[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md) \| `null`\>

Full request authentication flow

Combines token extraction (with full strategy support), validation,
and session creation/reuse.

#### Parameters

##### context

[`AuthRequestContext`](../type-aliases/AuthRequestContext.md)

Request context

#### Returns

`Promise`\<[`AuthenticatedContext`](../type-aliases/AuthenticatedContext.md) \| `null`\>

Authenticated context with user and session, or null

#### Implementation of

`AuthProvider.authenticateRequest`

---

### healthCheck()

> **healthCheck**(): `Promise`\<[`AuthHealthCheck`](../type-aliases/AuthHealthCheck.md)\>

Check provider health

#### Returns

`Promise`\<[`AuthHealthCheck`](../type-aliases/AuthHealthCheck.md)\>

#### Implementation of

`AuthProvider.healthCheck`

---

### on()

> **on**(`event`, `listener`): `void`

Subscribe to auth events

#### Parameters

##### event

`string`

##### listener

(...`args`) => `void`

#### Returns

`void`

---

### off()

> **off**(`event`, `listener`): `void`

Unsubscribe from auth events

#### Parameters

##### event

`string`

##### listener

(...`args`) => `void`

#### Returns

`void`

---

### emit()

> `protected` **emit**(`event`, ...`args`): `void`

Emit an auth event

#### Parameters

##### event

`string`

##### args

...`unknown`[]

#### Returns

`void`
