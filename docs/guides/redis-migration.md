# Redis Migration Patterns

Complete guide for migrating conversation storage between different backends and Redis configurations.

## Table of Contents

- [In-Memory to Redis Migration](#in-memory-to-redis-migration)
- [Version Upgrades](#version-upgrades)
- [Single to Cluster Migration](#single-to-cluster-migration)
- [Cloud Provider Migrations](#cloud-provider-migrations)
- [Backup and Restore](#backup-and-restore)
- [Zero-Downtime Migration](#zero-downtime-migration)

## In-Memory to Redis Migration

### When to Migrate

Consider migrating from in-memory to Redis storage when:

- **Multi-Instance Deployment**: Running multiple NeuroLink instances that need shared conversation state
- **Session Persistence**: Need conversations to survive application restarts
- **Long-Running Sessions**: Managing conversations that span multiple days/weeks
- **Analytics Requirements**: Need to analyze conversation patterns and history
- **Compliance**: Regulatory requirements for conversation retention and audit trails

### Migration Steps

#### Step 1: Set Up Redis Server

```bash
# Quick Docker setup for development
docker run -d \
  --name neurolink-redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine

# Verify Redis is running
docker exec -it neurolink-redis redis-cli ping
# Expected: PONG
```

#### Step 2: Update NeuroLink Configuration

```typescript
// Before: In-memory storage
const neurolinkOld = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "memory", // Default in-memory storage
    maxSessions: 100,
    maxTurnsPerSession: 50,
  },
});

// After: Redis storage
const neurolinkNew = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: {
      host: "localhost",
      port: 6379,
      db: 0,
      keyPrefix: "neurolink:conversation:",
      ttl: 86400, // 24 hours
    },
    maxSessions: 1000, // Can handle more with Redis
    maxTurnsPerSession: 100,
    enableSummarization: true,
  },
});
```

#### Step 3: Migrate Existing Sessions (Optional)

```typescript
// migration-script.ts
import { NeuroLink } from "@juspay/neurolink";

async function migrateToRedis() {
  // Initialize both instances
  const memoryInstance = new NeuroLink({
    conversationMemory: { enabled: true, store: "memory" },
  });

  const redisInstance = new NeuroLink({
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

  console.log("Starting migration from memory to Redis...");

  // Note: In-memory storage doesn't persist data across restarts
  // This example shows conceptual migration if you have active sessions

  // If you have a way to export memory data:
  // 1. Export sessions from memory storage
  // 2. Import into Redis storage
  // 3. Verify migration success

  console.log("✅ Migration completed");
  console.log(
    "Note: Historical data from in-memory storage before migration is not preserved.",
  );
  console.log("All new conversations will now be stored in Redis.");
}

migrateToRedis().catch(console.error);
```

#### Step 4: Verify Migration

```typescript
// verify-redis.ts
import { NeuroLink } from "@juspay/neurolink";

async function verifyRedisStorage() {
  const neurolink = new NeuroLink({
    conversationMemory: {
      enabled: true,
      store: "redis",
      redisConfig: {
        host: "localhost",
        port: 6379,
      },
    },
  });

  // Create a test conversation
  console.log("Creating test conversation...");
  await neurolink.generate({
    input: { text: "Test message for Redis verification" },
    sessionId: "test-session",
    userId: "test-user",
    provider: "openai",
  });

  // Verify persistence
  const history = await neurolink.conversationMemory?.getUserSessionHistory(
    "test-user",
    "test-session",
  );

  console.log(`✅ Redis storage verified`);
  console.log(`Conversation has ${history?.length} messages`);

  // Check stats
  const stats = await neurolink.conversationMemory?.getStats();
  console.log(
    `Total sessions: ${stats?.totalSessions}, Total turns: ${stats?.totalTurns}`,
  );

  // Cleanup test data
  await neurolink.conversationMemory?.clearSession("test-session", "test-user");
  console.log("✅ Test data cleaned up");
}

verifyRedisStorage().catch(console.error);
```

### Code Example: Gradual Migration

```typescript
// gradual-migration.ts - Migrate incrementally
import { NeuroLink } from "@juspay/neurolink";

class GradualMigration {
  private memoryInstance: NeuroLink;
  private redisInstance: NeuroLink;
  private migrationProgress = 0;

  constructor() {
    // Initialize both storage backends
    this.memoryInstance = new NeuroLink({
      conversationMemory: {
        enabled: true,
        store: "memory",
      },
    });

    this.redisInstance = new NeuroLink({
      conversationMemory: {
        enabled: true,
        store: "redis",
        redisConfig: {
          host: "localhost",
          port: 6379,
        },
      },
    });
  }

  // Gradual cutover: route traffic based on percentage
  async generate(options: {
    input: any;
    sessionId: string;
    userId: string;
    provider: string;
  }) {
    const useRedis = Math.random() < this.migrationProgress;
    const instance = useRedis ? this.redisInstance : this.memoryInstance;

    console.log(
      `Using ${useRedis ? "Redis" : "Memory"} for session ${options.sessionId}`,
    );

    return await instance.generate(options);
  }

  // Increase Redis usage percentage
  increaseMigrationProgress(percentage: number) {
    this.migrationProgress = Math.min(1, this.migrationProgress + percentage);
    console.log(
      `Migration progress: ${(this.migrationProgress * 100).toFixed(0)}%`,
    );
  }
}

// Usage example
async function gradualMigrationExample() {
  const migration = new GradualMigration();

  // Phase 1: 20% on Redis
  migration.increaseMigrationProgress(0.2);
  await runTraffic(migration, 100);

  // Phase 2: 50% on Redis
  migration.increaseMigrationProgress(0.3);
  await runTraffic(migration, 100);

  // Phase 3: 100% on Redis
  migration.increaseMigrationProgress(0.5);
  await runTraffic(migration, 100);

  console.log("✅ Full migration to Redis completed");
}

async function runTraffic(migration: GradualMigration, requests: number) {
  for (let i = 0; i < requests; i++) {
    await migration.generate({
      input: { text: `Test message ${i}` },
      sessionId: `session-${i % 10}`,
      userId: `user-${i % 5}`,
      provider: "openai",
    });
  }
}
```

## Version Upgrades

### Redis Version Upgrade

#### Upgrading from Redis 6.x to 7.x

```bash
# 1. Create backup before upgrade
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb /backup/redis-backup-$(date +%Y%m%d).rdb

# 2. Install new Redis version
sudo apt update
sudo apt install redis-server=7:7.0.* -y

# 3. Update configuration for Redis 7
sudo nano /etc/redis/redis.conf
# Review new configuration options

# 4. Restart Redis
sudo systemctl restart redis-server

# 5. Verify upgrade
redis-cli INFO server | grep redis_version
# Expected: redis_version:7.0.x

# 6. Test with NeuroLink
neurolink generate "Test after Redis upgrade" --session-id test-session
```

### NeuroLink Version Upgrade with Redis

When upgrading NeuroLink versions:

```typescript
// Check for breaking changes in conversation memory schema
import { NeuroLink } from "@juspay/neurolink";

async function safeNeuroLinkUpgrade() {
  // 1. Create backup of current Redis data
  console.log("Creating backup before NeuroLink upgrade...");
  // Use redis-cli BGSAVE or your backup strategy

  // 2. Initialize new NeuroLink version with Redis
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

  // 3. Verify compatibility
  try {
    const stats = await neurolink.conversationMemory?.getStats();
    console.log("✅ NeuroLink upgrade successful");
    console.log(`Existing sessions: ${stats?.totalSessions}`);
  } catch (error) {
    console.error("❌ Compatibility issue detected:", error);
    console.log("Restore from backup and check migration notes");
  }
}
```

## Single to Cluster Migration

### When to Use Redis Cluster

Migrate to Redis Cluster when you need:

- **Horizontal Scalability**: Dataset exceeds single-server RAM capacity
- **High Availability**: Automatic failover without Sentinel
- **Performance**: Distribute load across multiple nodes
- **Geographic Distribution**: Deploy Redis nodes across regions

### Migration Process

#### Step 1: Setup Redis Cluster

```bash
# Create 3-node cluster (minimum for production)
mkdir -p /etc/redis/cluster/{7001,7002,7003}

# Configure each node
for port in 7001 7002 7003; do
cat > /etc/redis/cluster/$port/redis.conf << EOF
port $port
cluster-enabled yes
cluster-config-file nodes-$port.conf
cluster-node-timeout 15000
appendonly yes
dbfilename dump-$port.rdb
dir /var/lib/redis/cluster/$port
requirepass cluster_password
masterauth cluster_password
EOF
done

# Start cluster nodes
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

#### Step 2: Migrate Data to Cluster

```bash
# Using redis-cli --cluster import (Redis 7.0+)
redis-cli --cluster import \
  127.0.0.1:7001 \
  --cluster-from 127.0.0.1:6379 \
  --cluster-copy \
  --cluster-replace \
  -a cluster_password

# Verify migration
redis-cli -c -p 7001 -a cluster_password DBSIZE
```

#### Step 3: Update NeuroLink Configuration

```typescript
// Cluster configuration
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: {
      // For cluster, specify any node - client will discover others
      host: "127.0.0.1",
      port: 7001,
      password: "cluster_password",
      db: 0, // Note: Cluster mode only supports db 0
    },
  },
});
```

## Cloud Provider Migrations

### AWS ElastiCache Migration

#### From Local Redis to ElastiCache

```bash
# 1. Create ElastiCache cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id neurolink-prod \
  --cache-node-type cache.r7g.large \
  --engine redis \
  --num-cache-nodes 1 \
  --auth-token-enabled \
  --transit-encryption-enabled

# 2. Create RDB backup
redis-cli BGSAVE
aws s3 cp /var/lib/redis/dump.rdb s3://your-backup-bucket/redis-backup.rdb

# 3. Import to ElastiCache
aws elasticache create-snapshot \
  --snapshot-name neurolink-initial-data \
  --cache-cluster-id neurolink-prod \
  --s3-bucket-name your-backup-bucket \
  --s3-key-prefix redis-backup.rdb
```

```typescript
// Update NeuroLink for ElastiCache
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: {
      host: "neurolink-prod.abc123.cache.amazonaws.com",
      port: 6379,
      password: process.env.ELASTICACHE_AUTH_TOKEN,
      db: 0,
      connectionOptions: {
        connectTimeout: 15000,
        retryDelayOnFailover: 200,
        maxRetriesPerRequest: 5,
      },
    },
  },
});
```

### Azure Cache for Redis Migration

```typescript
// Migrating to Azure Cache
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: {
      host: "your-cache.redis.cache.windows.net",
      port: 6380, // SSL port for Azure
      password: process.env.AZURE_REDIS_KEY,
      db: 0,
      connectionOptions: {
        connectTimeout: 20000, // Azure requires higher timeout
      },
    },
  },
});
```

### Google Cloud Memorystore Migration

```bash
# Export from local Redis
redis-cli --rdb /tmp/dump.rdb

