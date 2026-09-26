[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelDeploymentConfig

# Type Alias: ModelDeploymentConfig

> **ModelDeploymentConfig** = `object`

Model deployment configuration

## Properties

### modelName

> **modelName**: `string`

Model name

---

### endpointName

> **endpointName**: `string`

Endpoint name

---

### instanceType

> **instanceType**: `string`

EC2 instance type

---

### initialInstanceCount

> **initialInstanceCount**: `number`

Initial instance count

---

### modelDataUrl

> **modelDataUrl**: `string`

Model data S3 location

---

### image

> **image**: `string`

Container image URI

---

### executionRoleArn

> **executionRoleArn**: `string`

IAM execution role ARN

---

### tags?

> `optional` **tags?**: `Record`\<`string`, `string`\>

Resource tags

---

### autoScaling?

> `optional` **autoScaling?**: `object`

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
