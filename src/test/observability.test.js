import { afterEach, describe, expect, it, vi } from 'vitest';
import { logRequestWarning, withRequestLogging } from '../../api/_lib/observability.js';

function parseLog(spy, index = 0) {
  return JSON.parse(spy.mock.calls[index][0]);
}

describe('withRequestLogging', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs a request lifecycle and preserves the response', async () => {
    const info = vi.spyOn(console, 'log').mockImplementation(() => {});
    const request = new Request('https://example.com/api/example?secret=query-value', {
      method: 'POST',
      headers: {
        authorization: 'Bearer secret-token',
        cookie: 'session=secret-cookie',
        'x-vercel-id': 'iad1::request-123',
      },
      body: JSON.stringify({ title: 'private-event-title' }),
    });
    const expected = new Response('created', { status: 201 });
    const handler = withRequestLogging('/api/example', async () => expected);

    const actual = await handler(request);

    expect(actual).toBe(expected);
    expect(parseLog(info)).toEqual({
      level: 'info',
      event: 'request.started',
      route: '/api/example',
      method: 'POST',
      requestId: 'iad1::request-123',
    });
    expect(parseLog(info, 1)).toMatchObject({
      level: 'info',
      event: 'request.completed',
      route: '/api/example',
      method: 'POST',
      requestId: 'iad1::request-123',
      status: 201,
    });
    expect(parseLog(info, 1).durationMs).toEqual(expect.any(Number));

    const output = info.mock.calls.flat().join(' ');
    expect(output).not.toContain('query-value');
    expect(output).not.toContain('secret-token');
    expect(output).not.toContain('secret-cookie');
    expect(output).not.toContain('private-event-title');
  });

  it.each([
    [401, 'warn'],
    [503, 'error'],
  ])('uses the appropriate log level for status %s', async (status, level) => {
    const info = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = withRequestLogging('/api/example', async () => new Response(null, { status }));

    await handler(new Request('https://example.com/api/example'));

    const completionSpy = level === 'warn' ? warn : error;
    expect(parseLog(completionSpy)).toMatchObject({
      level,
      event: 'request.completed',
      status,
    });
    expect(info).toHaveBeenCalledTimes(1);
  });

  it('logs a safe failure record and rethrows the original error', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const originalError = new Error('private failure details');
    const handler = withRequestLogging('/api/example', async () => {
      throw originalError;
    });

    await expect(handler(new Request('https://example.com/api/example'))).rejects.toBe(originalError);

    expect(parseLog(errorLog)).toMatchObject({
      level: 'error',
      event: 'request.failed',
      route: '/api/example',
      errorName: 'Error',
    });
    expect(errorLog.mock.calls.flat().join(' ')).not.toContain('private failure details');
  });

  it('correlates safe warning events with the request lifecycle', async () => {
    const info = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const request = new Request('https://example.com/api/example?secret=value');
    const handler = withRequestLogging('/api/example', async (currentRequest) => {
      logRequestWarning('/api/example', 'provider.failed', currentRequest);
      return new Response(null, { status: 204 });
    });

    await handler(request);

    const requestId = parseLog(info).requestId;
    expect(parseLog(warn)).toEqual({
      level: 'warn',
      event: 'provider.failed',
      route: '/api/example',
      method: 'GET',
      requestId,
    });
    expect(warn.mock.calls.flat().join(' ')).not.toContain('secret=value');
  });
});
