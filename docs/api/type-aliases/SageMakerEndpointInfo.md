[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerEndpointInfo

# Type Alias: SageMakerEndpointInfo

> **SageMakerEndpointInfo** = `object`

Defined in: [types/providers.ts:1436](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1436)

SageMaker endpoint information and metadata

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1438](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1438)

Endpoint name

---

### endpointArn

> **endpointArn**: `string`

Defined in: [types/providers.ts:1440](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1440)

Endpoint ARN

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1442](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1442)

Associated model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1444](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1444)

EC2 instance type

---

### creationTime

> **creationTime**: `string`

Defined in: [types/providers.ts:1446](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1446)

Endpoint creation timestamp

---

### lastModifiedTime

> **lastModifiedTime**: `string`

Defined in: [types/providers.ts:1448](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1448)

Last modification timestamp

---

### endpointStatus

> **endpointStatus**: `"InService"` \| `"Creating"` \| `"Updating"` \| `"SystemUpdating"` \| `"RollingBack"` \| `"Deleting"` \| `"Failed"`

Defined in: [types/providers.ts:1450](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1450)

Current endpoint status

---

### currentInstanceCount?

> `optional` **currentInstanceCount?**: `number`

Defined in: [types/providers.ts:1459](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1459)

Current instance count

---

### productionVariants?

> `optional` **productionVariants?**: `object`[]

Defined in: [types/providers.ts:1461](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1461)

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
