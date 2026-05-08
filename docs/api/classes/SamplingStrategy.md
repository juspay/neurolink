[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SamplingStrategy

# Class: SamplingStrategy

Defined in: [evaluation/pipeline/strategies/samplingStrategy.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/samplingStrategy.ts#L38)

Sampling strategy for evaluation

## Constructors

### Constructor

> **new SamplingStrategy**(`config?`): `SamplingStrategy`

Defined in: [evaluation/pipeline/strategies/samplingStrategy.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/samplingStrategy.ts#L44)

#### Parameters

##### config?

`Partial`\<[`SamplingConfig`](../type-aliases/SamplingConfig.md)\> = `{}`

#### Returns

`SamplingStrategy`

## Accessors

### config

#### Get Signature

> **get** **config**(): [`SamplingConfig`](../type-aliases/SamplingConfig.md)

Defined in: [evaluation/pipeline/strategies/samplingStrategy.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/samplingStrategy.ts#L78)

Get current sampling configuration

##### Returns

[`SamplingConfig`](../type-aliases/SamplingConfig.md)

---

### currentRate

#### Get Signature

> **get** **currentRate**(): `number`

Defined in: [evaluation/pipeline/strategies/samplingStrategy.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/samplingStrategy.ts#L85)

Get current sampling rate

##### Returns

`number`

## Methods

### shouldSample()

> **shouldSample**(`context?`): [`SamplingDecision`](../type-aliases/SamplingDecision.md)

Defined in: [evaluation/pipeline/strategies/samplingStrategy.ts:92](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/samplingStrategy.ts#L92)

Decide whether to sample a request

#### Parameters

##### context?

[`SamplingContext`](../type-aliases/SamplingContext.md)

#### Returns

[`SamplingDecision`](../type-aliases/SamplingDecision.md)

---

### recordScore()

> **recordScore**(`score`): `void`

Defined in: [evaluation/pipeline/strategies/samplingStrategy.ts:144](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/samplingStrategy.ts#L144)

Record a score for adaptive sampling

#### Parameters

##### score

`number`

#### Returns

`void`

---

### reset()

> **reset**(): `void`

Defined in: [evaluation/pipeline/strategies/samplingStrategy.ts:191](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/samplingStrategy.ts#L191)

Reset sampling state

#### Returns

`void`

---

### configure()

> **configure**(`config`): `void`

Defined in: [evaluation/pipeline/strategies/samplingStrategy.ts:199](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/samplingStrategy.ts#L199)

Update sampling configuration

#### Parameters

##### config

`Partial`\<[`SamplingConfig`](../type-aliases/SamplingConfig.md)\>

#### Returns

`void`

---

### getStats()

> **getStats**(): `object`

Defined in: [evaluation/pipeline/strategies/samplingStrategy.ts:235](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/evaluation/pipeline/strategies/samplingStrategy.ts#L235)

Get sampling statistics

#### Returns

`object`

##### currentRate

> **currentRate**: `number`

##### recentScoresCount

> **recentScoresCount**: `number`

##### averageScore

> **averageScore**: `number` \| `null`
