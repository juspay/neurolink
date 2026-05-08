[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationManager

# Class: ElicitationManager

Defined in: [mcp/elicitation/elicitationManager.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L70)

Manager for handling elicitation requests during tool execution

The elicitation protocol allows MCP tools to request interactive user input
mid-execution. This is useful for:

- Confirming destructive operations
- Requesting missing information
- Getting user preferences
- Handling authentication challenges

## Example

```typescript
const elicitationManager = new ElicitationManager({
  defaultTimeout: 60000,
  handler: async (request) => {
    // Implement UI prompt based on request type
    if (request.type === "confirmation") {
      const confirmed = await showConfirmDialog(request.message);
      return {
        requestId: request.id,
        responded: true,
        value: confirmed,
        timestamp: Date.now(),
      };
    }
    // Handle other types...
  },
});

// Use in a tool
const response = await elicitationManager.request({
  type: "confirmation",
  message: "Are you sure you want to delete this file?",
  toolName: "deleteFile",
});

if (response.value === true) {
  // Proceed with deletion
}
```

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new ElicitationManager**(`config?`): `ElicitationManager`

Defined in: [mcp/elicitation/elicitationManager.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L82)

#### Parameters

##### config?

[`ElicitationManagerConfig`](../type-aliases/ElicitationManagerConfig.md) = `{}`

#### Returns

`ElicitationManager`

#### Overrides

`EventEmitter.constructor`

## Methods

### setHandler()

> **setHandler**(`handler`): `void`

Defined in: [mcp/elicitation/elicitationManager.ts:96](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L96)

Set the elicitation handler

#### Parameters

##### handler

[`ElicitationHandler`](../type-aliases/ElicitationHandler.md)

#### Returns

`void`

---

### setEnabled()

> **setEnabled**(`enabled`): `void`

Defined in: [mcp/elicitation/elicitationManager.ts:103](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L103)

Enable or disable elicitation

#### Parameters

##### enabled

`boolean`

#### Returns

`void`

---

### isEnabled()

> **isEnabled**(): `boolean`

Defined in: [mcp/elicitation/elicitationManager.ts:125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L125)

Check if elicitation is enabled

#### Returns

`boolean`

---

### request()

> **request**(`elicitation`): `Promise`\<[`ElicitationResponse`](../type-aliases/ElicitationResponse.md)\>

Defined in: [mcp/elicitation/elicitationManager.ts:132](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L132)

Request user input

#### Parameters

##### elicitation

`Omit`\<[`Elicitation`](../type-aliases/Elicitation.md), `"id"`\> & `object`

#### Returns

`Promise`\<[`ElicitationResponse`](../type-aliases/ElicitationResponse.md)\>

---

### confirm()

> **confirm**(`message`, `options?`): `Promise`\<`boolean`\>

Defined in: [mcp/elicitation/elicitationManager.ts:206](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L206)

Convenience method for confirmation requests

#### Parameters

##### message

`string`

##### options?

###### toolName?

`string`

###### serverId?

`string`

###### confirmLabel?

`string`

###### cancelLabel?

`string`

###### timeout?

`number`

#### Returns

`Promise`\<`boolean`\>

---

### getText()

> **getText**(`message`, `options?`): `Promise`\<`string` \| `undefined`\>

Defined in: [mcp/elicitation/elicitationManager.ts:233](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L233)

Convenience method for text input

#### Parameters

##### message

`string`

##### options?

###### toolName?

`string`

###### placeholder?

`string`

###### defaultValue?

`string`

###### timeout?

`number`

#### Returns

`Promise`\<`string` \| `undefined`\>

---

### select()

> **select**\<`T`\>(`message`, `options`, `config?`): `Promise`\<`T` \| `undefined`\>

Defined in: [mcp/elicitation/elicitationManager.ts:258](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L258)

Convenience method for selection

#### Type Parameters

##### T

`T` _extends_ `string`

#### Parameters

##### message

`string`

##### options

`object`[]

##### config?

###### toolName?

`string`

###### timeout?

`number`

#### Returns

`Promise`\<`T` \| `undefined`\>

---

### multiSelect()

> **multiSelect**\<`T`\>(`message`, `options`, `config?`): `Promise`\<`T`[] \| `undefined`\>

Defined in: [mcp/elicitation/elicitationManager.ts:281](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L281)

Convenience method for multiple selection

#### Type Parameters

##### T

`T` _extends_ `string`

#### Parameters

##### message

`string`

##### options

`object`[]

##### config?

###### toolName?

`string`

###### timeout?

`number`

###### minSelections?

`number`

###### maxSelections?

`number`

#### Returns

`Promise`\<`T`[] \| `undefined`\>

---

### form()

> **form**\<`T`\>(`message`, `fields`, `config?`): `Promise`\<`T` \| `undefined`\>

Defined in: [mcp/elicitation/elicitationManager.ts:308](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L308)

Convenience method for form input

#### Type Parameters

##### T

`T` _extends_ `Record`\<`string`, `unknown`\>

#### Parameters

##### message

`string`

##### fields

[`FormField`](../type-aliases/FormField.md)[]

##### config?

###### toolName?

`string`

###### serverId?

`string`

###### timeout?

`number`

###### submitLabel?

`string`

#### Returns

`Promise`\<`T` \| `undefined`\>

---

### getSecret()

> **getSecret**(`message`, `options?`): `Promise`\<`string` \| `undefined`\>

Defined in: [mcp/elicitation/elicitationManager.ts:335](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L335)

Convenience method for secret input

#### Parameters

##### message

`string`

##### options?

###### toolName?

`string`

###### hint?

`string`

###### timeout?

`number`

#### Returns

`Promise`\<`string` \| `undefined`\>

---

### cancel()

> **cancel**(`requestId`, `reason?`): `void`

Defined in: [mcp/elicitation/elicitationManager.ts:358](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L358)

Cancel a pending request

#### Parameters

##### requestId

`string`

##### reason?

`string`

#### Returns

`void`

---

### getPendingCount()

> **getPendingCount**(): `number`

Defined in: [mcp/elicitation/elicitationManager.ts:481](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L481)

Get pending request count

#### Returns

`number`

---

### getPendingRequests()

> **getPendingRequests**(): [`Elicitation`](../type-aliases/Elicitation.md)[]

Defined in: [mcp/elicitation/elicitationManager.ts:488](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L488)

Get all pending requests

#### Returns

[`Elicitation`](../type-aliases/Elicitation.md)[]

---

### clearPending()

> **clearPending**(`reason?`): `void`

Defined in: [mcp/elicitation/elicitationManager.ts:495](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/elicitation/elicitationManager.ts#L495)

Clear all pending requests

#### Parameters

##### reason?

`string`

#### Returns

`void`
