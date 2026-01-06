# 🚀 Automated Publishing Guide (Semantic Release)

Complete step-by-step guide to set up **semantic-release** for automated GitHub releases, tags, and NPM publishing for NeuroLink.

## 🎯 Current Status

✅ **GitHub Workflow** - `.github/workflows/release.yml` configured with semantic-release
✅ **Semantic Release Config** - `.releaserc.json` configured
✅ **Dependencies Added** - All semantic-release packages in package.json
⏳ **NPM Token Setup** - Required for NPM publishing
⏳ **First Release** - Ready to trigger after NPM token

## 📋 Step-by-Step Setup

### **Step 1: Create NPM Automation Token**

1. **Login to NPM:**

   ```bash
   npm login
   ```

   Use your NPM account credentials

2. **Create Automation Token:**

   ```bash
   npm token create --type=automation
   ```

3. **Copy the token** (starts with `npm_...`)

### **Step 2: Add NPM Token to GitHub Secrets**

1. Go to: https://github.com/juspay/neurolink/settings/secrets/actions
2. Click **"New repository secret"**
3. **Name:** `NPM_TOKEN`
4. **Value:** Paste your NPM automation token
5. Click **"Add secret"**

### **Step 3: Use Conventional Commits**

Semantic-release uses **conventional commits** to determine version bumps:

```bash
# PATCH version (1.7.0 → 1.7.1) - Bug fixes
git commit -m "fix: resolve CLI authentication issue"
git commit -m "perf: improve provider selection speed"

# MINOR version (1.7.0 → 1.8.0) - New features
git commit -m "feat: add new AI provider support"
git commit -m "feat(cli): add batch processing command"

# MAJOR version (1.7.0 → 2.0.0) - Breaking changes
git commit -m "feat!: remove deprecated API methods"
git commit -m "fix!: change provider interface signature"

# Alternative major version syntax
git commit -m "feat: add new authentication

BREAKING CHANGE: Previous auth methods no longer supported"
```

### **Step 4: Trigger Automatic Release**

🎉 **Just push to release branch with conventional commits!**

```bash
# Make your changes with conventional commits
git add .
git commit -m "feat: add Google AI Studio integration"

# Push to release branch
git checkout release
git merge your-feature-branch
git push origin release

# 🤖 SEMANTIC RELEASE HANDLES EVERYTHING:
# ✅ Analyzes commit messages
# ✅ Determines version bump (patch/minor/major)
# ✅ Generates CHANGELOG.md
# ✅ Creates Git tag
# ✅ Creates GitHub release with notes
# ✅ Publishes to NPM
# ✅ Publishes to GitHub Packages
# ✅ Commits version changes back to repo
```

## 🔧 How Semantic Release Works

### **Commit Analysis:**

- **fix:** → Patch release (1.7.0 → 1.7.1)
- **feat:** → Minor release (1.7.0 → 1.8.0)
- **BREAKING CHANGE** or **!** → Major release (1.7.0 → 2.0.0)
- **docs:, style:, refactor:, test:, chore:** → No release

### **Generated Assets:**

- 🏷️ **Git Tag:** `v1.8.0` (automatically created)
- 📝 **CHANGELOG.md** (automatically generated and committed)
- 🐙 **GitHub Release** (with professional release notes)
- 📦 **NPM Package:** https://www.npmjs.com/package/@juspay/neurolink
- 📚 **GitHub Package:** https://github.com/juspay/neurolink/packages

### **Automatic Updates:**

- ✅ **package.json version** updated and committed
- ✅ **CHANGELOG.md** generated and committed
- ✅ **Git tags** created automatically
- ✅ **Release notes** generated from commits

## 🎉 Expected Results

After pushing conventional commits to release branch:

### **Automatic Process:**

