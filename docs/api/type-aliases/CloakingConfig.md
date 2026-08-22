[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CloakingConfig

# Type Alias: CloakingConfig

> **CloakingConfig** = `object`

Defined in: [types/subscription.ts:1244](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1244)

Cloaking plugin config

## Properties

### mode

> **mode**: `"auto"` \| `"always"` \| `"never"`

Defined in: [types/subscription.ts:1245](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1245)

---

### plugins

> **plugins**: `object`

Defined in: [types/subscription.ts:1246](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L1246)

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
