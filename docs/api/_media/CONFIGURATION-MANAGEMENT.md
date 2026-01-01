# 🏗️ Enterprise Configuration Management Guide

**NeuroLink Configuration System v3.0** - Complete guide to enterprise configuration management with automatic backup/restore, validation, and error recovery.

---

## 🎯 **Overview**

NeuroLink's enterprise configuration system provides:

- **✅ Automatic Backup System** - Timestamped backups before every config change
- **✅ Config Validation** - Comprehensive validation with suggestions and warnings
- **✅ Error Recovery** - Auto-restore on config update failures
- **✅ Provider Management** - Real-time provider availability monitoring
- **✅ Hash Verification** - SHA-256 integrity checking for all operations
- **✅ Cleanup Utilities** - Configurable backup retention and cleanup

---

## 🚀 **Quick Start**

### **Basic Configuration Setup**

```typescript
import { ConfigManager } from "@juspay/neurolink/config";

// Initialize config manager
const configManager = new ConfigManager();

// Update configuration (automatic backup created)
await configManager.updateConfig({
  providers: {
    google: { enabled: true, model: "gemini-2.5-pro" },
    openai: { enabled: true, model: "gpt-4o" },
  },
  performance: {
    timeout: 30000,
    retries: 3,
  },
});
// ✅ Backup created: .neurolink.backups/neurolink-config-2025-01-07T10-30-00.js
```

### **Environment Configuration**

```bash
# Enable automatic backups
NEUROLINK_BACKUP_ENABLED=true
NEUROLINK_BACKUP_RETENTION=30
NEUROLINK_BACKUP_DIRECTORY=.neurolink.backups

# Validation settings
NEUROLINK_VALIDATION_STRICT=false
NEUROLINK_VALIDATION_WARNINGS=true

# Provider monitoring
NEUROLINK_PROVIDER_STATUS_CHECK=true
NEUROLINK_PROVIDER_TIMEOUT=30000
```

---

## 📋 **Configuration Structure**

### **NeuroLinkConfig Interface**

```typescript
interface NeuroLinkConfig {
  providers: ProviderConfig; // AI provider settings
  performance: PerformanceConfig; // Performance optimization
  analytics: AnalyticsConfig; // Analytics configuration
  backup: BackupConfig; // Backup system settings
  validation: ValidationConfig; // Validation rules
}
```

### **Provider Configuration**

```typescript
interface ProviderConfig {
  google?: {
    enabled: boolean;
    model?: string;
    apiKey?: string;
    timeout?: number;
  };
  openai?: {
    enabled: boolean;
    model?: string;
    apiKey?: string;
    timeout?: number;
  };
  // ... other providers
}
```

### **Performance Configuration**

```typescript
interface PerformanceConfig {
  timeout: number; // Default timeout (ms)
  retries: number; // Default retry count
  cacheEnabled: boolean; // Enable execution caching
  cacheTTL: number; // Cache TTL (seconds)
  concurrency: number; // Max concurrent operations
}
```

---

## 🔄 **Automatic Backup System**

### **How It Works**

1. **Before Update**: Config manager creates timestamped backup
2. **Update Attempt**: Apply new configuration
3. **Validation**: Validate new configuration
4. **Success/Failure**: Keep new config or auto-restore from backup

### **Backup File Structure**

```
.neurolink.backups/
├── neurolink-config-2025-01-07T10-30-00.js    # Timestamped backup
├── neurolink-config-2025-01-07T11-15-30.js    # Another backup
├── metadata.json                               # Backup metadata
└── .backup-index                              # Backup index file
```

### **Backup Metadata**

```typescript
interface BackupMetadata {
  timestamp: string;
  hash: string; // SHA-256 hash
  size: number; // File size in bytes
  reason: string; // Reason for backup
  version: string; // Config version
  environment: string; // Environment context
  user?: string; // User who made change
}
```

### **Manual Backup Operations**

```typescript
// Create manual backup
const backupPath = await configManager.createBackup("manual-backup");
console.log(`Backup created: ${backupPath}`);

// List all backups
const backups = await configManager.listBackups();
console.log("Available backups:", backups);

// Restore from specific backup
await configManager.restoreFromBackup(
  "neurolink-config-2025-01-07T10-30-00.js",
);
```

---

## ✅ **Configuration Validation**

### **Validation Process**

1. **Schema Validation**: Check against TypeScript interfaces
2. **Provider Validation**: Verify provider configurations
3. **Dependency Validation**: Check inter-config dependencies
4. **Performance Validation**: Validate performance settings
5. **Security Validation**: Check for security issues

### **Validation Examples**

```typescript
// Validate current config
const validation = await configManager.validateConfig();

if (!validation.isValid) {
  console.log("Validation errors:", validation.errors);
  console.log("Suggestions:", validation.suggestions);
}

// Validate before update
await configManager.updateConfig(newConfig, {
  validateBeforeUpdate: true,
  onValidationError: (errors) => {
    console.log("Validation failed:", errors);
  },
});
```

### **Common Validation Errors**

```typescript
// Example validation results
{
  isValid: false,
  errors: [
    {
      field: 'providers.google.model',
      message: 'Model "gemini-pro-deprecated" is deprecated',
      severity: 'warning',
      suggestion: 'Use "gemini-2.5-pro" instead'
    },
    {
      field: 'performance.timeout',
      message: 'Timeout value too low (< 1000ms)',
      severity: 'error',
      suggestion: 'Use timeout >= 1000ms for reliable operation'
    }
  ],
  suggestions: [
    'Consider enabling caching for better performance',
    'Add fallback providers for reliability'
  ]
}
```

---

## 🛠️ **Advanced Configuration**

### **Update Strategies**

