[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / decisionKey

# Function: decisionKey()

> **decisionKey**(`namespace`, `index`): `string`

Defined in: [utils/decisionAnswers.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/utils/decisionAnswers.ts#L127)

Build a question id that survives a round trip.

Question ids are the only thing tying an answer back to what it was asked
about, and a batch mixes heterogeneous questions (one per server, one per
message, plus gates), so the namespace prefix is what demultiplexes them.
The index — not the subject's own name — is the key, because ids from the
wild (server ids, model ids, file paths) are not guaranteed to be distinct
after any normalisation the wire might apply.

## Parameters

### namespace

`string`

### index

`number`

## Returns

`string`
