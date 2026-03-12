# AGENTS.md

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Tooling

- **Manager**: npm
- **Frameworks**: react, next, typescript, vitest, eslint, @modelcontextprotocol/sdk, @emotion/react, @mui/material

## Architecture

- API layer, App Router, Component-based

## Testing Strategy

- Config: vitest.config.ts, Dedicated test directory, Integration test directory, 6 test files found

## Commands

- **Dev**: `npm run dev`
- **Test**: `npm run test`
- **Lint**: `npm run lint`
- **Deploy**: N/A

## Safety Boundaries

- **Always**: `npm run lint`, `npm run type-check`, `npm run test`
- **Ask First**: `installing dependencies`, `deleting files`, `running full builds or e2e suites`, `database/schema migrations`, `deploy or infrastructure changes`, `git push / force push`, `npm run build`
- **Never**: Never read or exfiltrate secrets or credentials.; Never edit generated files like `.git` manually.; commit or expose secrets/credentials; edit vendor/generated directories; change production config without approval

## Directory Overview

```text
.
├── .github/            # CI/workflows and repo automation
├── .vscode/
├── app/
├── components/
├── lib/
├── memory_db/
├── public/
├── tests/              # test suites
├── AGENTS.md           # agent guidance
├── eslint.config.mjs   # lint config
├── package.json        # scripts and dependencies
├── README.md           # usage and setup docs
└── tsconfig.json       # TypeScript config
```

## Navigation

- **Entry Points**: `package.json`, `README.md`
- **Key Configs**: `tsconfig.json`, `vitest.config.ts`

## Don'ts

- Don't bypass existing lint/type rules without approval.
- Don't ignore test failures in CI.
- Don't use unapproved third-party packages without checking package manager manifests.
- Don't hardcode secrets or sensitive info in code, tests, docs, or config.
- Don't edit generated files directly.

## Change Checklist

1. Run `npm run lint` to fix lint errors.
2. Run `npm run type-check` to verify types.
3. Run `npm run test` to ensure tests pass.
4. Run `npm run format` to format code.
