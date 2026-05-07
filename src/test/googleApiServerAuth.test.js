import { describe, expect, it } from 'vitest';
import { googleApiErrorResponse } from '../../api/_lib/google-calendar.js';

describe('googleApiErrorResponse', () => {
  it('maps auth expiration to a 401 response with AUTH_EXPIRED code', async () => {
    const error = new Error('Request had invalid authentication credentials.');
    error.code = 'AUTH_EXPIRED';
    error.status = 401;

    const response = googleApiErrorResponse(error, 'Fallback');
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.code).toBe('AUTH_EXPIRED');
    expect(body.error).toContain('invalid authentication credentials');
  });

  it('keeps non-auth errors as 500 responses', async () => {
    const response = googleApiErrorResponse(new Error('boom'), 'Fallback');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('boom');
  });
});
