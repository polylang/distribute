# @wpsyntex/distribute

Build WordPress plugin distribution ZIPs from a consumer project root.

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
npx distribute
```

Common flags:

```bash
npx distribute --mode dev
npx distribute --version tag
npx distribute --output ./artifacts
npx distribute --npm-cmd build:staging
npx distribute --sequential
```

Add a script to the consumer `package.json`:

```json
{
  "scripts": {
    "dist": "distribute"
  }
}
```

Then run:

```bash
npm run dist
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

## CI

For GitHub Actions, use the composite action in [`polylang/actions`](https://github.com/polylang/actions) (`distribute`).

## License

GPL-3.0-or-later
