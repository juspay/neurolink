[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DecideAmbientKeyGuard

# Type Alias: DecideAmbientKeyGuard

> **DecideAmbientKeyGuard** = `object`

Says when a decide provider's key may be used as the default decision
provider. A key found only in the environment may belong to something else:
`OPENAI_API_KEY` is also the key of every OpenAI-compatible gateway, and
sending a gateway's key and the decision state to the vendor's own host would
disclose both. With a guard, the environment key is skipped for default
resolution while any variable in `baseURLEnvVars`, or any credentials field in
`credentialBaseURLs`, holds a URL whose origin (scheme, host and port,
compared case-insensitively; path and trailing slash ignored) is not in
`trustedOrigins`; a value that does not parse as an http(s) URL counts as
untrusted, and a blank one as unset.

It does not apply once the host routed the provider on purpose: the
provider's own base-URL variable is set, or `credentials.<key>` supplies a key
or a base URL. It never applies to a call that names the provider.

## Properties

### baseURLEnvVars

> **baseURLEnvVars**: readonly `string`[]

Environment variables that move the key's other users off the vendor's host.

---

### trustedOrigins

> **trustedOrigins**: readonly `string`[]

Origins that are the vendor's own, such as `https://api.openai.com`.

---

### credentialBaseURLs?

> `optional` **credentialBaseURLs?**: readonly [`DecideAmbientKeyCredentialField`](DecideAmbientKeyCredentialField.md)[]

Credentials fields that move the key's other users off the vendor's host,
read from the same `credentials` the resolver is given (the instance's
merged with the call's), such as the chat provider's `credentials.openai`
`baseURL`. Omitted means only the environment is read.
