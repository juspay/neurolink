[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SamplingConfig

# Type Alias: SamplingConfig

> **SamplingConfig** = `object`

Sampling configuration for cost-efficient evaluation

## Properties

### rate

> **rate**: `number`

Sampling rate (0-1)

---

### alwaysEvaluate?

> `optional` **alwaysEvaluate?**: `object`

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
