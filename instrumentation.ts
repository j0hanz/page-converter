const LOG_PREFIX = '[fetch-url]';
const INIT_MESSAGE = `${LOG_PREFIX} Next.js server initializing...`;
const RESOLVED_MESSAGE = `${LOG_PREFIX} MCP transport resolved successfully.`;
const RESOLUTION_WARNING = `${LOG_PREFIX} MCP transport resolution failed during init. This may cause runtime errors.`;

function verifyTransportResolution(): void {
  try {
    // Just resolving to ensure it's available.
    require.resolve('@j0hanz/fetch-url-mcp');
    console.log(RESOLVED_MESSAGE);
  } catch (error) {
    console.warn(RESOLUTION_WARNING, error);
  }
}

export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  console.log(INIT_MESSAGE);
  verifyTransportResolution();
}
