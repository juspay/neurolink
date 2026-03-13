# Dev Dependencies Upgrade Research

## 1. @semantic-release/npm (13.1.2 -> 13.1.4)

### What Changed

- **13.1.3**: Dependency update - `@actions/core` updated to v2 (#1055)
- **13.1.4**: Dependency update - `@actions/core` updated to v3 (#1085)

### Breaking Changes

None. Both releases are purely internal dependency bumps.

### New Features We Can Leverage

None directly. These are internal improvements to GitHub Actions integration.

### Risk Level: LOW

Purely dependency version bumps with no API changes. Safe to upgrade.

---

## 2. @sveltejs/kit (2.53.2 -> 2.53.3)

### What Changed

- **2.53.3**: Fix - prevent overlapping file metadata in remote functions `form`

### Breaking Changes

None. Patch-level bug fix only.

### New Features We Can Leverage

None directly. This is a targeted bug fix for form handling in remote functions.

### Risk Level: LOW

Single patch fix. No API changes. Safe to upgrade.

---

## 3. @types/node (25.3.1 -> 25.3.2)

### What Changed

- **25.3.2**: Type definition updates tracking Node.js 25.x APIs. These releases are auto-generated from DefinitelyTyped and contain incremental type refinements and corrections.

### Breaking Changes

None expected. @types/node patch releases only refine existing type definitions.

### New Features We Can Leverage

More accurate Node.js type definitions.

### Risk Level: LOW

Type-only package; no runtime impact. Patch release with minor type corrections.

---

## 4. Fastify (5.7.2 -> 5.7.4)

### What Changed

- **5.7.3**: Security fix - patched GHSA-mrq3-vjjr-p77c (CVE-2026-25224). Updated Reply.send() documentation for string serialization. Enhanced vulnerability reporting procedures.
- **5.7.4**: Additional patch release following 5.7.3 (same release date).

### Breaking Changes

None. Both are patch-level security and documentation fixes.

### New Features We Can Leverage

None directly. Important security patch for string serialization in Reply.send().

### Risk Level: LOW

Security patch (important to apply). No API changes. NeuroLink uses Fastify as a server adapter in `src/lib/server/`, so the security fix is relevant.

---

## 5. svelte-check (4.4.3 -> 4.4.4)

### What Changed

- **4.4.4**: Three patch fixes:
  1. More robust detection of `lang="ts"` attribute (#2957)
  2. Pass filename to `warningFilter` (#2959)
  3. Resolve svelte files under path alias in `--incremental/tsgo` mode (#2955)

### Breaking Changes

None. All patch-level bug fixes.

### New Features We Can Leverage

- Better TypeScript detection in Svelte files
- Improved path alias resolution in incremental mode (useful for NeuroLink's `$lib` aliases)

### Risk Level: LOW

Patch-level bug fixes that improve existing functionality. Safe to upgrade.

---

## 6. tslib (2.4.1 -> 2.8.1) -- LARGE JUMP

### What Changed (version by version)

| Version   | Key Changes                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **2.5.0** | (no specific notes; accumulated fixes)                                                                                                                             |
| **2.5.1** | Reversed order of decorator `init` hooks to match proposed spec behavior. Fixed `exports` field and declaration files for `node16` and `bundler` moduleResolution. |
| **2.5.2** | Explicitly re-exports helpers to work around TypeScript's incomplete symbol resolution                                                                             |
| **2.5.3** | Removed tslib.es6.js reference from package.json exports                                                                                                           |
| **2.6.0** | **Added helpers for `using` and `await using` statements** (explicit resource management)                                                                          |
| **2.6.1** | Allow functions as values in `__addDisposableResource`; eliminated ES6 syntax from es6 file                                                                        |
| **2.6.2** | Fixed path to `exports["module"]["types"]`                                                                                                                         |
| **2.6.3** | Implemented `await using` normative changes                                                                                                                        |
| **2.7.0** | Implemented deterministic collapse of `await` in `await using`; use global `Iterator.prototype` for downlevel generators                                           |
| **2.8.0** | Validated export structure of every entrypoint; added `rewriteRelativeImportExtension` helper                                                                      |
| **2.8.1** | Fixed publish workflow; included non-enumerable keys in `__importStar` helper; removed ES2015 syntax usage                                                         |

### Breaking Changes

- **2.5.1**: Reversed decorator `init` hook order (matches spec but could break code relying on old order)
- **2.5.1**: Changed `exports` field in package.json (could affect resolution under `node16`/`bundler`)
- **2.8.0**: New export validation may surface previously-hidden issues

### New Features We Can Leverage

- **`using`/`await using` helpers** (2.6.0+): If the project targets older runtimes, tslib now provides runtime support for explicit resource management
- **`rewriteRelativeImportExtension` helper** (2.8.0): Supports TypeScript 5.7+'s `--rewriteRelativeImportExtensions` flag
- **Better moduleResolution compatibility** (2.5.1+): Fixed exports for `node16` and `bundler` resolution modes
- **Improved `__importStar`** (2.8.1): Now includes non-enumerable keys

### Risk Level: MEDIUM

This is a significant version jump spanning many releases. The decorator init hook reordering (2.5.1) is the main concern, but NeuroLink does not appear to use TypeScript decorators heavily. The `exports` field changes should be compatible since the project uses modern module resolution. Recommend upgrading and running a full test suite.

---

## 7. TypeScript (5.0.0 -> 5.9.3) -- VERY LARGE JUMP

This is the most significant upgrade. Below is a comprehensive breakdown of every major version between 5.0 and 5.9.

### TypeScript 5.1 (June 2023)

**Features:**

- Easier implicit returns for `undefined`-returning functions
- Unrelated types for getters and setters (with explicit type annotations)
- JSDoc `@param` snippet completions
- Performance improvements (50%+ type-checking speedup for material-ui docs)
- `typeRoots` consulted in module resolution

**Breaking Changes:**

- Minimum runtime requirement: ES2020 / Node.js 14.17

### TypeScript 5.2 (August 2023)

**Features:**

- **`using` declarations** (explicit resource management via `Symbol.dispose`)
- **`await using`** for async disposal via `Symbol.asyncDispose`
- **Decorator metadata** via `Symbol.metadata` on class context objects
- Tuple labeled element improvements
- Easier method usage for unions of arrays

**Breaking Changes:**

- More restrictive decorator context types

### TypeScript 5.3 (November 2023)

**Features:**

- **Import attributes** (`import ... with { type: "json" }`)
- **Stable `resolution-mode`** in import types (works in all moduleResolution modes)
- `switch(true)` narrowing
- Narrowing on comparisons to booleans
- `instanceof` narrowing through `Symbol.hasInstance`
- Checks for `super` property accesses on instance fields

**Breaking Changes:**

- `lib.d.ts` changes

### TypeScript 5.4 (March 2024)

**Features:**

- **`NoInfer<T>` utility type** - blocks unwanted type inference
- **Preserved narrowing in closures** after last assignment
- `Object.groupBy` and `Map.groupBy` declarations
- `--moduleResolution bundler` improvements

**Breaking Changes:**

- Enum members can no longer be named `Infinity`, `-Infinity`, or `NaN`
- More accurate template string type checking
- Intersection type reductions with mapped types over type parameters

### TypeScript 5.5 (June 2024) -- "Blockbuster Release"

**Features:**

- **Inferred type predicates** (`.filter()` now properly narrows types!)
- **`isolatedDeclarations`** - enables parallel declaration emit
- **Regular expression syntax checking** - validates regex at compile time
- Improved type narrowing for indexed access types (`obj[key]`)
- Support for new ECMAScript `Set` methods
- Simplified reference directives for declaration files

**Breaking Changes:**

- Declaration emit changes may affect generated `.d.ts` files
- Stricter regex validation may flag previously-allowed patterns

### TypeScript 5.6 (September 2024)

**Features:**

- **Disallowed nullish and truthy checks** - errors on always-truthy/nullish checks (catches "many, many bugs")
- **Iterator helper methods** (`map`, `filter`, `take`, etc. on iterables)
- **`--noCheck` flag** - skip type checking for faster builds
- Region-prioritized diagnostics (better editor performance)
- `IteratorObject` type (renamed from `BuiltinIterator`)
- Build continues despite intermediate project errors

**Breaking Changes:**

- Always-truthy/nullish checks now error (may flag existing code)
- `BuiltinIterator` renamed to `IteratorObject`
- `lib.d.ts` changes

### TypeScript 5.7 (November 2024)

**Features:**

- **`--rewriteRelativeImportExtensions`** - rewrites .ts imports to .js in output
- **`--target es2024`** - SharedArrayBuffer, ArrayBuffer, Object.groupBy, Promise.withResolvers
- Improved variable initialization analysis (errors for never-initialized vars)
- Better `typeof` for symbols
- Performance improvements (2.5x speedup in some cases)

**Breaking Changes:**

- Stricter checks for uninitialized variables may surface new errors
- `lib.d.ts` changes

### TypeScript 5.8 (February 2025)

**Features:**

- **Smarter conditional return type checks** - checks each branch against declared return type
- **`require()` of ESM under `--module nodenext`**
- **`--erasableSyntaxOnly`** flag for direct Node.js execution (Node 23.6+)
- **`--module node18`** - stable Node.js 18 module target
- **`--libReplacement`** flag
- Performance improvements (faster --watch / editor scenarios)

**Breaking Changes:**

- Stricter conditional return type checking may surface new errors
- Changes to declaration emit under `isolatedDeclarations`

### TypeScript 5.9 (August 2025)

**Features:**

- **`import defer` syntax** - deferred module evaluation (module only evaluated when exports accessed)
- **`--module node20`** - stable Node.js 20 module target
- **Expandable hovers** in editor - explore types deeper in tooltips
- **MDN descriptions** in DOM API tooltips
- Improved `tsc --init` defaults
- Performance improvements (11% faster file existence checks, cached instantiations)

**Breaking Changes:**

- Strict null checks in generic constraints
- Deprecated utility types removed
- Module resolution changes
- `lib.dom.d.ts` changes (ArrayBuffer no longer supertype of Buffer)
- Inference "leak" fixes may change inferred types in some codebases

### Summary of All Major Features (5.0 -> 5.9)

| Category                | Features                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Resource Management** | `using` / `await using` (5.2), decorator metadata (5.2)                                                                                        |
| **Type Inference**      | `NoInfer<T>` (5.4), inferred type predicates (5.5), preserved narrowing in closures (5.4)                                                      |
| **Module System**       | Import attributes (5.3), `import defer` (5.9), `--rewriteRelativeImportExtensions` (5.7), `--module node18/node20` (5.8/5.9)                   |
| **Error Detection**     | Disallowed nullish/truthy checks (5.6), regex syntax checking (5.5), uninitialized variable checks (5.7), conditional return type checks (5.8) |
| **Build & Perf**        | `isolatedDeclarations` (5.5), `--noCheck` (5.6), `--erasableSyntaxOnly` (5.8), significant perf improvements every release                     |
| **Runtime Targets**     | `--target es2024` (5.7), iterator helpers (5.6), `Object.groupBy`/`Map.groupBy` (5.4)                                                          |
| **DX**                  | Expandable hovers (5.9), MDN tooltips (5.9), JSDoc snippets (5.1)                                                                              |

### New Features NeuroLink Can Leverage

1. **`NoInfer<T>`** (5.4) - useful in factory/registry pattern generics
2. **Inferred type predicates** (5.5) - `.filter()` calls throughout the codebase will now properly narrow types
3. **`using`/`await using`** (5.2) - for resource cleanup in MCP connections, Redis memory, etc.
4. **`import defer`** (5.9) - aligns with NeuroLink's dynamic import pattern for providers
5. **`--erasableSyntaxOnly`** (5.8) - could enable direct Node.js execution for development
6. **Disallowed nullish/truthy checks** (5.6) - will catch bugs in existing code
7. **`--target es2024`** (5.7) - can target newer runtime features
8. **Regex validation** (5.5) - catches regex errors at compile time
9. **Performance improvements** - every version brings significant compiler speedups

### Risk Level: HIGH

This is a massive jump spanning 10 minor versions over 2.5 years. Key risks:

1. **Always-truthy/nullish checks (5.6)**: Will likely flag existing code patterns that need review
2. **Stricter type inference**: Multiple versions tighten inference; some existing code may need type annotations
3. **lib.d.ts changes**: DOM and standard library type changes across 10 versions could affect code
4. **Declaration emit changes**: The `isolatedDeclarations` work changed declaration emit behavior
5. **Uninitialized variable checks (5.7)**: May flag variables that were previously allowed
6. **Generic constraint null checks (5.9)**: May surface new errors in generic code
7. **ArrayBuffer/Buffer relationship (5.9)**: Could affect Node.js buffer handling code

**Recommended Migration Strategy:**

1. Update TypeScript to 5.9.3
2. Run `tsc --noEmit` to identify all new errors
3. Fix errors in order of severity (type errors first, then new warnings)
4. Run full test suite
5. The `--noCheck` flag (5.6) can be used as a temporary escape hatch during migration if needed

---

## Overall Risk Assessment Summary

| Package               | Version Jump     | Risk       | Notes                                                           |
| --------------------- | ---------------- | ---------- | --------------------------------------------------------------- |
| @semantic-release/npm | 13.1.2 -> 13.1.4 | **LOW**    | Internal dependency bumps only                                  |
| @sveltejs/kit         | 2.53.2 -> 2.53.3 | **LOW**    | Single bug fix                                                  |
| @types/node           | 25.3.1 -> 25.3.2 | **LOW**    | Type refinements only                                           |
| fastify               | 5.7.2 -> 5.7.4   | **LOW**    | Security patch (important to apply)                             |
| svelte-check          | 4.4.3 -> 4.4.4   | **LOW**    | Bug fixes for TS detection and path aliases                     |
| tslib                 | 2.4.1 -> 2.8.1   | **MEDIUM** | Large jump; decorator hook order changed; new exports structure |
| typescript            | 5.0.0 -> 5.9.3   | **HIGH**   | Massive jump; many new type checks will surface errors          |

### Recommended Upgrade Order

1. **First** (safe, quick wins): @semantic-release/npm, @sveltejs/kit, @types/node, fastify, svelte-check
2. **Second** (test after): tslib 2.8.1
3. **Last** (needs dedicated effort): TypeScript 5.9.3 -- expect to fix type errors after upgrading
