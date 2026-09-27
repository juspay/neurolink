[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyIRMessage

# Type Alias: ProxyIRMessage

> **ProxyIRMessage** = `object`

One message, with system and developer messages kept in sequence.

There is no separate bucket for leading instructions: native Codex sends
instruction blocks as ordered `developer` items inside the input array, and
lifting them out would lose their position relative to the conversation. A
codec that needs a leading system field extracts it; the IR does not presume
one exists.

## Properties

### role

> **role**: [`ProxyIRRole`](ProxyIRRole.md)

---

### content

> **content**: [`ProxyIRContentPart`](ProxyIRContentPart.md)[]
