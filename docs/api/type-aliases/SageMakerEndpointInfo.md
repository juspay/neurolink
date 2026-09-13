[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerEndpointInfo

# Type Alias: SageMakerEndpointInfo

> **SageMakerEndpointInfo** = `object`

Defined in: [types/providers.ts:1444](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1444)

SageMaker endpoint information and metadata

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1446](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1446)

Endpoint name

---

### endpointArn

> **endpointArn**: `string`

Defined in: [types/providers.ts:1448](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1448)

Endpoint ARN

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1450](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1450)

Associated model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1452](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1452)

EC2 instance type

---

### creationTime

> **creationTime**: `string`

Defined in: [types/providers.ts:1454](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1454)

Endpoint creation timestamp

---

### lastModifiedTime

> **lastModifiedTime**: `string`

Defined in: [types/providers.ts:1456](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1456)

Last modification timestamp

---

### endpointStatus

> **endpointStatus**: `"InService"` \| `"Creating"` \| `"Updating"` \| `"SystemUpdating"` \| `"RollingBack"` \| `"Deleting"` \| `"Failed"`

Defined in: [types/providers.ts:1458](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1458)

Current endpoint status

---

### currentInstanceCount?

> `optional` **currentInstanceCount?**: `number`

Defined in: [types/providers.ts:1467](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1467)

Current instance count

---

### productionVariants?

> `optional` **productionVariants?**: `object`[]

Defined in: [types/providers.ts:1469](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1469)

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