# Import to Memorystore using Cloud Storage
gsutil cp /tmp/dump.rdb gs://your-bucket/redis-backup.rdb

gcloud redis instances import \
  neurolink-prod \
  gs://your-bucket/redis-backup.rdb \
  --region=us-central1
```

```typescript
// Configure for Memorystore
const neurolink = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: "redis",
    redisConfig: {
      host: "10.0.0.3", // Memorystore private IP
      port: 6379,
      db: 0,
    },
  },
});
```

## Backup and Restore

### Creating Backups

#### Manual Backup

```bash
# Create RDB snapshot
redis-cli BGSAVE

# Wait for completion
redis-cli LASTSAVE

# Copy backup files
cp /var/lib/redis/dump.rdb /backup/neurolink-backup-$(date +%Y%m%d-%H%M%S).rdb
cp /var/lib/redis/appendonly.aof /backup/neurolink-aof-$(date +%Y%m%d-%H%M%S).aof

# Compress backups
gzip /backup/neurolink-backup-*.rdb
gzip /backup/neurolink-aof-*.aof
```

#### Automated Backup Script

```bash
#!/bin/bash
# neurolink-redis-backup.sh

REDIS_CLI="redis-cli -a ${REDIS_PASSWORD}"
BACKUP_DIR="/backup/redis"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Trigger background save
$REDIS_CLI BGSAVE

