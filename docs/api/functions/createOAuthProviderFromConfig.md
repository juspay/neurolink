[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createOAuthProviderFromConfig

# Function: createOAuthProviderFromConfig()

> **createOAuthProviderFromConfig**(`authConfig`, `storage?`): [`NeuroLinkOAuthProvider`](../classes/NeuroLinkOAuthProvider.md)

Defined in: [mcp/auth/oauthClientProvider.ts:426](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/auth/oauthClientProvider.ts#L426)

Create an OAuth provider from MCP server auth configuration

## Parameters

### authConfig

#### clientId

`string`

#### clientSecret?

`string`

#### authorizationUrl

`string`

#### tokenUrl

`string`

#### redirectUrl

`string`

#### scope?

`string`

#### usePKCE?

`boolean`

### storage?

[`TokenStorage`](../type-aliases/TokenStorage.md)

## Returns

[`NeuroLinkOAuthProvider`](../classes/NeuroLinkOAuthProvider.md)
