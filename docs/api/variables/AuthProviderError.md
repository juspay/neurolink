[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProviderError

# ~~Variable: AuthProviderError~~

> `const` **AuthProviderError**: `object` = `AuthError`

Defined in: [auth/providers/BaseAuthProvider.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/providers/BaseAuthProvider.ts#L44)

## Type Declaration

### ~~codes~~

> **codes**: `object`

#### codes.INVALID_TOKEN

> `readonly` **INVALID_TOKEN**: `"AUTH-001"` = `"AUTH-001"`

#### codes.EXPIRED_TOKEN

> `readonly` **EXPIRED_TOKEN**: `"AUTH-002"` = `"AUTH-002"`

#### codes.MISSING_TOKEN

> `readonly` **MISSING_TOKEN**: `"AUTH-003"` = `"AUTH-003"`

#### codes.TOKEN_DECODE_FAILED

> `readonly` **TOKEN_DECODE_FAILED**: `"AUTH-004"` = `"AUTH-004"`

#### codes.INVALID_SIGNATURE

> `readonly` **INVALID_SIGNATURE**: `"AUTH-005"` = `"AUTH-005"`

#### codes.SESSION_NOT_FOUND

> `readonly` **SESSION_NOT_FOUND**: `"AUTH-010"` = `"AUTH-010"`

#### codes.SESSION_EXPIRED

> `readonly` **SESSION_EXPIRED**: `"AUTH-011"` = `"AUTH-011"`

#### codes.SESSION_REVOKED

> `readonly` **SESSION_REVOKED**: `"AUTH-012"` = `"AUTH-012"`

#### codes.INSUFFICIENT_PERMISSIONS

> `readonly` **INSUFFICIENT_PERMISSIONS**: `"AUTH-020"` = `"AUTH-020"`

#### codes.INSUFFICIENT_ROLES

> `readonly` **INSUFFICIENT_ROLES**: `"AUTH-021"` = `"AUTH-021"`

#### codes.ACCESS_DENIED

> `readonly` **ACCESS_DENIED**: `"AUTH-022"` = `"AUTH-022"`

#### codes.USER_NOT_FOUND

> `readonly` **USER_NOT_FOUND**: `"AUTH-030"` = `"AUTH-030"`

#### codes.USER_DISABLED

> `readonly` **USER_DISABLED**: `"AUTH-031"` = `"AUTH-031"`

#### codes.EMAIL_NOT_VERIFIED

> `readonly` **EMAIL_NOT_VERIFIED**: `"AUTH-032"` = `"AUTH-032"`

#### codes.MFA_REQUIRED

> `readonly` **MFA_REQUIRED**: `"AUTH-033"` = `"AUTH-033"`

#### codes.PROVIDER_ERROR

> `readonly` **PROVIDER_ERROR**: `"AUTH-040"` = `"AUTH-040"`

#### codes.PROVIDER_NOT_FOUND

> `readonly` **PROVIDER_NOT_FOUND**: `"AUTH-041"` = `"AUTH-041"`

#### codes.PROVIDER_INIT_FAILED

> `readonly` **PROVIDER_INIT_FAILED**: `"AUTH-042"` = `"AUTH-042"`

#### codes.CONFIGURATION_ERROR

> `readonly` **CONFIGURATION_ERROR**: `"AUTH-043"` = `"AUTH-043"`

#### codes.CREATION_FAILED

> `readonly` **CREATION_FAILED**: `"AUTH-050"` = `"AUTH-050"`

#### codes.REGISTRATION_FAILED

> `readonly` **REGISTRATION_FAILED**: `"AUTH-051"` = `"AUTH-051"`

#### codes.DUPLICATE_REGISTRATION

> `readonly` **DUPLICATE_REGISTRATION**: `"AUTH-052"` = `"AUTH-052"`

#### codes.MIDDLEWARE_ERROR

> `readonly` **MIDDLEWARE_ERROR**: `"AUTH-060"` = `"AUTH-060"`

#### codes.RATE_LIMITED

> `readonly` **RATE_LIMITED**: `"AUTH-061"` = `"AUTH-061"`

#### codes.JWKS_FETCH_FAILED

> `readonly` **JWKS_FETCH_FAILED**: `"AUTH-070"` = `"AUTH-070"`

#### codes.JWKS_KEY_NOT_FOUND

> `readonly` **JWKS_KEY_NOT_FOUND**: `"AUTH-071"` = `"AUTH-071"`

### ~~create~~

> **create**: (`code`, `message`, `options?`) => [`NeuroLinkFeatureError`](../classes/NeuroLinkFeatureError.md)

#### Parameters

##### code

`"SESSION_NOT_FOUND"` \| `"CONFIGURATION_ERROR"` \| `"RATE_LIMITED"` \| `"PROVIDER_ERROR"` \| `"MIDDLEWARE_ERROR"` \| `"INVALID_TOKEN"` \| `"EXPIRED_TOKEN"` \| `"MISSING_TOKEN"` \| `"TOKEN_DECODE_FAILED"` \| `"INVALID_SIGNATURE"` \| `"SESSION_EXPIRED"` \| `"SESSION_REVOKED"` \| `"INSUFFICIENT_PERMISSIONS"` \| `"INSUFFICIENT_ROLES"` \| `"ACCESS_DENIED"` \| `"USER_NOT_FOUND"` \| `"USER_DISABLED"` \| `"EMAIL_NOT_VERIFIED"` \| `"MFA_REQUIRED"` \| `"PROVIDER_NOT_FOUND"` \| `"PROVIDER_INIT_FAILED"` \| `"CREATION_FAILED"` \| `"REGISTRATION_FAILED"` \| `"DUPLICATE_REGISTRATION"` \| `"JWKS_FETCH_FAILED"` \| `"JWKS_KEY_NOT_FOUND"`

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

## Deprecated

Use `AuthError` from `../errors.js` instead.
Kept for backward compatibility with CognitoProvider / KeycloakProvider.
