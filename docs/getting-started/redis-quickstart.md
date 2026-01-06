# Redis Quick Start (5 Minutes)

Get Redis storage up and running with NeuroLink in under 5 minutes.

## Prerequisites

- Docker installed **OR** Redis installed locally
- NeuroLink SDK installed (`pnpm add @juspay/neurolink`)

## Option 1: Docker (Recommended)

The fastest way to get Redis running for development and testing.

### Start Redis Container

```bash
# Start Redis with persistence
docker run -d \
  --name neurolink-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine

# Verify Redis is running
docker ps | grep neurolink-redis
```

### Test Connection

```bash
# Test Redis connectivity
docker exec -it neurolink-redis redis-cli ping
# Expected output: PONG
```

## Option 2: Local Install

### macOS

```bash
# Install Redis with Homebrew
brew install redis

# Start Redis service
brew services start redis

# Verify installation
redis-cli ping
# Expected output: PONG
```

### Ubuntu/Debian

```bash
# Install Redis
sudo apt update
sudo apt install redis-server -y

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify installation
redis-cli ping
# Expected output: PONG
```

### Windows (WSL2)

```bash
# Update packages
sudo apt update

# Install Redis
sudo apt install redis-server -y

# Start Redis
sudo service redis-server start

# Test connection
redis-cli ping
# Expected output: PONG
```

## Configure NeuroLink

### 1. Set Environment Variables

```bash
# Add to your .env file
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Leave empty for local dev
REDIS_DB=0
```

### 2. Initialize NeuroLink with Redis

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: {
      host: "localhost",
      port: 6379,
      db: 0,
    },
  },
});

// Use neurolink as normal
const result = await neurolink.generate({
  input: { text: "Hello! How are you?" },
  provider: "openai",
});

console.log(result.content);
```

### 3. Verify Storage

```typescript
// Check conversation persistence
const stats = await neurolink.conversationMemory?.getStats();
console.log(stats); // { totalSessions: 1, totalTurns: 1 }
```

## Quick Verification

### Test Data Persistence

```bash
# In your Node.js console
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: { host: "localhost", port: 6379 }
  }
});

// Generate a conversation
await neurolink.generate({
  input: { text: "Remember this: my favorite color is blue" },
  sessionId: "test-session",
  userId: "test-user",
});

// Stop your app, restart, and verify data persists
const history = await neurolink.conversationMemory?.getUserSessionHistory(
  "test-user",
  "test-session"
);

console.log(history); // Should show your conversation
```

### Check Redis Data

```bash
# Connect to Redis CLI
docker exec -it neurolink-redis redis-cli
# OR (local install)
redis-cli

# List all keys
127.0.0.1:6379> KEYS *
# Expected: Shows NeuroLink conversation keys

# Check a specific session
127.0.0.1:6379> GET neurolink:conversation:test-user:test-session
# Shows conversation data in JSON format
```

## Common Issues

### Connection Refused

**Problem:** Cannot connect to Redis

```bash
# Check if Redis is running
docker ps | grep neurolink-redis
# OR
sudo systemctl status redis-server

# Restart if needed
docker restart neurolink-redis
# OR
sudo systemctl restart redis-server
```

### Port Already in Use

**Problem:** Port 6379 is already taken

```bash
# Use a different port for Redis
docker run -d --name neurolink-redis -p 6380:6379 redis:7-alpine

# Update NeuroLink config
redisConfig: { host: "localhost", port: 6380 }
```

### Permission Denied

**Problem:** Cannot access Redis socket (Linux)

```bash
# Add your user to the redis group
sudo usermod -a -G redis $USER

# Restart Redis
sudo systemctl restart redis-server
```

## Next Steps

- **[Complete Redis Configuration Guide](../guides/redis-configuration.md)** - Production setup, clustering, security
- **[Redis Migration Patterns](../guides/redis-migration.md)** - Migrate from in-memory to Redis
- **[Conversation Memory Guide](../features/conversation-history.md)** - Advanced conversation management

## Production Checklist

Before going to production, review:

- [ ] **Security**: Set `requirepass` in Redis configuration
- [ ] **Persistence**: Enable AOF (Append-Only File) for data durability
- [ ] **Monitoring**: Set up health checks and alerts
- [ ] **Backup**: Configure automated backup schedule
- [ ] **Performance**: Tune `maxmemory` and eviction policies

See the [Complete Redis Configuration Guide](../guides/redis-configuration.md) for production best practices.

---

**Need Help?** Check our [Troubleshooting Guide](../troubleshooting.md) or open an issue on [GitHub](https://github.com/juspay/neurolink).
