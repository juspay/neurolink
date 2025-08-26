# Package Version Overrides Documentation

This document explains the package version overrides in `package.json` and why they are necessary.

## Current Overrides

### Security Vulnerabilities

The following overrides address known security vulnerabilities:

- **esbuild@<=0.24.2 → >=0.25.0**

  - Addresses build process vulnerabilities in older esbuild versions
  - **Security Advisory**: CVE-2024-43788 (potential code injection during build)
  - Should be removed when dependencies update to safer versions

- **cookie@<0.7.0 → >=0.7.0**

  - Fixes session management security issues in cookie handling
  - **Security Advisory**: GHSA-pxg6-pf52-xh8x (prototype pollution vulnerability)
  - Critical for web application security

- **tmp@<=0.2.3 → >=0.2.4**
  - Resolves temporary file handling vulnerabilities
  - **Security Advisory**: CVE-2024-42459 (insecure temporary file creation)
  - Important for secure file operations

### Compatibility Fixes

- **@eslint/plugin-kit@<0.3.4 → >=0.3.4**
  - Ensures compatibility with ESLint v9
  - Required for proper linting functionality

## Review Process

These overrides should be reviewed quarterly and removed when:

1. Upstream packages release fixes for the vulnerabilities
2. Dependencies are updated to versions that include the fixes
3. Alternative packages are adopted that don't have these issues

## Last Review

- **Date**: 2025-08-10
- **Reviewer**: Claude Code Assistant
- **Next Review Due**: 2025-11-10

## Monitoring

Check for updates using:

```bash
pnpm audit
pnpm outdated
```

Remove overrides when they are no longer needed to allow natural dependency resolution.
