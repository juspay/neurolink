# npm Trusted Publishing Setup

This repository is configured to use npm's **Trusted Publishing** feature with GitHub Actions OIDC authentication. This provides secure, token-free publishing with automatic provenance generation.

## What is Trusted Publishing?

Trusted Publishing allows GitHub Actions to publish packages to npm without using long-lived NPM_TOKEN secrets. Instead, it uses OpenID Connect (OIDC) to create short-lived tokens that are automatically verified by npm.

**Benefits:**

- ✅ No need to manage NPM_TOKEN secrets
- ✅ Automatic package provenance (cryptographic attestation)
- ✅ Enhanced security (no long-lived credentials)
- ✅ Verifiable supply chain

## Configuration Status

✅ **GitHub Actions workflow** - Configured with OIDC permissions
✅ **semantic-release** - Configured to publish with provenance

⚠️ **npm Trusted Publisher** - Requires manual setup on npm.org (see below)

## GitHub Actions Configuration (✅ Complete)

The following changes have been made to `.github/workflows/release.yml`:

1. **Added `id-token: write` permission:**

   ```yaml
   permissions:
     contents: write
     packages: write
     issues: write
     pull-requests: write
     id-token: write # Required for npm provenance
   ```

2. **Configured semantic-release** in `.releaserc.json`:
   ```json
   [
     "@semantic-release/npm",
     {
       "npmPublish": true,
       "provenance": true
     }
   ]
   ```

## npm Website Configuration (⚠️ Required)

To complete the setup, you must configure the trusted publisher on npm.org:

### Step 1: Access Package Settings

1. Go to [npmjs.com](https://www.npmjs.com/) and sign in
2. Navigate to your package: `@juspay/neurolink`
3. Click on **Settings** tab

### Step 2: Configure Trusted Publisher

1. Scroll to **Publishing Access** section
2. Click **Add Trusted Publisher**
3. Select **GitHub Actions** as the provider
4. Fill in the following details:
   - **Repository owner:** `juspay`
   - **Repository name:** `neurolink`
   - **Workflow name:** `release.yml`
   - **Environment (optional):** Leave empty unless you use GitHub environments

### Step 3: Save Configuration

1. Click **Add Trusted Publisher**
2. Verify the configuration appears in the list

## Migration Notes

### During Transition Period

You can keep the `NPM_TOKEN` secret configured during the transition:

- If trusted publishing is configured, npm will use OIDC authentication
- If trusted publishing fails, it will fall back to the token
- Once verified working, you can remove the `NPM_TOKEN` secret

### Removing NPM_TOKEN (After Verification)

Once you've confirmed trusted publishing works:

1. Go to GitHub repository settings
2. Navigate to **Secrets and variables** → **Actions**
3. Delete the `NPM_TOKEN` secret (optional but recommended)

**Note:** The `NPM_TOKEN` in the workflow environment variables doesn't need to be removed - it will simply be unused when OIDC is active.

## Verification

After configuring trusted publishing and triggering a release:

1. **Check the workflow logs:**
   - Go to **Actions** tab in GitHub
   - Open the latest release workflow run
   - Look for the semantic-release step logs

2. **Verify provenance on npm:**
   - Visit your package page: `https://www.npmjs.com/package/@juspay/neurolink`
   - Look for the **Provenance** badge or section
   - Click to view the attestation details

3. **Expected output:**
   - Workflow should complete successfully without NPM_TOKEN errors
   - Package page should show provenance information
   - Attestation should link back to the GitHub Actions run

## Troubleshooting

### Error: "This request requires id-token permission"

**Cause:** Missing `id-token: write` permission in workflow

**Solution:** Verify `.github/workflows/release.yml` has:

```yaml
permissions:
  id-token: write
```

### Error: "npm publish failed - no trusted publisher configured"

**Cause:** Trusted publisher not configured on npm.org

**Solution:** Follow the npm website configuration steps above

### Provenance not showing on npm

**Possible causes:**

1. Trusted publisher not configured on npm.org
2. `provenance: true` not set in semantic-release config
3. Publishing happened before OIDC configuration

**Solution:**

1. Verify all configuration steps
2. Trigger a new release to test

## References

- [npm Trusted Publishers Documentation](https://docs.npmjs.com/trusted-publishers)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [semantic-release npm plugin](https://github.com/semantic-release/npm#options)

## Support

For issues with:

- **GitHub Actions OIDC:** Contact GitHub Support
- **npm Trusted Publishing:** Contact npm Support
- **semantic-release:** Check [semantic-release documentation](https://semantic-release.gitbook.io/)
