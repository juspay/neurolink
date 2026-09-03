[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / isAnthropicConfig

# Function: isAnthropicConfig()

> **isAnthropicConfig**(`config`): `config is AnthropicProviderConfig`

Defined in: [types/providers.ts:618](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L618)

Type guard to check if a configuration is an AnthropicProviderConfig

## Parameters

### config

`unknown`

The configuration object to check

## Returns

`config is AnthropicProviderConfig`

True if the configuration is an AnthropicProviderConfig

## Example

```typescript
const config = getProviderConfig();
if (isAnthropicConfig(config)) {
  // TypeScript knows config is AnthropicProviderConfig here
  console.log(config.subscriptionTier);
  console.log(config.oauthConfig?.clientId);
}
```
