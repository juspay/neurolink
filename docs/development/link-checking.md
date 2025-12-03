---
title: Automated Link Checking
description: Guide to automated link validation and CI/CD integration
keywords: link checking, automation, CI/CD, documentation quality, broken links
---

# Automated Link Checking

**Automated validation of documentation links to prevent broken references**

---

## Overview

Automated link checking ensures all internal and external links in documentation remain valid, preventing broken links from reaching users. The NeuroLink documentation uses `markdown-link-check` for automated validation.

### Benefits

- **Prevent broken links**: Catch broken links before deployment
- **Automated validation**: Run checks on every commit
- **Internal link validation**: Verify cross-references between docs
- **External link monitoring**: Check third-party URLs periodically
- **CI/CD integration**: Fail builds on broken links

---

## Quick Start

### Local Link Checking

```bash
# From docs/improve-docs directory
chmod +x scripts/check-links.sh
./scripts/check-links.sh docs
```

Output:

```
🔍 Checking links in docs...

📄 Finding markdown files...
Found 50 files to check

[1/50] Checking: docs/index.md
✓ No broken links

[2/50] Checking: docs/getting-started/quick-start.md
✓ No broken links

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Link Check Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total files checked: 50
Files with broken links: 0

✅ All links valid!
```

### Install Dependencies

```bash
# Install markdown-link-check globally
npm install -g markdown-link-check

# Or use via npx (no installation)
npx markdown-link-check docs/index.md
```

---

## Configuration

### Link Checker Config

The script uses `/tmp/mlc_config.json` with default settings. To customize, create `.markdown-link-check.json`:

```json
{
  "ignorePatterns": [
    {
      "pattern": "^http://localhost"
    },
    {
      "pattern": "^https://example.com"
    },
    {
      "pattern": "^mailto:"
    }
  ],
  "timeout": "10s",
  "retryOn429": true,
  "retryCount": 3,
  "aliveStatusCodes": [200, 206, 301, 302, 307, 308, 403, 405],
  "replacementPatterns": [
    {
      "pattern": "^/",
      "replacement": "https://juspay.github.io/neurolink/"
    }
  ]
}
```

### Configuration Options

| Option             | Description                | Default           |
| ------------------ | -------------------------- | ----------------- |
| `timeout`          | HTTP request timeout       | `10s`             |
| `retryOn429`       | Retry on rate limit errors | `true`            |
| `retryCount`       | Number of retries          | `3`               |
| `aliveStatusCodes` | Valid HTTP status codes    | `[200, 206, ...]` |
| `ignorePatterns`   | URLs to skip checking      | `[]`              |

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/link-check.yml`:

```yaml
name: Link Checker

on:
  push:
    branches: [main, release]
    paths:
      - "docs/**/*.md"
  pull_request:
    branches: [main, release]
    paths:
      - "docs/**/*.md"
  schedule:
    # Run weekly to catch external link rot
    - cron: "0 0 * * 0"

jobs:
  link-check:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install markdown-link-check
        run: npm install -g markdown-link-check

      - name: Check links
        run: |
          cd docs/improve-docs
          chmod +x scripts/check-links.sh
          ./scripts/check-links.sh docs

      - name: Comment on PR (if failed)
        if: failure() && github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '❌ **Link check failed!** Please fix broken links before merging.'
            })
```

### Pre-commit Hook

Add to `.husky/pre-commit` or `.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Check links on changed markdown files
CHANGED_MD=$(git diff --cached --name-only --diff-filter=ACMR | grep '\.md$')

if [ -n "$CHANGED_MD" ]; then
    echo "🔍 Checking links in modified files..."

    for file in $CHANGED_MD; do
        echo "Checking: $file"
        npx markdown-link-check "$file" || exit 1
    done

    echo "✅ All links valid!"
