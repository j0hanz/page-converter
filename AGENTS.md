# AGENTS.md

A Next.js web app that converts public URLs into clean Markdown using MCP (Model Context Protocol). Users enter a URL, the app fetches and converts the page via `@j0hanz/fetch-url-mcp`, and displays rendered Markdown with metadata (title, description, author, dates, favicon).

## Tooling

- **Node**: >=24 (required by `engines`)
- **Manager**: npm
- **Framework**: Next.js 16 (App Router, React Compiler enabled), React 19, TypeScript 5
- **UI**: Material-UI 7 + Emotion, react-markdown + remark-gfm
- **Protocol**: @modelcontextprotocol/sdk (Stdio transport → `fetch-url` tool)
- **Testing**: Vitest 4 + React Testing Library + jsdom
- **Linting**: ESLint 10 (typescript-eslint, @next/eslint-plugin-next, unused-imports, de-morgan, depend) + Prettier

## Architecture

- **Flow**: Form → `POST /api/transform` → `transformUrl()` service → MCP client (`fetch-url`) → parse result → response
- **Response types**: Discriminated unions (`{ ok: true; result } | { ok: false; error }`) with type guards (`hasTransformResult`, `hasTransformError`)
- **Error handling**: `TransformError` with `code`, `message`, `retryable`, optional `statusCode`; factory functions (`createTransformError`, `createInternalError`, `createNetworkError`); MCP error codes mapped to app codes
- **Retry**: Service retries once on transient errors (transport timeout, connection, fetch failures); 4xx and validation errors fail immediately
- **Validation**: Whitelist-based (`url` only), protocol check (`http:` / `https:`), trimmed input, throws `ValidationError`
- **MCP result parsing**: Prefers `structuredContent`, falls back to `content[0].text` JSON parse; typed extraction helpers (`readString`, `readNumber`, `readBoolean`)

## Testing Strategy

- **Config**: `vitest.config.ts` — jsdom environment, glob `tests/**/*.test.{ts,tsx}`, `@` alias
- **Unit** (`tests/unit/`): Validation rules, MCP result parsing, error mapping, transform service (mocked MCP client via `vi.mock()`)
- **UI** (`tests/ui/`): Form submission, callbacks, disabled state; result panel, accordion states, copy, preview/code toggle, truncation warnings
- **Patterns**: Type guards narrow results before assertions; `waitFor` for async operations; coverage of success + error + retry paths

## Commands

| Task        | Command                                                                      | Notes                        |
| ----------- | ---------------------------------------------------------------------------- | ---------------------------- |
| Dev server  | `npm run dev`                                                                | `http://localhost:3000`      |
| Build       | `npm run build`                                                              | Production build (expensive) |
| Type-check  | `npm run type-check`                                                         | `tsc --noEmit`               |
| Lint        | `npm run lint`                                                               | ESLint                       |
| Test        | `npm run test`                                                               | `vitest run` (single pass)   |
| Test watch  | `npm run test:watch`                                                         | `vitest` (interactive)       |
| Format      | `npm run format`                                                             | `prettier --write .`         |
| File-scoped | `eslint --fix <file>` / `prettier --write <file>` / `vitest run <test-file>` |                              |

## Safety Boundaries

- **Always**: `npm run lint`, `npm run type-check`, `npm run test`
- **Ask First**: installing dependencies, deleting files, running full builds, `git push` / force push
- **Never**: commit or expose secrets; edit `.git`, `node_modules`, `.next`; change production config without approval

## Directory Overview

```text
.
├── app/                # Next.js App Router pages + API routes
│   ├── api/transform/  # POST /api/transform endpoint
│   ├── page.tsx        # Main page (URL form + result panel)
│   ├── layout.tsx      # Root layout (MUI theme, Geist fonts)
│   ├── error.tsx       # Route error boundary
│   ├── global-error.tsx# Global error boundary
│   └── loading.tsx     # Loading state
├── components/         # React UI components
│   ├── form.tsx        # URL input form (TransformForm)
│   ├── result.tsx      # Result panel with metadata + markdown
│   └── markdown-preview.tsx # GFM markdown renderer
├── lib/                # Business logic
│   ├── api/            # API handler (request → service → response)
│   ├── errors/         # TransformError type + factory functions
│   ├── mcp/            # MCP client (Stdio transport) + result parser
│   ├── transform/      # Transform service (orchestration + retry)
│   ├── validation/     # Request validation (URL whitelist)
│   └── theme.ts        # MUI theme (dark mode, Geist fonts)
├── tests/              # Vitest test suites
│   ├── unit/           # Service, validation, parsing, error tests
│   ├── ui/             # Component tests (form, result)
│   ├── integration/    # Integration tests
│   └── setup.ts        # Test setup (RTL cleanup)
├── .github/            # Agent configs, instructions, prompts
├── public/             # Static assets
└── memory_db/          # Local storage
```

## Navigation

- **Entry points**: `app/page.tsx` (UI), `app/api/transform/route.ts` (API)
- **Key configs**: `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `next.config.ts`
- **Path alias**: `@/*` → project root (in both tsconfig and vitest)

## Don'ts

- Don't bypass lint or type-check rules without approval.
- Don't ignore test failures.
- Don't hardcode secrets in code, tests, or config.
- Don't edit generated files (`.next`, `node_modules`, `next-env.d.ts`).
- Don't add dependencies without checking existing package manifests.
- Don't break the discriminated union response contract (`ok: true/false`).

## Change Checklist

1. Run `npm run format` to format code.
2. Run `npm run lint` to fix lint errors.
3. Run `npm run type-check` to verify types.
4. Run `npm run build` to ensure production build succeeds.
5. Run `npm run test` to ensure tests pass.
