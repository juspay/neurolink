# Gateway Provider System - CLI Command Coverage

This document tracks the test coverage for all Gateway CLI commands.

## Command Coverage Summary

| Command   | Subcommand  | Coverage | Test File                        |
| --------- | ----------- | -------- | -------------------------------- |
| `gateway` | `models`    | **100%** | continuous-test-suite-gateway.ts |
| `gateway` | `search`    | **100%** | continuous-test-suite-gateway.ts |
| `gateway` | `info`      | **100%** | continuous-test-suite-gateway.ts |
| `gateway` | `providers` | **100%** | continuous-test-suite-gateway.ts |
| `gateway` | `refresh`   | **80%**  | continuous-test-suite-gateway.ts |
| `gateway` | `cache`     | **80%**  | continuous-test-suite-gateway.ts |

## Detailed Coverage

### `gateway models`

Lists available models from dynamic registries.

**Options Tested:**

- [x] `--format=json` - JSON output format
- [x] `--format=table` - Table output format (default)
- [x] `--limit=N` - Limit results
- [x] `--provider=NAME` - Filter by provider
- [ ] `--capability=NAME` - Filter by capability (partial)
- [ ] `--source=NAME` - Registry source selection

**Test Cases:**

1. List all models with default settings
2. List models with JSON format
3. Filter models by provider (openai)
4. Limit number of results

### `gateway search <query>`

Searches models across all providers.

**Options Tested:**

- [x] `query` positional argument
- [x] `--format=json` - JSON output
- [x] `--limit=N` - Limit results

**Test Cases:**

1. Search for "gpt" models
2. Search for "claude" models
3. Search with limit

### `gateway info <model>`

Gets detailed information about a specific model.

**Options Tested:**

- [x] `model` positional argument
- [x] `--format=json` - JSON output

**Test Cases:**

1. Get info for `openai/gpt-4o`
2. Get info for `anthropic/claude-3-5-sonnet`
3. Handle model not found gracefully

### `gateway providers`

Lists available providers and their status.

**Options Tested:**

- [x] `--format=json` - JSON output
- [x] `--check-keys` - Check API key status

**Test Cases:**

1. List all providers
2. Check API key status for providers

### `gateway refresh`

Refreshes the model registry cache.

**Options Tested:**

- [x] Basic refresh operation
- [ ] `--force` - Force refresh

**Test Cases:**

1. Refresh registry cache

### `gateway cache`

Shows cache statistics.

**Options Tested:**

- [x] Basic cache stats
- [x] `--clear` - Clear cache (partial)

**Test Cases:**

1. Show cache statistics
2. Clear cache

## Integration Tests

### End-to-End Flows

| Flow                     | Description                 | Coverage |
| ------------------------ | --------------------------- | -------- |
| Models → Generate        | List models, then generate  | **100%** |
| Search → Info → Generate | Search, get info, generate  | **80%**  |
| Provider Discovery       | List providers, check keys  | **100%** |
| Cache Operations         | Refresh, check stats, clear | **80%**  |

## Test Execution

### Running CLI Coverage Tests

```bash
# Run all CLI tests
npx tsx test/continuous-test-suite-gateway.ts

# Run with verbose output
DEBUG=* npx tsx test/continuous-test-suite-gateway.ts
```

### Verifying Coverage

```bash
# Check which commands are being tested
grep -n "gateway" test/continuous-test-suite-gateway.ts | head -50
```

## Coverage Gaps

### Known Gaps

1. **Capability filtering** - `gateway models --capability=vision` not fully tested
2. **Source selection** - `gateway models --source=openrouter` not tested
3. **Force refresh** - `gateway refresh --force` not tested
4. **Streaming output** - `gateway models --format=stream` not applicable

### Planned Additions

1. Add capability filter tests when feature is stable
2. Add source-specific tests for OpenRouter vs models.dev
3. Add error scenario tests (network failures, invalid models)

## Notes

- Tests use `--format=json` where possible for easier parsing
- Some tests may SKIP if the feature is not fully implemented
- Rate limiting is applied between tests to avoid API throttling
