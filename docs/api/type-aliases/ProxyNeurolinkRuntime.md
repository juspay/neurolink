[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyNeurolinkRuntime

# Type Alias: ProxyNeurolinkRuntime

> **ProxyNeurolinkRuntime** = `object`

Defined in: [types/proxy.ts:3064](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3064)

Handle for a NeuroLink runtime created by the proxy start command.
The `neurolink` field is typed structurally (only the method used by the
proxy layer is exposed) so types/proxy.ts does not depend on the full
NeuroLink class.

## Properties

### neurolink

> **neurolink**: `object`

Defined in: [types/proxy.ts:3065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3065)

#### getToolRegistry()

> **getToolRegistry**(): [`MCPToolRegistry`](../classes/MCPToolRegistry.md)

##### Returns

[`MCPToolRegistry`](../classes/MCPToolRegistry.md)

---

### logsDir

> **logsDir**: `string`

Defined in: [types/proxy.ts:3068](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3068)
