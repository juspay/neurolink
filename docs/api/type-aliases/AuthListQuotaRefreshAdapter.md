[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListQuotaRefreshAdapter

# Type Alias: AuthListQuotaRefreshAdapter

> **AuthListQuotaRefreshAdapter** = `object`

Provider-specific quota capability used by the generic auth-list refresh.

## Properties

### supportsProxyRefresh?

> `optional` **supportsProxyRefresh?**: `boolean`

A successful local proxy `/limits` response is authoritative for this provider.

---

### listAccounts

> **listAccounts**: () => `Promise`\<[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)[]\>

#### Returns

`Promise`\<[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)[]\>

---

### priorQuotaKeys

> **priorQuotaKeys**: (`account`) => readonly `string`[]

#### Parameters

##### account

[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)

#### Returns

readonly `string`[]

---

### refreshAccount

> **refreshAccount**: (`account`, `options`) => `Promise`\<[`AuthListDirectQuotaRefreshResult`](AuthListDirectQuotaRefreshResult.md)\>

#### Parameters

##### account

[`ProxyPassthroughAccount`](ProxyPassthroughAccount.md)

##### options

###### prior

[`AccountQuota`](AccountQuota.md) \| `null`

#### Returns

`Promise`\<[`AuthListDirectQuotaRefreshResult`](AuthListDirectQuotaRefreshResult.md)\>
