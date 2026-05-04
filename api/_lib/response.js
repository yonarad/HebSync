export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), {
    ...init,
    headers,
  });
}

export function redirect(url, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('Location', url);

  return new Response(null, {
    status: 302,
    ...init,
    headers,
  });
}
