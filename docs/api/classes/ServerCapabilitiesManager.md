[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerCapabilitiesManager

# Class: ServerCapabilitiesManager

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

Register a resource

#### Parameters

##### resource

[`RegisteredResource`](../type-aliases/RegisteredResource.md)

#### Returns

`this`

---

### registerResourceTemplate()

> **registerResourceTemplate**(`pattern`, `template`): `this`

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

Unregister a resource

#### Parameters

##### uri

`string`

#### Returns

`boolean`

---

### listResources()

> **listResources**(): [`MCPResource`](../type-aliases/MCPResource.md)[]

List all resources

#### Returns

[`MCPResource`](../type-aliases/MCPResource.md)[]

---

### readResource()

> **readResource**(`uri`, `context?`): `Promise`\<[`ResourceContent`](../type-aliases/ResourceContent.md)\>

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

Notify subscribers of resource change

#### Parameters

##### uri

`string`

#### Returns

`Promise`\<`void`\>

---

### getResource()

> **getResource**(`uri`): [`RegisteredResource`](../type-aliases/RegisteredResource.md) \| `undefined`

Get resource by URI

#### Parameters

##### uri

`string`

#### Returns

[`RegisteredResource`](../type-aliases/RegisteredResource.md) \| `undefined`

---

### registerPrompt()

> **registerPrompt**(`prompt`): `this`

Register a prompt

#### Parameters

##### prompt

[`RegisteredPrompt`](../type-aliases/RegisteredPrompt.md)

#### Returns

`this`

---

### unregisterPrompt()

> **unregisterPrompt**(`name`): `boolean`

Unregister a prompt

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### listPrompts()

> **listPrompts**(): [`MCPPrompt`](../type-aliases/MCPPrompt.md)[]

List all prompts

#### Returns

[`MCPPrompt`](../type-aliases/MCPPrompt.md)[]

---

### getPrompt()

> **getPrompt**(`name`, `args?`, `context?`): `Promise`\<[`PromptResult`](../type-aliases/PromptResult.md)\>

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

Get prompt by name

#### Parameters

##### name

`string`

#### Returns

[`RegisteredPrompt`](../type-aliases/RegisteredPrompt.md) \| `undefined`

---

### getCapabilities()

> **getCapabilities**(): `object`

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

Clear all resources and prompts

#### Returns

`void`
