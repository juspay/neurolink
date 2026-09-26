[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MessageBus

# Class: MessageBus

Message Bus - Central hub for agent communication

## Constructors

### Constructor

> **new MessageBus**(`config?`): `MessageBus`

#### Parameters

##### config?

[`MessageBusConfig`](../type-aliases/MessageBusConfig.md)

#### Returns

`MessageBus`

## Methods

### subscribe()

> **subscribe**(`topic`, `subscriberId`, `handler`, `options?`): `string`

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

Unsubscribe from a topic

#### Parameters

##### subscriptionId

`string`

#### Returns

`boolean`

---

### unsubscribeAll()

> **unsubscribeAll**(`subscriberId`): `number`

Unsubscribe all subscriptions for an agent

#### Parameters

##### subscriberId

`string`

#### Returns

`number`

---

### publish()

> **publish**(`topic`, `senderId`, `payload`, `options?`): `Promise`\<`void`\>

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

Get dead letter queue messages

#### Returns

[`AgentMessage`](../type-aliases/AgentMessage.md)[]

---

### clearDeadLetterQueue()

> **clearDeadLetterQueue**(): `void`

Clear dead letter queue

#### Returns

`void`

---

### replayHistory()

> **replayHistory**(`topic`, `subscriberId`, `since?`): `Promise`\<`void`\>

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

Get all topics

#### Returns

`string`[]

---

### getSubscriberCount()

> **getSubscriberCount**(`topic`): `number`

Get subscriber count for a topic

#### Parameters

##### topic

`string`

#### Returns

`number`

---

### getStats()

> **getStats**(): `object`

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

Shutdown the message bus

#### Returns

`void`
