---
title: NeuroLink Tutorials
description: Step-by-step tutorials for building production AI applications with NeuroLink
keywords: tutorials, learning, step-by-step, chat app, RAG, hands-on
---

# Tutorials

Step-by-step tutorials for building real-world AI applications with NeuroLink.

---

## 📚 Available Tutorials

### 💬 [Chat Application](chat-app.md)

**Build a production-ready chat application with streaming, conversation history, and multi-provider support**

**What You'll Build:**

- Real-time streaming responses
- Persistent conversation history with PostgreSQL
- Multi-provider failover (OpenAI → Anthropic → Google AI)
- Cost optimization with free tier prioritization
- Modern React/Next.js UI
- User authentication and sessions

**Time:** 45-60 minutes
**Level:** Intermediate
**Tech Stack:** Next.js 14+, TypeScript, PostgreSQL, Prisma, TailwindCSS

[Start Tutorial →](chat-app.md)

---

### 🔍 [RAG System](rag.md)

**Build a Retrieval-Augmented Generation system for knowledge base Q&A**

**What You'll Build:**

- Document ingestion from multiple formats (PDF, MD, TXT)
- Semantic search with vector embeddings
- AI-powered Q&A with source citations
- MCP integration for file system access
- Vector storage with Pinecone or in-memory
- Context-aware responses with relevance scoring

**Time:** 60-90 minutes
**Level:** Advanced
**Tech Stack:** Next.js 14+, TypeScript, OpenAI Embeddings, Pinecone, NeuroLink MCP

[Start Tutorial →](rag.md)

---

## 🎯 Learning Path

### For Beginners

1. **[Quick Start](../getting-started/quick-start.md)** - Get familiar with NeuroLink basics
2. **[Provider Setup](../getting-started/provider-setup.md)** - Configure your first AI provider
3. **[Chat Application Tutorial](chat-app.md)** - Build your first AI application

### For Intermediate Developers

1. **[Chat Application Tutorial](chat-app.md)** - Learn streaming, state management, database integration
2. **[Use Cases Guide](../guides/examples/use-cases.md)** - Explore 12+ production use cases
3. **[Enterprise Guides](../guides/enterprise/multi-provider-failover.md)** - Production deployment patterns

### For Advanced Developers

1. **[RAG System Tutorial](rag.md)** - Build advanced retrieval-augmented generation
2. **[MCP Server Catalog](../guides/mcp/server-catalog.md)** - Integrate 58+ MCP servers
3. **[Code Patterns](../guides/examples/code-patterns.md)** - Master production patterns

---

## 📖 Prerequisites

All tutorials assume you have:

- Node.js 18+ installed
- Basic TypeScript/JavaScript knowledge
- At least one AI provider API key
- Familiarity with React (for UI tutorials)

---

## 🚀 What to Build Next

After completing the tutorials, consider building:

- **Customer Support Bot** - Automated support with intent classification
- **Content Generation Pipeline** - Multi-stage content creation
- **Code Review Automation** - AI-powered code analysis
- **Document Analysis System** - Extract insights from PDFs
- **Translation Service** - Multi-language translation
- **SQL Query Generator** - Natural language to SQL

See [Use Cases Guide](../guides/examples/use-cases.md) for implementation details.

---

## 💬 Need Help?

- **Documentation Issues:** [GitHub Issues](https://github.com/juspay/neurolink/issues)
- **Questions:** Check [FAQ](../reference/faq.md) or [Troubleshooting](../reference/troubleshooting.md)
- **Examples:** Browse [Examples & Use Cases](../guides/examples/use-cases.md)

---

## Related Resources

- **[Quick Start](../getting-started/quick-start.md)** - NeuroLink basics
- **[Provider Guides](../getting-started/providers/huggingface.md)** - Provider-specific setup
- **[Enterprise Guides](../guides/enterprise/multi-provider-failover.md)** - Production patterns
- **[Framework Integration](../guides/frameworks/nextjs.md)** - Framework-specific guides
