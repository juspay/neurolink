# RAG Processing - CLI Reference

## Status: FULLY IMPLEMENTED

**Feature:** RAG Processing  
**CLI Commands:** 3 commands available  
**Last Updated:** January 31, 2026

> **Provider Defaults:** When `--provider` and `--model` are not specified, NeuroLink defaults to **Vertex AI** with **gemini-2.5-flash** for text generation tasks (like metadata extraction with `--extract`).
>
> **Embedding Models:** For `index` and `query` commands that require embeddings, NeuroLink **automatically selects the appropriate embedding model** for the provider:
>
> - **Vertex AI:** `text-embedding-004`
> - **OpenAI:** `text-embedding-3-small`
> - **Bedrock:** `amazon.titan-embed-text-v2:0`
>
> You can override this by specifying an embedding model explicitly with `--model`.

---

## Overview

The RAG (Retrieval-Augmented Generation) Processing feature provides a complete CLI interface for document processing, indexing, and semantic search. All three core commands are fully implemented and ready for use.

---

## Commands

### 1. `neurolink rag chunk <file>`

Chunk a document into smaller pieces for processing.

#### Syntax

```bash
neurolink rag chunk <file> [options]
```

#### Arguments

| Argument | Description               | Required |
| -------- | ------------------------- | -------- |
| `<file>` | Path to the file to chunk | Yes      |

#### Options

| Option       | Alias | Description                                 | Type    | Default         |
| ------------ | ----- | ------------------------------------------- | ------- | --------------- |
| `--strategy` | `-s`  | Chunking strategy to use                    | string  | Auto-detected   |
| `--maxSize`  | `-m`  | Maximum chunk size in characters            | number  | `1000`          |
| `--overlap`  | `-o`  | Overlap between chunks in characters        | number  | `200`           |
| `--format`   | `-f`  | Output format                               | string  | `text`          |
| `--output`   |       | Output file path (optional)                 | string  | stdout          |
| `--extract`  | `-e`  | Extract metadata (title, summary, keywords) | boolean | `false`         |
| `--provider` | `-p`  | Provider for semantic chunking/metadata     | string  | From env/config |
| `--model`    |       | Model for semantic chunking/metadata        | string  | From env/config |
| `--verbose`  | `-v`  | Enable verbose output                       | boolean | `false`         |

#### Strategy Options

| Strategy    | Description                        | Auto-detected for      |
| ----------- | ---------------------------------- | ---------------------- |
| `character` | Fixed-size character splits        | -                      |
| `recursive` | Paragraph/sentence-aware splits    | `.txt`, `.csv`, `.pdf` |
| `sentence`  | Sentence boundary splitting        | -                      |
| `token`     | Token-based splitting              | -                      |
| `markdown`  | Markdown structure-aware splitting | `.md`, `.markdown`     |
| `html`      | HTML tag-aware splitting           | `.html`, `.htm`        |
| `json`      | JSON structure-aware splitting     | `.json`                |
| `latex`     | LaTeX structure-aware splitting    | `.tex`, `.latex`       |
| `semantic`  | LLM-powered semantic splitting     | -                      |

#### Format Options

| Format  | Description                                  |
| ------- | -------------------------------------------- |
| `text`  | Human-readable text with chunk separators    |
| `json`  | Full JSON output with all chunk data         |
| `table` | Tabular summary with ID, length, and preview |

#### Examples

**Basic chunking with auto-detected strategy:**

```bash
neurolink rag chunk document.md
```

**Chunk with specific strategy and size:**

```bash
neurolink rag chunk document.txt --strategy recursive --maxSize 500 --overlap 100
```

**Output as JSON to file:**

```bash
neurolink rag chunk document.md --format json --output chunks.json
```

**Extract metadata using LLM:**

```bash
neurolink rag chunk document.md --extract --provider vertex --model gemini-2.5-flash
```

**Verbose output with table format:**