# Wait for save completion
LAST_SAVE=$(redis-cli -a ${REDIS_PASSWORD} LASTSAVE)
while true; do
  sleep 1
  CURRENT_SAVE=$(redis-cli -a ${REDIS_PASSWORD} LASTSAVE)
  if [ "$CURRENT_SAVE" -gt "$LAST_SAVE" ]; then
    break
  fi
done

# Copy and compress backup
cp /var/lib/redis/dump.rdb $BACKUP_DIR/neurolink-dump-$DATE.rdb
cp /var/lib/redis/appendonly.aof $BACKUP_DIR/neurolink-aof-$DATE.aof
gzip $BACKUP_DIR/neurolink-dump-$DATE.rdb
gzip $BACKUP_DIR/neurolink-aof-$DATE.aof

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/neurolink-dump-$DATE.rdb.gz s3://your-backup-bucket/

# Remove old backups
find $BACKUP_DIR -name "neurolink-*" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
logger "NeuroLink Redis backup completed: $DATE"
```

#### Schedule Automated Backups

```bash
# Add to crontab
crontab -e

# Daily backup at 2:00 AM
0 2 * * * /usr/local/bin/neurolink-redis-backup.sh

# Hourly incremental backups
0 * * * * /usr/local/bin/neurolink-redis-backup.sh
```

### Restoring from Backup

#### Complete Restore

```bash
# Stop Redis
sudo systemctl stop redis-server

