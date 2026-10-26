[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / loadDotenv

# Function: loadDotenv()

> **loadDotenv**(`options?`): `Promise`\<[`DotenvBootstrapResult`](../type-aliases/DotenvBootstrapResult.md)\>

Explicit opt-in for SDK hosts that want `.env` loaded the way the CLI does,
with the same endpoint-override checks. Call it before constructing
`NeuroLink`.

## Parameters

### options?

[`DotenvBootstrapOptions`](../type-aliases/DotenvBootstrapOptions.md) = `{}`

## Returns

`Promise`\<[`DotenvBootstrapResult`](../type-aliases/DotenvBootstrapResult.md)\>
