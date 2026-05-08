[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BaseAuthProvider

# Abstract Class: BaseAuthProvider

Defined in: [auth/providers/BaseAuthProvider.ts:175](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L175)

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

Defined in: [auth/providers/BaseAuthProvider.ts:184](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L184)

#### Parameters

##### config

[`AuthProviderConfig`](../type-aliases/AuthProviderConfig.md)

#### Returns

`BaseAuthProvider`

## Properties

### type

> `abstract` `readonly` **type**: [`AuthProviderType`](../type-aliases/AuthProviderType.md)

Defined in: [auth/providers/BaseAuthProvider.ts:176](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L176)

Provider type identifier

#### Implementation of

`AuthProvider.type`

---

### config

> `readonly` **config**: [`AuthProviderConfig`](../type-aliases/AuthProviderConfig.md)

Defined in: [auth/providers/BaseAuthProvider.ts:177](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L177)

Provider configuration

#### Implementation of

`AuthProvider.config`

---

### sessionStorage

> `protected` **sessionStorage**: [`SessionStorage`](../type-aliases/SessionStorage.md)

Defined in: [auth/providers/BaseAuthProvider.ts:179](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L179)

---

### sessionConfig

> `protected` **sessionConfig**: [`SessionConfig`](../type-aliases/SessionConfig.md)

Defined in: [auth/providers/BaseAuthProvider.ts:180](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L180)

---

### rbacConfig

> `protected` **rbacConfig**: [`RBACConfig`](../type-aliases/RBACConfig.md)

Defined in: [auth/providers/BaseAuthProvider.ts:181](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L181)

---

### emitter

> `protected` **emitter**: `EventEmitter`\<`any`\>

Defined in: [auth/providers/BaseAuthProvider.ts:182](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L182)

## Methods

### authenticateToken()

> `abstract` **authenticateToken**(`token`, `context?`): `Promise`\<[`TokenValidationResult`](../type-aliases/TokenValidationResult.md)\>

Defined in: [auth/providers/BaseAuthProvider.ts:236](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L236)

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

Defined in: [auth/providers/BaseAuthProvider.ts:257](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L257)

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

Defined in: [auth/providers/BaseAuthProvider.ts:325](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L325)

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

Defined in: [auth/providers/BaseAuthProvider.ts:372](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L372)

Validate an existing session

#### Parameters

##### sessionId

`string`

#### Returns

`Promise`\<[`SessionValidationResult`](../type-aliases/SessionValidationResult.md)\>

---

### refreshSession()

> **refreshSession**(`sessionId`): `Promise`\<[`AuthSession`](../type-aliases/AuthSession.md)\>

Defined in: [auth/providers/BaseAuthProvider.ts:433](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L433)

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

Defined in: [auth/providers/BaseAuthProvider.ts:481](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L481)

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

Defined in: [auth/providers/BaseAuthProvider.ts:495](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L495)

Revoke all sessions for a user

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

---

### authorize()

> **authorize**(`user`, `options`): `Promise`\<[`AuthorizationResult`](../type-aliases/AuthorizationResult.md)\>

Defined in: [auth/providers/BaseAuthProvider.ts:507](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L507)

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

Defined in: [auth/providers/BaseAuthProvider.ts:579](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L579)

Check if user is a super admin

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

#### Returns

`boolean`

---

### getEffectiveRoles()

> `protected` **getEffectiveRoles**(`user`): `Set`\<`string`\>

Defined in: [auth/providers/BaseAuthProvider.ts:587](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L587)

Get effective roles including inherited roles from hierarchy (transitive)

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

#### Returns

`Set`\<`string`\>

---

### getEffectivePermissions()

> `protected` **getEffectivePermissions**(`user`): `Set`\<`string`\>

Defined in: [auth/providers/BaseAuthProvider.ts:612](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L612)

Get effective permissions including role-based permissions

#### Parameters

##### user

[`AuthUser`](../type-aliases/AuthUser.md)

#### Returns

`Set`\<`string`\>

---

### parseJWT()

> `protected` **parseJWT**(`token`): [`TokenClaims`](../type-aliases/TokenClaims.md) \| `null`

Defined in: [auth/providers/BaseAuthProvider.ts:658](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L658)

Parse JWT token (without validation)

#### Parameters

##### token

`string`

#### Returns

[`TokenClaims`](../type-aliases/TokenClaims.md) \| `null`

---

### isTokenExpired()

> `protected` **isTokenExpired**(`claims`, `clockTolerance?`): `boolean`

Defined in: [auth/providers/BaseAuthProvider.ts:676](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L676)

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

Defined in: [auth/providers/BaseAuthProvider.ts:688](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L688)

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

Defined in: [auth/providers/BaseAuthProvider.ts:703](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L703)

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

Defined in: [auth/providers/BaseAuthProvider.ts:743](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L743)

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

Defined in: [auth/providers/BaseAuthProvider.ts:753](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L753)

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

Defined in: [auth/providers/BaseAuthProvider.ts:765](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L765)

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

Defined in: [auth/providers/BaseAuthProvider.ts:778](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L778)

Clean up resources

#### Returns

`Promise`\<`void`\>

#### Implementation of

`AuthProvider.dispose`

---

### authorizeUser()

> **authorizeUser**(`user`, `permission`): `Promise`\<[`AuthorizationResult`](../type-aliases/AuthorizationResult.md)\>

Defined in: [auth/providers/BaseAuthProvider.ts:790](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L790)

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

Defined in: [auth/providers/BaseAuthProvider.ts:800](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L800)

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

Defined in: [auth/providers/BaseAuthProvider.ts:810](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L810)

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

Defined in: [auth/providers/BaseAuthProvider.ts:820](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L820)

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

Defined in: [auth/providers/BaseAuthProvider.ts:827](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L827)

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

Defined in: [auth/providers/BaseAuthProvider.ts:834](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L834)

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

Defined in: [auth/providers/BaseAuthProvider.ts:841](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L841)

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

Defined in: [auth/providers/BaseAuthProvider.ts:854](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L854)

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

Defined in: [auth/providers/BaseAuthProvider.ts:901](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L901)

Check provider health

#### Returns

`Promise`\<[`AuthHealthCheck`](../type-aliases/AuthHealthCheck.md)\>

#### Implementation of

`AuthProvider.healthCheck`

---

### on()

> **on**(`event`, `listener`): `void`

Defined in: [auth/providers/BaseAuthProvider.ts:916](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L916)

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

Defined in: [auth/providers/BaseAuthProvider.ts:923](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L923)

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

Defined in: [auth/providers/BaseAuthProvider.ts:930](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L930)

Emit an auth event

#### Parameters

##### event

`string`

##### args

...`unknown`[]

#### Returns

`void`
