[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerEndpointInfo

# Type Alias: SageMakerEndpointInfo

> **SageMakerEndpointInfo** = `object`

Defined in: [types/providers.ts:1500](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1500)

SageMaker endpoint information and metadata

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1502](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1502)

Endpoint name

---

### endpointArn

> **endpointArn**: `string`

Defined in: [types/providers.ts:1504](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1504)

Endpoint ARN

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1506](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1506)

Associated model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1508](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1508)

EC2 instance type

---

### creationTime

> **creationTime**: `string`

Defined in: [types/providers.ts:1510](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1510)

Endpoint creation timestamp

---

### lastModifiedTime

> **lastModifiedTime**: `string`

Defined in: [types/providers.ts:1512](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1512)

Last modification timestamp

---

### endpointStatus

> **endpointStatus**: `"InService"` \| `"Creating"` \| `"Updating"` \| `"SystemUpdating"` \| `"RollingBack"` \| `"Deleting"` \| `"Failed"`

Defined in: [types/providers.ts:1514](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1514)

Current endpoint status

---

### currentInstanceCount?

> `optional` **currentInstanceCount?**: `number`

Defined in: [types/providers.ts:1523](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1523)

Current instance count

---

### productionVariants?

> `optional` **productionVariants?**: `object`[]

Defined in: [types/providers.ts:1525](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1525)

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
