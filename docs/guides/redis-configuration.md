# Complete Redis Configuration Guide

Comprehensive guide for configuring Redis storage for NeuroLink in all environments from development to enterprise production.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Installation Options](#installation-options)
- [Configuration Reference](#configuration-reference)
- [Production Setup](#production-setup)
- [Performance Tuning](#performance-tuning)
- [Security Hardening](#security-hardening)
- [High Availability](#high-availability)
- [Monitoring](#monitoring)
- [NeuroLink Integration](#neurolink-integration)

## Architecture Overview

### Redis Role in NeuroLink

Redis serves as NeuroLink's persistent storage backend for:

- **Conversation Memory**: Multi-turn conversation history with summarization
- **Session Management**: User session data with TTL-based expiration
- **Tool Execution History**: Complete tool call and result tracking
- **Analytics Data**: Real-time metrics and performance data

### Storage Architecture

```
┌─────────────────────────────────────────────┐
│         NeuroLink Application               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │   SDK   │  │   CLI   │  │  Tools  │    │
│  └────┬────┘  └────┬────┘  └────┬────┘    │
└───────┼───────────┼───────────┼───────────┘
        │           │           │
        └───────────┴───────────┘
                    │
        ┌───────────▼──────────────┐
        │ RedisConversationMemoryManager │
        └───────────┬──────────────┘
                    │
        ┌───────────▼──────────────┐
        │     Redis Storage         │
        │  ┌────────────────────┐  │
        │  │ DB 0: Conversations│  │
        │  │ DB 1: Sessions     │  │
        │  │ DB 2: Analytics    │  │
        │  └────────────────────┘  │
        └──────────────────────────┘
```

## Installation Options

### Standalone Server

#### Ubuntu/Debian

```bash
# Add Redis repository
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list

# Install Redis
sudo apt update
sudo apt install redis-server

# Configure for production
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verify
redis-cli ping
```

#### CentOS/RHEL

```bash
# Install EPEL repository
sudo yum install epel-release

# Install Redis
sudo yum install redis

# Start and enable
sudo systemctl start redis
sudo systemctl enable redis
```

#### macOS

```bash
# Install with Homebrew
brew install redis

# Start as a service
brew services start redis

# Configuration file
/usr/local/etc/redis.conf
```

### Docker

#### Development Setup

```bash
# Basic development container
docker run -d \
  --name neurolink-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine
```

#### Production-Ready Container

```bash
# Create custom Redis configuration
cat > redis.conf << 'EOF'
# Network
bind 0.0.0.0
port 6379
protected-mode yes

# Security
requirepass your_production_password_here

# Persistence
save 900 1
save 300 10
save 60 1000
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Performance
tcp-backlog 511
timeout 300
tcp-keepalive 300
EOF

# Run production container
docker run -d \
  --name neurolink-redis-prod \
  -p 6379:6379 \
  -v $(pwd)/redis.conf:/usr/local/etc/redis/redis.conf \
  -v redis-data:/data \
  --restart unless-stopped \
  redis:7-alpine redis-server /usr/local/etc/redis/redis.conf
```

### Cloud Providers

#### AWS ElastiCache

```typescript
// NeuroLink configuration for ElastiCache
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: {
      host: "your-cluster.cache.amazonaws.com",
      port: 6379,
      password: process.env.ELASTICACHE_AUTH_TOKEN,
      db: 0,
      // ElastiCache specific
      connectionOptions: {
        connectTimeout: 10000,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      },
    },
  },
});
```

#### Azure Cache for Redis

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: {
      host: "your-cache.redis.cache.windows.net",
      port: 6380, // SSL port
      password: process.env.AZURE_REDIS_KEY,
      db: 0,
      // Azure requires TLS
      connectionOptions: {
        connectTimeout: 15000,
      },
    },
  },
});
```

#### Google Cloud Memorystore

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: {
      host: "10.0.0.3", // Private IP from Memorystore
      port: 6379,
      db: 0,
      connectionOptions: {
        connectTimeout: 10000,
      },
    },
  },
});
```

#### Redis Cloud

```typescript
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: {
      host: "redis-12345.c123.us-east-1.ec2.cloud.redislabs.com",
      port: 12345,
      password: process.env.REDIS_CLOUD_PASSWORD,
      db: 0,
    },
  },
});
```

### Redis Cluster

For enterprise scale and high availability:

```bash
# Create cluster nodes (3 masters minimum)
mkdir -p /etc/redis/cluster/{7001,7002,7003}

# Node 1 configuration
cat > /etc/redis/cluster/7001/redis.conf << 'EOF'
port 7001
cluster-enabled yes
cluster-config-file nodes-7001.conf
cluster-node-timeout 15000
appendonly yes
dbfilename dump-7001.rdb
dir /var/lib/redis/cluster/7001
requirepass cluster_password
masterauth cluster_password
EOF

# Repeat for nodes 7002 and 7003

# Start all nodes
redis-server /etc/redis/cluster/7001/redis.conf --daemonize yes
redis-server /etc/redis/cluster/7002/redis.conf --daemonize yes
redis-server /etc/redis/cluster/7003/redis.conf --daemonize yes

# Create cluster
redis-cli -a cluster_password --cluster create \
  127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 \
  --cluster-replicas 0

# Verify cluster
redis-cli -c -p 7001 -a cluster_password cluster info
```

## Configuration Reference

### Basic Configuration

#### redis.conf (Minimal Production)

```ini
# Network
bind 0.0.0.0
port 6379
protected-mode yes
tcp-backlog 511
timeout 300
tcp-keepalive 300

# Security
requirepass your_secure_password

# Memory
maxmemory 4gb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence (RDB)
save 900 1      # Save if at least 1 key changed in 900 seconds
save 300 10     # Save if at least 10 keys changed in 300 seconds
save 60 10000   # Save if at least 10000 keys changed in 60 seconds
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Persistence (AOF) - Recommended
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Clients
maxclients 10000

# Databases
databases 16
```

### NeuroLink-Optimized Configuration

#### redis.conf (NeuroLink Production)

```ini
# NeuroLink Production Redis Configuration

# Network and Security
bind 0.0.0.0
port 6379
requirepass "neurolink_redis_secure_password_2024"
protected-mode yes

# Memory Management for AI Workloads
maxmemory 8gb
maxmemory-policy allkeys-lru
maxmemory-samples 10

# Memory optimization for conversation data
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
set-max-intset-entries 512
zset-max-ziplist-entries 128
zset-max-ziplist-value 64

# Persistence for Conversation History
save 300 10      # Save if 10 keys changed in 5 minutes
save 60 1000     # Save if 1000 keys changed in 1 minute
save 30 10000    # Save if 10000 keys changed in 30 seconds
rdbcompression yes
rdbchecksum yes
dbfilename neurolink-dump.rdb
dir /var/lib/redis

# AOF for Critical Conversation Data
appendonly yes
appendfilename "neurolink-appendonly.aof"
appendfsync everysec
aof-rewrite-incremental-fsync yes

# Database Allocation
# DB 0: Conversation History
# DB 1: Session Management
# DB 2: Tool Execution History
# DB 3: Analytics Data
databases 16

# Keyspace Notifications (for expiration events)
notify-keyspace-events Ex

# Performance Optimization
tcp-backlog 2048
timeout 300
tcp-keepalive 300
slowlog-log-slower-than 10000
slowlog-max-len 128
latency-monitor-threshold 100

# Client Management
maxclients 20000
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60

# Logging
loglevel notice
logfile /var/log/redis/neurolink-redis.log
```

### NeuroLink SDK Configuration

#### TypeScript Configuration

```typescript
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",

    // Redis connection configuration
    redisConfig: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      db: 0,

      // Key prefixing for multi-tenant isolation
      keyPrefix: "neurolink:conversation:",
      userSessionsKeyPrefix: "neurolink:user:sessions:",

      // TTL for session expiration (in seconds)
      ttl: 86400, // 24 hours

      // Connection pool and retry settings
      connectionOptions: {
        connectTimeout: 10000,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      },
    },

    // Conversation memory settings
    maxSessions: 1000,
    maxTurnsPerSession: 50,
    tokenThreshold: 50000,
    enableSummarization: true,
    summarizationProvider: "vertex",
    summarizationModel: "gemini-2.5-flash",
  },
});
```

#### Environment Variables

```bash
# .env file for production
REDIS_HOST=redis.production.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your_production_redis_password
REDIS_DB=0
REDIS_KEY_PREFIX=neurolink:
REDIS_TTL=86400
REDIS_CONNECTION_TIMEOUT=10000
REDIS_MAX_RETRIES=3
```

## Production Setup

### Production Checklist

- [ ] **Security**: Password authentication configured
- [ ] **Persistence**: Both RDB and AOF enabled
- [ ] **Memory**: `maxmemory` set with appropriate eviction policy
- [ ] **Monitoring**: Logging and metrics collection enabled
- [ ] **Backup**: Automated backup schedule configured
- [ ] **High Availability**: Sentinel or Cluster mode for critical workloads
- [ ] **Network**: Firewall rules and network isolation
- [ ] **Performance**: Connection pooling and timeout configured

### Production Deployment Example

```typescript
// production.ts - Complete production setup
import { NeuroLink } from "@juspay/neurolink";

const setupProduction = () => {
  const neurolink = new NeuroLink({
    conversationMemory: {
      enabled: true,
      store: "redis",
      redisConfig: {
        // Primary production Redis
        host: process.env.REDIS_PRIMARY_HOST,
        port: parseInt(process.env.REDIS_PRIMARY_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
        db: 0,

        // Production-grade settings
        keyPrefix: `${process.env.ENVIRONMENT}:neurolink:`,
        ttl: 604800, // 7 days for production

        connectionOptions: {
          connectTimeout: 15000,
          retryDelayOnFailover: 200,
          maxRetriesPerRequest: 5,
        },
      },

      // Production conversation settings
      maxSessions: 10000,
      maxTurnsPerSession: 100,
      tokenThreshold: 100000,
      enableSummarization: true,
      summarizationProvider: "vertex",
      summarizationModel: "gemini-2.5-flash",
    },

    // Additional production features
    telemetry: {
      enabled: true,
      provider: "otel",
    },
  });

  return neurolink;
};

export default setupProduction;
```

## Performance Tuning

### Memory Optimization

```ini
# redis.conf - Memory tuning
maxmemory 16gb
maxmemory-policy allkeys-lru
maxmemory-samples 10

# Optimize for conversation data structures
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
list-max-ziplist-size -2
```

### Connection Pooling

```typescript
// Optimize connection pool for high concurrency
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: {
      host: "localhost",
      port: 6379,
      connectionOptions: {
        connectTimeout: 5000,
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
      },
    },
  },
});
```

### Persistence Tuning

```ini
# For high-write workloads (less durability, better performance)
appendfsync no
save ""

# For balanced workload (recommended)
appendfsync everysec
save 300 10
save 60 1000

# For maximum durability (lower performance)
appendfsync always
save 60 1
```

## Security Hardening

### Authentication

```ini
# redis.conf
requirepass strong_password_at_least_32_characters_long_2024
```

### Access Control Lists (Redis 6.0+)

```bash
# Create NeuroLink application user with limited permissions
redis-cli
127.0.0.1:6379> AUTH default admin_password
127.0.0.1:6379> ACL SETUSER neurolink-app on >app_password ~neurolink:* +@read +@write +@stream -@dangerous
127.0.0.1:6379> ACL SAVE

# Create read-only monitoring user
127.0.0.1:6379> ACL SETUSER neurolink-monitor on >monitor_password ~* +@read +info +ping -@write -@dangerous
127.0.0.1:6379> ACL SAVE
```

### TLS/SSL Configuration

```ini
# redis.conf - Enable TLS
port 0
tls-port 6380
tls-cert-file /etc/redis/tls/redis.crt
tls-key-file /etc/redis/tls/redis.key
tls-ca-cert-file /etc/redis/tls/ca.crt
tls-protocols "TLSv1.2 TLSv1.3"
```

### Network Security

```bash
# Ubuntu UFW firewall
sudo ufw allow from 10.0.0.0/8 to any port 6379
sudo ufw deny 6379

# CentOS/RHEL firewalld
sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='10.0.0.0/8' port protocol='tcp' port='6379' accept"
sudo firewall-cmd --reload
```

## High Availability

### Redis Sentinel

```ini
# sentinel.conf
port 26379
sentinel monitor neurolink-master 192.168.1.100 6379 2
sentinel auth-pass neurolink-master redis_password
sentinel down-after-milliseconds neurolink-master 5000
sentinel parallel-syncs neurolink-master 1
sentinel failover-timeout neurolink-master 60000
```

### NeuroLink with Sentinel

```typescript
// TypeScript configuration for Sentinel
import { NeuroLink } from "@juspay/neurolink";

const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: {
      // Sentinel configuration
      host: "sentinel-node-1",
      port: 26379,
      password: process.env.REDIS_PASSWORD,
      db: 0,
    },
  },
});
```

## Monitoring

### Key Metrics to Monitor

```bash
# Connection metrics
redis-cli info clients | grep connected_clients

# Memory usage
redis-cli info memory | grep used_memory_human

# Operations per second
redis-cli --stat

# Slow queries
redis-cli slowlog get 10

# Keyspace info
redis-cli info keyspace
```

### Health Check Script

```bash
#!/bin/bash
# neurolink-redis-health.sh

REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD="your_password"

# Test connectivity
if redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD ping | grep -q "PONG"; then
  echo "✅ Redis is responsive"
else
  echo "❌ Redis is not responding"
  exit 1
fi

# Check memory usage
MEMORY_USED=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD info memory | grep used_memory_human | cut -d: -f2)
echo "Memory Used: $MEMORY_USED"

# Check connected clients
CLIENTS=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD info clients | grep connected_clients | cut -d: -f2)
echo "Connected Clients: $CLIENTS"

# Check replication status
ROLE=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASSWORD info replication | grep role | cut -d: -f2)
echo "Role: $ROLE"
```

## NeuroLink Integration

### Complete Integration Example

```typescript
import { NeuroLink } from "@juspay/neurolink";

// Initialize with Redis storage
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      db: 0,
      keyPrefix: "neurolink:conversation:",
      ttl: 86400, // 24 hours
      connectionOptions: {
        connectTimeout: 10000,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
      },
    },
    maxSessions: 1000,
    maxTurnsPerSession: 50,
    tokenThreshold: 50000,
    enableSummarization: true,
  },
});

// Use with conversation persistence
const result = await neurolink.generate({
  input: { text: "What did we discuss yesterday about the project timeline?" },
  sessionId: "project-planning-session",
  userId: "user123",
  provider: "anthropic",
  model: "claude-3-5-sonnet",
});

console.log(result.content);

// Retrieve conversation history
const history = await neurolink.conversationMemory?.getUserSessionHistory(
  "user123",
  "project-planning-session",
);

console.log(`Conversation has ${history?.length} messages`);

// Get all user sessions
const sessions =
  await neurolink.conversationMemory?.getUserAllSessionsHistory("user123");
console.log(`User has ${sessions?.length} active sessions`);

// Clear a specific session
await neurolink.conversationMemory?.clearSession(
  "project-planning-session",
  "user123",
);

// Get storage statistics
const stats = await neurolink.conversationMemory?.getStats();
console.log(
  `Total sessions: ${stats?.totalSessions}, Total turns: ${stats?.totalTurns}`,
);
```

## See Also

- [Redis Quick Start](../getting-started/redis-quickstart.md) - 5-minute setup guide
- [Redis Migration Patterns](redis-migration.md) - Migration from in-memory to Redis
- [Conversation Memory Guide](../features/conversation-history.md) - Advanced conversation features
- [Troubleshooting Guide](../troubleshooting.md) - Common issues and solutions

## External Resources

- [Redis Documentation](https://redis.io/documentation)
- [Redis Best Practices](https://redis.io/topics/admin)
- [Redis Persistence](https://redis.io/topics/persistence)
- [Redis Security](https://redis.io/topics/security)
