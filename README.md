# Fetch URL

🔗 **[Try it out](https://fetch-url-client.vercel.app)**

Fetch URL is a Next.js web client for [`@j0hanz/fetch-url-mcp`](https://github.com/j0hanz/fetch-url-mcp). Paste in a public web page, and the app returns a cleaner Markdown version you can preview in the browser, copy to the clipboard, or download as a `.md` file.

## Why This Project Exists

Copying content straight from the web usually brings along everything you did not want: navigation, banners, repeated chrome, and formatting noise. Fetch URL keeps the useful content and gives you a Markdown result that is easier to read, save, quote, or reuse in notes and AI workflows.

## What You Get

- Clean Markdown generated from a single public URL
- Preview markdown and syntax-highlighted code blocks in the browser
- Copy the result to clipboard or download as a `.md` file

## How It Works

```text
Browser
  -> POST /api/transform
  -> Next.js route handler (Node.js runtime)
  -> MCP client over stdio
  -> @j0hanz/fetch-url-mcp
  -> fetch-url tool result
  -> NDJSON progress + final result stream
  -> preview, copy, or download in the UI
```

The homepage is server-first. [`app/layout.tsx`](app/layout.tsx) reads static Markdown content from [`content/`](content/) for the About dialog, while [`app/page.tsx`](app/page.tsx) renders the main page shell and interactive client UI. The request flow itself lives across a small set of focused modules:

| Area                                                                         | Responsibility                                                                        |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`app/layout.tsx`](app/layout.tsx)                                           | Loads the About / How It Works content on the server and wires shared page chrome     |
| [`app/page.tsx`](app/page.tsx)                                               | Renders homepage metadata and the interactive client surface                          |
| [`components/features/home-client.tsx`](components/features/home-client.tsx) | Owns the client-side interaction states: idle, loading, error, and result             |
| [`components/features/form.tsx`](components/features/form.tsx)               | Collects a single public URL and submits it through a form action                     |
| [`app/api/transform/route.ts`](app/api/transform/route.ts)                   | Validates input, runs the transform, and returns streamed NDJSON events               |
| [`lib/transform.ts`](lib/transform.ts)                                       | Handles transform execution and retries retryable transport failures once             |
| [`lib/mcp.ts`](lib/mcp.ts)                                                   | Manages the MCP client lifecycle, stdio transport, tool discovery, and result parsing |
| [`components/features/result.tsx`](components/features/result.tsx)           | Shows the rendered result, raw Markdown, copy/download actions, and result details    |

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- MUI 7 with Emotion and `@mui/material-nextjs`
- `react-markdown` with `remark-gfm`
- `@modelcontextprotocol/sdk`
- `@j0hanz/fetch-url-mcp`
- Vitest and Testing Library

The repo also enables the React Compiler in [`next.config.ts`](next.config.ts) and includes the fetch-url MCP package tree in output tracing for [`/api/transform`](app/api/transform/route.ts).

## Getting Started

### Requirements

- Node.js `>=24`
- npm

### Install

```bash
npm install
```

### Run the App

```bash
npm run dev
```

Then open `http://localhost:3000`.

No separate MCP server setup is needed for local development. The app launches `@j0hanz/fetch-url-mcp` from the installed dependency tree and communicates with it over stdio.

## API

The browser submits conversion requests to `POST /api/transform`.

### Request body

```json
{
  "url": "https://example.com"
}
```

### Validation rules

- The body must be a JSON object
- Only the `url` field is accepted
- `url` must be a non-empty string
- `url` must use the `http:` or `https:` scheme
- Bodies larger than `4096` bytes are rejected

### Success response

Successful requests stream newline-delimited JSON with progress events followed by a final result event:

```json
{"type":"progress","progress":2,"total":8,"message":"Fetching page"}
{"type":"result","ok":true,"result":{"url":"https://example.com","markdown":"# Example","metadata":{},"fetchedAt":"2026-03-11T00:00:00.000Z","contentSize":9,"truncated":false}}
```

### Error response

Validation failures return JSON with HTTP `400`. Transport and upstream failures are mapped to structured errors such as `FETCH_ERROR`, `HTTP_ERROR`, `ABORTED`, `QUEUE_FULL`, or `INTERNAL_ERROR`.

Example:

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid JSON body.",
    "retryable": false
  }
}
```

## Environment

Site metadata resolves its base URL from these environment variables, in this order:

| Variable                        | Purpose                     |
| ------------------------------- | --------------------------- |
| `NEXT_PUBLIC_APP_URL`           | Preferred public app URL    |
| `SITE_URL`                      | Alternate explicit site URL |
| `VERCEL_PROJECT_PRODUCTION_URL` | Vercel production hostname  |
| `VERCEL_URL`                    | Vercel deployment hostname  |

If none are set, or if the value is invalid, the app falls back to `http://localhost:3000`.

## Development

### Scripts

| Command              | Purpose                                 |
| -------------------- | --------------------------------------- |
| `npm run dev`        | Start the Next.js development server    |
| `npm run build`      | Build the app for production            |
| `npm run start`      | Start the production server             |
| `npm run lint`       | Run ESLint                              |
| `npm run type-check` | Run TypeScript checks                   |
| `npm run test`       | Run the Vitest suite                    |
| `npm run test:watch` | Run Vitest in watch mode                |
| `npm run format`     | Format the repo with Prettier           |
| `npm run knip`       | Check for unused files and dependencies |

### Test coverage

The test suite covers:

- request parsing and validation
- transform result parsing and error mapping
- MCP transport lifecycle and retry behavior
- route-level streaming behavior
- edge security header behavior
- form submission, preview rendering, and result interactions

## Project Layout

```text
.
├── app/                 # App Router entrypoints and API routes
├── components/          # Feature components and shared UI primitives
├── content/             # Server-read markdown content shown in the app
├── hooks/               # Client hooks for transform, preview, and feedback state
├── lib/                 # API contracts, validation, MCP integration, theming, site helpers
├── public/              # Static assets
├── tests/               # Unit, UI, and integration tests
├── next.config.ts       # React Compiler + output tracing config
└── package.json         # Scripts, runtime requirements, and dependencies
```

## Related Repositories

- Server implementation: [`j0hanz/fetch-url-mcp`](https://github.com/j0hanz/fetch-url-mcp)
- Web app repository: [`j0hanz/fetch-url`](https://github.com/j0hanz/fetch-url)

## License

MIT License. See [LICENSE](LICENSE) for details.
