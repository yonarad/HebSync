import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Home from '../pages/Home';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../utils/googleApi', () => ({
  authenticateWithGoogle: vi.fn(),
  fetchSession: vi.fn(() => Promise.resolve(null)),
  getAccessToken: vi.fn(() => null),
  SCOPE_MODES: {
    APP_CREATED: 'app_created',
    READ_ONLY: 'read_only',
    ALL_EVENTS: 'all_events',
  },
  usesAllCalendarsMode: vi.fn((scopeMode) => scopeMode === 'read_only' || scopeMode === 'all_events'),
}));

vi.mock('../hooks/useInstallPrompt', () => ({
  default: () => ({
    canInstall: false,
    isInstalled: false,
    promptInstall: vi.fn(),
  }),
}));

vi.mock('../components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>,
}));

vi.mock('../components/LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher">Lang</div>,
}));

vi.mock('../components/LegalLinks', () => ({
  default: () => <div data-testid="legal-links">Links</div>,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      const translations = {
        appNameFirst: 'Heb',
        appNameSecond: 'Sync',
        landingEyebrow: 'Hebrew dates for real life',
        landingHeroTitle: 'Hebrew dates that stay in sync with your calendar',
        landingHeroBody: 'Landing body',
        landingValueSyncTitle: 'Sync title',
        landingValueSyncBody: 'Sync body',
        landingValueImportTitle: 'Import title',
        landingValueImportBody: 'Import body',
        landingValueControlTitle: 'Control title',
        landingValueControlBody: 'Control body',
        landingHowItWorksEyebrow: 'How it works',
        landingHowItWorksTitle: 'How it works title',
        landingHowItWorksBody: 'How it works body',
        landingChecklistOneTitle: 'Checklist one',
        landingChecklistOneBody: 'Checklist one body',
        landingChecklistTwoTitle: 'Checklist two',
        landingChecklistTwoBody: 'Checklist two body',
        landingConnectEyebrow: 'Connect once',
        landingConnectTitle: 'Choose how HebSync should connect to your calendars',
        landingConnectBody: 'Connect body',
        permissionHebsyncOnly: 'HebSync calendars only',
        permissionHebsyncOnlyDesc: 'HebSync only desc',
        permissionAllCalendars: 'All calendars',
        permissionAllCalendarsDesc: 'All calendars desc',
        permissionAllCalendarsHelper: 'View access first',
        tapToSelect: 'Tap to select',
        continue: 'Continue',
        howAccessWorks: 'How access works',
        permissionHebsyncOnlyFooter: 'HebSync only footer',
        permissionAllCalendarsFooter: 'All calendars footer',
        thanksTo: 'Powered by',
        copyright: `HebSync ${options?.year ?? ''}`,
        authErrorTitle: 'Google sign-in did not complete',
        authErrorInvalidState:
          'The sign-in session expired or was interrupted. Please try again and complete the Google window in the same browser tab.',
        authErrorAccessDenied:
          "Google sign-in was canceled before completion. You can try again whenever you're ready.",
        authErrorGoogleOauth: 'Google sign-in could not be completed. Please try again.',
        authErrorAuthenticationFailed:
          'We reached Google, but could not finish connecting your account. Please try again in a moment.',
        authErrorGeneric: 'The sign-in could not be completed. Please try again.',
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

function renderHome(initialEntry = '/') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Home auth error handling', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('shows a friendly invalid auth state message on the home screen', async () => {
    renderHome('/?authError=invalid_auth_state');

    expect(await screen.findByText('Google sign-in did not complete')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The sign-in session expired or was interrupted. Please try again and complete the Google window in the same browser tab.',
      ),
    ).toBeInTheDocument();
  });

  it('shows a friendly access denied message when Google sign-in is canceled', async () => {
    renderHome('/?authError=google_oauth_error&authErrorDetail=access_denied');

    expect(await screen.findByText('Google sign-in did not complete')).toBeInTheDocument();
    expect(
      screen.getByText(
        "Google sign-in was canceled before completion. You can try again whenever you're ready.",
      ),
    ).toBeInTheDocument();
  });
});
