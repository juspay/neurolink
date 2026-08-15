[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isAnthropicConfig

# Function: isAnthropicConfig()

> **isAnthropicConfig**(`config`): `config is AnthropicProviderConfig`

Defined in: [types/providers.ts:608](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/providers.ts#L608)

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
