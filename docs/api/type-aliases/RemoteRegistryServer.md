[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RemoteRegistryServer

# Type Alias: RemoteRegistryServer

> **RemoteRegistryServer** = `object`

Server description inside a registry record. Mirrors the `ServerDetail`
schema of the official MCP Registry API, reduced to the fields the client
reads; everything else in the response is ignored.

## Properties

### name

> **name**: `string`

---

### description

> **description**: `string`

---

### version

> **version**: `string`

---

### repositoryUrl?

> `optional` **repositoryUrl?**: `string`

---

### websiteUrl?

> `optional` **websiteUrl?**: `string`

---

### packages

> **packages**: [`RemoteRegistryPackage`](RemoteRegistryPackage.md)[]

---

### remotes

> **remotes**: [`RemoteRegistryTransport`](RemoteRegistryTransport.md)[]
