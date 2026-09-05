[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListQuotaRefreshAdapter

# Type Alias: AuthListQuotaRefreshAdapter

> **AuthListQuotaRefreshAdapter** = `object`

Defined in: [types/cli.ts:1140](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1140)

Provider-specific quota capability used by the generic auth-list refresh.

## Properties

### supportsProxyRefresh?

> `optional` **supportsProxyRefresh?**: `boolean`

Defined in: [types/cli.ts:1142](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1142)

A successful local proxy `/limits` response is authoritative for this provider.

---

### listAccounts

> **listAccounts**: () => `Promise`\<[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)[]\>

Defined in: [types/cli.ts:1143](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1143)

#### Returns

`Promise`\<[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)[]\>

---

### priorQuotaKeys

> **priorQuotaKeys**: (`account`) => readonly `string`[]

Defined in: [types/cli.ts:1144](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1144)

#### Parameters

##### account

[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)

#### Returns

readonly `string`[]

---

### refreshAccount

> **refreshAccount**: (`account`, `options`) => `Promise`\<[`AuthListDirectQuotaRefreshResult`](AuthListDirectQuotaRefreshResult.md)\>

Defined in: [types/cli.ts:1145](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1145)

#### Parameters

##### account

[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)

##### options

###### prior

[`AccountQuota`](AccountQuota.md) \| `null`

#### Returns

`Promise`\<[`AuthListDirectQuotaRefreshResult`](AuthListDirectQuotaRefreshResult.md)\>
