# NeuroLink Enterprise Application Example

Demonstrates enterprise features: HITL, Redis memory, audit logging, rate limiting.

## Features

- Human-in-the-Loop (HITL) approval workflows
- Redis-based conversation memory
- Audit logging for compliance
- Rate limiting
- Docker deployment

## Quick Start

```bash
# Start Redis
docker-compose up -d redis

# Install and run
npm install
cp .env.example .env
npm run dev
```

## Enterprise Features Demonstrated

### HITL Workflow

Requires human approval before executing sensitive tools

### Redis Memory

Persistent conversation memory across sessions

### Audit Logging

Log of each HITL approval request and decision (`auditLogging`); a log, not a compliance control

### Rate Limiting

Per-user and global rate limits
