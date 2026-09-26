[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfigManager

# Class: ConfigManager

Enhanced Config Manager with automatic backup/restore capabilities

## Constructors

### Constructor

> **new ConfigManager**(): `NeuroLinkConfigManager`

#### Returns

`NeuroLinkConfigManager`

## Methods

### loadConfig()

> **loadConfig**(): `Promise`\<[`NeuroLinkConfig`](../type-aliases/NeuroLinkConfig.md)\>

Load configuration with caching

#### Returns

`Promise`\<[`NeuroLinkConfig`](../type-aliases/NeuroLinkConfig.md)\>

---

### updateConfig()

> **updateConfig**(`updates`, `options?`): `Promise`\<`void`\>

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

Create a backup with metadata

#### Parameters

##### reason?

`string` = `"manual"`

#### Returns

`Promise`\<`string`\>

---

### listBackups()

> **listBackups**(): `Promise`\<[`BackupInfo`](../type-aliases/BackupInfo.md)[]\>

List all available backups

#### Returns

`Promise`\<[`BackupInfo`](../type-aliases/BackupInfo.md)[]\>

---

### restoreFromBackup()

> **restoreFromBackup**(`backupFilename`): `Promise`\<`void`\>

Restore from specific backup

#### Parameters

##### backupFilename

`string`

#### Returns

`Promise`\<`void`\>

---

### restoreLatestBackup()

> **restoreLatestBackup**(): `Promise`\<`void`\>

Restore from latest backup

#### Returns

`Promise`\<`void`\>

---

### cleanupOldBackups()

> **cleanupOldBackups**(`keepCount?`): `Promise`\<`void`\>

Clean up old backups

#### Parameters

##### keepCount?

`number` = `10`

#### Returns

`Promise`\<`void`\>

---

### updateProviderStatus()

> **updateProviderStatus**(`providerId`, `status`): `Promise`\<`void`\>

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

Validate configuration

#### Parameters

##### config

[`NeuroLinkConfig`](../type-aliases/NeuroLinkConfig.md)

#### Returns

`Promise`\<[`ConfigValidationResult`](../type-aliases/ConfigValidationResult.md)\>

---

### generateDefaultConfig()

> **generateDefaultConfig**(): `Promise`\<[`NeuroLinkConfig`](../type-aliases/NeuroLinkConfig.md)\>

Generate default configuration

#### Returns

`Promise`\<[`NeuroLinkConfig`](../type-aliases/NeuroLinkConfig.md)\>
