# HebSync Handoff

Date: 2026-08-05

## Current State

HebSync is a Vite + React app for syncing Hebrew-date events with Google Calendar. The app has moved from browser-held Google tokens to a server-backed OAuth model.

Current auth/data flow:

- Google OAuth starts at `/api/auth/google/start` and returns through `/api/auth/google/callback`.
- Sessions are stored server-side and referenced by `HttpOnly` cookies.
- Google refresh tokens are encrypted before database storage.
- Frontend Google Calendar operations call `/api/google/*` routes.
- Non-read server calls use CSRF protection through `authorizedFetch()`.

## Verified Baseline

Last verified locally:

- `npm run typecheck` passed.
- `npm test` passed with 25 test files and 231 tests.
- `git status --short` was clean before this documentation update.

## Important Files

- `src/utils/googleApiCore.ts`: auth/session helpers and `authorizedFetch()`.
- `src/utils/googleApiEvents.ts`: frontend calendar/event API wrapper functions.
- `api/_lib/google.js`: token exchange, token refresh, encrypted token storage.
- `api/_lib/google-calendar.js`: authorized Google API fetch helper.
- `api/auth/google/start.js`: OAuth start route.
- `api/auth/google/callback.js`: OAuth callback route.
- `api/auth/session.js`: session read route.
- `api/auth/logout.js`: logout/revoke route.
- `api/google/*.js`: Google Calendar server routes.
- `db/schema.sql`: Neon schema.

## Next Step

Do an end-to-end OAuth and Google Calendar smoke test with real credentials before adding new product features.

Recommended local test:

1. Confirm `.env` has real `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `APP_BASE_URL`, and `APP_ENCRYPTION_KEY`.
2. Run `npm run dev`.
3. Open `http://localhost:3000`.
4. Sign in with Google.
5. Confirm a server session exists and the browser has an `HttpOnly` session cookie.
6. Load calendars.
7. Create a HebSync calendar.
8. Create, search, edit, and delete a Hebrew-date event.
9. Logout and confirm access is revoked/cleared.

After the local smoke test passes, deploy to Vercel and repeat the same flow with production OAuth redirect URIs.

## Cleanup Candidates

- Rename `getAccessToken()` because it now returns a server-session marker, not a Google access token.
- Update or remove legacy test references to `gcal_token` once fallback cleanup behavior is no longer needed.
- Keep privacy/legal copy aligned with the server-side token model.
- Add a small Playwright smoke test for the logged-out-to-login flow if credentials can be mocked safely.
