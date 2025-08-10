# Single Commit Per Branch Policy

NeuroLink enforces a **single commit per branch policy** to maintain clean, linear Git history and streamline the code review process.

## Policy Overview

- ✅ **Each feature branch must contain exactly 1 commit**
- ✅ **Commit messages must follow semantic format: `type(scope): description`**
- ✅ **No merge commits allowed in feature branches**
- ✅ **All merges to release branch use squash strategy**

## Enforcement Mechanism

### Automated Validation

The policy is enforced through GitHub Actions workflow that runs on:

- All pushes to feature branches
- All pull requests to the release branch

### Branch Protection

The `release` branch is protected with:

- Required pull request reviews
- Required status checks including single commit validation
- Linear history requirement
- Squash-only merge strategy

## Developer Workflow

### ✅ Compliant Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-auth-system

# 2. Make changes and commit (single commit)
git add .
git commit -m "feat(auth): add OAuth2 authentication system"

# 3. Push to remote
git push origin feature/new-auth-system

# 4. Create pull request → Validation passes ✅
```

### ❌ Non-Compliant Workflow (Multiple Commits)

```bash
# 1. Create feature branch
git checkout -b feature/new-auth-system

# 2. Make multiple commits
git add auth.ts
git commit -m "feat(auth): add OAuth2 base"

git add login.ts
git commit -m "feat(auth): add login component"

git add tests.ts
git commit -m "test(auth): add OAuth2 tests"

# 3. Push to remote → Validation fails ❌
git push origin feature/new-auth-system
```

## Fixing Policy Violations

When the validation check fails, you'll receive detailed instructions. Here are the most common fixes:

### Method 1: Interactive Rebase (Recommended)

```bash
# If you have 3 commits to squash
git rebase -i HEAD~3

# In the editor:
# - Keep first commit as 'pick'
# - Change subsequent commits from 'pick' to 'squash' (or 's')
# - Save and close editor
# - Edit commit message in next editor
# - Save and close

# Force push the squashed commit
git push --force-with-lease
```

### Method 2: Soft Reset

```bash
# Reset to base branch but keep changes staged
git reset --soft origin/release

# Create single commit with combined changes
git commit -m "feat(auth): add OAuth2 authentication system

- Add OAuth2 base configuration
- Add login component with validation
- Add comprehensive test coverage"

# Force push
git push --force-with-lease
```

### Method 3: Manual Squash

```bash
# Create new commit with all changes
git reset --hard origin/release
git merge --squash feature/new-auth-system
git commit -m "feat(auth): add OAuth2 authentication system"

# Force push to feature branch
git push --force-with-lease origin feature/new-auth-system
```

## Semantic Commit Message Format

All commits must follow the semantic commit format:

```
type(scope): description

[optional body]

[optional footer]
```

### Valid Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples

✅ **Valid commit messages:**

```
feat(auth): add OAuth2 authentication flow
fix(api): resolve null pointer exception in user service
docs(readme): update installation instructions
test(integration): add tests for payment processing
chore(deps): update dependencies to latest versions
```

❌ **Invalid commit messages:**

```
Add authentication        # Missing type and scope
feat: new feature        # Missing scope
Fixed bug               # Wrong tense, missing type/scope
WIP: work in progress   # Not descriptive enough
```

## Benefits

### Clean History

- Linear commit history on release branch
- Easy to understand project evolution
- Simple rollback and hotfix procedures

### Better Code Review

- Each PR represents one logical change
- Easier to review focused commits
- Clear commit messages describe purpose

### Simplified Maintenance

- Bisect debugging works reliably
- Cherry-picking features is straightforward
- Release notes generation is automated

## Troubleshooting

### "Single Commit Policy Validation" Check Failed

**Problem**: Your branch has multiple commits
**Solution**: Follow the squashing instructions provided in the check output

### "Commit message doesn't follow semantic format"

**Problem**: Your commit message isn't properly formatted
**Solution**: Amend your commit message:

```bash
git commit --amend -m "feat(scope): proper description"
git push --force-with-lease
```

### "Branch contains merge commits"

**Problem**: You merged instead of rebasing
**Solution**: Rebase your branch:

```bash
git rebase origin/release
git push --force-with-lease
```

### Can't Merge PR - "Squash and merge is the only allowed merge type"

**Problem**: Branch protection is working correctly
**Solution**: This is expected - use the "Squash and merge" button

## Integration with Build Rules

The single commit policy works alongside NeuroLink's comprehensive build rule enforcement:

- **Commit validation** ensures semantic format
- **Security scanning** prevents API key leaks
- **Code quality checks** maintain standards
- **Environment validation** ensures proper configuration

All these checks must pass along with the single commit policy for a successful merge.

## FAQ

**Q: What if I need to make a small fix to my PR?**
A: Amend your existing commit:

```bash
git add .
git commit --amend --no-edit
git push --force-with-lease
```

**Q: Can I work with multiple commits during development?**
A: Yes! You can make as many commits as needed during development. Just squash them before creating the PR or when the validation check reminds you.

**Q: What about emergency hotfixes?**
A: Emergency hotfixes still follow the same policy - one commit per branch. This ensures even critical fixes maintain proper history.

**Q: How does this work with collaboration?**
A: For collaborative feature branches, designate one person to handle the final squash, or use feature flags and separate single-commit PRs.

---

_This policy ensures NeuroLink maintains enterprise-grade code quality and traceability while streamlining the development workflow._
