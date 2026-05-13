# HebSync

HebSync is a Vite + React app for syncing Hebrew-date events with Google Calendar.

The frontend source now uses TypeScript across `src`, with Vitest coverage for the main calendar and event flows.

## Server-side OAuth setup

The project now includes a secure server-side OAuth foundation for:

- Google OAuth authorization code flow
- Neon-backed session storage
- Encrypted Google `refresh_token` storage
- `HttpOnly` session cookies

Relevant files:

- [api/auth/google/start.js](C:/dev/HebSync/api/auth/google/start.js)
- [api/auth/google/callback.js](C:/dev/HebSync/api/auth/google/callback.js)
- [api/auth/session.js](C:/dev/HebSync/api/auth/session.js)
- [api/auth/logout.js](C:/dev/HebSync/api/auth/logout.js)
- [db/schema.sql](C:/dev/HebSync/db/schema.sql)

## 1. Create a Neon database

1. Create a free Neon project.
2. Copy the connection string.
3. Run the SQL in [db/schema.sql](C:/dev/HebSync/db/schema.sql) in the Neon SQL editor.

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

Copy [.env.example](C:/dev/HebSync/.env.example) to `.env` locally and add the same values in Vercel Project Settings.

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
npm test
```

## 6. Frontend integration

The current frontend still calls Google Calendar utilities from [src/utils/googleApi.ts](C:/dev/HebSync/src/utils/googleApi.ts). To complete the security migration:

1. Replace `authenticateWithGoogle(...)` with a redirect to `/api/auth/google/start?scopeMode=...`
2. Replace `getAccessToken()` checks with `GET /api/auth/session`
3. Move Google Calendar API calls from the browser into Vercel Functions
4. Stop storing tokens in `localStorage`

## Recommended next step

After this setup, the next clean step is migrating one real Google API call end-to-end, for example:

- `fetchAllCalendars`

That gives you one fully secure server-side path before moving the rest of the app.
