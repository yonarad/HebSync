# HebSync

[![CI](https://github.com/yonarad/HebSync/actions/workflows/ci.yml/badge.svg)](https://github.com/yonarad/HebSync/actions/workflows/ci.yml)

HebSync is a Vite + React app for syncing Hebrew-date events with Google Calendar.

The frontend source now uses TypeScript across `src`, with Vitest coverage for the main calendar and event flows.

## Current architecture

HebSync now uses a server-backed Google OAuth and Google Calendar integration:

- Google OAuth authorization code flow starts from the frontend and completes in `/api/auth/google/*`.
- Session state is stored server-side and referenced by `HttpOnly` cookies.
- Google `refresh_token` values are encrypted before storage.
- Browser Google Calendar calls go through local/Vercel API routes under `/api/google/*`.
- The browser keeps only minimal auth state, such as the selected permission mode, and does not store Google access or refresh tokens.

Main client integration files:

- [src/utils/googleApiCore.ts](src/utils/googleApiCore.ts)
- [src/utils/googleApiEvents.ts](src/utils/googleApiEvents.ts)
- [src/hooks/useMyCalendarData.ts](src/hooks/useMyCalendarData.ts)
- [src/pages/AddEvent.tsx](src/pages/AddEvent.tsx)

Main server integration files:

- [api/auth/google/start.js](api/auth/google/start.js)
- [api/auth/google/callback.js](api/auth/google/callback.js)
- [api/auth/session.js](api/auth/session.js)
- [api/auth/logout.js](api/auth/logout.js)
- [api/google/calendars.js](api/google/calendars.js)
- [api/google/events.js](api/google/events.js)
- [api/google/event.js](api/google/event.js)
- [api/google/events/app.js](api/google/events/app.js)
- [api/google/events/in-range.js](api/google/events/in-range.js)
- [api/google/events/search.js](api/google/events/search.js)
- [db/schema.sql](db/schema.sql)

## Server-side OAuth setup

The project now includes a secure server-side OAuth foundation for:

- Google OAuth authorization code flow
- Neon-backed session storage
- Encrypted Google `refresh_token` storage
- `HttpOnly` session cookies

## 1. Create a Neon database

1. Create a free Neon project.
2. Copy the connection string.
3. Run the SQL in [db/schema.sql](db/schema.sql) in the Neon SQL editor.

## 2. Configure Google OAuth

Create a Google OAuth Web Application client and set:

- Authorized JavaScript origins:
  - `http://localhost:3000`
  - `https://your-app.vercel.app`
- Authorized redirect URIs:
  - `http://localhost:3000/api/auth/google/callback`
  - `https://your-app.vercel.app/api/auth/google/callback`

Important:

- Use a Web Application client, not a SPA client, for the server-side flow.
- The frontend `VITE_GOOGLE_CLIENT_ID` can stay for now, but the new flow uses the server-side `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

## 3. Environment variables

Copy [.env.example](.env.example) to `.env` locally and add the same values in Vercel Project Settings.

Required variables:

- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `APP_BASE_URL`
- `APP_ENCRYPTION_KEY`

Generate `APP_ENCRYPTION_KEY` as base64-encoded 32 random bytes. Example:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

## 4. Install dependencies

```bash
npm install
```

This project now requires:

- `@neondatabase/serverless`
- `typescript`

## 5. Vercel deployment

In Vercel:

1. Connect the repo.
2. Add the environment variables from `.env.example`.
3. Redeploy after saving them.

The app will expose these endpoints automatically:

- `GET /api/auth/google/start?scopeMode=app_created`
- `GET /api/auth/google/callback`
- `GET /api/auth/session`
- `GET /api/auth/logout`

## Local development

Use the local combined dev flow now that the app depends on:

- local server-backed `/api` routes
- `HttpOnly` session cookies
- Google OAuth callbacks back into the same app origin

Run:

```bash
npm run dev
```

Important:

- `npm run dev` starts both the local API server and Vite together
- `npm run dev:vite` is frontend-only and will break `/api/*` routes for auth
- local app origin is `http://localhost:3000`
- local API proxy target is `http://localhost:8787`

## Quality checks

Run the main verification commands before shipping changes:

```bash
npm run typecheck
npm run lint
npm test -- --run
npm run build
npm run test:visual
```

The same checks run automatically in GitHub Actions on pushes and pull requests to `master`. Visual tests run on Windows to match the committed Playwright snapshots.

As of 2026-09-06, the current local baseline passes:

- `npm run typecheck`
- `npm run lint`
- `npm test` with 26 test files and 238 tests passing
- `npm run build`
- `npm run test:visual` with 26 browser tests passing, including mocked authentication lifecycle coverage

## Implementation status

The security migration is mostly complete:

- `authenticateWithGoogle(...)` redirects to `/api/auth/google/start`.
- Session checks use `/api/auth/session` through `fetchSession()`.
- Calendar list, color, creation, event creation, event fetch, event update, event delete, app-event loading, range loading, and search calls all go through `/api/google/*`.
- CSRF headers are attached by `authorizedFetch()` for non-read requests.
- `hasStoredAuthState()` provides a synchronous UI hint while the authoritative server session is being fetched.

Known cleanup:

- Keep the privacy/legal copy aligned with the server-side token model.

## Recommended next step

Before adding new features, verify the full Google integration against real credentials:

1. Start the combined local app with `npm run dev`.
2. Sign in with Google through `http://localhost:3000`.
3. Confirm session creation in Neon and an `HttpOnly` browser session cookie.
4. Exercise the core flows:
   - load calendars
   - create a HebSync calendar
   - create a Hebrew-date event
   - search events
   - edit an event
   - delete an event
   - logout/revoke access
5. Deploy to Vercel with matching environment variables and Google OAuth redirect URIs.
6. Repeat the same smoke test on the production deployment.

See [HANDOFF.md](HANDOFF.md) for a concise project handoff.
