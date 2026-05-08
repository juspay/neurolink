[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / GraphRAG

# Class: GraphRAG

Defined in: [rag/graphRag/graphRAG.ts:29](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L29)

Graph-based Retrieval Augmented Generation

Creates a knowledge graph from document chunks where nodes represent
documents and edges represent semantic relationships based on
embedding similarity.

## Constructors

### Constructor

> **new GraphRAG**(`config?`): `GraphRAG`

Defined in: [rag/graphRag/graphRAG.ts:35](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L35)

#### Parameters

##### config?

[`GraphRAGConfig`](../type-aliases/GraphRAGConfig.md)

#### Returns

`GraphRAG`

## Methods

### createGraph()

> **createGraph**(`chunks`, `embeddings`): `void`

Defined in: [rag/graphRag/graphRAG.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L46)

Create a knowledge graph from document chunks and embeddings

#### Parameters

##### chunks

[`GraphChunk`](../type-aliases/GraphChunk.md)[]

Array of document chunks

##### embeddings

[`GraphEmbedding`](../type-aliases/GraphEmbedding.md)[]

Corresponding embedding vectors

#### Returns

`void`

---

### query()

> **query**(`params`): [`RankedNode`](../type-aliases/RankedNode.md)[]

Defined in: [rag/graphRag/graphRAG.ts:122](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L122)

Query the graph using random walk with restart

#### Parameters

##### params

[`GraphQueryParams`](../type-aliases/GraphQueryParams.md)

Query parameters including embedding vector

#### Returns

[`RankedNode`](../type-aliases/RankedNode.md)[]

Ranked nodes by relevance

---

### addNode()

> **addNode**(`chunk`, `embedding`): `string`

Defined in: [rag/graphRag/graphRAG.ts:224](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L224)

Add a single node to the graph

#### Parameters

##### chunk

[`GraphChunk`](../type-aliases/GraphChunk.md)

Document chunk

##### embedding

[`GraphEmbedding`](../type-aliases/GraphEmbedding.md)

Embedding vector

#### Returns

`string`

Node ID

---

### removeNode()

> **removeNode**(`id`): `boolean`

Defined in: [rag/graphRag/graphRAG.ts:280](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L280)

Remove a node and its edges from the graph

#### Parameters

##### id

`string`

Node ID to remove

#### Returns

`boolean`

True if node was removed

---

### getStats()

> **getStats**(): [`GraphStats`](../type-aliases/GraphStats.md)

Defined in: [rag/graphRag/graphRAG.ts:303](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L303)

Get graph statistics

#### Returns

[`GraphStats`](../type-aliases/GraphStats.md)

---

### getNode()

> **getNode**(`id`): [`GraphNode`](../type-aliases/GraphNode.md) \| `undefined`

Defined in: [rag/graphRag/graphRAG.ts:320](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L320)

Get a node by ID

#### Parameters

##### id

`string`

#### Returns

[`GraphNode`](../type-aliases/GraphNode.md) \| `undefined`

---

### getAllNodes()

> **getAllNodes**(): [`GraphNode`](../type-aliases/GraphNode.md)[]

Defined in: [rag/graphRag/graphRAG.ts:327](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L327)

Get all nodes

#### Returns

[`GraphNode`](../type-aliases/GraphNode.md)[]

---

### getEdges()

> **getEdges**(`nodeId`): [`GraphEdge`](../type-aliases/GraphEdge.md)[]

Defined in: [rag/graphRag/graphRAG.ts:334](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L334)

Get edges for a node

#### Parameters

##### nodeId

`string`

#### Returns

[`GraphEdge`](../type-aliases/GraphEdge.md)[]

---

### findConnectedComponents()

> **findConnectedComponents**(): `string`[][]

Defined in: [rag/graphRag/graphRAG.ts:341](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L341)

Find connected components in the graph

#### Returns

`string`[][]

---

### updateThreshold()

> **updateThreshold**(`threshold`): `void`

Defined in: [rag/graphRag/graphRAG.ts:428](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L428)

Update similarity threshold and rebuild edges

#### Parameters

##### threshold

`number`

#### Returns

`void`

---

### toJSON()

> **toJSON**(): `object`

Defined in: [rag/graphRag/graphRAG.ts:476](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L476)

Serialize graph to JSON

#### Returns

`object`

##### nodes

> **nodes**: [`GraphNode`](../type-aliases/GraphNode.md)[]

##### edges

> **edges**: `object`[]

##### config

> **config**: `object`

###### config.dimension

> **dimension**: `number`

###### config.threshold

> **threshold**: `number`

---

### fromJSON()

> `static` **fromJSON**(`json`): `GraphRAG`

Defined in: [rag/graphRag/graphRAG.ts:497](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/graphRag/graphRAG.ts#L497)

Load graph from JSON

#### Parameters

##### json

###### nodes

[`GraphNode`](../type-aliases/GraphNode.md)[]

###### edges

`object`[]

###### config

\{ `dimension`: `number`; `threshold`: `number`; \}

###### config.dimension

`number`

###### config.threshold

`number`

#### Returns

`GraphRAG`