fi
```

Make executable:

```bash
chmod +x .git/hooks/pre-commit
```

---

## Usage Patterns

### Check Specific File

```bash
markdown-link-check docs/getting-started/quick-start.md
```

### Check All Docs

```bash
find docs -name "*.md" -exec markdown-link-check {} \;
```

### Check with Custom Config

```bash
markdown-link-check docs/index.md -c .markdown-link-check.json
```

### Quiet Mode (Only Show Errors)

```bash
markdown-link-check docs/index.md --quiet
```

### Verbose Mode (Debug)

```bash
markdown-link-check docs/index.md --verbose
```

---

## Common Issues

### Issue 1: False Positives (Valid Links Marked as Broken)

**Cause**: Some sites block automated requests or have aggressive rate limiting.

**Solution**: Add to ignore patterns:

```json
{
  "ignorePatterns": [
    {
      "pattern": "^https://linkedin.com"
    }
  ]
}
```

Or add to alive status codes:

```json
{
  "aliveStatusCodes": [200, 403, 999]
}
```

### Issue 2: Slow Checks

**Cause**: External link checking can be slow.

**Solution 1**: Skip external links for local development:

```json
{
  "ignorePatterns": [
    {
      "pattern": "^https?://"
    }
  ]
}
```

**Solution 2**: Use faster internal-only checker:

```bash
# Check only internal links (faster)
grep -r "\[.*\](\./" docs/ | grep -v "http"
```

### Issue 3: Relative Path Issues

**Cause**: Relative links may not resolve correctly.

**Solution**: Use replacement patterns:

```json
{
  "replacementPatterns": [
    {
      "pattern": "^../",
      "replacement": "https://juspay.github.io/neurolink/"
    }
  ]
}
```

### Issue 4: Anchor Links Not Validated

**Cause**: markdown-link-check may not validate anchor links (`#section`).

**Solution**: Use `remark-validate-links`:

```bash
npm install -g remark-cli remark-validate-links
remark --use remark-validate-links docs/
```

---

## Advanced Usage

### Custom Link Validation Script

For complex validation needs, create custom scripts:

```javascript
// scripts/validate-links.js
const fs = require("fs");
const path = require("path");

const DOCS_DIR = "docs";
const brokenLinks = [];

function validateInternalLink(file, link) {
  const targetPath = path.resolve(path.dirname(file), link);

  if (!fs.existsSync(targetPath)) {
    brokenLinks.push({
      file,
      link,
      type: "internal",
    });
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const [, text, link] = match;

    // Skip external links
    if (link.startsWith("http")) continue;

    // Check internal links
    if (!link.startsWith("#")) {
      validateInternalLink(filePath, link);
    }
  }
}

// Run validation
function walk(dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      walk(filePath);
    } else if (file.endsWith(".md")) {
      checkFile(filePath);
    }
  });
}

walk(DOCS_DIR);

// Report results
if (brokenLinks.length > 0) {
  console.error("❌ Found broken links:");
  brokenLinks.forEach(({ file, link }) => {
    console.error(`  ${file}: ${link}`);
  });
  process.exit(1);
} else {
  console.log("✅ All internal links valid!");
}
```

Run:

```bash
node scripts/validate-links.js
```

### Parallel Link Checking

For faster checking with many files:

```bash
# Install GNU parallel
brew install parallel  # macOS
apt-get install parallel  # Linux

# Check files in parallel
find docs -name "*.md" | parallel -j 4 markdown-link-check {}
```

---

## Best Practices

### 1. Regular Checks

- **On every commit**: Check changed files in pre-commit hook
- **On every PR**: Full link check in CI/CD
- **Weekly**: Scheduled check for external link rot

### 2. Separate Internal and External

```yaml
# Fast check (internal only)
- name: Check internal links
  run: ./scripts/check-links.sh docs --internal-only

# Slow check (weekly for external)
- name: Check external links
  if: github.event.schedule
  run: ./scripts/check-links.sh docs --external-only
```

### 3. Ignore Transient Failures

Some external links may fail intermittently. Retry failed checks:

```bash
# Retry failed checks 3 times
markdown-link-check docs/index.md --retry --retryCount 3
```

### 4. Document Known Issues

For persistent false positives, document in `.markdown-link-check.json`:

```json
{
  "ignorePatterns": [
    {
      "comment": "LinkedIn blocks automated requests",
      "pattern": "^https://linkedin.com"
    }
  ]
}
```

---

## Integration with MkDocs

### Build-time Link Checking

Add to `mkdocs.yml`:

```yaml
hooks:
  - scripts/check-links-hook.py
```

Create `scripts/check-links-hook.py`:

```python
import subprocess
import sys

def on_pre_build(config):
    """Run link checker before building docs"""
    print("🔍 Checking links...")

    result = subprocess.run(
        ['./scripts/check-links.sh', 'docs'],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print("❌ Link check failed!")
        print(result.stdout)
        sys.exit(1)

    print("✅ All links valid!")
```

---

## Related Documentation

- **[Versioning](versioning.md)** - Documentation version management
- **[Contributing](contributing.md)** - Contribution guidelines
- **[Testing](testing.md)** - Testing strategies

---

## Additional Resources

- **[markdown-link-check](https://github.com/tcort/markdown-link-check)** - Link checker tool
- **[remark-validate-links](https://github.com/remarkjs/remark-validate-links)** - Alternative validator
- **[GitHub Actions](https://docs.github.com/en/actions)** - CI/CD automation
