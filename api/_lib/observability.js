import { randomUUID } from 'node:crypto';

const generatedRequestIds = new WeakMap();

function writeLog(level, payload) {
  const serialized = JSON.stringify(payload);
  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  } else {
    console.log(serialized);
  }
}

function getRequestId(request) {
  const platformRequestId = request.headers.get('x-vercel-id');
  if (platformRequestId) return platformRequestId;

  if (!generatedRequestIds.has(request)) {
    generatedRequestIds.set(request, randomUUID());
  }
  return generatedRequestIds.get(request);
}

function getCompletionLevel(status) {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}

export function withRequestLogging(route, handler) {
  return async function loggedHandler(request) {
    const startedAt = performance.now();
    const requestId = getRequestId(request);
    const context = {
      route,
      method: request.method,
      requestId,
    };

    writeLog('info', {
      level: 'info',
      event: 'request.started',
      ...context,
    });

    try {
      const response = await handler(request);
      const level = getCompletionLevel(response.status);
      writeLog(level, {
        level,
        event: 'request.completed',
        ...context,
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
      });
      return response;
    } catch (error) {
      writeLog('error', {
        level: 'error',
        event: 'request.failed',
        ...context,
        durationMs: Math.round(performance.now() - startedAt),
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      throw error;
    }
  };
}

export function logRequestWarning(route, event, request) {
  writeLog('warn', {
    level: 'warn',
    event,
    route,
    method: request.method,
    requestId: getRequestId(request),
  });
}
