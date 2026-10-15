[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerCarriedContext

# Type Alias: ServerCarriedContext

> **ServerCarriedContext** = `Pick`\<[`ServerContext`](ServerContext.md), `"user"` \| `"session"` \| `"metadata"` \| `"abortSignal"` \| `"abortController"`\>

What middleware sets on its context that later middleware and the route
handler must see. Adapters build a fresh context for every step, so this is
what they carry between steps in the framework's per-request storage.
