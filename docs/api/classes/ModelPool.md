[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelPool

# Class: ModelPool

Defined in: [routing/modelPool.ts:173](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/routing/modelPool.ts#L173)

Multi-provider pool with per-member cooldown and strategy-based selection.

All state (cooldowns, cursor) is instance-local and resets on construction.
Thread safety is not required — Node.js is single-threaded for async work.

## Constructors

### Constructor

> **new ModelPool**(`config`, `injectors?`): `ModelPool`

Defined in: [routing/modelPool.ts:181](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/routing/modelPool.ts#L181)

#### Parameters

##### config

[`ModelPoolConfig`](../type-aliases/ModelPoolConfig.md)

##### injectors?

###### now?

() => `number`

#### Returns

`ModelPool`

## Accessors

### maxAttempts

#### Get Signature

> **get** **maxAttempts**(): `number`

Defined in: [routing/modelPool.ts:194](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/routing/modelPool.ts#L194)

The maximum number of attempts per call (pool config value or member count).
Used by callers that drive the retry loop externally.

##### Returns

`number`

## Methods

### memberKey()

> **memberKey**(`member`): `string`

Defined in: [routing/modelPool.ts:202](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/routing/modelPool.ts#L202)

Returns a stable string key for a pool member.
Format: `${provider}:${model ?? "*"}:${region ?? "*"}`

#### Parameters

##### member

[`ModelPoolMember`](../type-aliases/ModelPoolMember.md)

#### Returns

`string`

---

### availableMembers()

> **availableMembers**(): [`ModelPoolMember`](../type-aliases/ModelPoolMember.md)[]

Defined in: [routing/modelPool.ts:207](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/routing/modelPool.ts#L207)

Returns members whose cooldown has expired (or were never cooled).

#### Returns

[`ModelPoolMember`](../type-aliases/ModelPoolMember.md)[]

---

### selectNext()

> **selectNext**(`excludedKeys?`): [`ModelPoolMember`](../type-aliases/ModelPoolMember.md) \| `undefined`

Defined in: [routing/modelPool.ts:221](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/routing/modelPool.ts#L221)

Selects the next member to try according to the configured strategy.

#### Parameters

##### excludedKeys?

`Set`\<`string`\>

— keys of members already attempted this call.

#### Returns

[`ModelPoolMember`](../type-aliases/ModelPoolMember.md) \| `undefined`

the chosen member, or undefined when all members are exhausted.

---

### recordFailure()

> **recordFailure**(`member`, `errorClass`): `void`

Defined in: [routing/modelPool.ts:289](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/routing/modelPool.ts#L289)

Records a provider failure, setting a cooldown appropriate for the error class.

- Retryable classes (rate_limit, server, network, unknown): timed cooldown
  for `cooldownMs` so the member can recover and be retried later.
- Non-retryable classes (auth, context_window): permanent cooldown for the
  lifetime of this ModelPool instance, because these errors are structural
  and will not resolve between calls (wrong credentials, model not available
  in team whitelist, payload exceeds the model's context window).

#### Parameters

##### member

[`ModelPoolMember`](../type-aliases/ModelPoolMember.md)

##### errorClass

[`ProviderErrorClass`](../type-aliases/ProviderErrorClass.md)

#### Returns

`void`

---

### recordSuccess()

> **recordSuccess**(`member`): `void`

Defined in: [routing/modelPool.ts:301](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/routing/modelPool.ts#L301)

Records a successful response, clearing any existing cooldown for this member
so it remains fully available.

#### Parameters

##### member

[`ModelPoolMember`](../type-aliases/ModelPoolMember.md)

#### Returns

`void`
