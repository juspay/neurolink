[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / isAnthropicConfig

# Function: isAnthropicConfig()

> **isAnthropicConfig**(`config`): `config is AnthropicProviderConfig`

Defined in: [types/providers.ts:498](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L498)

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
