[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthProviderConfig

# Type Alias: AuthProviderConfig

> **AuthProviderConfig** = [`BaseAuthProviderConfig`](BaseAuthProviderConfig.md) & [`Auth0Config`](Auth0Config.md) & `object` \| [`BaseAuthProviderConfig`](BaseAuthProviderConfig.md) & [`ClerkConfig`](ClerkConfig.md) & `object` \| [`BaseAuthProviderConfig`](BaseAuthProviderConfig.md) & [`FirebaseConfig`](FirebaseConfig.md) & `object` \| [`BaseAuthProviderConfig`](BaseAuthProviderConfig.md) & [`SupabaseConfig`](SupabaseConfig.md) & `object` \| [`BaseAuthProviderConfig`](BaseAuthProviderConfig.md) & [`CognitoConfig`](CognitoConfig.md) & `object` \| [`BaseAuthProviderConfig`](BaseAuthProviderConfig.md) & [`KeycloakConfig`](KeycloakConfig.md) & `object` \| [`BaseAuthProviderConfig`](BaseAuthProviderConfig.md) & [`OAuth2Config`](OAuth2Config.md) & `object` \| [`BaseAuthProviderConfig`](BaseAuthProviderConfig.md) & [`JWTConfig`](JWTConfig.md) & `object` \| [`BaseAuthProviderConfig`](BaseAuthProviderConfig.md) & [`BetterAuthConfig`](BetterAuthConfig.md) & `object` \| [`BaseAuthProviderConfig`](BaseAuthProviderConfig.md) & [`WorkOSConfig`](WorkOSConfig.md) & `object` \| [`BaseAuthProviderConfig`](BaseAuthProviderConfig.md) & [`CustomAuthConfig`](CustomAuthConfig.md) & `object` \| [`BaseAuthProviderConfig`](BaseAuthProviderConfig.md)

Defined in: [types/auth.ts:857](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L857)

Configuration for AuthProvider.

Discriminated union of base + each provider-specific config so that
provider factories receive the properly typed config without requiring
`as any` casts or an open index signature.

The `type` discriminant narrows to the correct provider-specific fields.
The final `BaseAuthProviderConfig` branch serves as a generic fallback
for code that only needs the common fields.
