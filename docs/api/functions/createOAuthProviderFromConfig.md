[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createOAuthProviderFromConfig

# Function: createOAuthProviderFromConfig()

> **createOAuthProviderFromConfig**(`authConfig`, `storage?`): [`NeuroLinkOAuthProvider`](../classes/NeuroLinkOAuthProvider.md)

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
