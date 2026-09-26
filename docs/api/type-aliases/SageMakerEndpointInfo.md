[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerEndpointInfo

# Type Alias: SageMakerEndpointInfo

> **SageMakerEndpointInfo** = `object`

Defined in: [types/providers.ts:1508](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1508)

SageMaker endpoint information and metadata

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1510](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1510)

Endpoint name

---

### endpointArn

> **endpointArn**: `string`

Defined in: [types/providers.ts:1512](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1512)

Endpoint ARN

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1514](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1514)

Associated model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1516](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1516)

EC2 instance type

---

### creationTime

> **creationTime**: `string`

Defined in: [types/providers.ts:1518](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1518)

Endpoint creation timestamp

---

### lastModifiedTime

> **lastModifiedTime**: `string`

Defined in: [types/providers.ts:1520](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1520)

Last modification timestamp

---

### endpointStatus

> **endpointStatus**: `"InService"` \| `"Creating"` \| `"Updating"` \| `"SystemUpdating"` \| `"RollingBack"` \| `"Deleting"` \| `"Failed"`

Defined in: [types/providers.ts:1522](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1522)

Current endpoint status

---

### currentInstanceCount?

> `optional` **currentInstanceCount?**: `number`

Defined in: [types/providers.ts:1531](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1531)

Current instance count

---

### productionVariants?

> `optional` **productionVariants?**: `object`[]

Defined in: [types/providers.ts:1533](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1533)

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
