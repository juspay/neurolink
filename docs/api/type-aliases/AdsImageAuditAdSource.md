[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AdsImageAuditAdSource

# Type Alias: AdsImageAuditAdSource

> **AdsImageAuditAdSource** = `object`

## Properties

### fetchAds

> **fetchAds**: (`stores`, `options`) => `Promise`\<[`AdsImageAuditAd`](AdsImageAuditAd.md)[]\>

Return normalized active single-image candidates; the SDK validates shape and exact destination-domain matches.

#### Parameters

##### stores

[`AdsImageAuditStore`](AdsImageAuditStore.md)[]

##### options

###### market

`string`

###### signal?

`AbortSignal`

#### Returns

`Promise`\<[`AdsImageAuditAd`](AdsImageAuditAd.md)[]\>
