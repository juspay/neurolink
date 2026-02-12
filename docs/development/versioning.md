---
title: Documentation Versioning
description: Guide to managing documentation versions with mike
keywords: versioning, mike, documentation versions, release management
---

# Documentation Versioning

**Managing documentation versions across releases using mike**

---

## Overview

NeuroLink documentation uses [mike](https://github.com/jimporter/mike) to maintain multiple versions of documentation for different releases. This allows users to view documentation for the specific version they're using.

### Benefits

- **Version-specific docs**: Users can view docs matching their installed version
- **Preserved history**: Old versions remain accessible
- **Easy switching**: Version selector in navigation
- **Automated deployment**: Integrate with CI/CD for automatic publishing

---

## Setup

### 1. Install Dependencies

```bash
# Install mike (already in requirements.txt)
pip install -r requirements.txt
```

### 2. Verify Configuration

The `mkdocs.yml` already includes mike configuration:

```yaml
extra:
  version:
    provider: mike
    default: latest
```

---

## Local Usage

### Create First Version

```bash
# Deploy current docs as version 1.0
mike deploy 1.0 latest --update-aliases

# Set 1.0 as the default version
mike set-default latest
```

### Deploy New Version

```bash
# Deploy new version 1.1
mike deploy 1.1 latest --update-aliases

# Deploy specific version without making it latest
mike deploy 1.0.5
```

### List All Versions

```bash
mike list
```

Output:

```
1.0 [latest]
1.1
1.2
```

### Serve Versioned Docs Locally

```bash
mike serve
```

Visit `http://localhost:8000` to test version switching.

### Delete a Version

```bash
mike delete 1.0
```

---

## Version Management Workflow

### For Minor Releases (1.0 → 1.1)

```bash
# 1. Update docs for new features
# 2. Deploy new version
mike deploy 1.1 latest --update-aliases --push

# 3. Verify
mike list
```

### For Major Releases (1.x → 2.0)

```bash
# 1. Create new version
mike deploy 2.0 latest --update-aliases --push

# 2. Keep 1.x docs accessible
mike list
# Output:
# 1.9
# 2.0 [latest]
```

### For Patch Releases (1.0.0 → 1.0.1)

```bash
# Update existing version (same alias)
mike deploy 1.0 latest --update-aliases --push
```

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/docs.yml`:

```yaml
name: Documentation

on:
  push:
    branches:
      - release
    tags:
      - "v*"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Fetch all history for mike

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.x"

      - name: Install dependencies
        run: |
          pip install -r docs/improve-docs/requirements.txt

      - name: Configure Git
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com

      - name: Deploy documentation
        run: |
          VERSION=${GITHUB_REF#refs/tags/v}
          cd docs/improve-docs
          mike deploy $VERSION latest --update-aliases --push
```

### Automatic Version Detection

```yaml
- name: Deploy documentation
  run: |
    # Get version from package.json
    VERSION=$(node -p "require('./package.json').version")
    cd docs/improve-docs

    # Deploy with version
    if [[ $VERSION == *"-"* ]]; then
      # Pre-release (1.0.0-beta.1)
      mike deploy $VERSION --push
    else
      # Stable release
      mike deploy $VERSION latest --update-aliases --push
    fi
```

---

## Best Practices

### 1. Version Naming

- **Stable releases**: `1.0`, `1.1`, `2.0` (match npm version)
- **Pre-releases**: `1.0-beta`, `2.0-rc1`
- **Development**: `dev` (always latest from main branch)

### 2. Alias Strategy

```bash
# Latest stable release
mike deploy 1.5 latest stable --update-aliases

# Development version
mike deploy dev --update-aliases

# Long-term support
mike deploy 1.0 lts --update-aliases
```

### 3. Version Cleanup

```bash
# Remove old versions (keep last 3 major versions)
mike delete 0.9
mike delete 1.0
```

### 4. Documentation Updates

For bug fixes to old versions:

```bash
# Checkout old version
git checkout v1.0.0

# Make documentation fixes
# ...

# Redeploy specific version
mike deploy 1.0 --push
```

---

## Advanced Configuration

### Custom Version Selector

Add to `mkdocs.yml`:

```yaml
extra:
  version:
    provider: mike
    default: latest
    alias: true
```

### Version Warnings

Add version-specific warnings in `docs/index.md`:

```markdown
!!! warning "Deprecated Version"
You're viewing documentation for version 1.0, which is no longer supported.
Please upgrade to the latest version.
```

---

## Troubleshooting

### Issue: "gh-pages branch not found"

```bash
# Create gh-pages branch
git checkout --orphan gh-pages
git rm -rf .
git commit --allow-empty -m "Initialize gh-pages"
git push origin gh-pages
git checkout main
```

### Issue: Version selector not appearing

Verify mike is installed:

```bash
mike --version
```

Check `mkdocs.yml` configuration:

```yaml
extra:
  version:
    provider: mike # Must be set
```

### Issue: Wrong default version

```bash
# Set correct default
mike set-default latest
mike serve  # Verify locally
```

---

## Version History

| Version | Release Date     | Status         | Notes                 |
| ------- | ---------------- | -------------- | --------------------- |
| 7.47.x  | Current          | ✅ Active      | Latest features       |
| 7.46.x  | 2024-12          | ✅ Active      | Previous stable       |
| 7.45.x  | 2024-11          | ⚠️ Old         | Security updates only |
| < 7.45  | 2024 and earlier | ❌ Unsupported | Upgrade recommended   |

---

## Related Documentation

- **[Contributing](contributing.md)** - How to contribute documentation
- **[Development Setup](../index.md)** - Local development environment
- **[Architecture](architecture.md)** - Documentation structure

---

## Additional Resources

- **[mike Documentation](https://github.com/jimporter/mike)** - Official mike guide
- **[MkDocs Material Versioning](https://squidfunk.github.io/mkdocs-material/setup/setting-up-versioning/)** - Material theme versioning
- **[GitHub Pages](https://docs.github.com/en/pages)** - Hosting documentation
