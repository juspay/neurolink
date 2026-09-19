[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDeploymentConfig

# Type Alias: ModelDeploymentConfig

> **ModelDeploymentConfig** = `object`

Defined in: [types/providers.ts:1819](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1819)

Model deployment configuration

## Properties

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1821](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1821)

Model name

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1823](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1823)

Endpoint name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1825)

EC2 instance type

---

### initialInstanceCount

> **initialInstanceCount**: `number`

Defined in: [types/providers.ts:1827](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1827)

Initial instance count

---

### modelDataUrl

> **modelDataUrl**: `string`

Defined in: [types/providers.ts:1829](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1829)

Model data S3 location

---

### image

> **image**: `string`

Defined in: [types/providers.ts:1831](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1831)

Container image URI

---

### executionRoleArn

> **executionRoleArn**: `string`

Defined in: [types/providers.ts:1833](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1833)

IAM execution role ARN

---

### tags?

> `optional` **tags?**: `Record`\<`string`, `string`\>

Defined in: [types/providers.ts:1835](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1835)

Resource tags

---

### autoScaling?

> `optional` **autoScaling?**: `object`

Defined in: [types/providers.ts:1837](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1837)

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
