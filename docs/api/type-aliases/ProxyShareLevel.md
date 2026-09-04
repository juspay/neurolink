[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLevel

# Type Alias: ProxyShareLevel

> **ProxyShareLevel** = `"live"` \| `"complete"`

Defined in: [types/proxy.ts:3414](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3414)

How a borrower reaches the lender's capacity.

- `live` — the borrower forwards each request to the lender's exposed proxy.
  The lender's credentials never leave the lender's device and every request
  passes the lender's gate, so control is immediate and cryptographic. The
  borrower is dependent on the lender's device being reachable.
- `complete` — the borrower holds an independently provisioned OAuth grant on
  the lender's account and calls the upstream directly. Survives the lender
  being offline; control is enforced by a signed lease plus usage audit,
  which makes it cooperative rather than cryptographic.
