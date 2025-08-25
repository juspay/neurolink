# Core Module Refactoring

**Status**: `[ ]` Not started  
**Priority**: 🔴 Critical  
**Estimated Effort**: 6-8 hours  
**Prerequisites**: 01-global-imports.md must be completed

## Objective

Refactor the core module (`src/lib/core/`) to achieve strict TypeScript compliance, convert interfaces to types, improve type safety, and establish proper architectural patterns for the entire codebase.

## Files to Modify

### Primary Files

- `src/lib/core/types.ts` - Main type definitions (CRITICAL)
- `src/lib/core/factory.ts` - Provider factory
- `src/lib/core/baseProvider.ts` - Abstract provider base class
- `src/lib/core/serviceRegistry.ts` - Service registration
- `src/lib/core/analytics.ts` - Analytics system
- `src/lib/core/evaluation.ts` - Evaluation system
- `src/lib/core/conversationMemoryManager.ts` - Memory management

### Secondary Files

- `src/lib/core/constants.ts` - Constants
- `src/lib/core/dynamicModels.ts` - Dynamic model support
- `src/lib/core/modelConfiguration.ts` - Model configuration
- `src/lib/core/streamAnalytics.ts` - Streaming analytics

## Step-by-Step Instructions

### Step 1: Backup and Setup

```bash
# Create feature branch
git checkout -b refactor/core-module
git add -A
git commit -m "Backup before core module refactor"
```

### Step 2: Refactor types.ts (CRITICAL PATH)

#### 2.1 Convert Interfaces to Types

**File**: `src/lib/core/types.ts`

Find and replace these interface declarations:

```typescript
// ❌ Current
export interface TextGenerationResult {
  content: string;
  provider?: string;
  // ... rest of properties
}

// ✅ Replace with
export type TextGenerationResult = {
  content: string;
  provider?: string;
  // ... rest of properties
};
```

**Specific conversions needed**:

- `TextGenerationResult` interface → type
- `StreamingOptions` interface → type
- `TextGenerationOptions` interface → type
- `ProviderConfig` interface → type
- `AIProvider` interface → type
- `ProviderAttempt` interface → type
- `EvaluationData` interface → type
- `LegacyEvaluationData` interface → type
- `EvaluationConfig` interface → type
- `ProviderModelConfig` interface → type
- `EnhancedGenerateResult` interface → type
- `StreamingProgressData` interface → type
- `StreamingMetadata` interface → type

#### 2.2 Improve Type Definitions

**Add proper generic constraints**:

```typescript
// ❌ Current
export type ProgressCallback = (progress: StreamingProgressData) => void;

// ✅ Improve to
export type ProgressCallback = (
  progress: StreamingProgressData,
) => void | Promise<void>;
```

**Improve union types**:

```typescript
// ❌ Current (if exists)
type AlertSeverity = string;

// ✅ Replace with
type AlertSeverity = "low" | "medium" | "high" | "none";
```

#### 2.3 Add Missing Type Exports

Ensure all types are properly exported:

```typescript
// Add these exports if missing
export type {
  ProgressCallback,
  AlertSeverity,
  EvaluationMode,
  ProviderHealth,
  StreamPhase,
};
```

### Step 3: Refactor factory.ts

**File**: `src/lib/core/factory.ts`

#### 3.1 Add Explicit Return Types

```typescript
// ❌ Current (if missing return types)
export class AIProviderFactory {
  static async createProvider(providerName: string, modelName?: string) {
    // implementation
  }
}

// ✅ Add explicit return type
export class AIProviderFactory {
  static async createProvider(
    providerName: string,
    modelName?: string,
  ): Promise<AIProvider> {
    // implementation
  }
}
```

#### 3.2 Improve Error Handling Types

```typescript
// Add specific error types
export type ProviderCreationError = {
  code: "INVALID_PROVIDER" | "CONFIGURATION_ERROR" | "INSTANTIATION_ERROR";
  message: string;
  provider: string;
  details?: UnknownRecord;
};

export type FactoryResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: ProviderCreationError;
    };
```

### Step 4: Refactor baseProvider.ts

**File**: `src/lib/core/baseProvider.ts`

#### 4.1 Improve Abstract Class Typing

```typescript
// ❌ Current (if using generic any or unknown incorrectly)
export abstract class BaseProvider {
  abstract stream(options: any): Promise<any>;
}

// ✅ Improve to
export abstract class BaseProvider implements AIProvider {
  abstract stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult>;

  abstract generate(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null>;
}
```

#### 4.2 Add Provider Metadata Types

```typescript
export type ProviderMetadata = {
  name: string;
  version: string;
  capabilities: ProviderCapability[];
  models: string[];
  healthStatus: ProviderHealthStatus;
};

export type ProviderCapability =
  | "text-generation"
  | "streaming"
  | "tool-calling"
  | "image-generation"
  | "embeddings";

export type ProviderHealthStatus =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "unknown";
```

### Step 5: Refactor serviceRegistry.ts

**File**: `src/lib/core/serviceRegistry.ts`

#### 5.1 Improve Registry Types

```typescript
export type ServiceDefinition<T = UnknownRecord> = {
  name: string;
  version: string;
  instance: T;
  metadata: ServiceMetadata;
  status: ServiceStatus;
};

export type ServiceMetadata = {
  description: string;
  tags: string[];
  dependencies: string[];
  capabilities: string[];
};

export type ServiceStatus = "active" | "inactive" | "error" | "initializing";
```

