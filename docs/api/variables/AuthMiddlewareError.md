[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthMiddlewareError

# Variable: AuthMiddlewareError

> `const` **AuthMiddlewareError**: `object`

Defined in: [auth/middleware/AuthMiddleware.ts:51](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/auth/middleware/AuthMiddleware.ts#L51)

Auth middleware error factory

## Type Declaration

### codes

> **codes**: `object`

#### codes.MISSING_TOKEN

> `readonly` **MISSING_TOKEN**: `"AUTH_MIDDLEWARE-001"` = `"AUTH_MIDDLEWARE-001"`

#### codes.INVALID_TOKEN

> `readonly` **INVALID_TOKEN**: `"AUTH_MIDDLEWARE-002"` = `"AUTH_MIDDLEWARE-002"`

#### codes.UNAUTHORIZED

> `readonly` **UNAUTHORIZED**: `"AUTH_MIDDLEWARE-003"` = `"AUTH_MIDDLEWARE-003"`

#### codes.FORBIDDEN

> `readonly` **FORBIDDEN**: `"AUTH_MIDDLEWARE-004"` = `"AUTH_MIDDLEWARE-004"`

#### codes.PROVIDER_ERROR

> `readonly` **PROVIDER_ERROR**: `"AUTH_MIDDLEWARE-005"` = `"AUTH_MIDDLEWARE-005"`

#### codes.CONFIGURATION_ERROR

> `readonly` **CONFIGURATION_ERROR**: `"AUTH_MIDDLEWARE-006"` = `"AUTH_MIDDLEWARE-006"`

### create

> **create**: (`code`, `message`, `options?`) => [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

#### Parameters

##### code

`"CONFIGURATION_ERROR"` \| `"UNAUTHORIZED"` \| `"FORBIDDEN"` \| `"PROVIDER_ERROR"` \| `"INVALID_TOKEN"` \| `"MISSING_TOKEN"`

##### message

`string`

##### options?

###### retryable?

`boolean`

###### details?

`Record`\<`string`, `unknown`\>

###### cause?

`Error`

#### Returns

[`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)
