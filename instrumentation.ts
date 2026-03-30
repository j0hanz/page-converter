import type { Instrumentation } from 'next';

const LOG_PREFIX = '[fetch-url]';
const INIT_MESSAGE = `${LOG_PREFIX} Next.js server initializing...`;
const REQUEST_ERROR_TYPE = 'next-request-error';

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  console.log(INIT_MESSAGE);
}

export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context
) => {
  const errorRecord = readRecord(error);
  const requestRecord = readRecord(request);
  const contextRecord = readRecord(context);

  console.error(
    JSON.stringify({
      type: REQUEST_ERROR_TYPE,
      digest: readString(errorRecord?.digest),
      message: readString(errorRecord?.message) ?? 'Unknown request error',
      method: readString(requestRecord?.method),
      path: readString(requestRecord?.path),
      routePath: readString(contextRecord?.routePath),
      routeType: readString(contextRecord?.routeType),
      routerKind: readString(contextRecord?.routerKind),
      renderSource: readString(contextRecord?.renderSource),
      revalidateReason: readString(contextRecord?.revalidateReason),
    })
  );
};
