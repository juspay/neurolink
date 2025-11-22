# NPM Package Deprecation Guide

## Overview

This guide documents the process for deprecating incompatible NPM package versions to help users avoid known issues.

## Background

NeuroLink versions prior to `7.53.5` have a known incompatibility with modern MCP servers, resulting in the error:

```
Failed to request initial roots from client: MCP error -32601: Method not found
```

To prevent users from installing incompatible versions, we can formally deprecate older versions on NPM with a clear upgrade message.

## Deprecation Process

### Prerequisites

- NPM account with publish permissions for `@juspay/neurolink`
- Local installation of NPM CLI

### Commands to Deprecate Old Versions

```bash
# Deprecate a specific version
npm deprecate @juspay/neurolink@7.43.0 "This version is incompatible with modern MCP servers. Please upgrade to 7.53.5 or later to fix MCP error -32601."

# Deprecate a range of versions (if needed)
npm deprecate @juspay/neurolink@">=7.40.0 <7.53.5" "These versions are incompatible with modern MCP servers. Please upgrade to 7.53.5 or later to fix MCP error -32601."
```

### Deprecation Message Template

When deprecating versions, use this message template:

```
This version is incompatible with modern MCP servers (MCP error -32601: Method not found). Please upgrade to version 7.53.5 or later. See https://github.com/juspay/neurolink/blob/main/docs/TROUBLESHOOTING.md#-mcp-error--32601-method-not-found for details.
```

> **Note**: Update the branch name in the URL (e.g., `main`, `master`, or `release`) to match your repository's default branch.

### Verify Deprecation

```bash
# Check if a version is deprecated
npm view @juspay/neurolink@7.43.0

# List all versions with deprecation status
npm view @juspay/neurolink versions --json
```

### User Experience

When users try to install a deprecated version, they will see:

```bash
$ npm install @juspay/neurolink@7.43.0

npm WARN deprecated @juspay/neurolink@7.43.0: This version is incompatible with modern MCP servers. Please upgrade to 7.53.5 or later to fix MCP error -32601.
```

## Impact

### Who This Affects

- Projects with `package.json` specifying `^7.43.0` or similar ranges
- New installations using older version numbers
- CI/CD pipelines with pinned old versions

### Recommended Actions

1. **Immediate**: Deprecate version `7.43.0` and other known incompatible versions
2. **Communication**: Announce deprecation in:
   - GitHub release notes
   - Project README
   - Discord/Slack community (if applicable)
3. **Documentation**: Update all documentation to reference version `7.53.5+` as the minimum

## Undoing Deprecation

If a deprecation needs to be reversed:

```bash
npm deprecate @juspay/neurolink@7.43.0 ""
```

Note: An empty string removes the deprecation warning.

## Best Practices

1. **Clear Messages**: Always explain why a version is deprecated and what users should do
2. **Include Links**: Link to troubleshooting documentation
3. **Version Ranges**: Consider deprecating ranges if multiple versions have the same issue
4. **Communication**: Announce deprecations through multiple channels
5. **Monitor**: Track download statistics to see if users are migrating away from deprecated versions

## Related Documentation

- [Troubleshooting Guide](TROUBLESHOOTING.md#-mcp-error--32601-method-not-found)
- [MCP Integration Guide](MCP-INTEGRATION.md)
- [NPM Deprecate Documentation](https://docs.npmjs.com/cli/v8/commands/npm-deprecate)

## Decision Log

### 2025-11-22: MCP Error -32601 Deprecation

**Decision**: Document deprecation process for incompatible versions

**Rationale**:

- Versions < 7.53.5 have known MCP compatibility issues
- Deprecation warnings will guide users to upgrade
- Reduces support burden from users encountering the issue

**Action Items**:

- [ ] Review and approve deprecation message
- [ ] Execute deprecation commands for affected versions
- [ ] Monitor user feedback and installation metrics
- [ ] Update documentation with deprecation notice

**Status**: Pending approval and execution

---

_Last Updated: 2025-11-22_
