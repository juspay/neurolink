# GitHub Workflow Automation Guide

## Overview

This document outlines the standardized GitHub workflow for task completion, branch creation, and pull request management. This workflow was refined during the three-provider implementation and is designed to be reusable across all future development cycles.

## 🎯 Task Completion Workflow

### Phase 0: Pre-Analysis

**Goal:** Understand current changes and project context
**Tools:** Git MCP tools, file reading

```bash
# Get current repository status
git_status → Understand what files are staged/modified
git_diff_staged → Analyze specific changes (if needed, in chunks)

# Context gathering
read_file(CHANGELOG.md) → Understand version history and format
read_file(package.json) → Get current version
read_file(.clinerules) → Understand project patterns
```

### Phase 1: Change Analysis & Planning

**Goal:** Deep analysis of changes and strategic impact

**🔍 Analysis Framework:**

1. **Core Changes Identification:**

   - New features added
   - Infrastructure improvements
   - Bug fixes and optimizations
   - Documentation updates

2. **Impact Assessment:**

   - Breaking changes (none preferred)
   - Backward compatibility
   - Performance implications
   - User experience changes

3. **Strategic Classification:**
   - Major (new providers, architecture changes)
   - Minor (feature enhancements, new CLI commands)
   - Patch (bug fixes, optimizations)

### Phase 2: Material Preparation

**Goal:** Prepare all materials before execution

**📋 Required Materials:**

#### A. Branch Naming Convention

```
feat/{descriptive-feature-name}
fix/{descriptive-fix-name}
chore/{descriptive-maintenance-name}
docs/{descriptive-documentation-name}
```

**Examples:**

- `feat/enhanced-multi-provider-support-production-ready`
- `fix/cli-logging-debug-persistence`
- `chore/dependencies-security-update`

#### B. Changelog Update (for next version)

```markdown
## {NEXT_VERSION}

### Major Changes (if applicable)

- **🎉 Feature Name**: Description with impact
  - **🆕 Component**: Specific addition
  - **🔧 Enhancement**: Specific improvement

### Features

- **🛠️ Feature Category**: Description
  - Sub-feature 1
  - Sub-feature 2

### Critical Production Fixes (if applicable)

- **🔧 Fix Category**: Description
  - Problem solved
  - Solution implemented

### Breaking Changes

- None - 100% backward compatibility maintained (preferred)
- OR list specific breaking changes with migration guide
```

#### C. Commit Message Structure

```
{emoji} {type}: {short description}

{detailed bullet points with specific changes}

BREAKING CHANGE: {description or "None - 100% backward compatibility maintained"}

{additional metadata}
```

#### D. Pull Request Materials

**Title Format:**

```
{emoji} {Short Title}: {Key Impact}
```

**Description Template:**

```markdown
## 🎯 Overview

{Brief description of the PR's purpose and impact}

## ✨ What's New

### 🚀 {Category 1}

- **{Component}**: {Description}

### 🛠️ {Category 2}

- **{Component}**: {Description}

## 🔧 Critical Fixes (if applicable)

- **{Fix Category}**: {Description}

## 📊 {Impact Section} (if applicable)

{Table or comparison showing before/after}

## 🧪 Testing

- ✅ **{Test Category}**: {Status}

## 🔄 Migration

{Migration notes or "No breaking changes"}

## 📈 Impact

{Summary of overall impact}
```

### Phase 3: Execution Workflow

**Goal:** Execute GitHub workflow with prepared materials

**🔄 Execution Steps:**

#### Step 1: Branch Creation

```bash
# Create and checkout new branch
git_create_branch(repo_path, branch_name)
git_checkout(repo_path, branch_name)
```

#### Step 2: Commit Changes

```bash
# Commit all staged changes with detailed message
git_commit(repo_path, detailed_commit_message)
```

#### Step 3: Push to GitHub

```bash
# Push branch to origin
execute_command: "git push origin {branch_name}"
```

#### Step 4: Pull Request Creation

**Option A: GitHub MCP (if permissions available)**

```bash
github_create_pull_request(
  owner, repo, title, body, head_branch, base_branch
)
```

**Option B: Manual (if MCP fails)**

```bash
# Use provided URL from git push output
# Format: https://github.com/{owner}/{repo}/pull/new/{branch_name}
```

## 🛠️ Tool Requirements

### MCP Tools Used

- **Git MCP Server**: `git_status`, `git_create_branch`, `git_checkout`, `git_commit`
- **GitHub MCP Server**: `create_pull_request` (if available)
- **Execute Command**: For `git push` operations

### Fallback Methods

- **Manual PR Creation**: Using URLs provided by GitHub after push
- **Browser Action**: Can open PR creation URLs if needed

## 📋 Quality Checklist

### Before Execution

- [ ] All staged changes analyzed and understood
- [ ] Version increment strategy decided
- [ ] Branch name follows convention
- [ ] Changelog entry prepared
- [ ] Commit message follows structure
- [ ] PR title and description ready
- [ ] Breaking changes documented (or confirmed none)

### During Execution

- [ ] Branch created successfully
- [ ] All changes committed with detailed message
- [ ] Branch pushed to GitHub without errors
- [ ] PR creation attempted (MCP or manual)

### After Execution

- [ ] PR URL obtained and ready for review
- [ ] All materials properly documented
- [ ] Memory bank updated with learnings

## 🚨 Common Issues & Solutions

### Issue 1: MCP Permission Denied

**Problem:** GitHub MCP lacks permissions for PR creation
**Solution:** Use manual PR creation with provided URL

### Issue 2: Large Change Sets

**Problem:** Too many changes, context window overflow
**Solution:** Analyze changes in chunks, focus on high-level impact

### Issue 3: Complex Dependencies

**Problem:** Changes span multiple systems
**Solution:** Group by logical functionality, document cross-dependencies

## 📈 Success Metrics

### Workflow Efficiency

- **Time to PR Creation**: < 15 minutes from start to PR URL
- **Material Completeness**: All required materials prepared before execution
- **Error Rate**: < 5% failure rate in execution steps

### Quality Standards

- **Commit Message Quality**: Detailed, structured, informative
- **PR Description Quality**: Complete, professional, actionable
- **Documentation**: All changes properly documented

## 🔄 Continuous Improvement

### Learning Integration

- Document new patterns in `.clinerules`
- Update workflow based on project evolution
- Refine templates based on actual usage

### Template Evolution

- Adapt to project-specific needs
- Include project-specific quality gates
- Enhance automation where possible

## 🎯 Future Enhancements

### Automation Opportunities

- Automated changelog generation from commits
- Template-based PR description generation
- Integrated testing validation before PR creation

### Tool Integration

- Enhanced MCP server permissions
- Automated version bumping
- CI/CD integration hooks

---

**Last Updated:** 2025-06-14
**Version:** 1.0.0
**Status:** Production Ready

This workflow has been validated through multiple successful implementations and is ready for immediate use across all NeuroLink development cycles.
