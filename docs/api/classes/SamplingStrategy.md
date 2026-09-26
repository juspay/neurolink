[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SamplingStrategy

# Class: SamplingStrategy

Sampling strategy for evaluation

## Constructors

### Constructor

> **new SamplingStrategy**(`config?`): `SamplingStrategy`

#### Parameters

##### config?

`Partial`\<[`SamplingConfig`](../type-aliases/SamplingConfig.md)\> = `{}`

#### Returns

`SamplingStrategy`

## Accessors

### config

#### Get Signature

> **get** **config**(): [`SamplingConfig`](../type-aliases/SamplingConfig.md)

Get current sampling configuration

##### Returns

[`SamplingConfig`](../type-aliases/SamplingConfig.md)

---

### currentRate

#### Get Signature

> **get** **currentRate**(): `number`

Get current sampling rate

##### Returns

`number`

## Methods

### shouldSample()

> **shouldSample**(`context?`): [`SamplingDecision`](../type-aliases/SamplingDecision.md)

Decide whether to sample a request

#### Parameters

##### context?

[`SamplingContext`](../type-aliases/SamplingContext.md)

#### Returns

[`SamplingDecision`](../type-aliases/SamplingDecision.md)

---

### recordScore()

> **recordScore**(`score`): `void`

Record a score for adaptive sampling

#### Parameters

##### score

`number`

#### Returns

`void`

---

### reset()

> **reset**(): `void`

Reset sampling state

#### Returns

`void`

---

### configure()

> **configure**(`config`): `void`

Update sampling configuration

#### Parameters

##### config

`Partial`\<[`SamplingConfig`](../type-aliases/SamplingConfig.md)\>

#### Returns

`void`

---

### getStats()

> **getStats**(): `object`

Get sampling statistics

#### Returns

`object`

##### currentRate

> **currentRate**: `number`

##### recentScoresCount

> **recentScoresCount**: `number`

##### averageScore

> **averageScore**: `number` \| `null`
