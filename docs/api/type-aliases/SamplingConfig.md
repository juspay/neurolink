[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SamplingConfig

# Type Alias: SamplingConfig

> **SamplingConfig** = `object`

Defined in: [types/scorer.ts:375](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L375)

Sampling configuration for cost-efficient evaluation

## Properties

### rate

> **rate**: `number`

Defined in: [types/scorer.ts:377](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L377)

Sampling rate (0-1)

---

### alwaysEvaluate?

> `optional` **alwaysEvaluate?**: `object`

Defined in: [types/scorer.ts:379](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L379)

Always evaluate certain conditions

#### errors?

> `optional` **errors?**: `boolean`

Always evaluate errors

#### users?

> `optional` **users?**: `string`[]

Always evaluate for certain users

#### tags?

> `optional` **tags?**: `string`[]

Always evaluate certain tags

---

### adaptive?

> `optional` **adaptive?**: `object`

Defined in: [types/scorer.ts:388](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L388)

Adaptive sampling configuration

#### enabled

> **enabled**: `boolean`

Enable adaptive sampling

#### qualityThreshold

> **qualityThreshold**: `number`

Adjust rate based on quality

#### minRate

> **minRate**: `number`

Minimum sampling rate

#### maxRate

> **maxRate**: `number`

Maximum sampling rate