# Restore from backup
gunzip -c /backup/neurolink-dump-20260101-020000.rdb.gz > /var/lib/redis/dump.rdb
gunzip -c /backup/neurolink-aof-20260101-020000.aof.gz > /var/lib/redis/appendonly.aof

# Set correct permissions
sudo chown redis:redis /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/appendonly.aof

# Start Redis
sudo systemctl start redis-server

# Verify restoration
redis-cli -a ${REDIS_PASSWORD} DBSIZE
```

#### Selective Restore (Specific Keys)

```bash
# Export specific keys from backup
redis-cli --rdb /tmp/backup.rdb

# Start temporary Redis instance
redis-server --port 6380 --dir /tmp --dbfilename backup.rdb --daemonize yes

# Copy specific keys to production
redis-cli -p 6380 --scan --pattern "neurolink:conversation:user123:*" | \
  xargs redis-cli -p 6380 MIGRATE localhost 6379 0 5000 KEYS

# Cleanup temporary instance
redis-cli -p 6380 SHUTDOWN
```

### Disaster Recovery Procedure

```bash
#!/bin/bash
# disaster-recovery.sh

echo "Starting NeuroLink Redis disaster recovery..."

# 1. Stop affected Redis instance
sudo systemctl stop redis-server

# 2. Check data integrity
redis-check-rdb /var/lib/redis/dump.rdb
redis-check-aof /var/lib/redis/appendonly.aof

# 3. If corrupted, restore from latest backup
if [ $? -ne 0 ]; then
  echo "Data corruption detected. Restoring from backup..."
  LATEST_BACKUP=$(ls -t /backup/redis/neurolink-dump-*.rdb.gz | head -1)
  gunzip -c $LATEST_BACKUP > /var/lib/redis/dump.rdb
  sudo chown redis:redis /var/lib/redis/dump.rdb
fi

# 4. Restart Redis
sudo systemctl start redis-server

# 5. Verify health
if redis-cli -a ${REDIS_PASSWORD} ping | grep -q "PONG"; then
  echo "✅ Redis recovery successful"
else
  echo "❌ Redis recovery failed"
  exit 1
fi

# 6. Verify NeuroLink connectivity
node -e "
const { NeuroLink } = require('@juspay/neurolink');
const nl = new NeuroLink({
  conversationMemory: {
    enabled: true,
    store: 'redis',
    redisConfig: { host: 'localhost', port: 6379 }
  }
});
nl.conversationMemory.getStats().then(stats => {
  console.log('✅ NeuroLink verification successful');
  console.log('Sessions:', stats.totalSessions);
}).catch(err => {
  console.error('❌ NeuroLink verification failed:', err);
  process.exit(1);
});
"

