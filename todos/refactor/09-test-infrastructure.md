# Test Infrastructure Improvements

**Status**: `[ ]` Not started  
**Priority**: 🟡 Medium  
**Estimated Effort**: 4-6 hours  
**Prerequisites**: 01-global-imports.md, 02-core-module.md, 03-providers-module.md must be completed

## Objective

Refactor the test infrastructure to eliminate `as any` usage, improve type safety, standardize test patterns, and ensure comprehensive type coverage across all test files.

## Files to Modify

### Main Test Files

- `test/array-tool-registration.test.ts` - Main test file with multiple `as any` usages
- `test/setup-minimal.ts` - Test setup and configuration

### Test Utilities (if they exist)

- `test/utils/` - Test utility functions
- `test/helpers/` - Test helper functions
- `test/fixtures/` - Test fixtures and mock data

## Step-by-Step Instructions

### Step 1: Backup and Setup

```bash
# Create feature branch
git checkout -b refactor/test-infrastructure
git add -A
git commit -m "Backup before test infrastructure refactor"
```

### Step 2: Create Test Type Definitions

**File**: `test/types/test-types.ts` (create new file)

```typescript
import type { UnknownRecord, JsonValue } from "../src/lib/types/common";

// Test result types
export type TestResult<T = JsonValue> = {
  success: boolean;
  data?: T;
  error?: TestError;
  metadata?: TestMetadata;
};

export type TestError = {
  message: string;
  code?: string;
  stack?: string;
  details?: UnknownRecord;
};

export type TestMetadata = {
  executionTime: number;
  testName: string;
  provider?: string;
  model?: string;
};

// Tool execution test types
export type ToolExecutionResult = {
  success: boolean;
  result: JsonValue;
  executionTime: number;
  toolName: string;
  serverId?: string;
};

// Mock provider types
export type MockProviderConfig = {
  name: string;
  models: string[];
  responses: MockResponse[];
  errors?: MockError[];
};

export type MockResponse = {
  trigger: string | RegExp;
  response: JsonValue;
  delay?: number;
};

export type MockError = {
  trigger: string | RegExp;
  error: Error;
  delay?: number;
};

// Type guards for test results
export function isToolExecutionResult(
  value: unknown,
): value is ToolExecutionResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    "result" in value &&
    "toolName" in value
  );
}

export function hasDataProperty<T>(value: unknown): value is { data: T } {
  return typeof value === "object" && value !== null && "data" in value;
}

export function isSuccessResult(
  value: unknown,
): value is { success: true; data: JsonValue } {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    (value as { success: unknown }).success === true &&
    "data" in value
  );
}
```

### Step 3: Refactor Main Test File

**File**: `test/array-tool-registration.test.ts`

#### 3.1 Remove `as any` Usages

**Find and replace these patterns:**

```typescript
// ❌ Current - Line ~105
const addValue = (addResult as any)?.data ?? addResult;

// ✅ Replace with
const addValue = hasDataProperty(addResult) ? addResult.data : addResult;
```

```typescript
// ❌ Current - Line ~114
const multiplyValue = (multiplyResult as any)?.data ?? multiplyResult;

// ✅ Replace with
const multiplyValue = hasDataProperty(multiplyResult)
  ? multiplyResult.data
  : multiplyResult;
```

```typescript
// ❌ Current - Line ~198
expect((individualResult as any)?.data ?? individualResult).toBe("individual");

// ✅ Replace with
const individualValue = hasDataProperty(individualResult)
  ? individualResult.data
  : individualResult;
expect(individualValue).toBe("individual");
```

```typescript
// ❌ Current - Line ~201-202
expect((arrayResult as any)?.data ?? arrayResult).toBe("array");
expect((objectResult as any)?.data ?? objectResult).toBe("object");

// ✅ Replace with
const arrayValue = hasDataProperty(arrayResult)
  ? arrayResult.data
  : arrayResult;
const objectValue = hasDataProperty(objectResult)
  ? objectResult.data
  : objectResult;

expect(arrayValue).toBe("array");
expect(objectValue).toBe("object");
```

