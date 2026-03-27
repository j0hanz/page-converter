export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[fetch-url] Next.js server initializing...');
    try {
      // Just resolving to ensure it's available
      require.resolve('@j0hanz/fetch-url-mcp');
      console.log('[fetch-url] MCP transport resolved successfully.');
    } catch (err) {
      console.warn(
        '[fetch-url] MCP transport resolution failed during init. This may cause runtime errors.',
        err
      );
    }
  }
}
