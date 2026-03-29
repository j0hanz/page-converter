# AGENTS.md

Fetch URL is a Next.js web client for [`@j0hanz/fetch-url-mcp`](https://github.com/j0hanz/fetch-url-mcp). It turns public web pages into clean Markdown with live progress, an in-app preview, one-click copy, and Markdown downloads.

## Tooling

- **Manager**: npm
- **Runtime**: Node.js `>=24`
- **Core Stack**: Next.js 16 App Router, React 19, TypeScript 5
- **UI**: MUI 7 with Emotion, `@mui/material-nextjs` App Router cache provider, Geist variable fonts
- **Content Rendering**: `react-markdown` with `remark-gfm`
- **MCP Integration**: `@modelcontextprotocol/sdk` client + `@j0hanz/fetch-url-mcp` stdio transport
- **Quality Tooling**: ESLint flat config (`@eslint/js`, `typescript-eslint`, `@next/next` core-web-vitals, `unused-imports`, `de-morgan`, `depend`), Prettier + `@trivago/prettier-plugin-sort-imports`, Knip
- **Build Flags**: React Compiler enabled in `next.config.ts`; output tracing explicitly includes the fetch-url MCP package tree for `/api/transform`
- **Testing Tooling**: Vitest 4, `@vitejs/plugin-react`, Testing Library, `@testing-library/user-event`, jsdom

## Architecture

- **Rendering Model**: App Router with server-first entrypoints in `app/layout.tsx` and `app/page.tsx`
- **Home Page Flow**: `app/layout.tsx` reads static markdown content from `content/` for the About dialog, while `app/page.tsx` renders the homepage shell and hands interaction off to the client
- **Client State Boundary**: `components/features/home-client.tsx` owns form submission, request cancellation, streamed progress state, error display, and final result rendering
- **API Layer**: `app/api/transform/route.ts` runs on the Node.js runtime, validates JSON input, and returns either JSON errors or streamed NDJSON progress/result events
- **Service Layer**: `lib/transform.ts` handles retry behavior and transport-level error mapping before returning normalized API responses
- **MCP Transport Layer**: `lib/mcp.ts` manages MCP client lifecycle, stdio transport creation, tool discovery, reconnect/reset behavior, and fetch-url tool invocation
- **Shared Contracts**: `lib/api.ts` and `lib/validate.ts` centralize request validation, response typing, stream event helpers, and error construction
- **Presentation Layer**: MUI theming is wired through `lib/theme-provider.tsx`, with route metadata, sitemap/robots assets, and social image generation kept under `app/` and `lib/`

## Testing Strategy

- **Runner Config**: `vitest.config.ts` uses `@vitejs/plugin-react`, the `@` path alias, `tests/setup.ts`, and a default `node` environment
- **Test Layout**: `tests/unit` covers service, transport, parsing, site helpers, logging, and proxy behavior; `tests/ui` covers rendered component behavior; `tests/integration` covers route-level streaming
- **UI Test Pattern**: UI specs opt into `// @vitest-environment jsdom` per file and use Testing Library plus shared helpers from `tests/setup.ts`
- **Mocking Strategy**: Unit tests mock MCP SDK clients/transports and network boundaries to verify retry logic, connection lifecycle, abort handling, and error mapping without starting external processes
- **Current Footprint**: 15 test files total, split across 9 unit tests, 5 UI tests, and 1 integration test
- **Behavior Under Test**: form submission, streamed progress transitions, result/error presentation, MCP transport lifecycle, request parsing, transform retries, and site metadata helpers

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
├── app/
├── assets/
├── components/
├── content/
├── hooks/
├── lib/
├── public/
├── tests/              # test suites
├── .prettierignore     # formatter config
├── .prettierrc         # formatter config
├── eslint.config.mjs   # lint config
├── package.json        # scripts and dependencies
├── README.md           # usage and setup docs
└── tsconfig.json       # TypeScript config
```

## Navigation

- **Entry Points**: `package.json`, `README.md`
- **Key Configs**: `.prettierrc`, `tsconfig.json`, `vitest.config.ts`

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
