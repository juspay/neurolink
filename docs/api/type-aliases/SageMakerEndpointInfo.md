[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerEndpointInfo

# Type Alias: SageMakerEndpointInfo

> **SageMakerEndpointInfo** = `object`

Defined in: [types/providers.ts:1439](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1439)

SageMaker endpoint information and metadata

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1441](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1441)

Endpoint name

---

### endpointArn

> **endpointArn**: `string`

Defined in: [types/providers.ts:1443](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1443)

Endpoint ARN

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1445](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1445)

Associated model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1447](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1447)

EC2 instance type

---

### creationTime

> **creationTime**: `string`

Defined in: [types/providers.ts:1449](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1449)

Endpoint creation timestamp

---

### lastModifiedTime

> **lastModifiedTime**: `string`

Defined in: [types/providers.ts:1451](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1451)

Last modification timestamp

---

### endpointStatus

> **endpointStatus**: `"InService"` \| `"Creating"` \| `"Updating"` \| `"SystemUpdating"` \| `"RollingBack"` \| `"Deleting"` \| `"Failed"`

Defined in: [types/providers.ts:1453](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1453)

Current endpoint status

---

### currentInstanceCount?

> `optional` **currentInstanceCount?**: `number`

Defined in: [types/providers.ts:1462](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1462)

Current instance count

---

### productionVariants?

> `optional` **productionVariants?**: `object`[]

Defined in: [types/providers.ts:1464](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1464)

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
