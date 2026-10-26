[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / classifyMcpTransportAddress

# Function: classifyMcpTransportAddress()

> **classifyMcpTransportAddress**(`ip`): [`McpTransportAddressClass`](../type-aliases/McpTransportAddressClass.md)

Classify one IP literal. Throws when `ip` is not an IP address at all, so a
caller never silently treats a host name as public.

## Parameters

### ip

`string`

## Returns

[`McpTransportAddressClass`](../type-aliases/McpTransportAddressClass.md)
