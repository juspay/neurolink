[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerEndpointInfo

# Type Alias: SageMakerEndpointInfo

> **SageMakerEndpointInfo** = `object`

Defined in: [types/providers.ts:1470](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1470)

SageMaker endpoint information and metadata

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1472](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1472)

Endpoint name

---

### endpointArn

> **endpointArn**: `string`

Defined in: [types/providers.ts:1474](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1474)

Endpoint ARN

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1476](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1476)

Associated model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1478](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1478)

EC2 instance type

---

### creationTime

> **creationTime**: `string`

Defined in: [types/providers.ts:1480](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1480)

Endpoint creation timestamp

---

### lastModifiedTime

> **lastModifiedTime**: `string`

Defined in: [types/providers.ts:1482](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1482)

Last modification timestamp

---

### endpointStatus

> **endpointStatus**: `"InService"` \| `"Creating"` \| `"Updating"` \| `"SystemUpdating"` \| `"RollingBack"` \| `"Deleting"` \| `"Failed"`

Defined in: [types/providers.ts:1484](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1484)

Current endpoint status

---

### currentInstanceCount?

> `optional` **currentInstanceCount?**: `number`

Defined in: [types/providers.ts:1493](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1493)

Current instance count

---

### productionVariants?

> `optional` **productionVariants?**: `object`[]

Defined in: [types/providers.ts:1495](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1495)

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
