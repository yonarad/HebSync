import type {
  Calendar,
  ScopeMode,
  SessionResponse,
  SessionUser,
  StoredAuthState,
} from '../types/appTypes';

export const GCAL_AUTH_EXPIRED_EVENT = 'gcal-auth-expired';
export const AUTH_STATE_STORAGE_KEY = 'gcal_auth_state';
export const SCOPE_MODES = {
  APP_CREATED: 'app_created',
  READ_ONLY: 'read_only',
  ALL_EVENTS: 'all_events',
} as const;

const AUTH_ERROR_CODE = 'AUTH_EXPIRED';
const APP_SIGNATURE = 'ID:hebcal-sync-app';

interface GoogleApiError extends Error {
  code?: string;
}

export interface GoogleApiListResponse<T> {
  items?: T[];
  scopeMode?: ScopeMode;
}

let inMemoryCsrfToken: string | null = null;

export function isHebSyncCalendar(calendar: Calendar | null | undefined): boolean {
  return Boolean(
    calendar?.description && calendar.description.includes(APP_SIGNATURE),
  );
}

function createAuthError(message = 'Google session expired'): GoogleApiError {
  const error: GoogleApiError = new Error(message);
  error.code = AUTH_ERROR_CODE;
  return error;
}

function notifyAuthExpired(): GoogleApiError {
  logout();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GCAL_AUTH_EXPIRED_EVENT));
  }
  return createAuthError();
}

function getStoredAuthState(): StoredAuthState | null {
  const raw = localStorage.getItem(AUTH_STATE_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredAuthState;
  } catch {
    localStorage.removeItem(AUTH_STATE_STORAGE_KEY);
    return null;
  }
}

function setStoredAuthState(session: SessionUser): void {
  if (!session?.scopeMode) {
    logout();
    return;
  }

  localStorage.setItem(
    AUTH_STATE_STORAGE_KEY,
    JSON.stringify({
      authenticated: true,
      scopeMode: session.scopeMode,
    } satisfies StoredAuthState),
  );
}

function getCsrfToken(): string | null {
  return inMemoryCsrfToken;
}

export function isAuthError(error: unknown): error is GoogleApiError {
  return (error as GoogleApiError | null | undefined)?.code === AUTH_ERROR_CODE;
}

async function readGoogleError(
  response: Response,
  fallbackMessage: string,
): Promise<never> {
  let errorMessage = fallbackMessage;
  let errorCode: string | null = null;

  try {
    const errorData = (await response.clone().json()) as {
      code?: string;
      error?: { message?: string } | string;
      message?: string;
      error_description?: string;
    };
    errorCode = errorData?.code || null;
    errorMessage =
      (typeof errorData?.error === 'object' ? errorData.error?.message : errorData?.error) ||
      errorData?.message ||
      errorData?.error_description ||
      fallbackMessage;
  } catch {
    const text = await response.text().catch(() => '');
    errorMessage = text || fallbackMessage;
  }

  if (response.status === 401 || errorCode === AUTH_ERROR_CODE) {
    throw notifyAuthExpired();
  }

  throw new Error(errorMessage);
}

export async function authorizedFetch(
  url: string,
  options: RequestInit = {},
  fallbackMessage = 'Google request failed',
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (!csrfToken) {
      await fetchSession();
    }

    const resolvedCsrfToken = getCsrfToken();
    if (!resolvedCsrfToken) {
      throw notifyAuthExpired();
    }

    headers.set('x-csrf-token', resolvedCsrfToken);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    await readGoogleError(response, fallbackMessage);
  }

  return response;
}

export function authenticateWithGoogle(
  scopeMode: Exclude<ScopeMode, null>,
  onSuccess?: (() => void) | null,
  onError?: ((error: Error) => void) | null,
): void {
  try {
    const returnTo =
      typeof window !== 'undefined'
        ? window.location.pathname === '/'
          ? '/calendar'
          : `${window.location.pathname}${window.location.search}${window.location.hash}`
        : '/calendar';
    const url = new URL('/api/auth/google/start', window.location.origin);
    url.searchParams.set('scopeMode', scopeMode);
    url.searchParams.set('returnTo', returnTo);
    onSuccess?.();
    window.location.assign(url.toString());
  } catch (error) {
    onError?.(error as Error);
  }
}

export function getScopeMode(): ScopeMode {
  return getStoredAuthState()?.scopeMode || null;
}

export function usesAllCalendarsMode(scopeMode: ScopeMode = getScopeMode()): boolean {
  return scopeMode === SCOPE_MODES.READ_ONLY || scopeMode === SCOPE_MODES.ALL_EVENTS;
}

export function canEditCalendars(scopeMode: ScopeMode = getScopeMode()): boolean {
  return scopeMode === SCOPE_MODES.APP_CREATED || scopeMode === SCOPE_MODES.ALL_EVENTS;
}

export function getAccessToken(): 'server-session' | null {
  return getStoredAuthState()?.authenticated ? 'server-session' : null;
}

export async function fetchSession(): Promise<SessionUser | null> {
  const response = await fetch('/api/auth/session', {
    credentials: 'same-origin',
  });

  if (response.status === 401) {
    notifyAuthExpired();
    return null;
  }

  if (!response.ok) {
    await readGoogleError(response, 'Failed to fetch session');
  }

  const data = (await response.json()) as SessionResponse;
  if (data?.authenticated && data?.user) {
    inMemoryCsrfToken = data.user.csrfToken || data.user.user?.csrfToken || null;
    setStoredAuthState(data.user);
    return data.user;
  }

  logout();
  return null;
}

export function logout(): void {
  inMemoryCsrfToken = null;
  localStorage.removeItem(AUTH_STATE_STORAGE_KEY);
  localStorage.removeItem('gcal_app_calendar_id');
}

export async function revokeAccess(): Promise<void> {
  try {
    await authorizedFetch('/api/auth/logout', { method: 'POST' }, 'Failed to revoke access');
  } catch (error) {
    console.error('Failed to revoke token:', error);
  } finally {
    logout();
  }
}

export async function deleteAccountData(): Promise<void> {
  try {
    await authorizedFetch(
      '/api/auth/account',
      { method: 'DELETE' },
      'Failed to delete account data',
    );
  } finally {
    logout();
  }
}
