[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createImageAdsAuditor

# Function: createImageAdsAuditor()

> **createImageAdsAuditor**(`client`, `options`): (`rawInput`) => `Promise`\<[`AdsImageAuditReport`](../type-aliases/AdsImageAuditReport.md)\>

Create a reusable images-only workflow. The caller owns the SDK client lifecycle.
Configure models, connectors and progress once; invoke with audit context repeatedly.

## Parameters

### client

[`AdsImageAuditClient`](../type-aliases/AdsImageAuditClient.md)

### options

[`AdsImageAuditConfig`](../type-aliases/AdsImageAuditConfig.md)

## Returns

(`rawInput`) => `Promise`\<[`AdsImageAuditReport`](../type-aliases/AdsImageAuditReport.md)\>
