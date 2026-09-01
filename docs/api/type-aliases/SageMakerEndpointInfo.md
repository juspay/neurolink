[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerEndpointInfo

# Type Alias: SageMakerEndpointInfo

> **SageMakerEndpointInfo** = `object`

Defined in: [types/providers.ts:1464](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1464)

SageMaker endpoint information and metadata

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1466](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1466)

Endpoint name

---

### endpointArn

> **endpointArn**: `string`

Defined in: [types/providers.ts:1468](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1468)

Endpoint ARN

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1470](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1470)

Associated model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1472](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1472)

EC2 instance type

---

### creationTime

> **creationTime**: `string`

Defined in: [types/providers.ts:1474](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1474)

Endpoint creation timestamp

---

### lastModifiedTime

> **lastModifiedTime**: `string`

Defined in: [types/providers.ts:1476](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1476)

Last modification timestamp

---

### endpointStatus

> **endpointStatus**: `"InService"` \| `"Creating"` \| `"Updating"` \| `"SystemUpdating"` \| `"RollingBack"` \| `"Deleting"` \| `"Failed"`

Defined in: [types/providers.ts:1478](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1478)

Current endpoint status

---

### currentInstanceCount?

> `optional` **currentInstanceCount?**: `number`

Defined in: [types/providers.ts:1487](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1487)

Current instance count

---

### productionVariants?

> `optional` **productionVariants?**: `object`[]

Defined in: [types/providers.ts:1489](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1489)

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
