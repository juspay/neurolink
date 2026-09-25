[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingConfig

# Type Alias: CloakingConfig

> **CloakingConfig** = `object`

Defined in: [types/subscription.ts:1259](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1259)

Cloaking plugin config

## Properties

### mode

> **mode**: `"auto"` \| `"always"` \| `"never"`

Defined in: [types/subscription.ts:1260](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1260)

---

### plugins

> **plugins**: `object`

Defined in: [types/subscription.ts:1261](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L1261)

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
