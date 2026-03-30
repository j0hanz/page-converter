const LOG_PREFIX = '[fetch-url]';
const INIT_MESSAGE = `${LOG_PREFIX} Next.js server initializing...`;

export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  console.log(INIT_MESSAGE);
}
