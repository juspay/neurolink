/**
 * Language Detection Map
 * Maps file extensions and filenames to programming language names
 *
 * @module processors/config/languageMap
 */

import { basename as pathBasename } from "node:path";

// =============================================================================
// EXTENSION TO LANGUAGE MAP
// =============================================================================

/**
 * Maps file extensions to their programming language names
 * Used for syntax highlighting, code analysis, and display purposes
 */
export const LANGUAGE_MAP: Record<string, string> = {
  // JavaScript/TypeScript
  ".js": "JavaScript",
  ".jsx": "JavaScript (JSX)",
  ".mjs": "JavaScript (ESM)",
  ".cjs": "JavaScript (CommonJS)",
  ".ts": "TypeScript",
  ".tsx": "TypeScript (TSX)",

  // Python
  ".py": "Python",
  ".pyw": "Python",
  ".pyi": "Python (Stub)",

  // Java/Kotlin
  ".java": "Java",
  ".kt": "Kotlin",
  ".kts": "Kotlin (Script)",

  // Go
  ".go": "Go",

  // Rust
  ".rs": "Rust",

  // C/C++
  ".c": "C",
  ".h": "C Header",
  ".cpp": "C++",
  ".hpp": "C++ Header",
  ".cc": "C++",
  ".cxx": "C++",
  ".hxx": "C++ Header",

  // C#
  ".cs": "C#",

  // Ruby
  ".rb": "Ruby",
  ".rake": "Ruby (Rake)",

  // PHP
  ".php": "PHP",
  ".phtml": "PHP (HTML)",
  ".php3": "PHP",
  ".php4": "PHP",
  ".php5": "PHP",
  ".phps": "PHP",

  // Shell
  ".sh": "Shell",
  ".bash": "Bash",
  ".zsh": "Zsh",
  ".fish": "Fish",
  ".ksh": "Ksh",

  // SQL
  ".sql": "SQL",

  // Swift
  ".swift": "Swift",

  // Dart
  ".dart": "Dart",

  // Objective-C
  ".m": "Objective-C",
  ".mm": "Objective-C++",

  // Scala
  ".scala": "Scala",
  ".sc": "Scala (Script)",

  // Haskell
  ".hs": "Haskell",
  ".lhs": "Literate Haskell",

  // Lua
  ".lua": "Lua",

  // R
  ".r": "R",
  ".R": "R",
  ".rmd": "R Markdown",
  ".Rmd": "R Markdown",

  // Perl
  ".pl": "Perl",
  ".pm": "Perl (Module)",
  ".pod": "Perl (Documentation)",
  ".t": "Perl (Test)",

  // Elixir/Erlang
  ".ex": "Elixir",
  ".exs": "Elixir (Script)",
  ".erl": "Erlang",
  ".hrl": "Erlang (Header)",

  // Clojure
  ".clj": "Clojure",
  ".cljs": "ClojureScript",
  ".cljc": "Clojure (Common)",
  ".edn": "Clojure (EDN)",

  // F#
  ".fs": "F#",
  ".fsx": "F# (Script)",
  ".fsi": "F# (Signature)",

  // OCaml
  ".ml": "OCaml",
  ".mli": "OCaml (Interface)",

  // Lisp/Scheme
  ".lisp": "Lisp",
  ".lsp": "Lisp",
  ".cl": "Common Lisp",
  ".scm": "Scheme",
  ".ss": "Scheme",

  // Groovy
  ".groovy": "Groovy",
  ".gvy": "Groovy",
  ".gy": "Groovy",
  ".gsh": "Groovy (Script)",

  // PowerShell
  ".ps1": "PowerShell",
  ".psm1": "PowerShell (Module)",
  ".psd1": "PowerShell (Data)",

  // Nim
  ".nim": "Nim",
  ".nims": "Nim (Script)",

  // Zig
  ".zig": "Zig",

  // V
  ".v": "V",

  // Julia
  ".jl": "Julia",

  // Crystal
  ".cr": "Crystal",

  // D
  ".d": "D",

  // Assembly
  ".asm": "Assembly",
  ".s": "Assembly",
  ".S": "Assembly",

  // Fortran
  ".f": "Fortran",
  ".f90": "Fortran 90",
  ".f95": "Fortran 95",
  ".f03": "Fortran 2003",
  ".for": "Fortran",

  // COBOL
  ".cob": "COBOL",
  ".cbl": "COBOL",
  ".cobol": "COBOL",

  // Pascal
  ".pas": "Pascal",
  ".pp": "Pascal",
  ".p": "Pascal",

  // Ada
  ".ada": "Ada",
  ".adb": "Ada (Body)",
  ".ads": "Ada (Spec)",

  // Web frameworks/templates
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".hbs": "Handlebars",
  ".handlebars": "Handlebars",
  ".ejs": "EJS",
  ".pug": "Pug",
  ".jade": "Jade",

  // Stylesheets
  ".css": "CSS",
  ".scss": "SCSS",
  ".sass": "Sass",
  ".less": "Less",
  ".styl": "Stylus",
  ".stylus": "Stylus",

  // Markup/Data
  ".html": "HTML",
  ".htm": "HTML",
  ".xhtml": "XHTML",
  ".xml": "XML",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".toml": "TOML",
  ".md": "Markdown",
  ".markdown": "Markdown",
  ".rst": "reStructuredText",
  ".tex": "LaTeX",
  ".latex": "LaTeX",

  // Build/Config
  ".dockerfile": "Dockerfile",
  ".mk": "Makefile",
  ".cmake": "CMake",
  ".gradle": "Gradle",
  ".sbt": "SBT",

  // Config files
  ".env": "Environment",
  ".ini": "INI",
  ".cfg": "Configuration",
  ".conf": "Configuration",
  ".config": "Configuration",
  ".properties": "Properties",

  // Logs
  ".log": "Log",

  // Plain text
  ".txt": "Plain Text",
} as const;