```bash
neurolink rag chunk document.md --format table --verbose
```

#### Output Examples

**Text format (default):**

```
--- Chunk 1 (487 chars) ---
# Introduction

This document covers the basics of RAG processing...

--- Chunk 2 (523 chars) ---
## Architecture

The system consists of three main components...
```

**Table format:**

```
#  | ID       | Length | Preview
---+----------+--------+---------------------------------------------------
1  | a1b2c3d4 | 487    | # Introduction This document covers the basics...
2  | e5f6g7h8 | 523    | ## Architecture The system consists of three m...
```

**JSON format:**

```json
[
  {
    "id": "a1b2c3d4-...",
    "text": "# Introduction\n\nThis document covers...",
    "metadata": {
      "source": "document.md",
      "title": "Introduction",
      "summary": "Overview of RAG processing basics",
      "keywords": ["RAG", "introduction", "basics"]
    }
  }
]
```

---

### 2. `neurolink rag index <file>`

Index a document for semantic search.

#### Syntax

```bash
neurolink rag index <file> [options]
```

#### Arguments

| Argument | Description               | Required |
| -------- | ------------------------- | -------- |
| `<file>` | Path to the file to index | Yes      |

#### Options

| Option        | Alias | Description                          | Type    | Default                    |
| ------------- | ----- | ------------------------------------ | ------- | -------------------------- |
| `--indexName` | `-n`  | Name for the index                   | string  | Filename without extension |
| `--strategy`  | `-s`  | Chunking strategy to use             | string  | Auto-detected              |
| `--maxSize`   | `-m`  | Maximum chunk size in characters     | number  | `1000`                     |
| `--overlap`   | `-o`  | Overlap between chunks in characters | number  | `200`                      |
| `--provider`  | `-p`  | Provider for embeddings              | string  | From env/config            |
| `--model`     |       | Model for embeddings                 | string  | From env/config            |
| `--graph`     | `-g`  | Build Graph RAG index                | boolean | `false`                    |
| `--verbose`   | `-v`  | Enable verbose output                | boolean | `false`                    |

#### Strategy Options

