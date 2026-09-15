[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountDirectoryOverride

# Type Alias: ProxyAccountDirectoryOverride

> **ProxyAccountDirectoryOverride** = `object`

Defined in: [types/proxy.ts:1670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1670)

Test-only replacement for the token store behind the account-exposing
routes. The token store is a module singleton bound to the real home at
import, so a suite cannot redirect it; this lets a case state which logins
exist (`knownKeys`, including disabled ones) and which are routable per
engine, exactly as the real listers would answer.

## Properties

### knownKeys

> **knownKeys**: `Set`\<`string`\>

Defined in: [types/proxy.ts:1671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1671)

---

### anthropic

> **anthropic**: [`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)[]

Defined in: [types/proxy.ts:1672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1672)

---

### codex

> **codex**: [`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)[]

Defined in: [types/proxy.ts:1673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1673)
