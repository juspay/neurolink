[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfigManager

# Class: ConfigManager

Defined in: [config/configManager.ts:25](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/config/configManager.ts#L25)

Enhanced Config Manager with automatic backup/restore capabilities

## Constructors

### Constructor

> **new ConfigManager**(): `NeuroLinkConfigManager`

#### Returns

`NeuroLinkConfigManager`

## Methods

### loadConfig()

> **loadConfig**(): `Promise`\<[`NeuroLinkConfig`](../type-aliases/NeuroLinkConfig.md)\>

Defined in: [config/configManager.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/config/configManager.ts#L37)

Load configuration with caching

#### Returns

`Promise`\<[`NeuroLinkConfig`](../type-aliases/NeuroLinkConfig.md)\>

---

### updateConfig()

> **updateConfig**(`updates`, `options?`): `Promise`\<`void`\>

Defined in: [config/configManager.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/config/configManager.ts#L47)

Update configuration with automatic backup

#### Parameters

##### updates

`Partial`\<[`NeuroLinkConfig`](../type-aliases/NeuroLinkConfig.md)\>

##### options?

[`ConfigUpdateOptions`](../type-aliases/ConfigUpdateOptions.md) = `{}`

#### Returns

`Promise`\<`void`\>

---

### createBackup()

> **createBackup**(`reason?`): `Promise`\<`string`\>

Defined in: [config/configManager.ts:107](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/config/configManager.ts#L107)

Create a backup with metadata

#### Parameters

##### reason?

`string` = `"manual"`

#### Returns

`Promise`\<`string`\>

---

### listBackups()

> **listBackups**(): `Promise`\<[`BackupInfo`](../type-aliases/BackupInfo.md)[]\>

Defined in: [config/configManager.ts:141](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/config/configManager.ts#L141)

List all available backups

#### Returns

`Promise`\<[`BackupInfo`](../type-aliases/BackupInfo.md)[]\>

---

### restoreFromBackup()

> **restoreFromBackup**(`backupFilename`): `Promise`\<`void`\>

Defined in: [config/configManager.ts:185](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/config/configManager.ts#L185)

Restore from specific backup

#### Parameters

##### backupFilename

`string`

#### Returns

`Promise`\<`void`\>

---

### restoreLatestBackup()

> **restoreLatestBackup**(): `Promise`\<`void`\>

Defined in: [config/configManager.ts:218](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/config/configManager.ts#L218)

Restore from latest backup

#### Returns

`Promise`\<`void`\>

---

### cleanupOldBackups()

> **cleanupOldBackups**(`keepCount?`): `Promise`\<`void`\>

Defined in: [config/configManager.ts:230](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/config/configManager.ts#L230)

Clean up old backups

#### Parameters

##### keepCount?

`number` = `10`

#### Returns

`Promise`\<`void`\>

---

### updateProviderStatus()

> **updateProviderStatus**(`providerId`, `status`): `Promise`\<`void`\>

Defined in: [config/configManager.ts:250](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/config/configManager.ts#L250)

Update provider status

#### Parameters

##### providerId

`string`

##### status

`Partial`\<[`ProviderRuntimeConfig`](../type-aliases/ProviderRuntimeConfig.md)\>

#### Returns

`Promise`\<`void`\>

---

### validateConfig()

> **validateConfig**(`config`): `Promise`\<[`ConfigValidationResult`](../type-aliases/ConfigValidationResult.md)\>

Defined in: [config/configManager.ts:274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/config/configManager.ts#L274)

Validate configuration

#### Parameters

##### config

[`NeuroLinkConfig`](../type-aliases/NeuroLinkConfig.md)

#### Returns

`Promise`\<[`ConfigValidationResult`](../type-aliases/ConfigValidationResult.md)\>

---

### generateDefaultConfig()

> **generateDefaultConfig**(): `Promise`\<[`NeuroLinkConfig`](../type-aliases/NeuroLinkConfig.md)\>

Defined in: [config/configManager.ts:326](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/config/configManager.ts#L326)

Generate default configuration

#### Returns

`Promise`\<[`NeuroLinkConfig`](../type-aliases/NeuroLinkConfig.md)\>