### Step 6: Refactor analytics.ts

**File**: `src/lib/core/analytics.ts`

#### 6.1 Improve Analytics Types

```typescript
// Ensure AnalyticsData is properly typed
export type AnalyticsData = {
  requestId: string;
  timestamp: number;
  provider: string;
  model: string;
  tokenUsage: TokenUsage;
  timing: PerformanceTiming;
  success: boolean;
  error?: ErrorInfo;
};

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;
};

export type PerformanceTiming = {
  totalTime: number;
  networkTime?: number;
  processingTime?: number;
  queueTime?: number;
};
```

### Step 7: Refactor evaluation.ts

**File**: `src/lib/core/evaluation.ts`

#### 7.1 Improve Evaluation System Types

```typescript
export type EvaluationRequest = {
  content: string;
  context?: string;
  domain?: string;
  criteria: EvaluationCriteria;
};

export type EvaluationCriteria = {
  relevance: boolean;
  accuracy: boolean;
  completeness: boolean;
  domainSpecific?: boolean;
};

export type EvaluationProvider = "openai" | "anthropic" | "vertex" | "local";
```

### Step 8: Add New Type Utilities

**File**: `src/lib/core/types.ts` (add these utilities)

```typescript
// Type guards
export function isTextGenerationOptions(
  value: unknown,
): value is TextGenerationOptions {
  return (
    isNonNullObject(value) &&
    (typeof value.prompt === "string" ||
      (isNonNullObject(value.input) && typeof value.input.text === "string"))
  );
}

export function isStreamOptions(value: unknown): value is StreamOptions {
  return isNonNullObject(value) && Array.isArray(value.providers);
}

// Utility types
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// Provider-related utilities
export type ProviderNames = keyof typeof AIProviderName;
export type ModelNames =
  | BedrockModels
  | OpenAIModels
  | VertexModels
  | GoogleAIModels;
```

## Validation Checklist

### Compilation Checks

- [ ] `npx tsc --noEmit` passes without errors
- [ ] No import/export errors in core module
- [ ] All type exports are accessible from other modules

### Type Safety Checks

- [ ] No `any` types in core module
- [ ] All interfaces converted to types where appropriate
- [ ] All public methods have explicit return types
- [ ] Generic constraints are properly defined

### Functionality Checks

- [ ] Core factory still creates providers correctly
- [ ] Base provider abstraction works
- [ ] Service registry functionality preserved
- [ ] Analytics system still functions
- [ ] Evaluation system still works

### Integration Checks

- [ ] Other modules still import core types correctly
- [ ] Provider implementations still extend base correctly
- [ ] CLI still uses core types correctly

## Verification Commands

```bash
# TypeScript compilation
npx tsc --noEmit

# Build test
pnpm run build

# Type checking specific to core module
npx tsc --noEmit --skipLibCheck src/lib/core/*.ts

# Test core functionality
pnpm test src/test/core/

# Check exports are accessible
node -e "
const core = require('./dist/lib/core/types.js');
console.log('Core exports:', Object.keys(core));
"
```

## Common Issues and Solutions

### Issue 1: Circular Import Dependencies

```typescript
// If you encounter circular imports
// Solution: Move shared types to a separate types file
// Create src/lib/core/shared-types.ts for common types
```

### Issue 2: Generic Constraint Errors

```typescript
// If generic constraints cause issues
// Solution: Use more specific constraints
export type ProviderMethod<T extends AIProvider> = keyof T;
```

### Issue 3: Type Compatibility Issues

```typescript
// If type conversion breaks compatibility
// Solution: Use type unions or intersection types
export type BackwardCompatibleType = NewType & LegacyType;
```

## Rollback Plan

```bash
# If critical issues arise
git checkout release
git branch -D refactor/core-module

# Or restore specific file
git checkout HEAD~1 -- src/lib/core/types.ts
```

## Testing Strategy

### Unit Tests

```bash
# Test core module specifically
pnpm test src/test/core/

# Test provider factory
pnpm test src/test/factory/

# Test type guards
pnpm test src/test/types/
```

### Integration Tests

```bash
# Test provider creation
pnpm test src/test/providers/

# Test CLI integration
pnpm test src/test/cli/
```

## Success Criteria

- ✅ All interfaces converted to types in core module
- ✅ Zero TypeScript compilation errors
- ✅ All public methods have explicit return types
- ✅ No `any` types in core module
- ✅ Proper generic constraints throughout
- ✅ Type guards implemented for runtime checking
- ✅ All exports properly typed and accessible
- ✅ Backward compatibility maintained
- ✅ All tests pass
- ✅ Provider factory works correctly
- ✅ Base provider abstraction functional

## Next Steps

After completing this refactor:

1. **03-providers-module.md** - Refactor all provider implementations
2. **04-cli-module.md** - Refactor CLI module
3. Update provider implementations to use new core types
4. Update CLI commands to use new core types

## Impact Assessment

**High Impact**:

- All provider implementations will need updates
- CLI module will need type updates
- Test files will need type updates

**Medium Impact**:

- Configuration module will benefit from improved types
- Utility modules will use better core types

**Low Impact**:

- MCP module (minimal dependencies on core types)
- Build configuration (should work the same)
