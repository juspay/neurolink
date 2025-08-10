# Changelog Automation & Formatting

NeuroLink automatically formats the CHANGELOG.md file after generation during the release process to ensure consistent formatting and readability.

## Overview

The project uses **semantic-release** to automatically generate changelogs based on commit messages. To ensure the generated CHANGELOG.md is properly formatted, we've implemented an automatic formatting step that runs immediately after changelog generation.

## How It Works

### Release Process Flow

1. **Commit Analysis**: `@semantic-release/commit-analyzer` analyzes commits since the last release
2. **Release Notes Generation**: `@semantic-release/release-notes-generator` creates release notes
3. **Changelog Generation**: `@semantic-release/changelog` updates CHANGELOG.md
4. **📄 Formatting Step**: Custom plugin formats the CHANGELOG.md file using Prettier
5. **Git Commit**: `@semantic-release/git` commits the formatted changelog
6. **NPM Publishing**: `@semantic-release/npm` publishes to npm
7. **GitHub Release**: `@semantic-release/github` creates GitHub release

### Configuration

The formatting is configured in `.releaserc.json`:

```json
{
  "branches": ["release"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "./scripts/semantic-release-format-plugin.cjs",
    "@semantic-release/npm",
    "@semantic-release/github",
    [
      "@semantic-release/git",
      {
        "assets": ["CHANGELOG.md", "package.json"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ]
  ]
}
```

## Scripts

### Format Changelog Script

**Location**: `scripts/format-changelog.cjs`

Standalone script that formats CHANGELOG.md using Prettier:

```bash
# Run manually
pnpm run format:changelog

# Or directly
node scripts/format-changelog.cjs
```

**Features**:

- ✅ Checks if CHANGELOG.md exists before formatting
- ✅ Uses project's Prettier configuration
- ✅ Provides clear success/error feedback
- ✅ Exits with error code on failure

### Semantic Release Plugin

**Location**: `scripts/semantic-release-format-plugin.cjs`

Custom semantic-release plugin that integrates formatting into the release workflow:

**Features**:

- ✅ Runs during the `prepare` step after changelog generation
- ✅ Uses semantic-release's logger for consistent output
- ✅ Automatically skips if CHANGELOG.md doesn't exist
- ✅ Integrates seamlessly with existing release pipeline

## Benefits

### Consistent Formatting

- All changelog entries follow the same formatting rules
- Markdown is properly structured and readable
- Code blocks, links, and lists are consistently formatted

### Automated Process

- No manual formatting required after releases
- Reduces human error in changelog maintenance
- Ensures formatting doesn't get forgotten

### Developer Experience

- Contributors don't need to worry about changelog formatting
- Semantic commit messages automatically generate well-formatted entries
- Release process remains fully automated

## Manual Usage

### Format Current Changelog

```bash
pnpm run format:changelog
```

### Test the Plugin

```bash
node scripts/semantic-release-format-plugin.cjs
```

### Format All Files (Including Changelog)

```bash
pnpm run format
```

## Troubleshooting

### "CHANGELOG.md not found" Warning

This is normal if:

- No changelog has been generated yet
- Running on a branch without changelog changes
- CHANGELOG.md was accidentally deleted

**Solution**: The script safely skips formatting and continues.

### Formatting Errors

If Prettier fails to format CHANGELOG.md:

1. **Check Prettier Configuration**: Ensure `.prettierrc` or `package.json` prettier config is valid
2. **Check File Permissions**: Ensure CHANGELOG.md is writable
3. **Check File Content**: Ensure CHANGELOG.md contains valid Markdown

### Plugin Not Running

If the formatting plugin doesn't run during releases:

1. **Check Plugin Order**: Ensure the format plugin comes after `@semantic-release/changelog`
2. **Check Plugin Path**: Ensure `./scripts/semantic-release-format-plugin.cjs` exists and is executable
3. **Check Semantic Release Config**: Ensure `.releaserc.json` is valid JSON

## Integration with Build Rules

The changelog formatting integrates with NeuroLink's comprehensive build rule enforcement:

- **Pre-commit Hooks**: Lint-staged ensures files are formatted before commits
- **CI Validation**: GitHub Actions verify formatting in pull requests
- **Release Automation**: Semantic-release handles the entire release pipeline
- **Quality Gates**: All formatting must pass before merge

## Best Practices

### Commit Messages

Use semantic commit messages to generate meaningful changelog entries:

```bash
# Good - generates clear changelog entry
feat(auth): add OAuth2 authentication system

# Good - generates clear changelog entry
fix(api): resolve timeout issues in user service

# Bad - creates unclear changelog entry
Update stuff
```

### Release Workflow

1. **Development**: Make commits with semantic commit messages
2. **Pull Request**: CI validates formatting and build rules
3. **Merge**: Squash merge to release branch
4. **Automatic Release**: semantic-release generates and formats changelog
5. **Distribution**: Formatted changelog is published to npm and GitHub

---

This automation ensures that NeuroLink's changelog remains consistently formatted and professional, supporting our commitment to high-quality documentation and developer experience.
