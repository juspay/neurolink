[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerEndpointInfo

# Type Alias: SageMakerEndpointInfo

> **SageMakerEndpointInfo** = `object`

Defined in: [types/providers.ts:1520](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1520)

SageMaker endpoint information and metadata

## Properties

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1522](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1522)

Endpoint name

---

### endpointArn

> **endpointArn**: `string`

Defined in: [types/providers.ts:1524](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1524)

Endpoint ARN

---

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1526](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1526)

Associated model name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1528](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1528)

EC2 instance type

---

### creationTime

> **creationTime**: `string`

Defined in: [types/providers.ts:1530](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1530)

Endpoint creation timestamp

---

### lastModifiedTime

> **lastModifiedTime**: `string`

Defined in: [types/providers.ts:1532](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1532)

Last modification timestamp

---

### endpointStatus

> **endpointStatus**: `"InService"` \| `"Creating"` \| `"Updating"` \| `"SystemUpdating"` \| `"RollingBack"` \| `"Deleting"` \| `"Failed"`

Defined in: [types/providers.ts:1534](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1534)

Current endpoint status

---

### currentInstanceCount?

> `optional` **currentInstanceCount?**: `number`

Defined in: [types/providers.ts:1543](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1543)

Current instance count

---

### productionVariants?

> `optional` **productionVariants?**: `object`[]

Defined in: [types/providers.ts:1545](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1545)

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