// =============================================================================
// EXACT FILENAME MAP
// =============================================================================

/**
 * Maps exact filenames (without extension) to their language/type
 * Used for special files like Dockerfile, Makefile, etc.
 */
export const EXACT_FILENAME_MAP: Record<string, string> = {
  // Docker
  Dockerfile: "Dockerfile",
  "Dockerfile.dev": "Dockerfile",
  "Dockerfile.prod": "Dockerfile",
  "docker-compose.yml": "Docker Compose",
  "docker-compose.yaml": "Docker Compose",

  // Build tools
  Makefile: "Makefile",
  makefile: "Makefile",
  GNUmakefile: "Makefile",
  CMakeLists: "CMake",
  Rakefile: "Ruby",
  Gemfile: "Ruby",
  "Gemfile.lock": "Ruby",
  Podfile: "Ruby",
  "Podfile.lock": "Ruby",
  Fastfile: "Ruby",
  Appfile: "Ruby",
  Matchfile: "Ruby",
  Guardfile: "Ruby",
  Vagrantfile: "Ruby",
  Berksfile: "Ruby",
  Thorfile: "Ruby",
  Puppetfile: "Ruby",
  Brewfile: "Ruby",
  Buildfile: "Ruby",

  // Node.js
  "package.json": "JSON (npm)",
  "package-lock.json": "JSON (npm)",
  "yarn.lock": "YAML (Yarn)",
  "pnpm-lock.yaml": "YAML (pnpm)",
  "tsconfig.json": "JSON (TypeScript)",
  "jsconfig.json": "JSON (JavaScript)",
  ".npmrc": "npm Config",
  ".yarnrc": "Yarn Config",
  ".nvmrc": "nvm Config",

  // Python
  Pipfile: "TOML (Pipenv)",
  "Pipfile.lock": "JSON (Pipenv)",
  "pyproject.toml": "TOML (Python)",
  "setup.py": "Python",
  "setup.cfg": "INI (Python)",
  "requirements.txt": "Plain Text (pip)",
  "constraints.txt": "Plain Text (pip)",
  "tox.ini": "INI (tox)",
  ".python-version": "Plain Text",

  // CI/CD
  Jenkinsfile: "Groovy",
  ".travis.yml": "YAML (Travis CI)",
  ".gitlab-ci.yml": "YAML (GitLab CI)",
  "azure-pipelines.yml": "YAML (Azure)",
  "bitbucket-pipelines.yml": "YAML (Bitbucket)",
  "circle.yml": "YAML (CircleCI)",
  "appveyor.yml": "YAML (AppVeyor)",

  // Git
  ".gitignore": "Git Ignore",
  ".gitattributes": "Git Attributes",
  ".gitmodules": "Git Modules",
  ".gitkeep": "Git Keep",

  // Editors/IDE
  ".editorconfig": "EditorConfig",
  ".prettierrc": "JSON (Prettier)",
  ".prettierignore": "Prettier Ignore",
  ".eslintrc": "JSON (ESLint)",
  ".eslintignore": "ESLint Ignore",
  ".stylelintrc": "JSON (Stylelint)",
  ".babelrc": "JSON (Babel)",
  ".browserslistrc": "Browserslist",

  // Misc
  LICENSE: "License",
  "LICENSE.md": "License",
  "LICENSE.txt": "License",
  CHANGELOG: "Changelog",
  "CHANGELOG.md": "Changelog",
  README: "Readme",
  "README.md": "Readme",
  AUTHORS: "Authors",
  CONTRIBUTORS: "Contributors",
  CODEOWNERS: "GitHub CODEOWNERS",
  ".env": "Environment",
  ".env.local": "Environment",
  ".env.development": "Environment",
  ".env.production": "Environment",
  ".env.test": "Environment",
  ".env.example": "Environment",
  Procfile: "Procfile (Heroku)",
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Detects the programming language from a filename
 *
 * @param filename - The filename to detect language from
 * @returns The detected language name or 'Unknown'
 *
 * @example
 * ```typescript
 * detectLanguageFromFilename('app.ts') // Returns 'TypeScript'
 * detectLanguageFromFilename('Dockerfile') // Returns 'Dockerfile'
 * detectLanguageFromFilename('unknown.xyz') // Returns 'Unknown'
 * ```
 */
export function detectLanguageFromFilename(filename: string): string {
  if (!filename) {
    return "Unknown";
  }

  // Check exact filename matches first (Dockerfile, Makefile, etc.)
  const exactMatch = EXACT_FILENAME_MAP[filename];
  if (exactMatch) {
    return exactMatch;
  }

  // Also check the basename for exact matches (in case full path is passed)
  const basename = pathBasename(filename);
  const basenameMatch = EXACT_FILENAME_MAP[basename];
  if (basenameMatch) {
    return basenameMatch;
  }

  // Get the file extension
  const lastDotIndex = basename.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return "Unknown";
  }

  const extension = basename.slice(lastDotIndex).toLowerCase();

  // Check extension in language map
  const languageMatch = LANGUAGE_MAP[extension];
  if (languageMatch) {
    return languageMatch;
  }

  // Handle case-sensitive extensions (like .R)
  const originalExtension = basename.slice(lastDotIndex);
  const caseSensitiveMatch = LANGUAGE_MAP[originalExtension];
  if (caseSensitiveMatch) {
    return caseSensitiveMatch;
  }

  return "Unknown";
}

