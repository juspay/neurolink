# Automated Publishing Guide

## 🚀 **Automated Version Bumping & Publishing Setup**

This guide explains how the automated version bumping and NPM publishing workflow works for the NeuroLink project.

## 📁 **Files Created**

### **1. `.github/workflows/npm-publish.yml`**

- **Purpose**: GitHub Actions workflow for automated publishing
- **Trigger**: Pushes to the `release` branch
- **Function**: Detects changesets, creates version PRs, and publishes to NPM

### **2. `.changeset/config.json`**

- **Purpose**: Changesets configuration
- **Base Branch**: `release`
- **Access**: `public` (for scoped NPM packages)

### **3. Package.json Scripts**

- **`changeset`**: Create a new changeset
- **`changeset:version`**: Apply version bumps from changesets
- **`release`**: Build and publish to NPM

## 🔄 **How the Workflow Works**

### **Step 1: Create a Changeset**

When you make changes that need to be published:

```bash
npm run changeset
```

This will:

- Ask you to select the type of change (major, minor, patch)
- Ask for a description of the change
- Create a `.changeset/*.md` file

### **Step 2: Push to Release Branch**

```bash
git add .
git commit -m "Add changeset for new feature"
git push origin release
```

### **Step 3: Automated Workflow**

When you push to the `release` branch:

1. **First Run**: GitHub Actions detects the changeset and creates a "Version Packages" PR
2. **Review**: You review and approve the version bump PR
3. **Merge**: When you merge the version PR, GitHub Actions automatically publishes to NPM

## 📋 **Required Setup**

### **NPM Token Setup**

1. **Generate NPM Token**:

   - Go to https://www.npmjs.com/
   - Profile → Access Tokens → Generate New Token
   - Choose "Granular Access Token"
   - Add `@juspay/neurolink` with "Read and write" permissions

2. **Add to GitHub Secrets**:
   - Repository → Settings → Secrets and variables → Actions
   - Create new secret: `NPM_TOKEN`
   - Paste your NPM token

### **Organization Access**

- Ensure your NPM account has publishing permissions to the `@juspay` organization
- Verify with: `npm access list packages @juspay`

## 🎯 **Example Workflow**

### **Adding a New Feature**

```bash
# 1. Make your changes
git add .
git commit -m "feat: add new AI provider support"

# 2. Create changeset
npm run changeset
# Select: minor (new feature)
# Description: "Added support for new AI provider"

# 3. Push to release branch
git push origin release
```

### **Bug Fix**

```bash
# 1. Fix the bug
git add .
git commit -m "fix: resolve provider initialization issue"

# 2. Create changeset
npm run changeset
# Select: patch (bug fix)
# Description: "Fixed provider initialization bug"

# 3. Push to release branch
git push origin release
```

## 🏷️ **Version Types**

- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes, backward compatible

## ✅ **Benefits**

### **Automated Process**

- ✅ No manual version bumping
- ✅ Automatic changelog generation
- ✅ Consistent release process
- ✅ PR-based review for releases

### **Team Collaboration**

- ✅ Multiple team members can add changesets
- ✅ Changes are reviewed before publishing
- ✅ Clear history of what changed in each version
- ✅ Semantic versioning automatically applied

### **Professional Publishing**

- ✅ Build verification before publishing
- ✅ Consistent package structure
- ✅ NPM registry integration
- ✅ GitHub release automation

## 🔧 **Troubleshooting**

### **NPM Publishing Fails**

- **Issue**: `404 Not Found` errors
- **Solution**: Verify NPM token has @juspay organization permissions

### **No Version PR Created**

- **Issue**: Workflow doesn't detect changes
- **Solution**: Ensure changeset files exist in `.changeset/` directory

### **Build Failures**

- **Issue**: Build fails during publishing
- **Solution**: Test locally with `npm run build` before pushing

## 🎉 **Current Status**

✅ **Setup Complete**: All configuration files created
✅ **Workflow Ready**: GitHub Actions workflow configured
✅ **Changeset Created**: Initial changeset for setup
✅ **Next Step**: Push to release branch to trigger first automated release

When you push the current changes to the `release` branch, the workflow will:

1. Create a version bump PR (1.2.3 → 1.2.4)
2. When merged, automatically publish to NPM with the @juspay scope

The automated publishing system is now fully configured and ready to use!
