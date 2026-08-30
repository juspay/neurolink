[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListQuotaRefreshAdapter

# Type Alias: AuthListQuotaRefreshAdapter

> **AuthListQuotaRefreshAdapter** = `object`

Defined in: [types/cli.ts:1136](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1136)

Provider-specific quota capability used by the generic auth-list refresh.

## Properties

### supportsProxyRefresh?

> `optional` **supportsProxyRefresh?**: `boolean`

Defined in: [types/cli.ts:1138](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1138)

A successful local proxy `/limits` response is authoritative for this provider.

---

### listAccounts

> **listAccounts**: () => `Promise`\<[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)[]\>

Defined in: [types/cli.ts:1139](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1139)

#### Returns

`Promise`\<[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)[]\>

---

### priorQuotaKeys

> **priorQuotaKeys**: (`account`) => readonly `string`[]

Defined in: [types/cli.ts:1140](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1140)

#### Parameters

##### account

[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)

#### Returns

readonly `string`[]

---

### refreshAccount

> **refreshAccount**: (`account`, `options`) => `Promise`\<[`AuthListDirectQuotaRefreshResult`](AuthListDirectQuotaRefreshResult.md)\>

Defined in: [types/cli.ts:1141](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1141)

#### Parameters

##### account

[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)

##### options

###### prior

[`AccountQuota`](AccountQuota.md) \| `null`

#### Returns

`Promise`\<[`AuthListDirectQuotaRefreshResult`](AuthListDirectQuotaRefreshResult.md)\>
