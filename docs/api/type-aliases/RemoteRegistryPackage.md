[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RemoteRegistryPackage

# Type Alias: RemoteRegistryPackage

> **RemoteRegistryPackage** = `object`

A package a registry record can be installed from (`npm`, `pypi`, `oci`, ...)

## Properties

### registryType

> **registryType**: `string`

---

### identifier

> **identifier**: `string`

---

### version?

> `optional` **version?**: `string`

---

### transport?

> `optional` **transport?**: [`RemoteRegistryTransport`](RemoteRegistryTransport.md)

---

### environmentVariables

> **environmentVariables**: [`RemoteRegistryInput`](RemoteRegistryInput.md)[]
