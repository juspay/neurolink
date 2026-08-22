[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliQwenSettings

# Type Alias: CliQwenSettings

> **CliQwenSettings** = `Record`\<`string`, `unknown`\>

Defined in: [types/proxyClient.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L59)

Raw contents of a Qwen Code `settings.json`. Deliberately open-ended: the
configurator rewrites only `security.auth` and must round-trip every other
key the user has set, including ones this repo does not know about.
