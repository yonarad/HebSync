import { requireSession } from '../_lib/auth.js';
import { authorizedGoogleFetch, googleApiErrorResponse } from '../_lib/google-calendar.js';
import { json } from '../_lib/response.js';

export async function GET(request) {
  const session = await requireSession(request);
  if (!session) {
    return json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const response = await authorizedGoogleFetch(
      session,
      'https://www.googleapis.com/calendar/v3/colors',
      {},
      'Failed to fetch Google calendar colors',
    );

    return json(await response.json());
  } catch (error) {
    console.error('Failed to fetch Google calendar colors:', error);
    return googleApiErrorResponse(error, 'Failed to fetch Google calendar colors');
  }
}