/**
 * Gets the lowercase language identifier for syntax highlighting
 *
 * @param filename - The filename to get language identifier from
 * @returns The lowercase language identifier suitable for syntax highlighting
 *
 * @example
 * ```typescript
 * getLanguageIdentifier('app.ts') // Returns 'typescript'
 * getLanguageIdentifier('Dockerfile') // Returns 'dockerfile'
 * ```
 */
export function getLanguageIdentifier(filename: string): string {
  const language = detectLanguageFromFilename(filename);

  // Convert display name to identifier
  return language
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, "") // Remove parenthetical content
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .trim();
}

/**
 * Checks if a file is a source code file based on its extension
 *
 * @param filename - The filename to check
 * @returns True if the file is a source code file
 */
export function isSourceCodeFile(filename: string): boolean {
  const language = detectLanguageFromFilename(filename);
  const nonCodeLanguages = [
    "Unknown",
    "Plain Text",
    "Log",
    "Environment",
    "Configuration",
    "Properties",
    "License",
    "Changelog",
    "Readme",
    "Authors",
    "Contributors",
    "Git Ignore",
    "Git Attributes",
    "Git Modules",
    "Git Keep",
  ];

  return !nonCodeLanguages.includes(language);
}

/**
 * Gets all supported file extensions
 *
 * @returns Array of all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(LANGUAGE_MAP);
}

/**
 * Gets all supported exact filenames
 *
 * @returns Array of all supported exact filenames
 */
export function getSupportedFilenames(): string[] {
  return Object.keys(EXACT_FILENAME_MAP);
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Type for the LANGUAGE_MAP object */
export type LanguageMap = typeof LANGUAGE_MAP;

/** Type for the EXACT_FILENAME_MAP object */
export type ExactFilenameMap = typeof EXACT_FILENAME_MAP;
