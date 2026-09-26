[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerEndpointInfo

# Type Alias: SageMakerEndpointInfo

> **SageMakerEndpointInfo** = `object`

SageMaker endpoint information and metadata

## Properties

### endpointName

> **endpointName**: `string`

Endpoint name

---

### endpointArn

> **endpointArn**: `string`

Endpoint ARN

---

### modelName

> **modelName**: `string`

Associated model name

---

### instanceType

> **instanceType**: `string`

EC2 instance type

---

### creationTime

> **creationTime**: `string`

Endpoint creation timestamp

---

### lastModifiedTime

> **lastModifiedTime**: `string`

Last modification timestamp

---

### endpointStatus

> **endpointStatus**: `"InService"` \| `"Creating"` \| `"Updating"` \| `"SystemUpdating"` \| `"RollingBack"` \| `"Deleting"` \| `"Failed"`

Current endpoint status

---

### currentInstanceCount?

> `optional` **currentInstanceCount?**: `number`

Current instance count

---

### productionVariants?

> `optional` **productionVariants?**: `object`[]

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
