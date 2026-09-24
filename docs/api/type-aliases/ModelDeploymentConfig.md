[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDeploymentConfig

# Type Alias: ModelDeploymentConfig

> **ModelDeploymentConfig** = `object`

Defined in: [types/providers.ts:1838](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1838)

Model deployment configuration

## Properties

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1840](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1840)

Model name

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1842](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1842)

Endpoint name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1844](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1844)

EC2 instance type

---

### initialInstanceCount

> **initialInstanceCount**: `number`

Defined in: [types/providers.ts:1846](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1846)

Initial instance count

---

### modelDataUrl

> **modelDataUrl**: `string`

Defined in: [types/providers.ts:1848](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1848)

Model data S3 location

---

### image

> **image**: `string`

Defined in: [types/providers.ts:1850](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1850)

Container image URI

---

### executionRoleArn

> **executionRoleArn**: `string`

Defined in: [types/providers.ts:1852](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1852)

IAM execution role ARN

---

### tags?

> `optional` **tags?**: `Record`\<`string`, `string`\>

Defined in: [types/providers.ts:1854](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1854)

Resource tags

---

### autoScaling?

> `optional` **autoScaling?**: `object`

Defined in: [types/providers.ts:1856](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1856)

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
