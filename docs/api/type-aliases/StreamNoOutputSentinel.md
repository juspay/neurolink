[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamNoOutputSentinel

# Type Alias: StreamNoOutputSentinel

> **StreamNoOutputSentinel** = `object`

Defined in: [types/noOutputSentinel.ts:7](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/noOutputSentinel.ts#L7)

Curator P3-6: shape of the sentinel chunk yielded by every provider's
stream-transformation generator when AI SDK throws
`NoOutputGeneratedError`. Built by `buildNoOutputSentinel` in
`src/lib/utils/noOutputSentinel.ts`.

## Properties

### content

> **content**: `""`

Defined in: [types/noOutputSentinel.ts:8](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/noOutputSentinel.ts#L8)

---

### metadata

> **metadata**: `object`

Defined in: [types/noOutputSentinel.ts:9](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/noOutputSentinel.ts#L9)

#### noOutput

> **noOutput**: `true`

#### errorType

> **errorType**: `"NoOutputGeneratedError"`

#### finishReason

> **finishReason**: `unknown`

#### usage

> **usage**: `unknown`

#### providerError

> **providerError**: `string`

#### modelResponseRaw

> **modelResponseRaw**: `string` \| `undefined`
