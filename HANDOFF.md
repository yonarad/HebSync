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
- Added GitHub Actions CI for typechecking, linting, unit tests, production builds, and Windows-based visual regression tests.
- Protected `master`: both CI jobs are required, branches must be up to date, and force-pushes and deletion are disabled. The rule applies to administrators as well.
- Added read-only production smoke tests for public pages, legal routes, unauthenticated API boundaries, and Google OAuth configuration. They run every six hours, after successful Vercel `Production` deployment events, and on manual request.
- Added structured request lifecycle logs to all 15 server handlers. The records support route/status/duration/request-ID diagnosis while excluding request and user content.
- Added Vercel Speed Insights to the React root; the project's free Speed Insights tier is enabled and begins collecting after deployment visits.
- Updated the resolved React Router dependency from 7.14.2 to 7.18.3 after a production dependency audit.
- Replaced the stale npm-registry `xlsx` 0.18.5 package with the vendor's maintained 0.20.3 CDN release, which contains the security fixes missing from the registry package.
- Hardened spreadsheet imports with a 5 MB file limit, a 1,000-event-row parse limit, dense worksheet parsing, and a real-template compatibility test.
- Enabled GitHub dependency alerts and automatic security updates, added grouped weekly Dependabot updates for npm and GitHub Actions, and added a standalone weekly production dependency audit.
- Isolated production-smoke concurrency by event and deployment environment so Vercel Preview events cannot cancel an active Production check.
- Updated README terminology for the server-session architecture.

## Verified baseline

Verified locally on 2026-09-06:

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test -- --run`: passed — 28 files, 246 tests.
- `npm run build`: passed with Vite 8.2.2.
- `npm run test:visual`: passed — 26 tests, including authentication, accessibility, and screenshot coverage.
- The visual-test command now exits normally after stopping its owned Vite server.
- `.github/workflows/ci.yml` runs the full baseline automatically on pushes and pull requests to `master`.
- `npm run test:smoke`: passed against `https://hebsync.org` — 2 production checks, with no authentication or data mutation.
- `npm audit --omit=dev`: passed — 0 production dependency vulnerabilities.

## Recent product changes

- Replaced the calendar-creation prompt with a dialog and removed duplicate status messaging.
- Added event greeting sharing, including external events and memorial-candle content.
- Refined birthday-name choices, memorial wording, email subjects, and unavailable-year explanations.
- Fixed repeated "Today" navigation in schedule view using local calendar dates.

## Next steps

### 1. Keep an authenticated production smoke checklist

The automated production smoke is intentionally unauthenticated. After authentication, permission, Google API, or database changes, verify manually with a real account:

1. Sign in and restore an existing session.
2. Load calendars and create a HebSync calendar.
3. Create, search, edit, and delete an event.
4. Exercise recurring-event behavior and greeting sharing.
5. Disconnect, revoke access, and delete account data.

This is an operational regression check for the released service, not a launch blocker.

### 2. Review production performance data

After Speed Insights has collected a representative seven-day sample, review field LCP, INP, CLS, FCP, and TTFB. Optimize only where real-user data identifies a problem; likely candidates include lazy-loading or splitting the larger production chunks (`xlsx` is about 492 kB and the main index chunk about 335 kB before gzip).

## Key files

- `src/utils/googleApiCore.ts`: session state, CSRF-aware requests, OAuth entry, and logout.
- `src/utils/googleApiEvents.ts`: frontend Calendar API wrappers.
- `src/components/ScheduleCalendarView.tsx`: schedule rendering and today navigation.
- `src/hooks/useMyCalendarData.ts`: calendar data orchestration.
- `api/_lib/google.js`: OAuth exchange/refresh and encrypted token storage.
- `api/_lib/google-calendar.js`: authorized Google API fetch helper.
- `api/_lib/observability.js`: privacy-safe structured server request logging.
- `api/auth/google/*`: OAuth routes.
- `api/google/*`: Calendar API routes.
- `scripts/run-visual-tests.mjs`: reliable visual-test server lifecycle.
- `.github/workflows/ci.yml`: automated verification for pushes and pull requests.
- `.github/workflows/production-smoke.yml`: read-only checks every six hours and after successful production deployments.
- `.github/workflows/dependency-security.yml`: weekly locked-tree production dependency audit.
- `.github/dependabot.yml`: grouped weekly npm and GitHub Actions update policy.
- `playwright.smoke.config.ts` and `tests/smoke/*`: production smoke configuration and scenarios.
- `tests/visual/*`: Playwright accessibility and screenshot coverage.
- `src/App.tsx`: app routing root and Vercel Speed Insights integration.
- `db/schema.sql`: Neon schema.

## Standard verification

```powershell
npm run typecheck
npm run lint
npm test -- --run
npm run build
npm run test:visual
$env:SMOKE_BASE_URL='https://hebsync.org'
npm run test:smoke
```
