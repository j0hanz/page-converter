import { EventEmitter } from 'node:events';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

interface Deferred<T> {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: T | PromiseLike<T>) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, reject, resolve };
}

async function loadMcpModuleWithMocks(options?: {
  connectDeferred?: Deferred<void>;
}) {
  vi.resetModules();

  const clients: FakeClient[] = [];
  const transports: FakeTransport[] = [];
  const connectDeferred = options?.connectDeferred;
  const SdkErrorCode = {
    ConnectionClosed: 'CONNECTION_CLOSED',
    RequestTimeout: 'REQUEST_TIMEOUT',
    NotConnected: 'NOT_CONNECTED',
  };
  const ProtocolErrorCode = {
    InternalError: -32603,
    MethodNotFound: -32601,
  };

  class FakeSdkError extends Error {
    code: string;
    data?: unknown;

    constructor(code: string, message: string, data?: unknown) {
      super(message);
      this.name = 'SdkError';
      this.code = code;
      this.data = data;
    }
  }

  class FakeProtocolError extends Error {
    code: number;
    data?: unknown;

    constructor(code: number, message: string, data?: unknown) {
      super(message);
      this.name = 'ProtocolError';
      this.code = code;
      this.data = data;
    }
  }

  class FakeTransport {
    close = vi.fn().mockResolvedValue(undefined);
    options: { args: string[]; command: string; stderr: 'pipe' };
    stderr = new EventEmitter();

    constructor(options: { args: string[]; command: string; stderr: 'pipe' }) {
      this.options = options;
      transports.push(this);
    }
  }

  class FakeClient {
    callTool = vi.fn().mockResolvedValue({ content: [] });
    close = vi.fn().mockResolvedValue(undefined);
    connect = vi.fn(async () => {
      await connectDeferred?.promise;
    });
    listTools = vi.fn().mockResolvedValue({ tools: [{ name: 'fetch-url' }] });
    onclose?: () => void;
    onerror?: () => void;

    constructor(_clientInfo: unknown) {
      clients.push(this);
    }
  }

  vi.doMock('@modelcontextprotocol/client', () => ({
    Client: FakeClient,
    StdioClientTransport: FakeTransport,
    SdkError: FakeSdkError,
    SdkErrorCode,
    ProtocolError: FakeProtocolError,
    ProtocolErrorCode,
  }));

  const mcpModule = await import('@/lib/mcp');
  await mcpModule.resetMcpRuntimeStateForTests();

  return {
    ...mcpModule,
    SdkErrorCode,
    ProtocolErrorCode,
    FakeSdkError,
    FakeProtocolError,
    clients,
    transports,
  };
}

afterEach(async () => {
  try {
    const mcpModule = await import('@/lib/mcp');
    await mcpModule.resetMcpRuntimeStateForTests();
  } catch {
    // Ignore import/reset failures caused by mocked module teardown.
  }

  vi.resetModules();
});

describe('getFetchUrlTransportConfig', () => {
  it('launches the fetch-url MCP entrypoint through the current Node binary', async () => {
    const { getFetchUrlTransportConfig, resolveFetchUrlPackageRoot } =
      await import('@/lib/mcp');
    const transport = getFetchUrlTransportConfig(process.cwd());

    expect(transport.command).toBe(process.execPath);
    expect(transport.args).toEqual([
      path.join(resolveFetchUrlPackageRoot(process.cwd()), 'dist', 'index.js'),
    ]);
  });
});

describe('callFetchUrl runtime lifecycle', () => {
  it('shares one connection attempt across concurrent callers', async () => {
    const connectDeferred = createDeferred<void>();
    const { callFetchUrl, clients, transports } = await loadMcpModuleWithMocks({
      connectDeferred,
    });

    const firstCall = callFetchUrl({ url: 'https://example.com/one' });
    const secondCall = callFetchUrl({ url: 'https://example.com/two' });

    expect(clients).toHaveLength(1);
    expect(clients[0]?.connect).toHaveBeenCalledTimes(1);
    expect(transports).toHaveLength(1);

    connectDeferred.resolve();

    await Promise.all([firstCall, secondCall]);

    expect(clients[0]?.callTool).toHaveBeenCalledTimes(2);
  });

  it('resets the runtime instance after a connection-closed error', async () => {
    const { SdkErrorCode, FakeSdkError, callFetchUrl, clients } =
      await loadMcpModuleWithMocks();

    await callFetchUrl({ url: 'https://example.com' });

    clients[0]?.callTool.mockRejectedValueOnce(
      new FakeSdkError(SdkErrorCode.ConnectionClosed, 'Connection closed')
    );

    await expect(
      callFetchUrl({ url: 'https://example.com/retry' })
    ).rejects.toMatchObject({
      code: SdkErrorCode.ConnectionClosed,
      message: 'Connection closed',
    });

    await callFetchUrl({ url: 'https://example.com/recovered' });

    expect(clients[0]?.close).toHaveBeenCalled();
    expect(clients).toHaveLength(2);
    expect(clients[1]?.connect).toHaveBeenCalledTimes(1);
    expect(clients[0]?.listTools).toHaveBeenCalledTimes(1);
    expect(clients[1]?.listTools).not.toHaveBeenCalled();
  });

  it('ignores stale lifecycle callbacks from a replaced client', async () => {
    const { SdkErrorCode, FakeSdkError, callFetchUrl, clients } =
      await loadMcpModuleWithMocks();

    await callFetchUrl({ url: 'https://example.com' });

    clients[0]?.callTool.mockRejectedValueOnce(
      new FakeSdkError(SdkErrorCode.ConnectionClosed, 'Connection closed')
    );

    await expect(
      callFetchUrl({ url: 'https://example.com/retry' })
    ).rejects.toMatchObject({
      code: SdkErrorCode.ConnectionClosed,
      message: 'Connection closed',
    });

    await callFetchUrl({ url: 'https://example.com/recovered' });

    clients[0]?.onclose?.();

    await callFetchUrl({ url: 'https://example.com/still-active' });

    expect(clients).toHaveLength(2);
    expect(clients[1]?.close).not.toHaveBeenCalled();
    expect(clients[1]?.callTool).toHaveBeenCalledTimes(2);
  });
});
