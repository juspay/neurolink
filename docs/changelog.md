# Changelog

All notable changes to NeuroLink are documented in this changelog.

For the complete and most up-to-date changelog, please visit:
**[CHANGELOG.md](https://github.com/juspay/neurolink/blob/release/CHANGELOG.md)** in the GitHub repository.

---

## Latest Releases

### v9.14.0 (Current Release - February 28, 2026)

**Features:**

- **(providers):** Add Claude Subscription Support with OAuth 2.0 PKCE authentication for Claude Pro/Max subscriptions

**What's New:**

- **OAuth 2.0 with PKCE authentication** for Claude Pro, Max, and Team subscription users, enabling API access without separate API keys
- **Automatic token refresh** before every `generate()` and `stream()` call, ensuring uninterrupted sessions
- **Model tier access enforcement** with six subscription tiers: `free`, `pro`, `max`, `max_5`, `max_20`, and `api`, restricting model access based on the user's plan
- **New `auth` CLI command** with four subcommands: `login` (browser-based OAuth flow), `status` (display current authentication state), `refresh` (manually refresh tokens), and `logout` (revoke and clear credentials)
- **Secure token storage** at `~/.neurolink/anthropic-credentials.json` with filesystem-level permissions
- **Beta feature support** for `claude-code`, `interleaved-thinking`, and `fine-grained-tool-streaming` via Anthropic beta headers
- **99 integration tests** covering authentication flows, token lifecycle, tier enforcement, and CLI command behavior

---

### v8.26.1 (December 31, 2025)

**Bug Fixes:**

- **(providers):** Resolve Gemini 3 issues, add utilities, improve tests ([270ef6f](https://github.com/juspay/neurolink/commit/270ef6f225e7861846cf359f2d81edae38592053))

**What's New:**

- Enhanced Gemini 3 provider stability
- Improved test coverage for Google AI providers
- Added new provider utility functions

---

### v8.26.0 (December 30, 2025)

**Features:**

- **(types):** Add video output types (VIDEO-GEN-001) ([1b1b5c2](https://github.com/juspay/neurolink/commit/1b1b5c23d0bdacb9d3120797b1f7984d7e0cc48c))

**What's New:**

- Video generation type support
- Enhanced multimodal capabilities
- New type definitions for video outputs

---

### v8.25.0 (December 30, 2025)

**Features:**

- **(observability):** Add support for custom metadata in Context ([b175249](https://github.com/juspay/neurolink/commit/b175249c61357b0e6d127932bd7824d0bfe6f2ed))

**What's New:**

- Custom metadata support for observability
- Enhanced context tracking capabilities
- Improved telemetry integration

---

## Recent Notable Releases

### v8.24.0 - OpenRouter Integration

- Added OpenRouter provider with 300+ model support
- Enhanced provider ecosystem
- Expanded model availability

### v8.23.0 - CSV Enhancements

- Added file extension field to CSV metadata
- Improved CSV processing capabilities

### v8.22.0 - CI/CD Improvements

- Added ffmpeg installation and verification to CI/CD pipeline
- Enhanced multimedia processing support

### v8.21.0 - Office Documents

- Added office document type definitions
- Comprehensive document handling tests
- Enhanced multimodal support

### v8.20.0 - Memory Improvements

- Implemented token-based summarization
- Enhanced conversation memory management
- Optimized context handling

### v8.19.0 - TTS Integration

- Integrated Text-to-Speech (TTS) into BaseProvider.generate()
- Enhanced audio generation capabilities
- Google TTS handler improvements

---

## Version Support Policy

| Version | Status      | Support Level                                            | End of Life  |
| ------- | ----------- | -------------------------------------------------------- | ------------ |
| **8.x** | **Active**  | Full support - Security updates, bug fixes, new features | -            |
| 7.x     | Maintenance | Security updates and critical bug fixes only             | June 1, 2026 |
| 6.x     | End of Life | No support                                               | June 1, 2025 |

**Support Levels Explained:**

- **Active**: Full support including new features, enhancements, bug fixes, and security updates
- **Maintenance**: Security patches and critical bug fixes only, no new features
- **End of Life**: No updates or support, upgrade recommended

---

## Upgrade Guides

Migrating between major versions? Check out our comprehensive upgrade guides:

### Major Version Upgrades

- **v8 to v9 Migration Guide**

  > This guide is planned for a future release.

- **v7 to v8 Migration Guide**

  > This guide is planned for a future release.

- **v6 to v7 Migration Guide**
  > This guide is planned for a future release.

### Migrating from Other SDKs

Already using another AI SDK? We have migration guides:

- **[From LangChain](guides/migration/from-langchain.md)**
  - Feature comparison
  - API mapping
  - Tool/chain equivalents

- **[From Vercel AI SDK](guides/migration/from-vercel-ai-sdk.md)**
  - Provider migration
  - Streaming API changes
  - UI integration patterns

---

## Release Highlights by Feature Area

### Providers (v8.20.0 - v9.14.0)

- **v9.14.0**: Claude Subscription Support with OAuth 2.0 PKCE authentication
- **v8.26.1**: Gemini 3 stability improvements
- **v8.24.0**: OpenRouter provider (300+ models)
- **v8.20.0**: Enhanced provider error handling

### Multimodal (v8.19.0 - v8.26.0)

- **v8.26.0**: Video output types
- **v8.23.0**: CSV metadata enhancements
- **v8.21.0**: Office document support
- **v8.19.0**: TTS integration

### Memory & Context (v8.20.0 - v8.25.0)

- **v8.25.0**: Custom metadata in Context
- **v8.20.0**: Token-based summarization

### Developer Experience (v8.22.0 - v8.23.1)

- **v8.23.1**: Blocked tool support
- **v8.22.0**: Enhanced CI/CD pipeline

---

## Breaking Changes Summary

### v8.x Series

No major breaking changes in v8.x patch releases. All releases are backward compatible within the 8.x major version.

### Future Breaking Changes

Breaking changes are only introduced in major version updates (e.g., v9.0.0). We follow [Semantic Versioning](https://semver.org/):

- **Major (x.0.0)**: Breaking changes
- **Minor (8.x.0)**: New features, backward compatible
- **Patch (8.26.x)**: Bug fixes, backward compatible

---

## Release Schedule

NeuroLink follows a continuous release schedule:

- **Patch Releases**: As needed for bug fixes and minor improvements
- **Minor Releases**: Every 1-2 weeks for new features
- **Major Releases**: Annually or when significant architecture changes are needed

### Release Notifications

Stay updated with new releases:

1. **GitHub Releases**: Watch the [NeuroLink repository](https://github.com/juspay/neurolink) for release notifications
2. **NPM**: Follow [@juspay/neurolink](https://www.npmjs.com/package/@juspay/neurolink) on npm
3. **Changelog**: Monitor this page or the [full CHANGELOG.md](https://github.com/juspay/neurolink/blob/release/CHANGELOG.md)
4. **GitHub Discussions**: Join discussions for release announcements

---

## Contribution to Changelog

Found a bug or want to contribute? Here's how:

1. **Report Issues**: [GitHub Issues](https://github.com/juspay/neurolink/issues)
2. **Submit PRs**: [Contributing Guide](contributing.md)
3. **Discuss Features**: [GitHub Discussions](https://github.com/juspay/neurolink/discussions)

All contributions are automatically included in the changelog via our automated release process using semantic-release.

---

## Historical Releases

For a complete history of all releases including detailed commit information, see:

**[Complete CHANGELOG.md](https://github.com/juspay/neurolink/blob/release/CHANGELOG.md)**

---

## Related Documentation

- **[Installation Guide](getting-started/installation.md)** - Install the latest version
- **[Quick Start](getting-started/quick-start.md)** - Get up and running quickly
- **[Migration Guides](guides/migration-guide.md)** - Upgrade from older versions
- **Breaking Changes** - Detailed breaking changes documentation is planned for a future release

---

**Last Updated:** February 28, 2026
**Current Version:** v9.14.0
