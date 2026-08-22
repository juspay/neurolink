[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MessageBus

# Class: MessageBus

Defined in: [agent/communication/message-bus.ts:26](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L26)

Message Bus - Central hub for agent communication

## Constructors

### Constructor

> **new MessageBus**(`config?`): `MessageBus`

Defined in: [agent/communication/message-bus.ts:41](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L41)

#### Parameters

##### config?

[`MessageBusConfig`](../type-aliases/MessageBusConfig.md)

#### Returns

`MessageBus`

## Methods

### subscribe()

> **subscribe**(`topic`, `subscriberId`, `handler`, `options?`): `string`

Defined in: [agent/communication/message-bus.ts:64](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L64)

Subscribe to a topic

#### Parameters

##### topic

`string`

##### subscriberId

`string`

##### handler

[`MessageHandler`](../type-aliases/MessageHandler.md)

##### options?

[`SubscriptionOptions`](../type-aliases/SubscriptionOptions.md)

#### Returns

`string`

---

### unsubscribe()

> **unsubscribe**(`subscriptionId`): `boolean`

Defined in: [agent/communication/message-bus.ts:101](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L101)

Unsubscribe from a topic

#### Parameters

##### subscriptionId

`string`

#### Returns

`boolean`

---

### unsubscribeAll()

> **unsubscribeAll**(`subscriberId`): `number`

Defined in: [agent/communication/message-bus.ts:122](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L122)

Unsubscribe all subscriptions for an agent

#### Parameters

##### subscriberId

`string`

#### Returns

`number`

---

### publish()

> **publish**(`topic`, `senderId`, `payload`, `options?`): `Promise`\<`void`\>

Defined in: [agent/communication/message-bus.ts:139](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L139)

Publish a message to a topic

#### Parameters

##### topic

`string`

##### senderId

`string`

##### payload

`unknown`

##### options?

`Partial`\<`Omit`\<[`AgentMessage`](../type-aliases/AgentMessage.md), `"id"` \| `"timestamp"` \| `"topic"` \| `"senderId"` \| `"payload"`\>\>

#### Returns

`Promise`\<`void`\>

---

### sendDirect()

> **sendDirect**(`senderId`, `recipientId`, `payload`, `options?`): `Promise`\<`void`\>

Defined in: [agent/communication/message-bus.ts:168](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L168)

Send a direct message to a specific agent

#### Parameters

##### senderId

`string`

##### recipientId

`string`

##### payload

`unknown`

##### options?

`Partial`\<`Omit`\<[`AgentMessage`](../type-aliases/AgentMessage.md), `"id"` \| `"timestamp"` \| `"senderId"` \| `"payload"` \| `"recipientId"`\>\>

#### Returns

`Promise`\<`void`\>

---

### request()

> **request**(`topic`, `senderId`, `payload`, `timeout?`): `Promise`\<[`AgentMessage`](../type-aliases/AgentMessage.md)\>

Defined in: [agent/communication/message-bus.ts:199](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L199)

Send a request and wait for response

#### Parameters

##### topic

`string`

##### senderId

`string`

##### payload

`unknown`

##### timeout?

`number`

#### Returns

`Promise`\<[`AgentMessage`](../type-aliases/AgentMessage.md)\>

---

### reply()

> **reply**(`originalMessage`, `senderId`, `payload`): `Promise`\<`void`\>

Defined in: [agent/communication/message-bus.ts:248](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L248)

Reply to a request

#### Parameters

##### originalMessage

[`AgentMessage`](../type-aliases/AgentMessage.md)

##### senderId

`string`

##### payload

`unknown`

#### Returns

`Promise`\<`void`\>

---

### broadcast()

> **broadcast**(`senderId`, `payload`, `excludeTopics?`): `Promise`\<`void`\>

Defined in: [agent/communication/message-bus.ts:266](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L266)

Broadcast a message to all subscribers

#### Parameters

##### senderId

`string`

##### payload

`unknown`

##### excludeTopics?

`string`[]

#### Returns

`Promise`\<`void`\>

---

### getHistory()

> **getHistory**(`topic?`, `limit?`): [`AgentMessage`](../type-aliases/AgentMessage.md)[]

Defined in: [agent/communication/message-bus.ts:415](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L415)

Get message history for a topic

#### Parameters

##### topic?

`string`

##### limit?

`number`

#### Returns

[`AgentMessage`](../type-aliases/AgentMessage.md)[]

---

### getDeadLetterQueue()

> **getDeadLetterQueue**(): [`AgentMessage`](../type-aliases/AgentMessage.md)[]

Defined in: [agent/communication/message-bus.ts:430](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L430)

Get dead letter queue messages

#### Returns

[`AgentMessage`](../type-aliases/AgentMessage.md)[]

---

### clearDeadLetterQueue()

> **clearDeadLetterQueue**(): `void`

Defined in: [agent/communication/message-bus.ts:437](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L437)

Clear dead letter queue

#### Returns

`void`

---

### replayHistory()

> **replayHistory**(`topic`, `subscriberId`, `since?`): `Promise`\<`void`\>

Defined in: [agent/communication/message-bus.ts:444](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L444)

Replay messages from history

#### Parameters

##### topic

`string`

##### subscriberId

`string`

##### since?

`number`

#### Returns

`Promise`\<`void`\>

---

### getTopics()

> **getTopics**(): `string`[]

Defined in: [agent/communication/message-bus.ts:472](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L472)

Get all topics

#### Returns

`string`[]

---

### getSubscriberCount()

> **getSubscriberCount**(`topic`): `number`

Defined in: [agent/communication/message-bus.ts:479](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L479)

Get subscriber count for a topic

#### Parameters

##### topic

`string`

#### Returns

`number`

---

### getStats()

> **getStats**(): `object`

Defined in: [agent/communication/message-bus.ts:486](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L486)

Get statistics

#### Returns

`object`

##### topicCount

> **topicCount**: `number`

##### totalSubscriptions

> **totalSubscriptions**: `number`

##### historySize

> **historySize**: `number`

##### deadLetterQueueSize

> **deadLetterQueueSize**: `number`

##### pendingRequests

> **pendingRequests**: `number`

---

### on()

> **on**(`event`, `handler`): `void`

Defined in: [agent/communication/message-bus.ts:510](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L510)

Subscribe to bus events

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`

---

### off()

> **off**(`event`, `handler`): `void`

Defined in: [agent/communication/message-bus.ts:517](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L517)

Unsubscribe from bus events

#### Parameters

##### event

`string`

##### handler

(...`args`) => `void`

#### Returns

`void`

---

### shutdown()

> **shutdown**(): `void`

Defined in: [agent/communication/message-bus.ts:524](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/agent/communication/message-bus.ts#L524)

Shutdown the message bus

#### Returns

`void`
