[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProvider

# Type Alias: AuthProvider

> **AuthProvider** = [`AuthTokenValidator`](AuthTokenValidator.md) & [`AuthUserAuthorizer`](AuthUserAuthorizer.md) & [`AuthSessionManager`](AuthSessionManager.md) & [`AuthRequestHandler`](AuthRequestHandler.md) & [`AuthUserManager`](AuthUserManager.md) & [`AuthLifecycle`](AuthLifecycle.md) & `object`

Defined in: [types/auth.ts:1207](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L1207)

Base interface for all authentication providers.

Composed from focused sub-types so consumers can depend on only the
slice they need (e.g. `AuthTokenValidator` for token-only middleware).

Unified auth provider interface covering:

- Token validation (AuthTokenValidator)
- User authorization (AuthUserAuthorizer)
- Session management (AuthSessionManager)
- Request context (AuthRequestHandler)
- User management (AuthUserManager)
- Lifecycle (AuthLifecycle)

## Type Declaration

### type

> `readonly` **type**: [`AuthProviderType`](AuthProviderType.md)

Provider type identifier

### config

> `readonly` **config**: [`AuthProviderConfig`](AuthProviderConfig.md)

Provider configuration
