[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerEndpointInfo

# Type Alias: SageMakerEndpointInfo

> **SageMakerEndpointInfo** = `object`

Defined in: [types/providers.ts:1435](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1435)

SageMaker endpoint information and metadata

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1437](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1437)

Endpoint name

---

### endpointArn

> **endpointArn**: `string`

Defined in: [types/providers.ts:1439](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1439)

Endpoint ARN

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1441](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1441)

Associated model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1443](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1443)

EC2 instance type

---

### creationTime

> **creationTime**: `string`

Defined in: [types/providers.ts:1445](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1445)

Endpoint creation timestamp

---

### lastModifiedTime

> **lastModifiedTime**: `string`

Defined in: [types/providers.ts:1447](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1447)

Last modification timestamp

---

### endpointStatus

> **endpointStatus**: `"InService"` \| `"Creating"` \| `"Updating"` \| `"SystemUpdating"` \| `"RollingBack"` \| `"Deleting"` \| `"Failed"`

Defined in: [types/providers.ts:1449](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1449)

Current endpoint status

---

### currentInstanceCount?

> `optional` **currentInstanceCount?**: `number`

Defined in: [types/providers.ts:1458](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1458)

Current instance count

---

### productionVariants?

> `optional` **productionVariants?**: `object`[]

Defined in: [types/providers.ts:1460](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1460)

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
