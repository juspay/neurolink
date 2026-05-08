[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingConfig

# Type Alias: CloakingConfig

> **CloakingConfig** = `object`

Defined in: [types/subscription.ts:1123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1123)

Cloaking plugin config

## Properties

### mode

> **mode**: `"auto"` \| `"always"` \| `"never"`

Defined in: [types/subscription.ts:1124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1124)

---

### plugins

> **plugins**: `object`

Defined in: [types/subscription.ts:1125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L1125)

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
