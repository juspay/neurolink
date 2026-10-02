[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPackageUpgradeOptions

# Type Alias: ProxyPackageUpgradeOptions

> **ProxyPackageUpgradeOptions** = [`ProxyStagedInstallOptions`](ProxyStagedInstallOptions.md) & `object`

Staged upgrade that reconciles recorded local edits before publication.

## Type Declaration

### activePackage

> **activePackage**: [`ProxyPackageSelection`](ProxyPackageSelection.md)

### isCurrentOwner?

> `optional` **isCurrentOwner?**: () => `boolean`

#### Returns

`boolean`

### onPolyfills?

> `optional` **onPolyfills?**: (`report`) => `void`

#### Parameters

##### report

[`ProxyPackagePolyfillReport`](ProxyPackagePolyfillReport.md)

#### Returns

`void`
