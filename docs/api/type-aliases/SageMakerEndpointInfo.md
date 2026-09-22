[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerEndpointInfo

# Type Alias: SageMakerEndpointInfo

> **SageMakerEndpointInfo** = `object`

Defined in: [types/providers.ts:1505](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1505)

SageMaker endpoint information and metadata

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1507](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1507)

Endpoint name

---

### endpointArn

> **endpointArn**: `string`

Defined in: [types/providers.ts:1509](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1509)

Endpoint ARN

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1511](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1511)

Associated model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1513](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1513)

EC2 instance type

---

### creationTime

> **creationTime**: `string`

Defined in: [types/providers.ts:1515](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1515)

Endpoint creation timestamp

---

### lastModifiedTime

> **lastModifiedTime**: `string`

Defined in: [types/providers.ts:1517](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1517)

Last modification timestamp

---

### endpointStatus

> **endpointStatus**: `"InService"` \| `"Creating"` \| `"Updating"` \| `"SystemUpdating"` \| `"RollingBack"` \| `"Deleting"` \| `"Failed"`

Defined in: [types/providers.ts:1519](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1519)

Current endpoint status

---

### currentInstanceCount?

> `optional` **currentInstanceCount?**: `number`

Defined in: [types/providers.ts:1528](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1528)

Current instance count

---

### productionVariants?

> `optional` **productionVariants?**: `object`[]

Defined in: [types/providers.ts:1530](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1530)

Variant weights for A/B testing

#### variantName

> **variantName**: `string`

#### modelName

> **modelName**: `string`

#### initialInstanceCount

> **initialInstanceCount**: `number`

#### instanceType

> **instanceType**: `string`

#### currentWeight?

> `optional` **currentWeight?**: `number`
