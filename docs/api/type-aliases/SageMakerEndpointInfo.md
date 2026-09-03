[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerEndpointInfo

# Type Alias: SageMakerEndpointInfo

> **SageMakerEndpointInfo** = `object`

Defined in: [types/providers.ts:1457](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1457)

SageMaker endpoint information and metadata

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1459](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1459)

Endpoint name

---

### endpointArn

> **endpointArn**: `string`

Defined in: [types/providers.ts:1461](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1461)

Endpoint ARN

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1463](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1463)

Associated model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1465](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1465)

EC2 instance type

---

### creationTime

> **creationTime**: `string`

Defined in: [types/providers.ts:1467](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1467)

Endpoint creation timestamp

---

### lastModifiedTime

> **lastModifiedTime**: `string`

Defined in: [types/providers.ts:1469](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1469)

Last modification timestamp

---

### endpointStatus

> **endpointStatus**: `"InService"` \| `"Creating"` \| `"Updating"` \| `"SystemUpdating"` \| `"RollingBack"` \| `"Deleting"` \| `"Failed"`

Defined in: [types/providers.ts:1471](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1471)

Current endpoint status

---

### currentInstanceCount?

> `optional` **currentInstanceCount?**: `number`

Defined in: [types/providers.ts:1480](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1480)

Current instance count

---

### productionVariants?

> `optional` **productionVariants?**: `object`[]

Defined in: [types/providers.ts:1482](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1482)

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
