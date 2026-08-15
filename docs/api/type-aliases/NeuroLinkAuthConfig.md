[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NeuroLinkAuthConfig

# Type Alias: NeuroLinkAuthConfig

> **NeuroLinkAuthConfig** = [`AuthProvider`](AuthProvider.md) \| \{ `provider`: [`AuthProvider`](AuthProvider.md); \} \| \{ `type`: `"auth0"`; `config`: [`Auth0Config`](Auth0Config.md); \} \| \{ `type`: `"clerk"`; `config`: [`ClerkConfig`](ClerkConfig.md); \} \| \{ `type`: `"firebase"`; `config`: [`FirebaseConfig`](FirebaseConfig.md); \} \| \{ `type`: `"supabase"`; `config`: [`SupabaseConfig`](SupabaseConfig.md); \} \| \{ `type`: `"workos"`; `config`: [`WorkOSConfig`](WorkOSConfig.md); \} \| \{ `type`: `"better-auth"`; `config`: [`BetterAuthConfig`](BetterAuthConfig.md); \} \| \{ `type`: `"jwt"`; `config`: [`JWTConfig`](JWTConfig.md); \} \| \{ `type`: `"oauth2"`; `config`: [`OAuth2Config`](OAuth2Config.md); \} \| \{ `type`: `"cognito"`; `config`: [`CognitoConfig`](CognitoConfig.md); \} \| \{ `type`: `"keycloak"`; `config`: [`KeycloakConfig`](KeycloakConfig.md); \} \| \{ `type`: [`AuthProviderType`](AuthProviderType.md); `config`: [`AuthProviderConfig`](AuthProviderConfig.md); \}

Defined in: [types/config.ts:268](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/config.ts#L268)

Authentication configuration for NeuroLink SDK
