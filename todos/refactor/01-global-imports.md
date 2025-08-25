# Global Import Extensions Fix

**Status**: `[ ]` Not started  
**Priority**: 🔴 Critical  
**Estimated Effort**: 2-3 hours  
**Prerequisites**: None (must be done first)

## Objective

Remove all `.js` extensions from TypeScript import statements across the entire codebase to ensure proper TypeScript compilation and module resolution.

## Problem Description

All TypeScript files currently use `.js` extensions in import statements:

```typescript
// ❌ Current (incorrect for TypeScript)
import { logger } from "../utils/logger.js";

// ✅ Should be (correct for TypeScript)
import { logger } from "../utils/logger";
```

## Files to Modify

**All TypeScript files in the project** (~140 files):

- `src/lib/**/*.ts`
- `src/cli/**/*.ts`
- `test/**/*.ts`

## Step-by-Step Instructions

### Step 1: Create Backup

```bash
# Create a backup branch
git checkout -b fix/remove-js-extensions
git add -A
git commit -m "Backup before removing .js extensions"
```

### Step 2: Global Find and Replace

Use VS Code or sed to replace all `.js` extensions in imports:

**Option A: VS Code Global Replace**

1. Open VS Code
2. Press `Cmd+Shift+F` (macOS) or `Ctrl+Shift+H` (Windows/Linux)
3. Enable regex mode (.\*)
4. Find: `(import.*from\s+['"].*?)\.js(['"])`
5. Replace: `$1$2`
6. Include: `src/**/*.ts,test/**/*.ts`
7. Exclude: `node_modules,dist,.svelte-kit`

**Option B: Command Line (sed)**

```bash
# macOS/BSD sed
find src test -name "*.ts" -exec sed -i '' 's/\(import.*from[[:space:]]*['\''"][^'\'']*\)\.js\(['\''"][[:space:]]*\)/\1\2/g' {} +

# Linux sed
find src test -name "*.ts" -exec sed -i 's/\(import.*from[[:space:]]*['\''"][^'\'']*\)\.js\(['\''"][[:space:]]*\)/\1\2/g' {} +
```

### Step 3: Manual Verification

Check specific known problematic files:

- `src/lib/index.ts`
- `src/lib/core/types.ts`
- `src/lib/providers/index.ts`
- `src/cli/index.ts`

### Step 4: Handle Dynamic Imports

Find and fix dynamic imports:

```bash
grep -r "import(" src/ test/ | grep "\.js"
```

Example fixes:

```typescript
// ❌ Before
const { ProviderFactory } = await import("./providerFactory.js");

// ✅ After
const { ProviderFactory } = await import("./providerFactory");
```

### Step 5: Build Verification

```bash
# Test TypeScript compilation
npx tsc --noEmit

# Test build
pnpm run build

# Test CLI
pnpm run build:cli
```

## Common Patterns to Fix

### 1. Basic Imports

```typescript
// ❌ Before
import { AIProviderFactory } from "./core/factory.js";
import type { AIProvider } from "../core/types.js";

// ✅ After
import { AIProviderFactory } from "./core/factory";
import type { AIProvider } from "../core/types";
```

### 2. Relative Imports

```typescript
// ❌ Before
import { logger } from "../utils/logger.js";
import type { UnknownRecord } from "../types/common.js";

// ✅ After
import { logger } from "../utils/logger";
import type { UnknownRecord } from "../types/common";
```

### 3. Dynamic Imports

```typescript
// ❌ Before
const anthropicModule = await import("@ai-sdk/google-vertex/anthropic");

// ✅ After (external modules keep extensions if required)
const anthropicModule = await import("@ai-sdk/google-vertex/anthropic");

// ❌ Before (internal dynamic imports)
const { createVertexAnthropic } = await import("./vertex-helper.js");

// ✅ After
const { createVertexAnthropic } = await import("./vertex-helper");
```

## Validation Checklist

- [ ] All TypeScript files compile without import errors
- [ ] `npx tsc --noEmit` passes without errors
- [ ] `pnpm run build` succeeds
- [ ] `pnpm run build:cli` succeeds
- [ ] No `.js` extensions in TypeScript imports (verify with grep)
- [ ] All tests still pass: `pnpm test`
- [ ] CLI still works: `./dist/cli/index.js --help`

## Verification Commands

```bash
# Check for remaining .js extensions in imports
grep -r "import.*\.js['\"]" src/ test/ || echo "✅ No .js extensions found"

# Check for remaining .js in dynamic imports
grep -r "import(.*\.js" src/ test/ || echo "✅ No .js in dynamic imports found"

# TypeScript compilation check
npx tsc --noEmit && echo "✅ TypeScript compilation successful"

# Build check
pnpm run build && echo "✅ Build successful"

# Test check
pnpm test && echo "✅ Tests passing"
```

## Common Issues and Solutions

### Issue 1: ESLint Import Errors

```bash
# If ESLint complains about import extensions
# Update .eslintrc.js to enforce no extensions for TypeScript
"import/extensions": ["error", "never", { "js": "never", "ts": "never" }]
```

### Issue 2: Module Resolution Issues

```typescript
// If you see "Module not found" errors
// Check tsconfig.json module resolution settings
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

### Issue 3: Build Tool Issues

```typescript
// If build tools expect .js extensions
// Check vite.config.ts and build scripts
// May need to update build configuration
```

## Rollback Plan

If issues arise:

```bash
# Rollback using git
git checkout release  # or your main branch
git branch -D fix/remove-js-extensions

# Or restore specific files
git checkout HEAD~1 -- src/lib/index.ts
```

## Files Modified (Example List)

After completion, these key files will be modified:

- `src/lib/index.ts`
- `src/lib/core/types.ts`
- `src/lib/core/factory.ts`
- `src/lib/providers/index.ts`
- `src/lib/providers/amazonBedrock.ts`
- `src/lib/providers/openAI.ts`
- [... all TypeScript files]

## Success Criteria

- ✅ Zero `.js` extensions in TypeScript import statements
- ✅ TypeScript compilation succeeds without module resolution errors
- ✅ Build pipeline succeeds without import errors
- ✅ All tests pass
- ✅ CLI functionality preserved
- ✅ No runtime import errors

## Next Steps

After completing this refactor:

1. Move to **02-core-module.md** - Core module type improvements
2. Ensure this change is committed before starting other refactors
3. Update team about the change (no more `.js` extensions in TypeScript)
