[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / loadProcessDotenv

# Function: loadProcessDotenv()

> **loadProcessDotenv**(`options?`): `Promise`\<[`DotenvBootstrapResult`](../type-aliases/DotenvBootstrapResult.md)\>

Load `.env` into `process.env` under the rules in this module's header and
report what happened. Never throws: a missing dotenv module degrades to
"nothing loaded".

## Parameters

### options?

[`DotenvBootstrapOptions`](../type-aliases/DotenvBootstrapOptions.md) = `{}`

## Returns

`Promise`\<[`DotenvBootstrapResult`](../type-aliases/DotenvBootstrapResult.md)\>
