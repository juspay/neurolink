[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListQuotaRefreshAdapter

# Type Alias: AuthListQuotaRefreshAdapter

> **AuthListQuotaRefreshAdapter** = `object`

Defined in: [types/cli.ts:1160](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1160)

Provider-specific quota capability used by the generic auth-list refresh.

## Properties

### supportsProxyRefresh?

> `optional` **supportsProxyRefresh?**: `boolean`

Defined in: [types/cli.ts:1162](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1162)

A successful local proxy `/limits` response is authoritative for this provider.

---

### listAccounts

> **listAccounts**: () => `Promise`\<[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)[]\>

Defined in: [types/cli.ts:1163](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1163)

#### Returns

`Promise`\<[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)[]\>

---

### priorQuotaKeys

> **priorQuotaKeys**: (`account`) => readonly `string`[]

Defined in: [types/cli.ts:1164](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1164)

#### Parameters

##### account

[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)

#### Returns

readonly `string`[]

---

### refreshAccount

> **refreshAccount**: (`account`, `options`) => `Promise`\<[`AuthListDirectQuotaRefreshResult`](AuthListDirectQuotaRefreshResult.md)\>

Defined in: [types/cli.ts:1165](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1165)

#### Parameters

##### account

[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)

##### options

###### prior

[`AccountQuota`](AccountQuota.md) \| `null`

#### Returns

`Promise`\<[`AuthListDirectQuotaRefreshResult`](AuthListDirectQuotaRefreshResult.md)\>