echo "Recovery procedure completed"
```

## Zero-Downtime Migration

### Strategy: Dual-Write Pattern

```typescript
// dual-write-migration.ts
import { NeuroLink } from "@juspay/neurolink";

class DualWriteMigration {
  private sourceInstance: NeuroLink;
  private targetInstance: NeuroLink;

  constructor() {
    // Source: Current Redis instance
    this.sourceInstance = new NeuroLink({
      conversationMemory: {
        enabled: true,
        store: "redis",
        redisConfig: {
          host: "old-redis.example.com",
          port: 6379,
        },
      },
    });

    // Target: New Redis instance/cluster
    this.targetInstance = new NeuroLink({
      conversationMemory: {
        enabled: true,
        store: "redis",
        redisConfig: {
          host: "new-redis.example.com",
          port: 6379,
        },
      },
    });
  }

  // Write to both instances
  async generate(options: any) {
    try {
      // Primary write to source
      const result = await this.sourceInstance.generate(options);

      // Async write to target (don't wait)
      this.targetInstance.generate(options).catch((err) => {
        console.error("Target write failed:", err);
        // Log for later reconciliation
      });

      return result;
    } catch (error) {
      console.error("Source write failed:", error);
      // Could fall back to target or retry
      throw error;
    }
  }

  // Gradual switchover
  async switchToTarget() {
    console.log("Switching primary to target instance...");
    const temp = this.sourceInstance;
    this.sourceInstance = this.targetInstance;
    this.targetInstance = temp;
    console.log("✅ Switched to new Redis instance");
  }
}

// Usage
const migration = new DualWriteMigration();

// Phase 1: Dual write (both instances receive writes)
await migration.generate({
  input: { text: "Test message" },
  sessionId: "session1",
  userId: "user1",
  provider: "openai",
});

// Phase 2: After data sync, switch primary
await migration.switchToTarget();

// Phase 3: Continue with new instance as primary
```

### Blue-Green Deployment

```bash
#!/bin/bash
# blue-green-migration.sh

# Blue: Current production Redis
BLUE_REDIS="redis-blue.example.com:6379"

# Green: New Redis instance
GREEN_REDIS="redis-green.example.com:6379"

echo "Starting Blue-Green migration..."

# 1. Sync data from Blue to Green
redis-cli --rdb /tmp/blue-backup.rdb -h redis-blue.example.com -p 6379
redis-cli -h redis-green.example.com -p 6379 --pipe < /tmp/blue-backup.rdb

# 2. Enable dual-write mode in application
# Update environment variable
export REDIS_DUAL_WRITE=true
export REDIS_PRIMARY=$BLUE_REDIS
export REDIS_SECONDARY=$GREEN_REDIS

# 3. Monitor for consistency
sleep 300  # 5 minutes of dual-write

# 4. Switch primary to Green
export REDIS_PRIMARY=$GREEN_REDIS
export REDIS_SECONDARY=$BLUE_REDIS

# 5. Verify new primary
redis-cli -h redis-green.example.com -p 6379 DBSIZE

# 6. After validation, decommission Blue
echo "✅ Migration to Green completed"
```

## See Also

- [Redis Quick Start](../getting-started/redis-quickstart.md) - 5-minute Redis setup
- [Redis Configuration Guide](redis-configuration.md) - Complete configuration reference
- [Conversation Memory](../features/conversation-history.md) - Conversation memory features
- [Troubleshooting](../troubleshooting.md) - Common issues and solutions

## External Resources

- [Redis Persistence](https://redis.io/topics/persistence) - RDB and AOF persistence
- [Redis Cluster Tutorial](https://redis.io/topics/cluster-tutorial) - Cluster setup guide
- [Redis Replication](https://redis.io/topics/replication) - Replication and high availability
- [Redis Backup Best Practices](https://redis.io/topics/admin#backup) - Backup strategies
