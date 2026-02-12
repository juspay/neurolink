# Pull Request

## Description

**What does this PR do?**

A clear and concise description of the changes in this pull request.

## Related Issues

**Does this PR close any issues?**

Fixes #(issue number)
Closes #(issue number)
Relates to #(issue number)

## Type of Change

Please select the type of change:

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Test coverage improvement
- [ ] Build/CI configuration
- [ ] Other (please describe):

## Motivation and Context

**Why is this change needed? What problem does it solve?**

Provide context for reviewers:

- Background information
- Use case or scenario
- Links to relevant discussions or documentation
- Screenshots/GIFs (if UI-related)

## Changes Made

**What specific changes were made?**

Provide a bullet-point list of the key changes:

- Added X functionality to Y component
- Modified Z behavior to handle edge case A
- Updated documentation in file B
- Refactored C for better performance

## Breaking Changes

**Does this PR introduce breaking changes?**

- [ ] No breaking changes
- [ ] Yes, breaking changes (describe below)

If yes, describe:

- What breaks?
- Migration path for users
- Deprecation warnings added?

## Testing

**How has this been tested?**

Please describe the tests you ran and their results:

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests pass
- [ ] Manual testing completed
- [ ] Tested with multiple providers: [list providers]
- [ ] Tested on multiple platforms: [list platforms]

### Test Coverage

- [ ] All new code is covered by tests
- [ ] Existing tests pass
- [ ] Coverage percentage maintained or improved

### Manual Testing Steps

Provide steps for manual testing:

1. Set up environment with [...]
2. Run command [...]
3. Verify that [...]
4. Check that [...]

## Code Quality

**Have you followed code quality standards?**

- [ ] Code follows the project's style guidelines (ESLint passes)
- [ ] Code is properly formatted (Prettier applied)
- [ ] Self-review of code completed
- [ ] No console.log statements (using logger instead)
- [ ] No hardcoded API keys or secrets
- [ ] TypeScript strict mode compliance
- [ ] Proper error handling implemented
- [ ] TODO/FIXME comments reference issues

## Documentation

**Have you updated documentation?**

- [ ] JSDoc comments added/updated for public APIs
- [ ] README.md updated (if needed)
- [ ] Documentation in /docs updated (if needed)
- [ ] Code examples added/updated (if needed)
- [ ] CHANGELOG.md updated (if applicable)
- [ ] Migration guide provided (if breaking changes)

## Commit Message Format

**Does your commit follow semantic commit conventions?**

- [ ] Commit message follows format: `type(scope): description`
- [ ] Valid type used: feat, fix, docs, style, refactor, test, chore, build, ci, perf, revert
- [ ] Scope specified (e.g., providers, cli, docs, middleware)

Example: `feat(providers): add support for LiteLLM proxy`

## Dependencies

**Does this PR add, update, or remove dependencies?**

- [ ] No dependency changes
- [ ] Dependencies added (list below)
- [ ] Dependencies updated (list below)
- [ ] Dependencies removed (list below)

If yes, list dependencies and justification:

```
package-name@version - Reason for adding/updating
```

## Performance Impact

**Does this change affect performance?**

- [ ] No performance impact
- [ ] Performance improved (provide metrics)
- [ ] Performance degraded (justify why acceptable)

If applicable, provide benchmark results:

```
Before: X ms
After: Y ms
Improvement: Z%
```

## Security Considerations

**Are there any security implications?**

- [ ] No security implications
- [ ] Security review needed
- [ ] Security vulnerability fixed

If applicable, describe:

- Security measures implemented
- Potential risks mitigated
- Compliance considerations (HIPAA, SOC2, GDPR)

## Deployment Notes

**Special deployment instructions?**

- [ ] No special deployment steps
- [ ] Requires environment variable changes (list below)
- [ ] Requires database migration
- [ ] Requires Redis schema update
- [ ] Other (describe below)

## Screenshots / Videos

**If applicable, add screenshots or videos to demonstrate changes:**

[Add screenshots or videos here]

## Reviewer Checklist

For reviewers:

- [ ] Code follows project style and conventions
- [ ] Changes are well-documented
- [ ] Tests provide adequate coverage
- [ ] No obvious performance issues
- [ ] No security vulnerabilities introduced
- [ ] Breaking changes are properly documented
- [ ] Documentation is clear and accurate

## Additional Notes

**Any additional information for reviewers:**

[Add any extra context, concerns, or questions here]

---

## Pre-submission Checklist

Before submitting, ensure you have:

- [ ] Read and followed the [Contributing Guidelines](../CONTRIBUTING.md)
- [ ] Verified all automated pre-commit checks pass
- [ ] Tested changes locally with `pnpm test`
- [ ] Built the project successfully with `pnpm build`
- [ ] Run `pnpm run validate:all` and all checks pass
- [ ] Reviewed your own code for obvious issues
- [ ] Ensured commit messages follow semantic format
- [ ] Updated relevant documentation
- [ ] Added tests for new functionality
- [ ] Checked that CI/CD pipeline passes (after creating PR)

Thank you for contributing to NeuroLink!