```typescript
// Replace entire config
await configManager.updateConfig(newConfig, {
  mergeStrategy: "replace",
});

// Merge with existing config
await configManager.updateConfig(partialConfig, {
  mergeStrategy: "merge",
});

// Deep merge (preserves nested objects)
await configManager.updateConfig(partialConfig, {
  mergeStrategy: "deep-merge",
});
```

### **Custom Validation Rules**

```typescript
// Add custom validation
configManager.addValidator("performance", (config) => {
  if (config.performance.timeout < 5000) {
    return {
      isValid: false,
      message: "Timeout too low for production use",
      suggestion: "Use timeout >= 5000ms",
    };
  }
  return { isValid: true };
});
```

### **Event Handlers**

```typescript
// Listen for config events
configManager.on("configUpdated", (newConfig, oldConfig) => {
  console.log("Config updated:", { newConfig, oldConfig });
});

configManager.on("backupCreated", (backupPath) => {
  console.log("Backup created:", backupPath);
});

configManager.on("configRestored", (backupPath) => {
  console.log("Config restored from:", backupPath);
});
```

---

## 🚨 **Error Recovery**

### **Auto-Restore Process**

1. **Detection**: Config update fails validation or causes errors
2. **Identification**: Find most recent valid backup
3. **Restoration**: Restore config from backup
4. **Verification**: Validate restored config
5. **Notification**: Log recovery action

### **Manual Recovery**

```typescript
// Check config health
const health = await configManager.checkHealth();
if (!health.isHealthy) {
  console.log("Config issues detected:", health.issues);

  // Restore from backup
  await configManager.autoRestore();
}

// Recovery from specific backup
try {
  await configManager.restoreFromBackup("backup-name.js");
  console.log("Successfully restored from backup");
} catch (error) {
  console.error("Restore failed:", error.message);
}
```

### **Recovery Scenarios**

- **Corrupted Config**: Auto-restore from last known good backup
- **Invalid Provider**: Disable problematic provider, restore working config
- **Performance Issues**: Restore previous performance settings
- **Validation Failures**: Rollback to validated configuration

---

## 🧹 **Cleanup & Maintenance**

### **Automatic Cleanup**

```typescript
// Configure automatic cleanup
await configManager.updateConfig({
  backup: {
    retention: 30, // Keep backups for 30 days
    maxBackups: 100, // Keep max 100 backups
    autoCleanup: true, // Enable automatic cleanup
  },
});
```

### **Manual Cleanup**

```typescript
// Clean old backups
const cleaned = await configManager.cleanupBackups({
  olderThan: 30, // Days
  keepMinimum: 5, // Always keep at least 5 backups
});
console.log(`Cleaned ${cleaned.count} old backups`);

// Verify backup integrity
const verification = await configManager.verifyBackups();
console.log("Backup verification:", verification);
```

---

## 🔍 **Monitoring & Diagnostics**

### **Config Status**

```typescript
// Get config status
const status = await configManager.getStatus();
console.log("Config status:", {
  isValid: status.isValid,
  lastUpdated: status.lastUpdated,
  backupCount: status.backupCount,
  providerStatus: status.providers,
});
```

### **Provider Health Monitoring**

```typescript
// Check provider health
const providers = await configManager.checkProviderHealth();
providers.forEach((provider) => {
  console.log(`${provider.name}: ${provider.status}`);
  if (provider.status === "error") {
    console.log(`Error: ${provider.error}`);
  }
});
```

### **Performance Metrics**

```typescript
// Get performance metrics
const metrics = await configManager.getMetrics();
console.log("Config performance:", {
  updateTime: metrics.averageUpdateTime,
  validationTime: metrics.averageValidationTime,
  backupTime: metrics.averageBackupTime,
});
```

---

## 🚀 **Best Practices**

### **Configuration Management**

1. **Always Validate**: Enable validation before updates
2. **Use Backups**: Keep automatic backups enabled
3. **Monitor Health**: Regular provider health checks
4. **Version Control**: Consider versioning config files
5. **Environment Separation**: Different configs for dev/prod

### **Performance Optimization**

1. **Cache Settings**: Enable caching for frequently used configs
2. **Timeout Tuning**: Set appropriate timeouts for your use case
3. **Provider Selection**: Use fastest available providers
4. **Cleanup Schedule**: Regular backup cleanup

### **Security Considerations**

1. **API Key Management**: Store API keys securely
2. **Backup Encryption**: Consider encrypting sensitive backups
3. **Access Control**: Limit config update permissions
4. **Audit Logging**: Log all config changes

---

## 🆘 **Troubleshooting**

### **Common Issues**

**Config Update Fails**

```bash
# Check config validation
npx @juspay/neurolink config validate

# Check provider status
npx @juspay/neurolink status

# Restore from backup
npx @juspay/neurolink config restore --backup latest
```

**Backup System Issues**

```bash
# Verify backup directory
ls -la .neurolink.backups/

# Check backup integrity
npx @juspay/neurolink config verify-backups

# Manual cleanup
npx @juspay/neurolink config cleanup --older-than 30
```

**Provider Configuration Issues**

```bash
# Test provider connection
npx @juspay/neurolink test-provider google

# Reset provider config
npx @juspay/neurolink config reset-provider google

# Check environment variables
npx @juspay/neurolink env check
```

### **Support & Resources**

- **Documentation**: See [API Reference](sdk/api-reference.md) for interface details
- **Migration Guide**: See `docs/INTERFACE-MIGRATION-GUIDE.md`
- **Troubleshooting**: See `docs/TROUBLESHOOTING.md`
- **GitHub Issues**: Report bugs and feature requests

---

**🎯 Enterprise configuration management provides robust, reliable, and maintainable configuration handling for production NeuroLink deployments.**
