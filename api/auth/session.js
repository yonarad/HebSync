import { createCsrfToken, getSessionTokenFromRequest, requireSession } from '../_lib/auth.js';
import { json } from '../_lib/response.js';

export async function GET(request) {
  const sessionToken = getSessionTokenFromRequest(request);

  if (!sessionToken) {
    return json({ authenticated: false }, { status: 401 });
  }

  const session = await requireSession(request);
  if (!session) {
    return json({ authenticated: false }, { status: 401 });
  }

  return json({
    authenticated: true,
    user: {
      scopeMode: session.scope_mode,
      csrfToken: createCsrfToken(sessionToken),
    },
  });
}