```typescript
// ❌ Current - Line ~338
const analyticsData = (analyticsResult as any)?.data ?? analyticsResult;

// ✅ Replace with
const analyticsData = hasDataProperty(analyticsResult)
  ? analyticsResult.data
  : analyticsResult;
```

```typescript
// ❌ Current - Line ~359
const paymentData = (paymentResult as any)?.data ?? paymentResult;

// ✅ Replace with
const paymentData = hasDataProperty(paymentResult)
  ? paymentResult.data
  : paymentResult;
```

#### 3.2 Improve Test Helper Functions

Add these helper functions at the top of the test file:

```typescript
import {
  hasDataProperty,
  isToolExecutionResult,
  isSuccessResult,
  type TestResult,
  type ToolExecutionResult,
} from "./types/test-types";

// Helper function to safely extract tool result data
function extractToolResult<T = JsonValue>(result: unknown): T {
  if (isSuccessResult(result)) {
    return result.data as T;
  }

  if (hasDataProperty(result)) {
    return result.data as T;
  }

  return result as T;
}

// Helper function to validate tool execution results
function validateToolExecution(
  result: unknown,
  expectedToolName: string,
): asserts result is ToolExecutionResult {
  if (!isToolExecutionResult(result)) {
    throw new Error(`Expected tool execution result, got: ${typeof result}`);
  }

  if (result.toolName !== expectedToolName) {
    throw new Error(
      `Expected tool ${expectedToolName}, got: ${result.toolName}`,
    );
  }
}

// Helper function for type-safe test result assertion
function assertTestSuccess<T>(
  result: unknown,
): asserts result is TestResult<T> & { success: true } {
  if (!isSuccessResult(result)) {
    throw new Error(`Test failed: ${JSON.stringify(result)}`);
  }
}
```

#### 3.3 Update Test Cases

**Replace unsafe patterns with type-safe alternatives:**

```typescript
// ❌ Current pattern
test("should register tools from array format using unified method", async () => {
  // ... test setup
  const addValue = (addResult as any)?.data ?? addResult;
  expect(addValue).toBe(42);
});

// ✅ Improved pattern
test("should register tools from array format using unified method", async () => {
  // ... test setup
  const addValue = extractToolResult<number>(addResult);
  expect(addValue).toBe(42);
});
```

```typescript
// ❌ Current pattern for tool validation
// Direct access without type checking

// ✅ Improved pattern with validation
test("should validate tool execution properly", async () => {
  const result = await neurolink.executeTool("test_tool", { value: 10 });

  // Validate the result structure
  validateToolExecution(result, "test_tool");

  // Now we can safely access properties
  expect(result.success).toBe(true);
  expect(result.toolName).toBe("test_tool");
  expect(typeof result.executionTime).toBe("number");
});
```

### Step 4: Improve Test Setup

**File**: `test/setup-minimal.ts`

```typescript
import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import type { MockProviderConfig } from "./types/test-types";

// Test environment configuration
export type TestEnvironment = {
  providers: MockProviderConfig[];
  timeout: number;
  cleanup: boolean;
  verbose: boolean;
};

export const defaultTestEnvironment: TestEnvironment = {
  providers: [],
  timeout: 30000,
  cleanup: true,
  verbose: false,
};

// Global test setup
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = "test";
  process.env.NEUROLINK_DEBUG = "false";
  process.env.NEUROLINK_TELEMETRY_ENABLED = "false";

  // Disable actual network calls in tests
  process.env.NEUROLINK_TEST_MODE = "true";
});

afterAll(async () => {
  // Cleanup test environment
  delete process.env.NEUROLINK_TEST_MODE;
});

// Test utilities
export class TestHelper {
  static createMockProvider(
    config: Partial<MockProviderConfig>,
  ): MockProviderConfig {
    return {
      name: config.name || "test-provider",
      models: config.models || ["test-model"],
      responses: config.responses || [],
      errors: config.errors || [],
    };
  }

  static async waitFor(
    condition: () => boolean,
    timeout = 5000,
  ): Promise<void> {
    const start = Date.now();

    while (!condition() && Date.now() - start < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!condition()) {
      throw new Error(`Condition not met within ${timeout}ms`);
    }
  }

  static createTestTimeout(duration: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Test timeout after ${duration}ms`)),
        duration,
      );
    });
  }
}
```

### Step 5: Create Test Utility Functions

**File**: `test/utils/assertions.ts` (create new file)

```typescript
import { expect } from "vitest";
import type { JsonValue, UnknownRecord } from "../../src/lib/types/common";

