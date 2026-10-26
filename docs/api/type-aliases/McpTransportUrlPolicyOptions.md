[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / McpTransportUrlPolicyOptions

# Type Alias: McpTransportUrlPolicyOptions

> **McpTransportUrlPolicyOptions** = `object`

Options for the MCP transport URL policy (`assertMcpTransportUrlAllowed`).

## Properties

### transport

> **transport**: [`MCPTransportType`](MCPTransportType.md)

---

### allowPrivateNetwork?

> `optional` **allowPrivateNetwork?**: `boolean`

See [MCPServerInfo.allowPrivateNetwork](MCPServerInfo.md#allowprivatenetwork).

---

### hostOwnedEgress?

> `optional` **hostOwnedEgress?**: `boolean`

The host application supplied its own `fetch` (or dispatcher) for this
server, so egress — which addresses are dialled, with which pins — is
decided by that code, not by this policy. Only program code can pass a
function; a config file never can. The scheme allow-list still applies;
the plaintext and address classification is skipped.

---

### serverId?

> `optional` **serverId?**: `string`

Used only to name the server in error messages.
