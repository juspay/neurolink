[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SamplingStrategies

# Variable: SamplingStrategies

> `const` **SamplingStrategies**: `object`

Defined in: [evaluation/pipeline/strategies/samplingStrategy.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/evaluation/pipeline/strategies/samplingStrategy.ts#L266)

Pre-configured sampling strategies

## Type Declaration

### all

> `readonly` **all**: () => [`SamplingStrategy`](../classes/SamplingStrategy.md)

Evaluate everything (default)

#### Returns

[`SamplingStrategy`](../classes/SamplingStrategy.md)

### half

> `readonly` **half**: () => [`SamplingStrategy`](../classes/SamplingStrategy.md)

Evaluate 50% of requests

#### Returns

[`SamplingStrategy`](../classes/SamplingStrategy.md)

### light

> `readonly` **light**: () => [`SamplingStrategy`](../classes/SamplingStrategy.md)

Evaluate 10% of requests

#### Returns

[`SamplingStrategy`](../classes/SamplingStrategy.md)

### adaptive

> `readonly` **adaptive**: () => [`SamplingStrategy`](../classes/SamplingStrategy.md)

Adaptive sampling based on quality

#### Returns

[`SamplingStrategy`](../classes/SamplingStrategy.md)

### errorsOnly

> `readonly` **errorsOnly**: () => [`SamplingStrategy`](../classes/SamplingStrategy.md)

Only evaluate errors and specific conditions

#### Returns

[`SamplingStrategy`](../classes/SamplingStrategy.md)

### vipUsers

> `readonly` **vipUsers**: (`users`) => [`SamplingStrategy`](../classes/SamplingStrategy.md)

VIP users always evaluated

#### Parameters

##### users

`string`[]

#### Returns

[`SamplingStrategy`](../classes/SamplingStrategy.md)
