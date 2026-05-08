[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createOAuthProviderFromConfig

# Function: createOAuthProviderFromConfig()

> **createOAuthProviderFromConfig**(`authConfig`, `storage?`): [`NeuroLinkOAuthProvider`](../classes/NeuroLinkOAuthProvider.md)

Defined in: [mcp/auth/oauthClientProvider.ts:426](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/auth/oauthClientProvider.ts#L426)

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
