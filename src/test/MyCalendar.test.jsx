import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MyCalendar from '../pages/MyCalendar';
import * as googleApi from '../utils/googleApi';
import { GCAL_AUTH_EXPIRED_EVENT } from '../utils/googleApi';
import enLocale from '../locales/en.json';
import heLocale from '../locales/he.json';

// Mock the API utilities
vi.mock('../utils/googleApi', () => ({
  GCAL_AUTH_EXPIRED_EVENT: 'gcal-auth-expired',
  getAccessToken: vi.fn(() => 'mock-token'),
  fetchSession: vi.fn(() => Promise.resolve({ scopeMode: 'all_events' })),
  fetchAllCalendars: vi.fn(() => Promise.resolve([
    { id: 'cal1', summary: 'Personal', accessRole: 'owner' }
  ])),
  fetchMyAppEvents: vi.fn(() => Promise.resolve([])),
  fetchEventsInRange: vi.fn(() => Promise.resolve([])),
  authenticateWithGoogle: vi.fn(),
  canEditCalendars: vi.fn((scopeMode) => scopeMode === 'app_created' || scopeMode === 'all_events'),
  usesAllCalendarsMode: vi.fn((scopeMode) => scopeMode === 'read_only' || scopeMode === 'all_events'),
  isHebSyncCalendar: vi.fn(
    (calendar) =>
      Boolean(
        calendar?.description &&
        calendar.description.includes('ID:hebcal-sync-app'),
      ),
  ),
  SCOPE_MODES: {
    APP_CREATED: 'app_created',
    READ_ONLY: 'read_only',
    ALL_EVENTS: 'all_events',
  },
  revokeAccess: vi.fn(),
  createNewCalendar: vi.fn(),
  deleteEvent: vi.fn(),
  updateEvent: vi.fn(),
  isAuthError: vi.fn((error) => error?.code === 'AUTH_EXPIRED'),
}));

// Mock the Logo component
vi.mock('../components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, options) => {
      const translations = {
        appNameFirst: 'appNameFirst',
        selectAll: 'selectAll',
        clearAll: 'clearAll',
        refreshCalendars: 'Refresh calendars',
        hebSyncGroupLabel: 'HebSync Calendars',
        otherCalendarsGroupLabel: 'Other Calendars',
        dayEventsDialog: 'Day events',
        moreEvents: `${options?.count ?? 0} more events`,
      };
      return translations[key] ?? key;
    },
    i18n: { language: 'he', changeLanguage: vi.fn() }
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() }
}));

// Mock LanguageSwitcher
vi.mock('../components/LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher">Lang</div>
}));

vi.mock('../components/LoginModal', () => ({
  default: ({ isOpen, mode }) =>
    isOpen ? <div data-testid="login-modal">{mode}</div> : null
}));

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <MyCalendar />
    </BrowserRouter>
  );
};

const flattenLocaleKeys = (value, prefix = '') => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) =>
    flattenLocaleKeys(nestedValue, prefix ? `${prefix}.${key}` : key),
  );
};

describe('My Calendar Component', () => {
  it('should keep english and hebrew locale keys in sync', () => {
    const englishKeys = flattenLocaleKeys(enLocale.translation).sort();
    const hebrewKeys = flattenLocaleKeys(heLocale.translation).sort();

    expect(hebrewKeys).toEqual(englishKeys);

    for (const key of englishKeys) {
      const value = key
        .split('.')
        .reduce((acc, part) => acc?.[part], heLocale.translation);
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(0);
    }
  });

  it('should render the dashboard header and logo', async () => {
    renderDashboard();
    expect((await screen.findAllByText('appNameFirst'))[0]).toBeInTheDocument();
    expect(await screen.findByTestId('logo')).toBeInTheDocument();
  });

  it('should have Select All and Clear All buttons in the sidebar', async () => {
    renderDashboard();
    const selectAllBtns = await screen.findAllByText('selectAll');
    const clearAllBtns = await screen.findAllByText('clearAll');
    expect(selectAllBtns.length).toBeGreaterThan(0);
    expect(clearAllBtns.length).toBeGreaterThan(0);
  });

  it('should show a refresh button near the calendars header', async () => {
    renderDashboard();
    expect(await screen.findByRole('button', { name: 'Refresh calendars' })).toBeInTheDocument();
  });

  it('should open an overflow day dialog from the + more button', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValueOnce([
      { id: 'evt1', summary: 'Event 1', calendarId: 'cal1', start: { date: '2026-05-07' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt2', summary: 'Event 2', calendarId: 'cal1', start: { date: '2026-05-07' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt3', summary: 'Event 3', calendarId: 'cal1', start: { date: '2026-05-07' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt4', summary: 'Event 4', calendarId: 'cal1', start: { date: '2026-05-07' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt5', summary: 'Event 5', calendarId: 'cal1', start: { date: '2026-05-07' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
    ]);

    renderDashboard();

    const moreButton = await screen.findByLabelText(/more events/i);
    fireEvent.click(moreButton);

    expect(await screen.findByRole('dialog', { name: 'Day events' })).toBeInTheDocument();
  });

  it('should select only HebSync calendars by default', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'Personal',
        accessRole: 'owner',
      },
      {
        id: 'cal2',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: /Other Calendars/i }));

    const personalCheckbox = await screen.findByRole('checkbox', { name: 'Personal' });
    const hebSyncCheckbox = await screen.findByRole('checkbox', { name: 'HebSync' });

    expect(personalCheckbox).not.toBeChecked();
    expect(hebSyncCheckbox).toBeChecked();
  });

  it('should group calendars into HebSync and other calendars', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'Personal',
        accessRole: 'owner',
      },
      {
        id: 'cal2',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);

    renderDashboard();

    expect(await screen.findByRole('button', { name: /HebSync Calendars/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Other Calendars/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Personal' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Other Calendars/i }));

    expect(await screen.findByRole('checkbox', { name: 'Personal' })).toBeInTheDocument();
    expect(await screen.findByRole('checkbox', { name: 'HebSync' })).toBeInTheDocument();
  });

  it('should reopen the login modal when the Google session expires', async () => {
    renderDashboard();
    window.dispatchEvent(new CustomEvent(GCAL_AUTH_EXPIRED_EVENT));
    expect(await screen.findByTestId('login-modal')).toBeInTheDocument();
  });

  it('should open the login modal in reauthorize mode when the Google session expires', async () => {
    renderDashboard();
    window.dispatchEvent(new CustomEvent(GCAL_AUTH_EXPIRED_EVENT));
    expect(await screen.findByText('reauthorize')).toBeInTheDocument();
  });

  it('should open the login modal in connect mode when unauthenticated user clicks login', async () => {
    vi.mocked(googleApi.getAccessToken).mockReturnValueOnce(null);
    render(
      <BrowserRouter>
        <MyCalendar />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('login'));
    expect(await screen.findByText('connect')).toBeInTheDocument();
  });
});
