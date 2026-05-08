[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkAuthConfig

# Type Alias: NeuroLinkAuthConfig

> **NeuroLinkAuthConfig** = [`AuthProvider`](AuthProvider.md) \| \{ `provider`: [`AuthProvider`](AuthProvider.md); \} \| \{ `type`: `"auth0"`; `config`: [`Auth0Config`](Auth0Config.md); \} \| \{ `type`: `"clerk"`; `config`: [`ClerkConfig`](ClerkConfig.md); \} \| \{ `type`: `"firebase"`; `config`: [`FirebaseConfig`](FirebaseConfig.md); \} \| \{ `type`: `"supabase"`; `config`: [`SupabaseConfig`](SupabaseConfig.md); \} \| \{ `type`: `"workos"`; `config`: [`WorkOSConfig`](WorkOSConfig.md); \} \| \{ `type`: `"better-auth"`; `config`: [`BetterAuthConfig`](BetterAuthConfig.md); \} \| \{ `type`: `"jwt"`; `config`: [`JWTConfig`](JWTConfig.md); \} \| \{ `type`: `"oauth2"`; `config`: [`OAuth2Config`](OAuth2Config.md); \} \| \{ `type`: `"cognito"`; `config`: [`CognitoConfig`](CognitoConfig.md); \} \| \{ `type`: `"keycloak"`; `config`: [`KeycloakConfig`](KeycloakConfig.md); \} \| \{ `type`: [`AuthProviderType`](AuthProviderType.md); `config`: [`AuthProviderConfig`](AuthProviderConfig.md); \}

Defined in: [types/config.ts:178](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L178)

Authentication configuration for NeuroLink SDK
