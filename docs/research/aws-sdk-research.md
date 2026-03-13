# AWS SDK Package Upgrade Research

**Date:** 2026-02-27
**Upgrade Path:** 3.998.0 -> 3.999.0 (all four packages)
**Release Date of 3.999.0:** 2026-02-26

---

## Executive Summary

The upgrade from 3.998.0 to 3.999.0 across all four AWS SDK packages is **extremely low risk**. All four packages received **version-bump-only** updates in both 3.998.0 and 3.999.0 -- no new features, no bug fixes, and no breaking changes were introduced in any of the Bedrock or SageMaker client packages specifically. The only SDK-wide change in 3.999.0 is an enhancement to `util-user-agent-node` that populates the TypeScript version in the user-agent header when available.

**Overall Risk Level: LOW** -- This is a routine maintenance upgrade.

---

## Package-by-Package Analysis

### 1. @aws-sdk/client-bedrock (3.998.0 -> 3.999.0)

| Attribute            | Details                                               |
| -------------------- | ----------------------------------------------------- |
| **What changed**     | Version bump only (no direct changes to this package) |
| **Breaking changes** | None                                                  |
| **Bug fixes**        | None                                                  |
| **New features**     | None in 3.998.0 or 3.999.0 specifically               |
| **Risk level**       | **LOW**                                               |

**Context:** The most recent substantive change to `client-bedrock` was in **v3.996.0** (2026-02-23), which added Automated Reasoning checks fidelity report generation in Bedrock Guardrails and extended the `GetAutomatedReasoningPolicyBuildWorkflowResultAssets` API with three new asset types. This feature was already included in the previous 3.998.0 version that NeuroLink currently uses.

**NeuroLink Impact:** No changes to the Bedrock provider API surface. The `src/lib/providers/amazonBedrock.ts` provider implementation requires no modifications.

---

### 2. @aws-sdk/client-bedrock-runtime (3.998.0 -> 3.999.0)

| Attribute            | Details                                               |
| -------------------- | ----------------------------------------------------- |
| **What changed**     | Version bump only (no direct changes to this package) |
| **Breaking changes** | None                                                  |
| **Bug fixes**        | None                                                  |
| **New features**     | None in 3.998.0 or 3.999.0 specifically               |
| **Risk level**       | **LOW**                                               |

**Context:** The last substantive changes to `client-bedrock-runtime` were:

- **v3.983.0** (2026-02-04): Added structured outputs to Converse and ConverseStream APIs
- **v3.972.0** (2026-01-20): Added extended prompt caching with one hour TTL

Both of these features are already available in the current 3.998.0 version.

**NeuroLink Impact:** No changes to the runtime API. The Bedrock provider's `generate()` and `stream()` implementations are unaffected.

---

### 3. @aws-sdk/client-sagemaker (3.998.0 -> 3.999.0)

| Attribute            | Details                                               |
| -------------------- | ----------------------------------------------------- |
| **What changed**     | Version bump only (no direct changes to this package) |
| **Breaking changes** | None                                                  |
| **Bug fixes**        | None                                                  |
| **New features**     | None in 3.998.0 or 3.999.0 specifically               |
| **Risk level**       | **LOW**                                               |

**Context:** Recent substantive changes to `client-sagemaker` (prior to 3.998.0) include g7e instance type support for SageMaker Processing and single file configuration provisioning for HyperPod Slurm, but those were in earlier releases already included in 3.998.0.

**NeuroLink Impact:** No changes to the SageMaker management API surface. The `src/lib/providers/amazonSagemaker.ts` provider implementation requires no modifications.

---

### 4. @aws-sdk/client-sagemaker-runtime (3.998.0 -> 3.999.0)

| Attribute            | Details                                               |
| -------------------- | ----------------------------------------------------- |
| **What changed**     | Version bump only (no direct changes to this package) |
| **Breaking changes** | None                                                  |
| **Bug fixes**        | None                                                  |
| **New features**     | None in 3.998.0 or 3.999.0 specifically               |
| **Risk level**       | **LOW**                                               |

