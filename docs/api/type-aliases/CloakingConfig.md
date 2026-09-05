[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingConfig

# Type Alias: CloakingConfig

> **CloakingConfig** = `object`

Defined in: [types/subscription.ts:1247](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1247)

Cloaking plugin config

## Properties

### mode

> **mode**: `"auto"` \| `"always"` \| `"never"`

Defined in: [types/subscription.ts:1248](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1248)

---

### plugins

> **plugins**: `object`

Defined in: [types/subscription.ts:1249](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1249)

#### headerScrubber?

> `optional` **headerScrubber?**: `boolean`

#### sessionIdentity?

> `optional` **sessionIdentity?**: `boolean`

#### systemPromptInjector?

> `optional` **systemPromptInjector?**: `boolean`

#### wordObfuscator?

> `optional` **wordObfuscator?**: `object`

##### wordObfuscator.enabled

> **enabled**: `boolean`

##### wordObfuscator.words

> **words**: `string`[]

#### tlsFingerprint?

> `optional` **tlsFingerprint?**: `object`

##### tlsFingerprint.enabled

> **enabled**: `boolean`