1. 🔍 **Analyzes commits** since last release
2. 📊 **Determines version** based on conventional commits
3. 📝 **Generates CHANGELOG.md** from commit messages
4. 🏷️ **Creates Git tag** (e.g., v1.8.0)
5. 🐙 **Creates GitHub release** with generated notes
6. 📦 **Publishes to NPM** registry
7. 📚 **Publishes to GitHub Packages**
8. 💾 **Commits changes** back to release branch

### **GitHub Repository:**

- ✅ **Tags:** Automatically created (v1.8.0)
- ✅ **Releases:** Professional release notes from commits
- ✅ **Packages:** Available on GitHub Packages
- ✅ **CHANGELOG.md:** Auto-generated and updated

### **NPM Registry:**

- ✅ **Published Package:** `@juspay/neurolink@1.8.0`
- ✅ **Installation:** `npm install @juspay/neurolink`

## 🚨 Troubleshooting

### **Common Issues:**

#### **"No release published"**

- **Cause:** No conventional commits since last release
- **Solution:** Use proper conventional commit format (`feat:`, `fix:`, etc.)

#### **"NPM_TOKEN not found"**

- **Solution:** Add NPM token to GitHub repository secrets
- **Check:** Repository → Settings → Secrets and variables → Actions

#### **"Permission denied to publish"**

- **Solution:** Ensure NPM token has publishing permissions
- **Fix:** Create new automation token with correct permissions

#### **"CHANGELOG.md conflicts"**

- **Solution:** Semantic-release handles this automatically
- **Info:** Don't manually edit CHANGELOG.md - it's auto-generated

### **Verification Commands:**

```bash
# Check if package is published
npm view @juspay/neurolink

# Check latest release
gh release view --web

# Check semantic-release dry run (locally)
npx semantic-release --dry-run
```

## 📚 Conventional Commit Examples

### **Feature Examples:**

```bash
feat: add OpenAI GPT-4o support
feat(cli): add --stream flag for real-time output
feat(providers): add retry logic for failed requests
```

### **Bug Fix Examples:**

```bash
fix: resolve memory leak in provider selection
fix(auth): handle expired API keys gracefully
fix(cli): correct typo in help text
```

### **Breaking Change Examples:**

```bash
feat!: change provider interface to async/await
fix!: remove deprecated createProvider function

# Or with body:
feat: redesign authentication system

BREAKING CHANGE: All providers now require async initialization
```

### **Other Types:**

```bash
docs: update README with new provider instructions
style: fix code formatting in provider files
refactor: simplify error handling logic
test: add unit tests for new providers
chore: update dependencies to latest versions
perf: optimize provider selection algorithm
```

## 🔄 Future Releases

### **Fully Automated Process:**

1. Write code with conventional commits
2. Push to release branch
3. **That's it!** Semantic-release handles everything else

### **No Manual Steps Required:**

- ❌ No manual version bumping
- ❌ No manual changelog writing
- ❌ No manual tag creation
- ❌ No manual release creation
- ❌ No manual NPM publishing

### **Professional Results:**

- ✅ Consistent versioning with SemVer
- ✅ Professional changelogs from commits
- ✅ Comprehensive release notes
- ✅ Zero human error in releases

## ✅ Next Steps

1. **Complete Step 1-2:** NPM token setup
2. **Use conventional commits:** Follow the format above
3. **Push to release branch:** Automatic release triggered
4. **Verify:** Check all platforms have packages
5. **Celebrate:** You now have industry-standard automation! 🎉

---

**📞 Need Help?**

- Check the workflow logs in GitHub Actions
- Ensure NPM_TOKEN is properly configured
- Use conventional commit format
- Test with `npx semantic-release --dry-run` locally

The semantic-release workflow is the industry standard used by thousands of open-source projects. Once set up, you'll have bulletproof, professional-grade release automation! 🚀

## 🔗 References

- [Semantic Release Documentation](https://semantic-release.gitbook.io/)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [GitHub Actions for Semantic Release](https://github.com/semantic-release/semantic-release/blob/master/docs/usage/github-actions.md)
