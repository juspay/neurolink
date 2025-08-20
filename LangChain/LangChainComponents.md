# LangChain Components Guide

## Table of Contents

- [Overview](#overview)
- [Core Components](#core-components)
  - [Prompt Templates](#prompt-templates)
  - [Chains](#chains)
  - [Indexes](#indexes)
  - [Memory](#memory)
- [LangChain Libraries](#langchain-libraries)
- [Integration with NeuroLink](#integration-with-neurolink)

---

## Overview

**LangChain** is a comprehensive framework designed for building applications powered by Large Language Models (LLMs). It enables developers to create sophisticated AI applications by executing sequences of functions in a structured chain, providing modularity, reusability, and enhanced control over LLM interactions.

### Key Benefits

- **Modular Architecture**: Break down complex LLM workflows into manageable components
- **Chain Composition**: Create sophisticated applications by linking simple operations
- **Rich Ecosystem**: Extensive library of pre-built components and integrations

---

## Core Components

### Prompt Templates

Prompt templates help to translate user input and parameters into instructions for a language model. This can be used to guide a model's response, helping it understand the context and generate relevant and coherent language-based output. Prompt Templates take as input a dictionary, where each key represents a variable in the prompt template to fill in. Prompt Templates output a PromptValue. This PromptValue can be passed to an LLM or a ChatModel, and can also be cast to a string or a list of messages. The reason this PromptValue exists is to make it easy to switch between strings and messages.

#### Key Features

- **Dynamic Variable Substitution**: Insert variables into templates at runtime
- **Context Management**: Maintain conversation context and state
- **Format Flexibility**: Support for both string and chat-based interactions
- **Reusability**: Create templates once, use across multiple interactions

#### Types of Prompt Templates

##### 1. String Prompt Templates

Used for formatting single string prompts, ideal for simpler inputs and traditional text generation tasks.

**Use Cases:**

- Text completion
- Simple question answering
- Content generation

##### 2. Chat Prompt Templates

Designed for formatting structured conversation messages, supporting multi-turn dialogues with role-based messaging.

**Use Cases:**

- Conversational AI
- Multi-turn interactions
- Role-playing scenarios
- System-guided conversations

---

### Chains

Chains represent sequences of operations where the output of one step becomes the input for the next.

---

### Indexes

Indexes provide sophisticated data storage and retrieval capabilities, enabling applications to work with large datasets efficiently through embedding-based similarity search.

#### Vector Stores

Vector stores are specialized databases that store embedded representations of data and perform similarity searches using vector mathematics.

##### Pick your embedding model

OpenAI - “text-embedding-3-large”
Azure - “text-embedding-ada-002”
AWS - “amazon.titan-embed-text-v”
MistralAI - “mistral-embed”
Cohere - “embed-english-v3.0"

##### Vector Store Options

---

| Type         |
| ------------ |
| **Memory**   |
| **Chroma**   |
| **FAISS**    |
| **MongoDB**  |
| **Pinecone** |
| **Qdrant**   |

---

##### Core Vector Store Operations

    addDocuments: Add a list of texts to the vectorstore.
    deleteDocuments / delete: Delete a list of documents from the vectorstore.

##### Similarity Search Process

Search for similar documents to a given query.
-> Vectorstores embed and store the documents that added. If we pass in a query, the vectorstore will embed the query, perform a similarity search over the embedded documents, and return the most similar ones.
-> First, there needs to be a way to measure the similarity between the query and any embedded document
-> Second, there needs to be an algorithm (cosine similarity, euclidean distance, dot product) to efficiently perform this similarity search across all embedded documents.
The LangChain vectorstore interface has a similaritySearch method for all integrations. This will take the search query, create an embedding, find similar documents, and return them as a list of documents.

#### Document Loaders

Document loaders provide seamless integration with various data sources, enabling applications to ingest content from multiple platforms and formats.

#### Text Splitters

Text splitting is a critical preprocessing step that breaks down large documents into manageable chunks, optimizing them for embedding and retrieval.

##### Why Text Splitting is Essential

- **Model Limitations**: Overcome input size constraints of embedding models
- **Processing Consistency**: Ensure uniform handling of varying document lengths
- **Retrieval Quality**: Improve accuracy of similarity search results
- **Memory Efficiency**: Reduce computational overhead for large documents

##### Splitting Strategies

###### 1. Length-Based Splitting

**Token-Based Splitting:**

- Splits text based on token count
- Ideal for language model compatibility
- Ensures consistent token limits

**Character-Based Splitting:**

- Splits text by character count
- More predictable across different text types
- Simpler implementation and debugging

###### 2. Structure-Based Splitting

**Recursive Character Text Splitter:**

- Maintains semantic coherence by preserving larger units
- Hierarchical splitting: paragraphs → sentences → words
- Adapts to content structure automatically

###### 3. Document Structure-Based Splitting

Leverages inherent document structure for intelligent splitting:

- **Markdown**: Split by headers (`#`, `##`, `###`)
- **HTML**: Split using semantic tags (`<section>`, `<article>`, `<div>`)
- **JSON**: Split by objects or array elements
- **Code**: Split by functions, classes, or logical blocks

---

### Memory

Memory components enable LLMs to maintain state and context across interactions, transforming stateless models into stateful conversational agents.

#### Memory Types

- **Buffer Memory**: Store entire conversation history
- **Summary Memory**: Maintain condensed conversation summaries
- **Token Buffer Memory**: Limit memory by token count
- **Sliding Window Memory**: Keep only recent interactions
- **Entity Memory**: Track specific entities across conversations

---

## LangChain Libraries

The LangChain ecosystem consists of several specialized libraries designed for different aspects of LLM application development:

### Core Libraries

LangChain consists of multiple open-source libraries:

1. langchain-core: Different components (chat models, vector stores, tools)
2. langchain: chains, retrieval strategies
3. langchain-community: Third party integrations. Partner packages (e.g. @langchain/openai, @langchain/anthropic, etc.)
4. langgraph: It is an extension of LangChain that lets you build stateful, multi-step agent workflows as a graph instead of just linear chains. It is good for complex workflows.

### Specialized Extensions

#### LangGraph

Advanced workflow orchestration for complex, stateful agent workflows.

---

For detailed implementation examples and code samples, see [LangChain Component Implementation Guide](./LangChainComponentImplementation.md).

---