// Type-safe assertion utilities
export function expectTypeOf<T>(value: unknown): asserts value is T {
  // This is a runtime assertion that TypeScript will understand
  if (value === null || value === undefined) {
    throw new Error(`Expected value to be defined, got: ${value}`);
  }
}

export function expectObject(value: unknown): asserts value is UnknownRecord {
  expect(value).toBeTypeOf("object");
  expect(value).not.toBeNull();
  expect(Array.isArray(value)).toBe(false);
}

export function expectArray(value: unknown): asserts value is unknown[] {
  expect(Array.isArray(value)).toBe(true);
}

export function expectString(value: unknown): asserts value is string {
  expect(value).toBeTypeOf("string");
}

export function expectNumber(value: unknown): asserts value is number {
  expect(value).toBeTypeOf("number");
  expect(Number.isNaN(value)).toBe(false);
}

export function expectBoolean(value: unknown): asserts value is boolean {
  expect(value).toBeTypeOf("boolean");
}

// Tool-specific assertions
export function expectToolResult(
  value: unknown,
  expectedToolName?: string,
): asserts value is { success: boolean; result: JsonValue; toolName: string } {
  expectObject(value);

  expect(value).toHaveProperty("success");
  expect(value).toHaveProperty("result");
  expect(value).toHaveProperty("toolName");

  expectBoolean(value.success);
  expectString(value.toolName);

  if (expectedToolName) {
    expect(value.toolName).toBe(expectedToolName);
  }
}

// Provider result assertions
export function expectProviderResult(
  value: unknown,
): asserts value is { content: string; provider?: string; model?: string } {
  expectObject(value);

  expect(value).toHaveProperty("content");
  expectString(value.content);

  if ("provider" in value) {
    expectString(value.provider);
  }

  if ("model" in value) {
    expectString(value.model);
  }
}
```

### Step 6: Create Mock Utilities

**File**: `test/utils/mocks.ts` (create new file)

```typescript
import { vi } from "vitest";
import type { AIProvider } from "../../src/lib/core/types";
import type { MockProviderConfig, MockResponse } from "../types/test-types";

export class MockProvider implements AIProvider {
  private responses: MockResponse[];
  private errors: MockError[];

  constructor(config: MockProviderConfig) {
    this.responses = config.responses;
    this.errors = config.errors || [];
  }

  async stream(optionsOrPrompt: unknown): Promise<unknown> {
    const prompt =
      typeof optionsOrPrompt === "string"
        ? optionsOrPrompt
        : this.extractPrompt(optionsOrPrompt);

    return this.getResponse(prompt);
  }

  async generate(optionsOrPrompt: unknown): Promise<unknown> {
    const prompt =
      typeof optionsOrPrompt === "string"
        ? optionsOrPrompt
        : this.extractPrompt(optionsOrPrompt);

    return this.getResponse(prompt);
  }

  async gen(optionsOrPrompt: unknown): Promise<unknown> {
    return this.generate(optionsOrPrompt);
  }

  setupToolExecutor(): void {
    // Mock implementation
  }

  private extractPrompt(options: unknown): string {
    if (typeof options === "object" && options !== null) {
      const opts = options as UnknownRecord;
      return (
        (opts.prompt as string) || (opts.input as { text: string })?.text || ""
      );
    }
    return "";
  }

  private getResponse(prompt: string): unknown {
    // Check for error responses first
    for (const error of this.errors) {
      if (this.matchesTrigger(prompt, error.trigger)) {
        throw error.error;
      }
    }

    // Check for mock responses
    for (const response of this.responses) {
      if (this.matchesTrigger(prompt, response.trigger)) {
        return response.response;
      }
    }

    // Default response
    return {
      content: `Mock response for: ${prompt}`,
      provider: "mock",
      model: "mock-model",
    };
  }

