[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerCapabilitiesManager

# Class: ServerCapabilitiesManager

Defined in: [mcp/serverCapabilities.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L68)

Server Capabilities Manager

Manages resources and prompts for MCP servers.

## Example

```typescript
const capabilities = new ServerCapabilitiesManager({
  resources: true,
  prompts: true,
});

// Register a resource
capabilities.registerResource({
  uri: "file:///data/config.json",
  name: "Configuration",
  mimeType: "application/json",
  reader: async (uri) => ({
    uri,
    mimeType: "application/json",
    text: JSON.stringify({ key: "value" }),
  }),
});

// Register a prompt
capabilities.registerPrompt({
  name: "summarize",
  description: "Summarize text content",
  arguments: [{ name: "text", required: true }],
  generator: async (args) => ({
    messages: [
      {
        role: "user",
        content: { type: "text", text: `Summarize: ${args.text}` },
      },
    ],
  }),
});
```

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new ServerCapabilitiesManager**(`config?`): `ServerCapabilitiesManager`

Defined in: [mcp/serverCapabilities.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L76)

#### Parameters

##### config?

[`ServerCapabilitiesConfig`](../type-aliases/ServerCapabilitiesConfig.md) = `{}`

#### Returns

`ServerCapabilitiesManager`

#### Overrides

`EventEmitter.constructor`

## Methods

### registerResource()

> **registerResource**(`resource`): `this`

Defined in: [mcp/serverCapabilities.ts:93](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L93)

Register a resource

#### Parameters

##### resource

[`RegisteredResource`](../type-aliases/RegisteredResource.md)

#### Returns

`this`

---

### registerResourceTemplate()

> **registerResourceTemplate**(`pattern`, `template`): `this`

Defined in: [mcp/serverCapabilities.ts:118](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L118)

Register a resource template (with URI pattern)

#### Parameters

##### pattern

`string`

##### template

`Omit`\<[`RegisteredResource`](../type-aliases/RegisteredResource.md), `"uri"`\> & `object`

#### Returns

`this`

---

### unregisterResource()

> **unregisterResource**(`uri`): `boolean`

Defined in: [mcp/serverCapabilities.ts:145](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L145)

Unregister a resource

#### Parameters

##### uri

`string`

#### Returns

`boolean`

---

### listResources()

> **listResources**(): [`MCPResource`](../type-aliases/MCPResource.md)[]

Defined in: [mcp/serverCapabilities.ts:164](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L164)

List all resources

#### Returns

[`MCPResource`](../type-aliases/MCPResource.md)[]

---

### readResource()

> **readResource**(`uri`, `context?`): `Promise`\<[`ResourceContent`](../type-aliases/ResourceContent.md)\>

Defined in: [mcp/serverCapabilities.ts:179](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L179)

Read a resource

#### Parameters

##### uri

`string`

##### context?

[`JsonObject`](../type-aliases/JsonObject.md)

#### Returns

`Promise`\<[`ResourceContent`](../type-aliases/ResourceContent.md)\>

---

### subscribeToResource()

> **subscribeToResource**(`uri`, `callback`): () => `void`

Defined in: [mcp/serverCapabilities.ts:235](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L235)

Subscribe to resource changes

#### Parameters

##### uri

`string`

##### callback

[`ResourceSubscriptionCallback`](../type-aliases/ResourceSubscriptionCallback.md)

#### Returns

() => `void`

---

### notifyResourceChanged()

> **notifyResourceChanged**(`uri`): `Promise`\<`void`\>

Defined in: [mcp/serverCapabilities.ts:280](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L280)

Notify subscribers of resource change

#### Parameters

##### uri

`string`

#### Returns

`Promise`\<`void`\>

---

### getResource()

> **getResource**(`uri`): [`RegisteredResource`](../type-aliases/RegisteredResource.md) \| `undefined`

Defined in: [mcp/serverCapabilities.ts:325](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L325)

Get resource by URI

#### Parameters

##### uri

`string`

#### Returns

[`RegisteredResource`](../type-aliases/RegisteredResource.md) \| `undefined`

---

### registerPrompt()

> **registerPrompt**(`prompt`): `this`

Defined in: [mcp/serverCapabilities.ts:390](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L390)

Register a prompt

#### Parameters

##### prompt

[`RegisteredPrompt`](../type-aliases/RegisteredPrompt.md)

#### Returns

`this`

---

### unregisterPrompt()

> **unregisterPrompt**(`name`): `boolean`

Defined in: [mcp/serverCapabilities.ts:414](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L414)

Unregister a prompt

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### listPrompts()

> **listPrompts**(): [`MCPPrompt`](../type-aliases/MCPPrompt.md)[]

Defined in: [mcp/serverCapabilities.ts:430](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L430)

List all prompts

#### Returns

[`MCPPrompt`](../type-aliases/MCPPrompt.md)[]

---

### getPrompt()

> **getPrompt**(`name`, `args?`, `context?`): `Promise`\<[`PromptResult`](../type-aliases/PromptResult.md)\>

Defined in: [mcp/serverCapabilities.ts:441](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L441)

Get a prompt

#### Parameters

##### name

`string`

##### args?

`Record`\<`string`, [`JsonValue`](../type-aliases/JsonValue.md)\> = `{}`

##### context?

[`JsonObject`](../type-aliases/JsonObject.md)

#### Returns

`Promise`\<[`PromptResult`](../type-aliases/PromptResult.md)\>

---

### getPromptDefinition()

> **getPromptDefinition**(`name`): [`RegisteredPrompt`](../type-aliases/RegisteredPrompt.md) \| `undefined`

Defined in: [mcp/serverCapabilities.ts:503](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L503)

Get prompt by name

#### Parameters

##### name

`string`

#### Returns

[`RegisteredPrompt`](../type-aliases/RegisteredPrompt.md) \| `undefined`

---

### getCapabilities()

> **getCapabilities**(): `object`

Defined in: [mcp/serverCapabilities.ts:540](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L540)

Get capabilities object for MCP protocol

#### Returns

`object`

##### resources?

> `optional` **resources?**: `object`

###### resources.subscribe?

> `optional` **subscribe?**: `boolean`

###### resources.listChanged?

> `optional` **listChanged?**: `boolean`

##### prompts?

> `optional` **prompts?**: `object`

###### prompts.listChanged?

> `optional` **listChanged?**: `boolean`

---

### getStatistics()

> **getStatistics**(): `object`

Defined in: [mcp/serverCapabilities.ts:568](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L568)

Get statistics

#### Returns

`object`

##### resourceCount

> **resourceCount**: `number`

##### templateCount

> **templateCount**: `number`

##### promptCount

> **promptCount**: `number`

##### subscriptionCount

> **subscriptionCount**: `number`

---

### clear()

> **clear**(): `void`

Defined in: [mcp/serverCapabilities.ts:590](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L590)

Clear all resources and prompts

#### Returns

`void`
