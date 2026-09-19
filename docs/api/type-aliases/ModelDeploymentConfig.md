[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDeploymentConfig

# Type Alias: ModelDeploymentConfig

> **ModelDeploymentConfig** = `object`

Defined in: [types/providers.ts:1788](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1788)

Model deployment configuration

## Properties

### modelName

> **modelName**: `string`

Defined in: [types/providers.ts:1790](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1790)

Model name

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:1792](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1792)

Endpoint name

---

### instanceType

> **instanceType**: `string`

Defined in: [types/providers.ts:1794](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1794)

EC2 instance type

---

### initialInstanceCount

> **initialInstanceCount**: `number`

Defined in: [types/providers.ts:1796](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1796)

Initial instance count

---

### modelDataUrl

> **modelDataUrl**: `string`

Defined in: [types/providers.ts:1798](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1798)

Model data S3 location

---

### image

> **image**: `string`

Defined in: [types/providers.ts:1800](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1800)

Container image URI

---

### executionRoleArn

> **executionRoleArn**: `string`

Defined in: [types/providers.ts:1802](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1802)

IAM execution role ARN

---

### tags?

> `optional` **tags?**: `Record`\<`string`, `string`\>

Defined in: [types/providers.ts:1804](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1804)

Resource tags

---

### autoScaling?

> `optional` **autoScaling?**: `object`

Defined in: [types/providers.ts:1806](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L1806)

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
