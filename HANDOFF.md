# HebSync Handoff

Last updated: 2026-09-06

Production status: released and in use (confirmed by the project owner)

Branch: `master`

## Current state

HebSync is a production Vite + React + TypeScript application for creating and managing Hebrew-date events in Google Calendar.

Google integration uses server-backed OAuth:

- Sessions are stored in Neon and referenced by `HttpOnly` cookies.
- Google refresh tokens are encrypted at rest.
- Calendar operations go through `/api/google/*` routes.
- Non-read requests use CSRF protection.
- The browser stores only a minimal authentication-state hint, not Google tokens.

The main calendar, event, import, reminder, greeting, recurring-event, accessibility, and responsive-layout flows have automated coverage.

## Maintenance completed on 2026-09-06

- Reviewed and refreshed five stale visual baselines for the current production UI:
  - desktop and narrow schedule views now reflect scrolling to "Today";
  - desktop and mobile search results reflect the current controls;
  - advanced search reflects the current month/year selectors.
- Added `scripts/run-visual-tests.mjs` so visual tests start and stop Vite reliably on Windows instead of hanging during Playwright web-server teardown.
- Replaced the misleading `getAccessToken()` client helper with `hasStoredAuthState()`.
- Removed the remaining legacy `gcal_token` cleanup and test setup.
- Added mocked browser coverage for OAuth redirect/callback, session restoration, session expiry and reauthorization, logout, account deletion, and CSRF headers.
- Updated README terminology for the server-session architecture.

## Verified baseline

Verified locally on 2026-09-06:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test -- --run`: passed — 26 files, 238 tests.
- `npm run build`: passed with Vite 8.0.10.
- `npm run test:visual`: passed — 26 tests, including authentication, accessibility, and screenshot coverage.
- The visual-test command now exits normally after stopping its owned Vite server.

## Recent product changes

- Replaced the calendar-creation prompt with a dialog and removed duplicate status messaging.
- Added event greeting sharing, including external events and memorial-candle content.
- Refined birthday-name choices, memorial wording, email subjects, and unavailable-year explanations.
- Fixed repeated "Today" navigation in schedule view using local calendar dates.

## Next steps

### 1. Keep a production smoke checklist

After authentication, permission, Google API, database, or deployment configuration changes, verify:

1. Sign in and restore an existing session.
2. Load calendars and create a HebSync calendar.
3. Create, search, edit, and delete an event.
4. Exercise recurring-event behavior and greeting sharing.
5. Disconnect, revoke access, and delete account data.

This is an operational regression check for the released service, not a launch blocker.

### 2. Optional performance work

Consider lazy-loading or splitting the larger production chunks (`xlsx` is about 425 kB and the main index chunk about 335 kB before gzip). Measure user impact before optimizing.

## Key files

- `src/utils/googleApiCore.ts`: session state, CSRF-aware requests, OAuth entry, and logout.
- `src/utils/googleApiEvents.ts`: frontend Calendar API wrappers.
- `src/components/ScheduleCalendarView.tsx`: schedule rendering and today navigation.
- `src/hooks/useMyCalendarData.ts`: calendar data orchestration.
- `api/_lib/google.js`: OAuth exchange/refresh and encrypted token storage.
- `api/_lib/google-calendar.js`: authorized Google API fetch helper.
- `api/auth/google/*`: OAuth routes.
- `api/google/*`: Calendar API routes.
- `scripts/run-visual-tests.mjs`: reliable visual-test server lifecycle.
- `tests/visual/*`: Playwright accessibility and screenshot coverage.
- `db/schema.sql`: Neon schema.

## Standard verification

```bash
npm run typecheck
npm run lint
npm test -- --run
npm run build
npm run test:visual
```