**Context:** The most recent substantive change to `client-sagemaker-runtime` was in **v3.995.0** (2026-02-20), which added `S3OutputPathExtension` and `Filename` parameters to the `InvokeEndpointAsync` API for customizing S3 output path and file name for async inference response payloads. This feature is already included in 3.998.0.

**NeuroLink Impact:** No changes to the SageMaker Runtime API for inference. The SageMaker provider's endpoint invocation logic is unaffected.

---

## SDK-Wide Changes in 3.999.0

The following SDK-wide changes apply to all clients (including Bedrock and SageMaker):

1. **User-Agent Enhancement**: `util-user-agent-node` now populates the TypeScript version in the user-agent header when available (PR #7786). This is a non-breaking telemetry improvement that helps AWS understand SDK usage patterns.

2. **Service-specific features in 3.999.0** (not affecting NeuroLink's AWS packages):
   - SecurityHub: Extended Plan integration type for `DescribeProductsV2`
   - EC2: Support for c8id, m8id, and hpc8a instance types
   - ECS: Capacity Reservations support for Managed Instances
   - Marketplace: LicenseArn additions

---

## Node.js Compatibility Note

As of **January 2026**, the AWS SDK for JavaScript v3 has dropped support for Node.js 18.x. NeuroLink requires Node.js >=20.18.1, so this is not a concern. The SDK currently supports:

- Node.js 20.x (until April 2026)
- Node.js 22.x / 24.x (current LTS)

---

## New Features We Can Leverage in NeuroLink

Since this is a version-bump-only upgrade, there are no new features to leverage from the 3.998.0 -> 3.999.0 transition. However, features from recent prior releases (already available in 3.998.0) that NeuroLink could potentially leverage include:

1. **Structured Outputs for Bedrock Converse API** (v3.983.0) -- If not already used, this could enhance JSON schema output support for Bedrock models.
2. **Extended Prompt Caching (1hr TTL)** (v3.972.0) -- Could improve performance and reduce costs for repeated similar prompts.
3. **Async Inference S3 Output Customization for SageMaker** (v3.995.0) -- Could enhance SageMaker async inference workflows.

These are pre-existing capabilities, not new with 3.999.0.

---

## Upgrade Recommendation

**PROCEED** with the upgrade. This is a safe, routine version bump with:

- Zero breaking changes
- Zero functional changes to any of the four packages
- Only a minor SDK-wide user-agent telemetry improvement
- Full compatibility with NeuroLink's Node.js >=20.18.1 requirement

No code changes are required in NeuroLink's Bedrock or SageMaker provider implementations.

---

## Sources

- [AWS SDK JS v3 Releases](https://github.com/aws/aws-sdk-js-v3/releases)
- [client-bedrock CHANGELOG.md](https://github.com/aws/aws-sdk-js-v3/blob/main/clients/client-bedrock/CHANGELOG.md)
- [client-bedrock-runtime CHANGELOG.md](https://github.com/aws/aws-sdk-js-v3/blob/main/clients/client-bedrock-runtime/CHANGELOG.md)
- [client-sagemaker CHANGELOG.md](https://github.com/aws/aws-sdk-js-v3/blob/main/clients/client-sagemaker/CHANGELOG.md)
- [client-sagemaker-runtime CHANGELOG.md](https://github.com/aws/aws-sdk-js-v3/blob/main/clients/client-sagemaker-runtime/CHANGELOG.md)
- [Node.js 18 End of Support Issue #7558](https://github.com/aws/aws-sdk-js-v3/issues/7558)
- [@aws-sdk/client-bedrock on npm](https://www.npmjs.com/package/@aws-sdk/client-bedrock)
- [@aws-sdk/client-sagemaker-runtime on npm](https://www.npmjs.com/package/@aws-sdk/client-sagemaker-runtime)
