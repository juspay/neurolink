[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDeploymentConfig

# Type Alias: ModelDeploymentConfig

> **ModelDeploymentConfig** = `object`

Defined in: [types/providers.ts:1847](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1847)

Model deployment configuration

## Properties

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1849](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1849)

Model name

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1851](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1851)

Endpoint name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1853](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1853)

EC2 instance type

---

### initialInstanceCount

> **initialInstanceCount**: `number`

Defined in: [types/providers.ts:1855](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1855)

Initial instance count

---

### modelDataUrl

> **modelDataUrl**: `string`

Defined in: [types/providers.ts:1857](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1857)

Model data S3 location

---

### image

> **image**: `string`

Defined in: [types/providers.ts:1859](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1859)

Container image URI

---

### executionRoleArn

> **executionRoleArn**: `string`

Defined in: [types/providers.ts:1861](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1861)

IAM execution role ARN

---

### tags?

> `optional` **tags?**: `Record`\<`string`, `string`\>

Defined in: [types/providers.ts:1863](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1863)

Resource tags

---

### autoScaling?

> `optional` **autoScaling?**: `object`

Defined in: [types/providers.ts:1865](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1865)

Auto scaling configuration

#### minCapacity

> **minCapacity**: `number`

#### maxCapacity

> **maxCapacity**: `number`

#### targetValue

> **targetValue**: `number`

#### scaleUpCooldown

> **scaleUpCooldown**: `number`

#### scaleDownCooldown

> **scaleDownCooldown**: `number`
