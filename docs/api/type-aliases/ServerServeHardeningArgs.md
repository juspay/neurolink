[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerServeHardeningArgs

# Type Alias: ServerServeHardeningArgs

> **ServerServeHardeningArgs** = `object`

`neurolink serve` flags that relax its network hardening.

## Properties

### allowUnauthenticated?

> `optional` **allowUnauthenticated?**: `boolean`

`--allow-unauthenticated`: listen on a non-loopback host without
`NEUROLINK_SERVER_API_KEY`, and serve the tool and MCP execution routes
to anyone who can reach the port.

---

### enableBuiltinTools?

> `optional` **enableBuiltinTools?**: `boolean`

`--enable-builtin-tools`: keep NeuroLink's built-in tools (file reads and
writes under the server's working directory among them) in the server's
registry. Off by default, so `/tools/execute` and the agent routes cannot
reach the host's filesystem.