  private matchesTrigger(input: string, trigger: string | RegExp): boolean {
    if (typeof trigger === "string") {
      return input.includes(trigger);
    }
    return trigger.test(input);
  }
}

// Mock factory utilities
export function createMockToolExecutor() {
  return vi.fn().mockImplementation((toolName: string, params: unknown) => {
    return Promise.resolve({
      success: true,
      result: `Mock result for ${toolName}`,
      toolName,
      executionTime: Math.random() * 100,
    });
  });
}

export function createMockAnalytics() {
  return {
    track: vi.fn(),
    increment: vi.fn(),
    timing: vi.fn(),
    flush: vi.fn(),
  };
}
```

### Step 7: Update Existing Test Cases

**Apply these patterns throughout the test file:**

```typescript
// ❌ Old pattern with as any
test("tool execution test", async () => {
  const result = await executeFunction();
  const data = (result as any)?.data ?? result;
  expect(data).toBe("expected");
});

// ✅ New pattern with type safety
test("tool execution test", async () => {
  const result = await executeFunction();

  // Use type-safe extraction
  const data = extractToolResult(result);
  expect(data).toBe("expected");

  // Or use assertions
  expectToolResult(result, "expected-tool-name");
  expect(result.success).toBe(true);
});
```

## Validation Checklist

### Type Safety Checks

- [ ] No `as any` usage in test files
- [ ] All test utilities properly typed
- [ ] Type guards used for runtime validation
- [ ] Mock objects properly typed

### Test Coverage Checks

- [ ] All existing tests still pass
- [ ] New type assertions don't break functionality
- [ ] Error cases properly handled
- [ ] Edge cases covered with proper typing

### Code Quality Checks

- [ ] Test code is readable and maintainable
- [ ] Helper functions are reusable
- [ ] Mock utilities are comprehensive
- [ ] Type-safe patterns are consistent

## Verification Commands

```bash
# Run all tests
pnpm test

# Run tests with type checking
npx tsc --noEmit test/**/*.ts

# Run specific test file
pnpm test test/array-tool-registration.test.ts

# Run tests with verbose output
pnpm test --verbose

# Check test coverage
pnpm test --coverage
```

## Common Issues and Solutions

### Issue 1: Type Assertion Failures

```typescript
// If type assertions fail in tests
// Solution: Use proper type guards
function isValidTestResult(value: unknown): value is TestResult {
  return typeof value === "object" && value !== null && "success" in value;
}
```

### Issue 2: Mock Type Mismatches

```typescript
// If mocks don't match expected types
// Solution: Create typed mock factories
function createTypedMock<T>(): T {
  return vi.fn() as unknown as T;
}
```

### Issue 3: Async Test Type Issues

```typescript
// If async tests have type issues
// Solution: Properly type async test functions
async function runTypedTest<T>(testFn: () => Promise<T>): Promise<T> {
  return await testFn();
}
```

## Rollback Plan

```bash
# If critical issues arise
git checkout release
git branch -D refactor/test-infrastructure

# Or restore specific test file
git checkout HEAD~1 -- test/array-tool-registration.test.ts
```

## Success Criteria

- ✅ Zero `as any` usage in test files
- ✅ All test utilities properly typed
- ✅ Type guards implemented for test assertions
- ✅ Mock objects and functions properly typed
- ✅ All existing tests continue to pass
- ✅ Test code is more maintainable and readable
- ✅ Type safety enforced in test environment
- ✅ Helper functions are reusable across tests
- ✅ Error handling in tests is type-safe

## Next Steps

After completing this refactor:

1. **10-build-configuration.md** - Final build and tooling improvements
2. Consider adding more comprehensive test types
3. Add integration tests with proper typing
4. Document test patterns for future development

## Impact Assessment

**High Impact**:

- Test reliability improves significantly
- Type errors caught earlier in development
- Test code becomes more maintainable

**Medium Impact**:

- Development velocity may improve with better test types
- Debugging becomes easier with type-safe tests

**Low Impact**:

- Runtime test performance (minimal change)
- Existing test functionality (all preserved)
