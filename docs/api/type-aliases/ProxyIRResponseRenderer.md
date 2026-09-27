[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIRResponseRenderer

# Type Alias: ProxyIRResponseRenderer

> **ProxyIRResponseRenderer** = `object`

## Properties

### format

> **format**: [`ProxyIRWireFormat`](ProxyIRWireFormat.md)

## Methods

### renderResponseEvent()

> **renderResponseEvent**(`event`): `string`[]

#### Parameters

##### event

[`ProxyIRResponseEvent`](ProxyIRResponseEvent.md)

#### Returns

`string`[]

---

### renderTerminalOutcome()

> **renderTerminalOutcome**(`outcome`, `usage?`): `string`[]

#### Parameters

##### outcome

[`ProxyIRTerminalOutcome`](ProxyIRTerminalOutcome.md)

##### usage?

[`UsageContext`](UsageContext.md)

#### Returns

`string`[]