Same as the `chunk` command. See [Strategy Options](#strategy-options) above.

#### Examples

**Basic indexing:**

```bash
# Uses default provider (Vertex) with automatic embedding model (text-embedding-004)
neurolink rag index document.md
```

**Index with custom name:**

```bash
neurolink rag index document.md --indexName my-docs
```

**Index with Graph RAG:**

```bash
neurolink rag index document.md --graph --verbose
```

**Custom chunking with explicit embedding model:**

```bash
# You can specify an embedding model explicitly
neurolink rag index document.md \
  --strategy markdown \
  --maxSize 800 \
  --overlap 150 \
  --provider openai \
  --model text-embedding-3-small
```

**Using Vertex AI (default):**

```bash
# Provider defaults to Vertex, embedding model auto-selects to text-embedding-004
neurolink rag index document.md --verbose
```

#### Output Examples

**Standard output:**

```
Indexed 15 chunks as "document"
```

**With Graph RAG:**

```
Indexed 15 chunks as "document" with Graph RAG
```

**Verbose output:**

```
Indexed 15 chunks as "document" with Graph RAG

--- Index Summary ---
Index name: document
Total chunks: 15
Embedding dimension: 1536
Graph nodes: 15
Graph edges: 42
```

---

### 3. `neurolink rag query <query>`

Query indexed documents using semantic search.

#### Syntax

```bash
neurolink rag query <query> [options]
```

#### Arguments

| Argument  | Description         | Required |
| --------- | ------------------- | -------- |
| `<query>` | Search query string | Yes      |

#### Options

| Option        | Alias | Description                       | Type    | Default               |
| ------------- | ----- | --------------------------------- | ------- | --------------------- |
| `--indexName` | `-n`  | Name of the index to query        | string  | First available index |
| `--topK`      | `-k`  | Number of results to return       | number  | `5`                   |
| `--hybrid`    | `-h`  | Use hybrid search (vector + BM25) | boolean | `false`               |
| `--graph`     | `-g`  | Use Graph RAG search              | boolean | `false`               |
| `--provider`  | `-p`  | Provider for embeddings           | string  | From env/config       |
| `--model`     |       | Model for embeddings              | string  | From env/config       |
| `--format`    | `-f`  | Output format                     | string  | `text`                |
| `--verbose`   | `-v`  | Enable verbose output             | boolean | `false`               |

#### Search Modes

| Mode      | Flag       | Description                                         |
| --------- | ---------- | --------------------------------------------------- |
| Vector    | (default)  | Pure vector similarity search using embeddings      |
| Hybrid    | `--hybrid` | Combines vector search with BM25 keyword matching   |
| Graph RAG | `--graph`  | Traverses knowledge graph for context-aware results |

#### Format Options

| Format  | Description                                   |
| ------- | --------------------------------------------- |
| `text`  | Full text results with score headers          |
| `json`  | Complete JSON output with id, score, and text |
| `table` | Compact table with scores and text previews   |

#### Examples

**Basic query:**

```bash
# Uses default provider (Vertex) with automatic embedding model (text-embedding-004)
neurolink rag query "How does RAG processing work?"
```

**Query specific index with more results:**

```bash
neurolink rag query "authentication methods" --indexName my-docs --topK 10
```

**Hybrid search:**

```bash
neurolink rag query "vector embeddings" --hybrid
```

**Graph RAG search:**

```bash
neurolink rag query "system architecture" --graph --verbose
```

**JSON output with OpenAI embeddings:**

```bash
neurolink rag query "API endpoints" --format json --provider openai
```

#### Output Examples

**Text format (default):**

```
Found 5 results

Search Results:

--- Result 1 (Score: 0.8934) ---
RAG processing works by first chunking documents into smaller pieces,
then creating vector embeddings for each chunk...

--- Result 2 (Score: 0.8521) ---
The retrieval phase uses similarity search to find the most relevant
chunks based on the query embedding...
```

**Table format:**

```
Found 5 results

Search Results:

[1] Score: 0.8934
RAG processing works by first chunking documents into smaller pieces, then creating vector embeddings for each chunk...

[2] Score: 0.8521
The retrieval phase uses similarity search to find the most relevant chunks based on the query embedding...
```

**JSON format:**

```json
[
  {
    "id": "a1b2c3d4-...",
    "score": 0.8934,
    "text": "RAG processing works by first chunking documents..."
  },
  {
    "id": "e5f6g7h8-...",
    "score": 0.8521,
    "text": "The retrieval phase uses similarity search..."
  }
]
```

**Verbose output:**

```
Found 5 results

Search Results:
...

--- Query Info ---
Index: document
Query: How does RAG processing work?
Search type: Hybrid
```

---

## Workflow Example

A typical RAG workflow using the CLI:

```bash
# Step 1: Chunk a document to preview the splitting
neurolink rag chunk docs/guide.md --format table --verbose

# Step 2: Index the document for search
# Note: Embedding model is automatically selected based on provider
# Default: Vertex AI with text-embedding-004
neurolink rag index docs/guide.md --indexName guide --graph --verbose

# Step 3: Query the indexed document
# Uses same embedding model as indexing for consistency
neurolink rag query "How do I configure authentication?" --indexName guide --topK 3

# Step 4: Use hybrid search for better results
neurolink rag query "API rate limits" --indexName guide --hybrid --format json

# Alternative: Use OpenAI embeddings
neurolink rag index docs/guide.md --indexName guide-openai --provider openai --verbose
neurolink rag query "authentication" --indexName guide-openai --provider openai
```

---

## Environment Variables

The following environment variables can be used to configure default behavior:

### Provider & Authentication

| Variable                  | Description                              | Default  |
| ------------------------- | ---------------------------------------- | -------- |
| `NEUROLINK_PROVIDER`      | Default AI provider                      | `vertex` |
| `AI_PROVIDER`             | Alternative env var for default provider | `vertex` |
| `GOOGLE_CLOUD_PROJECT_ID` | Google Cloud project ID (for Vertex AI)  | -        |
| `GOOGLE_API_KEY`          | Google AI Studio API key                 | -        |
| `OPENAI_API_KEY`          | OpenAI API key                           | -        |
| `ANTHROPIC_API_KEY`       | Anthropic API key                        | -        |

### Embedding Models (for `index` and `query` commands)

| Variable                       | Description                    | Default                        |
| ------------------------------ | ------------------------------ | ------------------------------ |
| `NEUROLINK_EMBEDDING_MODEL`    | Global default embedding model | Provider-specific default      |
| `VERTEX_EMBEDDING_MODEL`       | Vertex AI embedding model      | `text-embedding-004`           |
| `GOOGLE_EMBEDDING_MODEL`       | Google AI embedding model      | `text-embedding-004`           |
| `OPENAI_EMBEDDING_MODEL`       | OpenAI embedding model         | `text-embedding-3-small`       |
| `AZURE_OPENAI_EMBEDDING_MODEL` | Azure OpenAI embedding model   | `text-embedding-3-small`       |
| `BEDROCK_EMBEDDING_MODEL`      | AWS Bedrock embedding model    | `amazon.titan-embed-text-v2:0` |

### Generation Models (for `chunk --extract` and other text generation)

| Variable             | Description                    | Default            |
| -------------------- | ------------------------------ | ------------------ |
| `VERTEX_MODEL`       | Default model for Vertex AI    | `gemini-2.5-flash` |
| `OPENAI_MODEL`       | Default model for OpenAI       | `gpt-4o-mini`      |
| `AZURE_OPENAI_MODEL` | Default model for Azure OpenAI | Deployment-based   |
| `BEDROCK_MODEL`      | Default model for AWS Bedrock  | Provider-specific  |

### Embedding Model Resolution Order

For `index` and `query` commands, the embedding model is resolved in this order:

1. **CLI `--model` flag** (if it's an embedding model)
2. **`NEUROLINK_EMBEDDING_MODEL`** (global embedding model)
3. **Provider-specific embedding env vars** (e.g., `VERTEX_EMBEDDING_MODEL`)
4. **Provider's default model env var** (if it's an embedding model, e.g., if `VERTEX_MODEL=text-embedding-004`)
5. **Provider-specific default embedding model** (e.g., `text-embedding-004` for Vertex)
6. **Fallback:** OpenAI `text-embedding-3-small`

> **Note:** The RAG CLI is smart about model selection. Even if you have `VERTEX_MODEL=gemini-2.5-flash` set for text generation, the `index` and `query` commands will automatically use the appropriate embedding model for your provider.
>
> If you explicitly specify a model with `--model`, ensure it's an embedding model that supports the `embed()` operation.

---

## Error Handling

### Common Errors

**File not found:**

```
File not found: /path/to/document.md
```

Ensure the file path is correct and the file exists.

**No indexed documents:**

```
No indexed documents found. Run 'neurolink rag index' first.
```

You must index a document before querying. Run `neurolink rag index <file>` first.

**Index not found:**

```
Index "my-docs" not found.
```

The specified index name doesn't exist. Check available indices or use the default.

---

## Notes

- **In-memory storage:** Currently, indexed documents are stored in memory and will be lost when the process exits. For persistence, use the SDK API with a vector database.
- **Auto-detection:** When `--strategy` is not specified, the chunking strategy is automatically detected based on file extension.
- **Graph RAG:** Building a Graph RAG index (`--graph`) requires additional processing time but enables context-aware traversal during queries.

---

## See Also

- [RAG Feature Guide](../features/rag.md) - Main RAG documentation with CLI usage
- [RAG Configuration](./configuration) - Configuration reference
