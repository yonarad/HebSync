import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MyCalendar from '../pages/MyCalendar';
import * as googleApi from '../utils/googleApi';
import { GCAL_AUTH_EXPIRED_EVENT } from '../utils/googleApi';
import enLocale from '../locales/en.json';
import heLocale from '../locales/he.json';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock the API utilities
vi.mock('../utils/googleApi', () => ({
  GCAL_AUTH_EXPIRED_EVENT: 'gcal-auth-expired',
  getAccessToken: vi.fn(() => 'mock-token'),
  getScopeMode: vi.fn(() => 'all_events'),
  fetchSession: vi.fn(() => Promise.resolve({ scopeMode: 'all_events' })),
  fetchGoogleCalendarColors: vi.fn(() => Promise.resolve({ calendar: {} })),
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
  deleteAccountData: vi.fn(),
  createNewCalendar: vi.fn(),
  createHebcalEvent: vi.fn(),
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
        viewMonth: 'Month',
        viewSchedule: 'Schedule',
        showGregorianDates: 'Show Gregorian dates',
        discardEventConfirm: 'Discard event draft?',
        noEventsInView: 'No events in this view.',
        allDay: 'All day',
        loadingGoogleData: 'Loading Google data...',
        createEventOnDay: `Create an event on day ${options?.hebrewDay ?? ''} (${options?.gregorianDay ?? ''})`,
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
  beforeEach(() => {
    mockNavigate.mockClear();
    sessionStorage.clear();
  });

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

  it('should show a floating add event button for authenticated users', async () => {
    renderDashboard();
    expect(await screen.findByRole('button', { name: 'addEvent' })).toBeInTheDocument();
  });

  it('should open add event modal with the clicked day as context', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValueOnce([]);

    renderDashboard();

    const dayButtons = await screen.findAllByLabelText(/Create an event on day/i);
    fireEvent.click(dayButtons[0]);

    expect(await screen.findByText('addEventTitle')).toBeInTheDocument();
    const [, yearSelect, monthSelect, daySelect] = screen.getAllByRole('combobox');

    expect(yearSelect.value).not.toBe('');
    expect(monthSelect.value).not.toBe('');
    expect(daySelect.value).not.toBe('');
    expect(mockNavigate).not.toHaveBeenCalledWith('/add-event', expect.anything());
  });

  it('should open add event modal from the floating add button', async () => {
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'addEvent' }));

    expect(await screen.findByText('addEventTitle')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith('/add-event');
  });

  it('should ask for confirmation before closing add event modal from the backdrop', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'addEvent' }));
    expect(await screen.findByText('addEventTitle')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('add-event-modal-backdrop'));

    expect(window.confirm).toHaveBeenCalledWith('Discard event draft?');
    expect(screen.getByText('addEventTitle')).toBeInTheDocument();
  });

  it('should close add event modal when backdrop confirmation is accepted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'addEvent' }));
    expect(await screen.findByText('addEventTitle')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('add-event-modal-backdrop'));

    await waitFor(() => {
      expect(screen.queryByText('addEventTitle')).not.toBeInTheDocument();
    });
  });

  it('should request an upgrade instead of navigating when read-only user clicks add event', async () => {
    vi.mocked(googleApi.fetchSession).mockResolvedValueOnce({ scopeMode: 'read_only' });

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'addEvent' }));

    expect(await screen.findByTestId('login-modal')).toBeInTheDocument();
    expect(screen.getByText('upgrade')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith('/add-event');
  });

  it('should request an upgrade instead of navigating when read-only user clicks a day', async () => {
    vi.mocked(googleApi.fetchSession).mockResolvedValueOnce({ scopeMode: 'read_only' });
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValueOnce([]);

    renderDashboard();

    const dayButtons = await screen.findAllByLabelText(/Create an event on day/i);
    fireEvent.click(dayButtons[0]);

    expect(await screen.findByTestId('login-modal')).toBeInTheDocument();
    expect(screen.getByText('upgrade')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith(
      '/add-event',
      expect.anything(),
    );
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

  it('should open event details when clicking an event chip', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValueOnce([
      {
        id: 'evt1',
        summary: 'Event 1',
        description: 'Event description',
        calendarId: 'cal1',
        start: { dateTime: '2026-05-07T08:00:00.000Z' },
        end: { dateTime: '2026-05-07T09:00:00.000Z' },
        extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } },
      },
    ]);

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }));
    fireEvent.click(await screen.findByText((content) => content.includes('Event 1')));

    expect(await screen.findByText('eventDetails')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /Event 1/ })).toBeInTheDocument();
    expect(await screen.findByText('Event description')).toBeInTheDocument();
    expect(await screen.findByTestId('event-time-range')).toBeInTheDocument();
  });

  it('should open event details when clicking an external event chip', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValueOnce([
      {
        id: 'evt1',
        summary: 'External Event',
        description: 'External description',
        calendarId: 'cal1',
        start: { date: '2026-05-07' },
        extendedProperties: { private: {} },
      },
    ]);

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }));
    fireEvent.click(await screen.findByRole('button', { name: /External Event/ }));

    expect(await screen.findByText('eventDetails')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: /External Event/ })).toBeInTheDocument();
    expect(await screen.findByText('External description')).toBeInTheDocument();
  });

  it('should allow switching to schedule view', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValueOnce([
      {
        id: 'evt1',
        summary: 'Event 1',
        calendarId: 'cal1',
        start: { dateTime: '2026-05-07T08:00:00.000Z' },
        end: { dateTime: '2026-05-07T09:00:00.000Z' },
        extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } },
      },
    ]);

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }));

    expect(await screen.findByRole('button', { name: /Event 1/ })).toBeInTheDocument();
  });

  it('should default to schedule view on mobile', async () => {
    const originalWidth = window.innerWidth;
    window.innerWidth = 375;

    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValueOnce([
      {
        id: 'evt1',
        summary: 'Mobile Event',
        calendarId: 'cal1',
        start: { dateTime: '2026-05-07T08:00:00.000Z' },
        end: { dateTime: '2026-05-07T09:00:00.000Z' },
        extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } },
      },
    ]);

    renderDashboard();

    expect(await screen.findByRole('button', { name: /Mobile Event/ })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('No events in this view.')).not.toBeInTheDocument();
    });

    window.innerWidth = originalWidth;
  });

  it('should show a loading state in schedule view before events resolve', async () => {
    const originalWidth = window.innerWidth;
    window.innerWidth = 375;

    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockImplementationOnce(
      () => new Promise(() => {}),
    );

    renderDashboard();
    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }));

    expect(await screen.findByTestId('calendar-loading-state')).toBeInTheDocument();

    window.innerWidth = originalWidth;
  });

  it('should show a loading state in month view before events resolve', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockImplementationOnce(
      () => new Promise(() => {}),
    );

    renderDashboard();

    expect(await screen.findByTestId('calendar-loading-state')).toBeInTheDocument();
  });

  it('should not get stuck in loading when the user has no calendars', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([]);

    renderDashboard();

    expect(await screen.findByText('noCalendarsAvailable')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId('calendar-loading-state')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));
    expect(await screen.findByText('No events in this view.')).toBeInTheDocument();
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
