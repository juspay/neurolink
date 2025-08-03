# Semantic Release & Task Completion Workflow Guide

*Complete guide for semantic release conventions, git workflows, and task completion based on real-world execution experience*

## Table of Contents
1. [Theoretical Framework](#theoretical-framework)
2. [Practical Execution Learnings](#practical-execution-learnings)
3. [GitHub Tools Integration](#github-tools-integration)
4. [Common Issues & Solutions](#common-issues--solutions)
5. [Best Practices](#best-practices)
6. [Reusable Templates](#reusable-templates)

---

## Theoretical Framework

### **Phase 0: Get Current Changes**
*Goal: Get current changes staged in git and analyze them*

**Steps:**
1. Use git MCP tools or command line to get current changes staged for push
2. Analyze them for scope and impact

**Tools Used:**
```bash
# Git status analysis
git status
git diff --staged
git diff --name-only --staged
```

### **Phase 1: Branch Creation **
**Branch Naming Convention :**
```bash
# Semantic branch naming
feat/feature-description
fix/bug-description
refactor/refactor-description
chore/maintenance-description
hotfix/critical-issue-description
```

### **Phase 2: Git Workflow**
*Goal: Commit staged changes to semantic branch and push*

**Critical Steps:**
1. **Analyze Staged Changes** - Understand scope for commit message
2. **Branch Management** - Create semantic branch name
3. **Semantic Commit Message** - Follow conventional commits
4. **Push Branch** - Ensure proper upstream tracking

### **Phase 3: Pull Request Creation**
*Goal: Create comprehensive PR following project template*

**Requirements:**
- Follow GitHub PR template exactly
- Include all verification steps
- Document breaking changes (if any)
- Provide clear migration guidance

---

## Practical Execution Learnings

### **Large Scale Refactoring Insights**

#### **Context Window Management**
- **Issue**: Large refactoring (114+ files) approaches context limits
- **Solution**:
  - Process changes in batches
  - Use targeted git tools instead of full diffs
  - Summarize rather than list every change
  - Focus on patterns rather than individual files

#### **File Renaming Best Practices**
```bash
# Systematic approach for large renames
1. Create comprehensive mapping script
2. Execute renames in batches (lib, cli, test, tools, scripts)
3. Update imports in separate phase
4. Verify build after each major phase
5. Clean up temporary scripts
```

#### **Import Reference Updates**
- **Challenge**: 197+ references across 62 files
- **Solution**: Automated script with comprehensive mapping
- **Critical**: Preserve external package imports (NPM packages stay kebab-case)

#### **Quality Verification Pipeline**
```bash
# Always run in this order
pnpm run format    # Fix formatting
pnpm run lint      # Check code quality
pnpm run build     # Verify compilation
# Only then proceed with git operations
```

---

## GitHub Tools Integration

### **Git MCP Tools vs GitHub CLI**

#### **Git MCP Tools** ✅ Reliable
```bash
# What works well
git_status          # Get repo status
git_create_branch   # Create new branch
git_checkout        # Switch branches
git_commit          # Commit with message
git_diff_staged     # View staged changes
```

#### **GitHub CLI Integration** ⚠️ Requires Setup
```bash
# Critical prerequisite
git branch --set-upstream-to=origin/branch-name branch-name

# Then GitHub CLI works
gh pr create --title "title" --body "body" --base target-branch
```

### **Branch Tracking Issue Resolution**

**Problem Encountered:**
```
remote tracking branch must have format refs/remotes/<remote>/<branch>
but was: refs/remotes/origin/refactor/camelcase-standardization
```

**Root Cause:** Branch not properly tracking remote after `git push`

**Solution:**
```bash
# Fix upstream tracking
git branch --set-upstream-to=origin/branch-name branch-name

# Then GitHub CLI works normally
gh pr create --title "..." --body "..." --base release
```

**Prevention:** Always verify branch tracking after initial push:
```bash
git branch -vv  # Check tracking status
```

---

## Common Issues & Solutions

### **Issue 1: Context Window Limitations**
**Symptom:** Large changesets cause context overflow
**Solutions:**
- Batch process files by directory
- Use `git status` summary instead of full diff
- Focus on patterns rather than individual changes
- Create automation scripts for repetitive tasks

### **Issue 2: GitHub CLI PR Creation Failures**
**Symptom:** `remote tracking branch must have format...` error
**Root Cause:** Missing upstream tracking
**Solution:**
```bash
git branch --set-upstream-to=origin/branch-name branch-name
```

### **Issue 3: External Package Import Corruption**
**Symptom:** Build fails with missing packages
**Root Cause:** Automated renaming affected NPM package names
**Solution:** Preserve external imports in automation scripts
```javascript
// Preserve NPM packages
if (specialCase && specialCase.preserve.some(preserve => preserve.includes(mapping.from))) {
  continue; // Skip NPM package imports
}
```

### **Issue 4: Temporary Script Cleanup**
**Symptom:** Cluttered repository with automation scripts
**Solution:** Always clean up temporary files
```bash
# Remove all temporary scripts
rm -f scripts/rename-*.cjs scripts/update-*.cjs scripts/fix-*.cjs
```

---

## Best Practices

### **Semantic Commit Messages**

#### **⚠️ CRITICAL: Accidental Major Version Prevention**
**Real Incident:** v7.0.0 was accidentally released due to improper commit message format.

**❌ NEVER Write This (Triggers Major Version):**
```
BREAKING CHANGE: None - all functionality preserved
BREAKING CHANGE: No breaking changes
BREAKING CHANGE: Internal only
```

**✅ ALWAYS Use Instead:**
```
Note: No breaking changes - all functionality preserved
All existing functionality preserved
Internal changes only - no public API impact
```

**Why:** Semantic-release sees "BREAKING CHANGE:" and triggers major version bump regardless of what follows the colon!

#### **Format:**
```
type(scope): description

- Detailed change 1
- Detailed change 2
- Detailed change 3

BREAKING CHANGE: description (ONLY if actually breaking!)

Closes: #issue-number (if applicable)
```

#### **Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring (no functional changes)
- `chore`: Maintenance tasks
- `docs`: Documentation updates
- `perf`: Performance improvements
- `test`: Test additions/updates

#### **Scopes:**
- `structure`: File/directory organization
- `core`: Core functionality
- `cli`: Command-line interface
- `providers`: AI provider implementations
- `mcp`: MCP integration
- `types`: TypeScript type definitions

### **Branch Naming**
```bash
# Semantic branch names
feat/add-new-provider
fix/resolve-timeout-issue
refactor/camelcase-standardization
chore/update-dependencies
docs/api-documentation-update
perf/optimize-provider-loading
test/add-integration-tests
```

### **Pull Request Quality**

#### **Title Format:**
```
type(scope): brief description
```

#### **Body Requirements:**
- [ ] Clear description of changes
- [ ] Type of change checkboxes
- [ ] Component impact documentation
- [ ] Testing verification
- [ ] Performance impact assessment
- [ ] Breaking change documentation
- [ ] All checklist items completed

---

## Reusable Templates

### **Refactoring Commit Template**
```
refactor(structure): standardize all filenames and directories to camelCase

- Rename 114+ files from kebab-case to camelCase across src/, test/, tools/, scripts/
- Rename 5 directories: ai-providers → aiProviders, sdk-tools → sdkTools, etc.
- Update 197+ import references across 62 files
- Update documentation and memory-bank references
- Preserve external package imports (NPM packages remain kebab-case)
- All builds, tests, and validations passing

BREAKING CHANGE: None - all functionality preserved, only naming conventions updated
```

### **Feature Addition Commit Template**
```
feat(providers): add new AI provider integration

- Implement [Provider]Provider class with full API support
- Add provider to factory registration
- Include comprehensive error handling
- Add unit and integration tests
- Update documentation and examples

Closes: #[issue-number]
```

### **Bug Fix Commit Template**
```
fix(core): resolve timeout handling in provider calls

- Fix timeout calculation for long-running requests
- Add proper error propagation
- Include timeout configuration validation
- Add regression tests

Fixes: #[issue-number]
```

### **GitHub PR Body Template**
```markdown
# Pull Request

## Description

[Clear description of changes]

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🧹 Code refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] 🧪 Test coverage improvement
- [ ] 🔧 Build/CI configuration change

## Changes Made

- [Change 1]
- [Change 2]
- [Change 3]

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] All existing tests pass

**Verification completed:**
- ✅ `pnpm format` - passed
- ✅ `pnpm lint` - passed
- ✅ `pnpm build` - passed
- ✅ All tests passing

## Performance Impact

- [ ] No performance impact
- [ ] Performance improvement
- [ ] Minor performance impact (acceptable)
- [ ] Significant performance impact (needs discussion)

## Breaking Changes

[If applicable, describe impact and migration path]

## Additional Notes

[Any additional context]
```

## Quality Gates Checklist

### **Pre-Commit Verification**
- [ ] `pnpm run format` - Code formatting
- [ ] `pnpm run lint` - Code quality
- [ ] `pnpm run build` - Compilation check
- [ ] Manual testing of affected functionality
- [ ] Documentation updates completed

### **Pre-PR Creation**
- [ ] Branch properly tracks remote (`git branch -vv`)
- [ ] All commits follow semantic convention
- [ ] PR template completely filled
- [ ] Breaking changes documented
- [ ] Migration guidance provided (if needed)

### **Post-PR Creation**
- [ ] All CI checks passing
- [ ] No merge conflicts
- [ ] Required approvals obtained
- [ ] Ready for semantic-release automation

---

*This guide is based on real-world execution of comprehensive refactoring tasks and GitHub CLI integration experience. Update as new patterns emerge.*
