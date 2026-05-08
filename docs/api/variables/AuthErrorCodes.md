[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthErrorCodes

# Variable: AuthErrorCodes

> `const` **AuthErrorCodes**: `object`

Defined in: [auth/errors.ts:5](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/auth/errors.ts#L5)

## Type Declaration

### INVALID_TOKEN

> `readonly` **INVALID_TOKEN**: `"AUTH-001"` = `"AUTH-001"`

### EXPIRED_TOKEN

> `readonly` **EXPIRED_TOKEN**: `"AUTH-002"` = `"AUTH-002"`

### MISSING_TOKEN

> `readonly` **MISSING_TOKEN**: `"AUTH-003"` = `"AUTH-003"`

### TOKEN_DECODE_FAILED

> `readonly` **TOKEN_DECODE_FAILED**: `"AUTH-004"` = `"AUTH-004"`

### INVALID_SIGNATURE

> `readonly` **INVALID_SIGNATURE**: `"AUTH-005"` = `"AUTH-005"`

### SESSION_NOT_FOUND

> `readonly` **SESSION_NOT_FOUND**: `"AUTH-010"` = `"AUTH-010"`

### SESSION_EXPIRED

> `readonly` **SESSION_EXPIRED**: `"AUTH-011"` = `"AUTH-011"`

### SESSION_REVOKED

> `readonly` **SESSION_REVOKED**: `"AUTH-012"` = `"AUTH-012"`

### INSUFFICIENT_PERMISSIONS

> `readonly` **INSUFFICIENT_PERMISSIONS**: `"AUTH-020"` = `"AUTH-020"`

### INSUFFICIENT_ROLES

> `readonly` **INSUFFICIENT_ROLES**: `"AUTH-021"` = `"AUTH-021"`

### ACCESS_DENIED

> `readonly` **ACCESS_DENIED**: `"AUTH-022"` = `"AUTH-022"`

### USER_NOT_FOUND

> `readonly` **USER_NOT_FOUND**: `"AUTH-030"` = `"AUTH-030"`

### USER_DISABLED

> `readonly` **USER_DISABLED**: `"AUTH-031"` = `"AUTH-031"`

### EMAIL_NOT_VERIFIED

> `readonly` **EMAIL_NOT_VERIFIED**: `"AUTH-032"` = `"AUTH-032"`

### MFA_REQUIRED

> `readonly` **MFA_REQUIRED**: `"AUTH-033"` = `"AUTH-033"`

### PROVIDER_ERROR

> `readonly` **PROVIDER_ERROR**: `"AUTH-040"` = `"AUTH-040"`

### PROVIDER_NOT_FOUND

> `readonly` **PROVIDER_NOT_FOUND**: `"AUTH-041"` = `"AUTH-041"`

### PROVIDER_INIT_FAILED

> `readonly` **PROVIDER_INIT_FAILED**: `"AUTH-042"` = `"AUTH-042"`

### CONFIGURATION_ERROR

> `readonly` **CONFIGURATION_ERROR**: `"AUTH-043"` = `"AUTH-043"`

### CREATION_FAILED

> `readonly` **CREATION_FAILED**: `"AUTH-050"` = `"AUTH-050"`

### REGISTRATION_FAILED

> `readonly` **REGISTRATION_FAILED**: `"AUTH-051"` = `"AUTH-051"`

### DUPLICATE_REGISTRATION

> `readonly` **DUPLICATE_REGISTRATION**: `"AUTH-052"` = `"AUTH-052"`

### MIDDLEWARE_ERROR

> `readonly` **MIDDLEWARE_ERROR**: `"AUTH-060"` = `"AUTH-060"`

### RATE_LIMITED

> `readonly` **RATE_LIMITED**: `"AUTH-061"` = `"AUTH-061"`

### JWKS_FETCH_FAILED

> `readonly` **JWKS_FETCH_FAILED**: `"AUTH-070"` = `"AUTH-070"`

### JWKS_KEY_NOT_FOUND

> `readonly` **JWKS_KEY_NOT_FOUND**: `"AUTH-071"` = `"AUTH-071"`
