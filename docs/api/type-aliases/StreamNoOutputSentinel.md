[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamNoOutputSentinel

# Type Alias: StreamNoOutputSentinel

> **StreamNoOutputSentinel** = `object`

Curator P3-6: shape of the sentinel chunk yielded by every provider's
stream-transformation generator when AI SDK throws
`NoOutputGeneratedError`. Built by `buildNoOutputSentinel` in
`src/lib/utils/noOutputSentinel.ts`.

## Properties

### content

> **content**: `""`

---

### metadata

> **metadata**: `object`

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
