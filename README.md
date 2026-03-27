# Fetch URL

Fetch URL is a Next.js web client for [`@j0hanz/fetch-url-mcp`](https://github.com/j0hanz/fetch-url-mcp). It turns public web pages into clean Markdown with live progress, an in-app preview, one-click copy, and Markdown downloads.

Unlike the server repo, this codebase does not expose an MCP server surface. It embeds an MCP client inside a web app and calls the `fetch-url` tool over stdio on the server side.

## Overview

- Built with Next.js App Router, React 19, TypeScript, and Material UI.
- Uses `@modelcontextprotocol/sdk` to connect to `@j0hanz/fetch-url-mcp`.
- Streams progress from the server to the browser as NDJSON.
- Renders Markdown with GitHub-flavored Markdown support via `react-markdown` and `remark-gfm`.

## How It Works

```text
Browser UI
  -> POST /api/transform
  -> Next.js route handler
  -> MCP client over stdio
  -> fetch-url-mcp binary from node_modules/.bin
  -> fetch-url tool result
  -> streamed progress + final result back to the UI
```

Core flow:

- [`components/form.tsx`](components/form.tsx) submits a single public URL to [`app/api/transform/route.ts`](app/api/transform/route.ts).
- [`app/api/transform/route.ts`](app/api/transform/route.ts) validates the request, runs the transform, and streams progress/result events.
- [`lib/transform.ts`](lib/transform.ts) calls the MCP layer and retries retryable transport failures once.
- [`lib/mcp.ts`](lib/mcp.ts) creates a stdio MCP client and invokes the `fetch-url` tool from `@j0hanz/fetch-url-mcp`.
- [`components/result.tsx`](components/result.tsx) lets the user preview, copy, or download the Markdown result.

## Getting Started

### Requirements

- Node.js `>=24`
- npm

### Install and Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

No separate MCP server setup is required for local development because `@j0hanz/fetch-url-mcp` is installed as an app dependency and launched through the local `node_modules/.bin` executable.

## API

### `POST /api/transform`

Request body:

```json
{
  "url": "https://example.com"
}
```

Rules:

- Only the `url` field is accepted.
- `url` must be a non-empty `http` or `https` URL.
- Request bodies larger than `4096` bytes are rejected.

Successful responses are streamed as NDJSON:

```json
{"type":"progress","progress":2,"total":8,"message":"Fetching page"}
{"type":"result","ok":true,"result":{"url":"https://example.com","markdown":"# Example","metadata":{},"fetchedAt":"2026-03-11T00:00:00.000Z","contentSize":9,"truncated":false}}
```

Validation failures return JSON with HTTP `400`, for example:

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

## Development

Main commands:

| Command              | Purpose                       |
| -------------------- | ----------------------------- |
| `npm run dev`        | Start the Next.js dev server  |
| `npm run lint`       | Run ESLint                    |
| `npm run type-check` | Run TypeScript checks         |
| `npm run test`       | Run Vitest suites             |
| `npm run format`     | Format the repo with Prettier |

Test coverage in this repo focuses on:

- request validation and route behavior
- MCP result parsing and error mapping
- retry behavior around MCP transport failures
- form submission, progress handling, cancel flow, and result rendering

## Deployment Notes

Site metadata resolves its base URL from these environment variables, in this order:

1. `NEXT_PUBLIC_APP_URL`
2. `SITE_URL`
3. `VERCEL_PROJECT_PRODUCTION_URL`
4. `VERCEL_URL`

If none are set or the value is invalid, the app falls back to `http://localhost:3000`.

## Related Repositories

- Server reference: [`j0hanz/fetch-url-mcp`](https://github.com/j0hanz/fetch-url-mcp)
- Client app: [`j0hanz/fetch-url`](https://github.com/j0hanz/fetch-url)
