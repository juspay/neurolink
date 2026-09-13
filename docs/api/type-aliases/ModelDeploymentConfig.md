[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDeploymentConfig

# Type Alias: ModelDeploymentConfig

> **ModelDeploymentConfig** = `object`

Defined in: [types/providers.ts:1761](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1761)

Model deployment configuration

## Properties

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1763](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1763)

Model name

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1765](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1765)

Endpoint name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1767](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1767)

EC2 instance type

---

### initialInstanceCount

> **initialInstanceCount**: `number`

Defined in: [types/providers.ts:1769](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1769)

Initial instance count

---

### modelDataUrl

> **modelDataUrl**: `string`

Defined in: [types/providers.ts:1771](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1771)

Model data S3 location

---

### image

> **image**: `string`

Defined in: [types/providers.ts:1773](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1773)

Container image URI

---

### executionRoleArn

> **executionRoleArn**: `string`

Defined in: [types/providers.ts:1775](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1775)

IAM execution role ARN

---

### tags?

> `optional` **tags?**: `Record`\<`string`, `string`\>

Defined in: [types/providers.ts:1777](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1777)

Resource tags

---

### autoScaling?

> `optional` **autoScaling?**: `object`

Defined in: [types/providers.ts:1779](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1779)

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
