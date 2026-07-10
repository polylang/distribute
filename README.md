# @wpsyntex/distribute

[![Unit Tests](https://github.com/polylang/distribute/actions/workflows/unit-tests.yml/badge.svg)](https://github.com/polylang/distribute/actions/workflows/unit-tests.yml)
[![ESLint](https://github.com/polylang/distribute/actions/workflows/eslint.yml/badge.svg)](https://github.com/polylang/distribute/actions/workflows/eslint.yml)

Build WordPress plugin or theme distribution ZIPs from a consumer project root.

## Requirements

- Node.js >= 18.12.0
- `rsync` and `zip` on the PATH
- Composer and git are optional (only needed when the consumer project uses them)

## Install

```bash
npm install -D @wpsyntex/distribute
```

## Usage

```bash
npx distribute [options]
```

### Options

```
--mode <production|dev>     Default: production
--version <strategy|text>   Default: commit (strategies: commit, tag, or a literal version)
--output <path>             Output directory or ZIP file (default: {cwd}/dist)
--slug <name>               Override slug (default: from package.json name)
--tmp-dir <path>            Temp working directory (default: {cwd}/.distribute-tmp)
--sequential                Run composer then npm (default: parallel when both apply)
--npm-cmd <script>          Override npm script (default: build or build:dev per mode)
--cwd <path>                Project root (default: process.cwd())
-h, --help
```

## Consumer setup

- Add a `.distignore` file at the project root (required).
- Add `composer.json` only if the project needs a Composer install step.
- Add `package.json` scripts `build` and/or `build:dev` only if the project needs an NPM build step.

The tool runs against the consumer project root (`process.cwd()` by default). Composer and NPM steps are auto-detected and skipped when the corresponding manifest is missing.

### Parallel vs sequential builds

When both Composer and NPM steps apply, they run **in parallel** by default. Use `--sequential` when the NPM build depends on Composer output (for example, when `vendor/` must exist before `npm run build`).

```bash
npx distribute --sequential
```

## Verify distribution

After building a ZIP, verify its contents against a `dist-manifest.json` file at the project root:

```bash
npx distribute
npx verify-dist --zip dist/my-plugin-abc1234.zip
```

### dist-manifest.json

List expected paths relative to the plugin folder inside the ZIP:

```json
{
  "files": [
    "my-plugin.php",
    "readme.txt",
    "src/",
    "js/build/*.js"
  ]
}
```

| Entry | Meaning |
|-------|---------|
| `plugin.php` | Exact file (required) |
| `src/` | Any file under `src/` (at least one required) |
| `js/build/*.js` | Glob pattern (at least one match required) |

Failures:

- **Unexpected files** — not covered by the manifest (often a `.distignore` leak).
- **Unsatisfied entries** — required file, directory, or glob missing from the ZIP.

### verify-dist options

```
--zip <path>        Path to distribution ZIP (required)
--manifest <path>   Path to dist-manifest.json (default: {cwd}/dist-manifest.json)
--tmp-dir <path>    Temp working directory (default: {cwd}/tmp)
--cwd <path>        Consumer project root (default: process.cwd())
-h, --help
```

## Development

```bash
git clone https://github.com/polylang/distribute.git
cd distribute
npm install
```

Run the CLI from the repo:

```bash
node bin/distribute.js --help
```

Scripts:

```bash
npm run test:unit     # Jest unit tests
npm run test:coverage # Jest unit tests with coverage report
npm run test:smoke    # Polylang distribution smoke test
npm run lint          # ESLint
```

## License

GPL-3.0-or-later
