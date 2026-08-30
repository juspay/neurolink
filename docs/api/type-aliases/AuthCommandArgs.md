[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthCommandArgs

# Type Alias: AuthCommandArgs

> **AuthCommandArgs** = [`BaseCommandArgs`](BaseCommandArgs.md) & `object`

Defined in: [types/cli.ts:1087](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1087)

Auth command arguments interface

## Type Declaration

### provider?

> `optional` **provider?**: `string`

### method?

> `optional` **method?**: `"api-key"` \| `"oauth"` \| `"create-api-key"`

### format?

> `optional` **format?**: `"text"` \| `"json"`

### quiet?

> `optional` **quiet?**: `boolean`

### debug?

> `optional` **debug?**: `boolean`

### nonInteractive?

> `optional` **nonInteractive?**: `boolean`

### add?

> `optional` **add?**: `boolean`

### label?

> `optional` **label?**: `string`

### account?

> `optional` **account?**: `string`

### force?

> `optional` **force?**: `boolean`

### refresh?

> `optional` **refresh?**: `boolean`

`auth list --refresh`: fetch fresh provider limits before listing

### config?

> `optional` **config?**: `string`

Path to the proxy config YAML, used by set-/get-/clear-primary

### email?

> `optional` **email?**: `string`

Email passed to `auth set-primary <email>`

### reason?

> `optional` **reason?**: `string`

Why an account is being disabled, recorded by `auth disable`

### action?

> `optional` **action?**: `string`

Subcommand verb for `auth cooldown <action>`

### all?

> `optional` **all?**: `boolean`

`auth cooldown clear --all`

### \_?

> `optional` **\_?**: (`string` \| `number`)[]

Yargs positional arguments
