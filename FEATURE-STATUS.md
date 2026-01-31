# Dynamic Arguments - Status

**Completion:** 100%
**Last Updated:** January 31, 2026

## Overview

The Dynamic Arguments feature enables runtime resolution of configuration values through static values, synchronous functions, asynchronous functions, or context-aware callbacks. This enables sophisticated multi-tenant, user-preference-based, and request-context-aware configurations.

## Components

| Component               | Status   | Lines       | Description                                                           |
| ----------------------- | -------- | ----------- | --------------------------------------------------------------------- |
| ArgumentResolver        | Complete | 888         | Core resolution logic with caching, fallbacks, conditional resolution |
| ArgumentValidators      | Complete | 498         | Validation utilities for dynamic argument types                       |
| DynamicArgumentRegistry | Complete | 505         | Registry for managing dynamic argument definitions                    |
| ContextResolver         | Complete | 556         | Request context resolution and propagation                            |
| EnvironmentResolver     | Complete | 547         | Environment-specific value resolution                                 |
| SecretResolver          | Complete | 584         | Secure secret resolution with provider integration                    |
| CLI Context Command     | Complete | 285         | `neurolink context` command for context management                    |
| CLI Context Flags       | Complete | -           | `--user-id`, `--tenant-id`, `--context-json` flags                    |
| Tests                   | Complete | 269 passing | Comprehensive test coverage                                           |

## Key Files

### Core Implementation

- `src/lib/dynamic/types.ts` - Type definitions (DynamicArgument, RequestContext, etc.)
- `src/lib/dynamic/resolver.ts` - Resolution utilities (resolveDynamicArgument, withFallback, conditional)
- `src/lib/dynamic/context.ts` - Request context system (withRequestContext, getCurrentContext)
- `src/lib/dynamic/validators.ts` - Argument validation utilities
- `src/lib/dynamic/registry.ts` - Dynamic argument registry

### SDK Integration

- `src/lib/neurolink.ts` - generateWithDynamic(), streamWithDynamic() methods
- `src/lib/types/generateTypes.ts` - enabledToolNames option for dynamic tools

### CLI Integration

- `src/cli/commands/context.ts` - Context management command
- `src/cli/factories/commandFactory.ts` - Context flags integration
- `src/cli/parser.ts` - Context command registration

## CLI Usage

### Context Management Command

```bash
# Set context values (persisted to ~/.neurolink/context.json)
neurolink context set --user-id user123 --tenant-id org456
neurolink context set --tenant-plan enterprise
neurolink context set --runtime-context '{"taskType": "analysis"}'

# Get current context
neurolink context get                    # Text format
neurolink context get --format json      # JSON format
neurolink context get userId             # Specific key

# Clear context
neurolink context clear                  # Clear all
neurolink context clear userId           # Clear specific key
```

### Context Flags with Generate/Stream Commands

```bash
# Use dynamic context flags directly
neurolink generate "Hello" --user-id user123 --tenant-id org456
neurolink generate "Complex task" --tenant-plan enterprise --user-id admin

# Use JSON context
neurolink generate "Analyze" --context-json '{"taskType": "analysis", "priority": "high"}'

# Combine with other options
neurolink generate "Process data" \
  --user-id user123 \
  --tenant-id org456 \
  --tenant-plan pro \
  --provider anthropic \
  --model claude-3-sonnet
```

## SDK Usage

```typescript
import { NeuroLink } from "@juspay/neurolink";
import { withFallback, conditional } from "@juspay/neurolink/dynamic";

const neurolink = new NeuroLink();

// Dynamic model selection based on tenant plan
const result = await neurolink.generate({
  model: ({ requestContext }) =>
    requestContext.tenant?.plan === "enterprise"
      ? "claude-3-opus"
      : "claude-3-sonnet",
  input: { text: "Hello" },
  context: {
    requestId: "req_123",
    timestamp: Date.now(),
    tenant: { id: "tenant_456", plan: "enterprise" },
  },
});

// Using withFallback for configuration chains
const modelWithFallback = withFallback(
  ({ requestContext }) => requestContext.user?.preferences?.preferredModel,
  ({ requestContext }) => requestContext.tenant?.settings?.defaultModel,
  "gpt-4o", // Final static fallback
);

// Using conditional for branching logic
const conditionalModel = conditional(
  ({ requestContext }) => requestContext.tenant?.plan === "enterprise",
  "claude-3-opus", // If enterprise
  "claude-3-sonnet", // Otherwise
);
```

## Test Coverage

- **Total Tests:** 269 passing
- **Unit Tests:** Type guards, resolution logic, caching
- **Integration Tests:** SDK integration, CLI integration
- **Edge Cases:** Timeout handling, error fallbacks, concurrent resolution

## Changelog

### January 31, 2026

- Added CLI context command (`neurolink context set/get/clear`)
- Added `--context-json` alias for `--runtime-context` flag
- Updated documentation to reflect 100% completion
- Created FEATURE-STATUS.md

### Previous

- Core implementation complete
- SDK integration complete
- CLI flags added to commandFactory.ts
