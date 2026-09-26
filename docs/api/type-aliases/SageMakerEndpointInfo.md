[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerEndpointInfo

# Type Alias: SageMakerEndpointInfo

> **SageMakerEndpointInfo** = `object`

Defined in: [types/providers.ts:1527](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1527)

SageMaker endpoint information and metadata

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1529](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1529)

Endpoint name

---

### endpointArn

> **endpointArn**: `string`

Defined in: [types/providers.ts:1531](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1531)

Endpoint ARN

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1533](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1533)

Associated model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1535](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1535)

EC2 instance type

---

### creationTime

> **creationTime**: `string`

Defined in: [types/providers.ts:1537](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1537)

Endpoint creation timestamp

---

### lastModifiedTime

> **lastModifiedTime**: `string`

Defined in: [types/providers.ts:1539](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1539)

Last modification timestamp

---

### endpointStatus

> **endpointStatus**: `"InService"` \| `"Creating"` \| `"Updating"` \| `"SystemUpdating"` \| `"RollingBack"` \| `"Deleting"` \| `"Failed"`

Defined in: [types/providers.ts:1541](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1541)

Current endpoint status

---

### currentInstanceCount?

> `optional` **currentInstanceCount?**: `number`

Defined in: [types/providers.ts:1550](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1550)

Current instance count

---

### productionVariants?

> `optional` **productionVariants?**: `object`[]

Defined in: [types/providers.ts:1552](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1552)

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
