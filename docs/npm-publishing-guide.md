# Automated NPM Publishing Workflow

This guide explains how the automated NPM publishing workflow works for NeuroLink, based on the successful pattern from the [type-crafter repository](https://github.com/sinha-sahil/type-crafter/).

## Overview

The automated workflow uses **Changesets** to manage versioning and publishing to NPM. This approach provides:

- ✅ **Automated Version Management**: Semantic versioning based on changeset types
- ✅ **Automated Changelog Generation**: Professional changelog from changeset descriptions
- ✅ **Pull Request Automation**: Auto-created PRs for version bumps
- ✅ **Production Safety**: Only publishes when PRs are merged to `release` branch
- ✅ **Team Collaboration**: Multiple contributors can add changesets before release

## Workflow Components

### 1. Changesets Configuration
- **Location**: `.changeset/config.json`
- **Purpose**: Configures changeset behavior for our project
- **Key Settings**:
  - `baseBranch: "release"` - Uses release branch as main
  - `access: "public"` - NPM package is public
  - `commit: false` - Manual commits for better control

### 2. GitHub Action Workflow
- **Location**: `.github/workflows/npm-publish.yml`
- **Trigger**: Pushes to `release` branch
- **Actions**:
  - Installs dependencies with pnpm
  - Runs changesets action
  - Creates version bump PR OR publishes to NPM

### 3. Package.json Scripts
- `npm run changeset` - Create a new changeset
- `npm run changeset:version` - Apply version changes
- `npm run publish` - Build and publish to NPM

## How to Use the Workflow

### Step 1: Create a Changeset (Developers)

When you make changes that should be released:

```bash
# Create a changeset for your changes
npm run changeset
```

This will prompt you for:
- **Change type**: `major`, `minor`, or `patch`
- **Description**: What changed (appears in changelog)

Example changeset creation:
```
? Which packages would you like to include? @juspay/neurolink
? Which type of change is this? minor
? Please enter a summary for this change: Add Google Vertex AI authentication flexibility
```

This creates a file like `.changeset/sharp-chairs-smile.md`:
```markdown
---
"@juspay/neurolink": minor
---

Add Google Vertex AI authentication flexibility

- Support three authentication methods for different deployment environments
- Enhanced documentation with deployment-specific examples
- Improved error handling for authentication failures
```

### Step 2: Commit and Push

```bash
git add .changeset/
git commit -m "Add changeset for Vertex AI authentication improvements"
git push origin your-feature-branch
```

### Step 3: Merge to Release Branch

When your PR is approved and merged to the `release` branch, the workflow automatically:

1. **First run**: Creates a "Version Packages" PR with:
   - Updated version in `package.json`
   - Updated `CHANGELOG.md` with changeset descriptions
   - Consumed changeset files (removed)

2. **When Version PR is merged**: Publishes the new version to NPM

## Repository Secrets Setup

The workflow requires two GitHub secrets:

### 1. NPM_TOKEN
```bash
# Create NPM access token
npm login
npm token create --access=public

# Add to GitHub repository secrets as NPM_TOKEN
```

### 2. GITHUB_TOKEN
- **Automatically provided** by GitHub Actions
- No manual setup required
- Used for creating PRs and accessing repository

## Changeset Types and Versioning

### Patch (1.0.0 → 1.0.1)
- Bug fixes
- Documentation updates
- Small improvements

```bash
npm run changeset
# Select "patch"
```

### Minor (1.0.0 → 1.1.0)
- New features
- Non-breaking changes
- API additions

```bash
npm run changeset
# Select "minor"
```

### Major (1.0.0 → 2.0.0)
- Breaking changes
- API removals
- Major redesigns

```bash
npm run changeset
# Select "major"
```

## Example Workflow Scenarios

### Scenario 1: Feature Development
```bash
# Developer working on new feature
git checkout -b feature/new-provider
# ... make changes ...

# Create changeset for the feature
npm run changeset
# Type: minor
# Description: "Add support for Claude 3.5 Sonnet model"

git add .changeset/
git commit -m "Add changeset for Claude 3.5 support"
git push origin feature/new-provider

# Create PR to release branch
# Once merged, workflow creates version bump PR
```

### Scenario 2: Multiple Changes Before Release
```bash
# Developer A adds authentication fix
npm run changeset  # patch: "Fix AWS session token handling"

# Developer B adds new documentation
npm run changeset  # patch: "Improve setup documentation"

# Developer C adds streaming feature
npm run changeset  # minor: "Add streaming response support"

# When all merged to release:
# - Version goes from 1.2.0 → 1.3.0 (highest change type)
# - Changelog includes all three changes
```

### Scenario 3: Emergency Bug Fix
```bash
# Critical bug discovered
git checkout -b hotfix/critical-auth-bug
# ... fix the bug ...

npm run changeset
# Type: patch
# Description: "Fix critical authentication error in production"

# Fast-track merge to release
# Workflow immediately creates version PR
# Quick merge publishes patch release
```

## Workflow Files Reference

### .changeset/config.json
```json
{
  "$schema": "https://unpkg.com/@changesets/config@2.3.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "release",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### GitHub Actions Workflow
```yaml
name: Publish to NPM
on:
  push:
    branches: [release]
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          registry-url: https://registry.npmjs.org/
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - run: pnpm i
      - uses: changesets/action@v1
        with:
          version: pnpm run changeset:version
          publish: pnpm run publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Benefits of This Approach

### For Developers
- ✅ **Simple**: Just run `npm run changeset` after making changes
- ✅ **Safe**: No manual version bumping or publishing
- ✅ **Collaborative**: Multiple developers can contribute to same release
- ✅ **Traceable**: Clear changelog showing what changed

### For Project Management
- ✅ **Controlled**: All releases go through PR review
- ✅ **Predictable**: Semantic versioning automatically applied
- ✅ **Professional**: Auto-generated changelogs
- ✅ **Auditable**: Git history shows exactly what was released

### For Users
- ✅ **Reliable**: Consistent release process
- ✅ **Informative**: Clear changelogs explain what changed
- ✅ **Timely**: Automated publishing means faster releases
- ✅ **Quality**: Tests run before every publish

## Troubleshooting

### "No changesets found"
- **Cause**: No changesets were created before merging
- **Solution**: Create changeset with `npm run changeset`

### "NPM publish failed"
- **Cause**: NPM_TOKEN expired or invalid
- **Solution**: Regenerate NPM token and update GitHub secret

### "Version PR not created"
- **Cause**: No changes to release, or workflow permissions issue
- **Solution**: Check changesets exist and GitHub permissions

### "Build failed before publish"
- **Cause**: TypeScript errors or test failures
- **Solution**: Fix build issues before merging to release

## Best Practices

1. **Always create changesets** for user-facing changes
2. **Use descriptive changeset messages** - they become changelog entries
3. **Review version bump PRs** before merging to ensure correct versioning
4. **Test thoroughly** before merging to release branch
5. **Keep release branch protected** with required reviews
6. **Monitor NPM publishing** to ensure successful releases

## Migration from Manual Publishing

If you were previously publishing manually:

1. ✅ **Setup Complete**: All changeset configuration is now in place
2. ✅ **GitHub Secrets**: Add NPM_TOKEN to repository secrets
3. ✅ **First Release**: Create initial changeset for current state
4. ✅ **Team Training**: Educate team on changeset workflow

---

**🚀 Ready to Publish**: The automated NPM publishing workflow is now fully configured and ready to use!
