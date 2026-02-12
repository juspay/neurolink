---
title: NeuroLink Guides
description: Comprehensive guides for enterprise deployment, framework integration, and production patterns
keywords: guides, enterprise, frameworks, production, best practices
---

# Guides

Comprehensive guides for building production-ready AI applications with NeuroLink.

---

## 🎯 Essential Guides

Core guides for getting the most out of NeuroLink.

| Guide                                                 | Description                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| **[Provider Selection Guide](provider-selection.md)** | Interactive wizard to choose the best provider for your use case       |
| **[GitHub Action Guide](github-action.md)**           | Run AI-powered workflows in GitHub Actions with 13 providers           |
| **[Troubleshooting](troubleshooting.md)**             | Common issues, debugging tips, and solutions for NeuroLink CLI and SDK |

---

## 🗄️ Redis & Persistence

Guides for setting up and managing Redis-backed conversation memory.

| Guide                                             | Description                                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| **[Redis Configuration](redis-configuration.md)** | Production-ready Redis setup with cluster, security, and cloud providers |
| **[Redis Migration](redis-migration.md)**         | Migration patterns for upgrading Redis and moving between environments   |

See also: [Redis Quick Start](../getting-started/redis-quickstart.md) in Getting Started

---

## Migration Guides

Migrate from other AI frameworks to NeuroLink.

| Guide                                                     | Description                                                                     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **[From LangChain](migration/from-langchain.md)**         | Complete migration guide from LangChain with concept mapping and examples       |
| **[From Vercel AI SDK](migration/from-vercel-ai-sdk.md)** | Migrate from Vercel AI SDK with Next.js-focused patterns and streaming examples |
| **[Migration Guide (Legacy)](migration-guide.md)**        | General migration guide for older versions                                      |

---

## 🏢 Enterprise Guides

Production-ready patterns for enterprise AI deployments.

| Guide                                                                | Description                                                 |
| -------------------------------------------------------------------- | ----------------------------------------------------------- |
| **[Multi-Provider Failover](enterprise/multi-provider-failover.md)** | High availability with automatic failover between providers |
| **[Load Balancing](enterprise/load-balancing.md)**                   | Distribute traffic across providers with 6 strategies       |
| **[Cost Optimization](enterprise/cost-optimization.md)**             | Reduce AI costs by 80-95% with smart routing                |
| **[Compliance & Security](enterprise/compliance.md)**                | GDPR, SOC2, HIPAA compliance patterns                       |
| **[Multi-Region Deployment](enterprise/multi-region.md)**            | Global deployment with geographic routing                   |
| **[Monitoring & Observability](enterprise/monitoring.md)**           | Prometheus, Grafana, CloudWatch integration                 |
| **[Audit Trails](enterprise/audit-trails.md)**                       | Comprehensive logging for compliance                        |

---

## 🔧 MCP Integration

Model Context Protocol server catalog and integration patterns.

| Guide                                       | Description                                                 |
| ------------------------------------------- | ----------------------------------------------------------- |
| **[Server Catalog](mcp/server-catalog.md)** | 58+ MCP servers for file systems, databases, APIs, and more |

See also: [MCP Tools Showcase](../features/mcp-tools-showcase.md) for detailed tool documentation

---

## 🖥️ Server Adapters :material-new-box:{ .new-feature title="New in v8.42" }

Deploy NeuroLink as production-ready HTTP APIs.

| Guide                                                      | Description                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| **[Server Adapters Overview](./server-adapters/index.md)** | Quick start guide for exposing AI agents as HTTP APIs               |
| **[Hono Adapter](./server-adapters/hono.md)**              | Recommended lightweight adapter for serverless and edge deployments |
| **[Express Adapter](./server-adapters/express.md)**        | Integration with existing Express applications                      |
| **[Fastify Adapter](./server-adapters/fastify.md)**        | High-performance adapter with built-in schema validation            |
| **[Koa Adapter](./server-adapters/koa.md)**                | Modern, minimalist adapter with clean middleware composition        |
| **[Security Guide](./server-adapters/security.md)**        | Authentication, authorization, and security best practices          |
| **[Deployment Guide](./server-adapters/deployment.md)**    | Production deployment patterns with Docker and Kubernetes           |

---

## 🎨 Framework Integration

Framework-specific integration guides.

| Framework                                | Description                                              |
| ---------------------------------------- | -------------------------------------------------------- |
| **[Next.js](frameworks/nextjs.md)**      | App Router, Server Components, Server Actions, Streaming |
| **[Express.js](frameworks/express.md)**  | RESTful APIs, middleware, authentication, rate limiting  |
| **[SvelteKit](frameworks/sveltekit.md)** | SSR, load functions, form actions, streaming             |

---

## 💡 Examples

Real-world use cases and production code patterns.

| Guide                                          | Description                                        |
| ---------------------------------------------- | -------------------------------------------------- |
| **[Use Cases](examples/use-cases.md)**         | 12+ production-ready use cases with complete code  |
| **[Code Patterns](examples/code-patterns.md)** | Best practices, design patterns, and anti-patterns |

---

## Next Steps

- **New to NeuroLink?** Start with [Quick Start](../getting-started/quick-start.md)
- **Need to choose a provider?** Use the [Provider Selection Guide](provider-selection.md)
- **Building a chat app?** Try our [Chat Application Tutorial](../tutorials/chat-app.md)
- **Need knowledge base Q&A?** Build a [RAG System](../tutorials/rag.md)
- **Want practical code examples?** Check the [Cookbook](../cookbook/index.md)
- **Migrating from another framework?** See our [Migration Guides](#migration-guides)
