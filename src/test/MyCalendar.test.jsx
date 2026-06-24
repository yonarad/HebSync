import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { HDate } from '@hebcal/core';
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
    {
      id: 'cal1',
      summary: 'HebSync',
      accessRole: 'owner',
      description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
    }
  ])),
  fetchMyAppEvents: vi.fn(() => Promise.resolve([])),
  fetchEventsInRange: vi.fn(() => Promise.resolve([])),
  searchEvents: vi.fn(() => Promise.resolve([])),
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
  deleteRecurringEventScope: vi.fn(),
  updateEvent: vi.fn(),
  updateRecurringEventScope: vi.fn(),
  isRecurringEvent: vi.fn((event) => Boolean(event?.recurringEventId || event?.recurrence?.length)),
  supportsFutureScopedChanges: vi.fn(
    (event) =>
      event?.extendedProperties?.private?.appIdentifier === 'MyHebrewCalendar' &&
      Boolean(event?.recurringEventId || event?.recurrence?.length),
  ),
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
        closeDayEvents: 'Close day events',
        moreEvents: `${options?.count ?? 0} more events`,
        previousMonth: 'Previous month',
        nextMonth: 'Next month',
        viewMonth: 'Month',
        viewSchedule: 'Schedule',
        displayOptions: 'Display',
        showGregorianDates: 'Show Gregorian dates',
        showEventAges: 'Show event ages',
        showHolidayEvents: 'Show holidays',
        showNationalHolidays: 'Show national observances',
        showRoshChodesh: 'Show Rosh Chodesh',
        showSpecialShabbat: 'Show special Shabbatot',
        showFasts: 'Show fasts',
        showWeeklyParsha: 'Show weekly parsha',
        selectAllDisplayOptions: 'Select all',
        clearAllDisplayOptions: 'Clear all',
        holidayDetails: 'Day details',
        parshaDetails: 'Weekly parsha details',
        viewDetails: 'More details',
        hebcalCategoryHoliday: 'Holiday',
        hebcalCategoryMajor: 'Major',
        hebcalCategoryFast: 'Fast',
        hebcalCategoryRoshChodesh: 'Rosh Chodesh',
        hebcalCategoryModern: 'National',
        hebcalCategoryMinor: 'Minor',
        hebcalCategoryParashat: 'Parashat',
        hebcalCategoryShabbat: 'Special Shabbat',
        searchEvents: 'Search events',
        searchEventsPlaceholder: 'Search events',
        toggleAdvancedSearch: 'Toggle advanced search',
        clearSearch: 'Clear search',
        close: 'Close',
        searchIn: 'Search in',
        searchInSelectedCalendars: 'Selected calendars',
        searchInAllCalendars: 'All calendars',
        searchWhat: 'What',
        searchWhatPlaceholder: 'Try a title, description, or keyword',
        searchFromDate: 'From date',
        searchToDate: 'To date',
        searchExtendBackward: 'Expand earlier',
        searchExtendForward: 'Expand later',
        searchResultsMode: 'Search results',
        searchResultsTitle: 'Matching events',
        searchResultsRange: `Showing events between ${options?.from ?? ''} and ${options?.to ?? ''}`,
        searchResultsCount: `${options?.count ?? 0} results`,
        noSearchResults: 'No events matched this search.',
        searchEventsError: 'Failed to search events',
        month: 'Month',
        hebrewYear: 'Hebrew year',
        untitledEvent: 'Untitled event',
        discardEventConfirm: 'Discard event draft?',
        noCalendarsYetInCalendarView: 'No calendars are available yet. Create a calendar from the sidebar to start adding events.',
        loginRequiredInCalendarView: 'Connect your Google account to view calendars and start managing Hebrew events here.',
        noSelectedCalendarsInCalendarView: 'There are calendars available, but none are selected. Choose one or more calendars from the sidebar.',
        noEventsInView: 'The selected calendars do not have events in this time range.',
        deletingEvent: 'Deleting...',
        allDay: 'All day',
        loadingGoogleData: 'Loading Google data...',
        createEventOnDay: `Create an event on day ${options?.hebrewDay ?? ''} (${options?.gregorianDay ?? ''})`,
        recurringDeleteDialogTitle: 'Delete recurring event',
        recurringDeleteDialogBody: 'Choose delete scope',
        recurringUpdateDialogTitle: 'Edit recurring event',
        recurringUpdateDialogBody: 'Choose update scope',
        recurringActionScopeSeries: 'Entire series',
        recurringActionScopeSeriesHint: 'Apply to all occurrences.',
        recurringActionScopeSingle: 'Only this occurrence',
        recurringActionScopeSingleHint: 'Keep other occurrences unchanged.',
        recurringActionScopeFuture: 'This and following',
        recurringActionScopeFutureHint: 'Apply from this point onward.',
        recurringDeleteConfirm: 'Delete selected scope',
        recurringUpdateConfirm: 'Apply changes',
        recommended: 'Recommended',
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

const resolveHebrewMonthForYear = (monthName, targetYear) => {
  const targetMonths = [
    'Tishrei',
    'Cheshvan',
    'Kislev',
    'Tevet',
    "Sh'vat",
    ...(HDate.isLeapYear(targetYear) ? ['Adar I', 'Adar II'] : ['Adar']),
    'Nisan',
    'Iyyar',
    'Sivan',
    'Tamuz',
    'Av',
    'Elul',
  ];

  if (targetMonths.includes(monthName)) {
    return monthName;
  }

  if (monthName === 'Adar' && targetMonths.includes('Adar II')) {
    return 'Adar II';
  }

  if ((monthName === 'Adar I' || monthName === 'Adar II') && targetMonths.includes('Adar')) {
    return 'Adar';
  }

  return monthName;
};

const getExpectedDefaultSearchRange = () => {
  const currentHDate = new HDate(new Date());
  const startOfMonth = new HDate(1, currentHDate.getMonthName(), currentHDate.getFullYear()).greg();
  const targetMonth = resolveHebrewMonthForYear(currentHDate.getMonthName(), currentHDate.getFullYear() + 1);
  const oneYearLaterStart = new HDate(1, targetMonth, currentHDate.getFullYear() + 1).greg();
  const oneYearLater = new Date(oneYearLaterStart);
  oneYearLater.setDate(oneYearLater.getDate() - 1);
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    inputTimeMin: formatDate(startOfMonth),
    inputTimeMax: formatDate(oneYearLater),
    requestTimeMin: `${formatDate(startOfMonth)}T00:00:00.000Z`,
    requestTimeMax: `${formatDate(oneYearLater)}T23:59:59.999Z`,
  };
};

const hideAllHebcalDisplayOptions = () => {
  localStorage.setItem(
    'hebsync.calendar.displayOptions',
    JSON.stringify({
      showGregorian: true,
      showEventAges: true,
      showFasts: false,
      showHolidayEvents: false,
      showNationalHolidays: false,
      showRoshChodesh: false,
      showSpecialShabbat: false,
      showWeeklyParsha: false,
    }),
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

const flattenLocaleEntries = (value, prefix = '') => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return [[prefix, value]];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) =>
    flattenLocaleEntries(nestedValue, prefix ? `${prefix}.${key}` : key),
  );
};

describe('My Calendar Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
    sessionStorage.clear();
    vi.useRealTimers();
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

  it('should not contain suspicious runs of question marks in translations', () => {
    const allEntries = [
      ...flattenLocaleEntries(enLocale.translation),
      ...flattenLocaleEntries(heLocale.translation),
    ];

    for (const [, value] of allEntries) {
      expect(typeof value).toBe('string');
      expect(value).not.toMatch(/\?{3,}/);
    }
  });

  it('should render the dashboard header and logo', async () => {
    renderDashboard();
    expect((await screen.findAllByText('appNameFirst'))[0]).toBeInTheDocument();
    expect(await screen.findByTestId('logo')).toBeInTheDocument();
  }, 30000);

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

  it('should search events and show matching results', async () => {
    const expectedRange = getExpectedDefaultSearchRange();

    vi.mocked(googleApi.searchEvents).mockResolvedValueOnce([
      {
        id: 'evt-search',
        summary: 'Jerusalem Day',
        description: 'City celebration',
        calendarId: 'cal1',
        start: { date: '2026-05-18' },
      },
    ]);

    renderDashboard();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Search events' }))[0]);
    const searchInput = await screen.findByRole('textbox', { name: 'Search events' });

    fireEvent.change(searchInput, {
      target: { value: 'Jerusalem' },
    });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    expect(await screen.findByText('Matching events')).toBeInTheDocument();
    expect(await screen.findByText(/Showing events between/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Jerusalem Day/ })).toBeInTheDocument();
    expect(googleApi.searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        query: 'Jerusalem',
        calendarIds: ['cal1'],
        timeMin: expectedRange.requestTimeMin,
        timeMax: expectedRange.requestTimeMax,
      }),
    );
  });

  it('should prefill the search date range from the current month to one year ahead', async () => {
    const expectedRange = getExpectedDefaultSearchRange();
    const startBoundary = new HDate(new Date(`${expectedRange.inputTimeMin}T12:00:00`));
    const endBoundary = new HDate(new Date(`${expectedRange.inputTimeMax}T12:00:00`));

    renderDashboard();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Search events' }))[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Toggle advanced search' }));

    expect(await screen.findByLabelText('From date Month')).toHaveValue(startBoundary.getMonthName());
    expect(await screen.findByLabelText('To date Month')).toHaveValue(endBoundary.getMonthName());
    expect(await screen.findByLabelText('From date Hebrew year')).toHaveValue(String(startBoundary.getFullYear()));
    expect(await screen.findByLabelText('To date Hebrew year')).toHaveValue(String(endBoundary.getFullYear()));
  });

  it('should keep mobile search simple by default and reveal advanced filters on demand', async () => {
    renderDashboard();

    fireEvent.click(await screen.findByTestId('mobile-search-toggle'));
    expect(await screen.findByTestId('mobile-search-dialog')).toBeInTheDocument();
    expect(screen.queryByText('Search in')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByTestId('mobile-search-advanced-toggle'));

    expect(await screen.findByText('Search in')).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Selected calendars' })).toBeInTheDocument();
  });

  it('should expand the search range backward and forward by one year', async () => {
    const expectedRange = getExpectedDefaultSearchRange();
    const startBoundary = new HDate(new Date(`${expectedRange.inputTimeMin}T12:00:00`));
    const previousYearMonth = resolveHebrewMonthForYear(startBoundary.getMonthName(), startBoundary.getFullYear() - 1);
    const expandedBackwardMin = new HDate(1, previousYearMonth, startBoundary.getFullYear() - 1).greg();
    const endBoundary = new HDate(new Date(`${expectedRange.inputTimeMax}T12:00:00`));
    const currentForwardAnchor = new Date(`${expectedRange.inputTimeMax}T12:00:00`);
    currentForwardAnchor.setDate(currentForwardAnchor.getDate() + 1);
    const currentForwardAnchorHDate = new HDate(currentForwardAnchor);
    const nextYearMonth = resolveHebrewMonthForYear(
      currentForwardAnchorHDate.getMonthName(),
      currentForwardAnchorHDate.getFullYear() + 1,
    );
    const expandedForwardMaxStart = new HDate(
      1,
      nextYearMonth,
      currentForwardAnchorHDate.getFullYear() + 1,
    ).greg();
    const expandedForwardMax = new Date(expandedForwardMaxStart);
    expandedForwardMax.setDate(expandedForwardMax.getDate() - 1);
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    vi.mocked(googleApi.searchEvents).mockResolvedValue([
      {
        id: 'evt-search',
        summary: 'Jerusalem Day',
        description: 'City celebration',
        calendarId: 'cal1',
        start: { date: '2026-05-18' },
      },
    ]);

    renderDashboard();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Search events' }))[0]);
    fireEvent.click(await screen.findByTestId('desktop-search-submit'));
    expect(await screen.findByText('Matching events')).toBeInTheDocument();

    fireEvent.click(await screen.findByTestId('search-extend-backward'));

    await waitFor(() => {
      expect(vi.mocked(googleApi.searchEvents)).toHaveBeenLastCalledWith(
        expect.objectContaining({
          calendarIds: ['cal1'],
          timeMin: `${formatDate(expandedBackwardMin)}T00:00:00.000Z`,
          timeMax: expectedRange.requestTimeMax,
        }),
      );
    });

    fireEvent.click(await screen.findByTestId('search-extend-forward'));

    await waitFor(() => {
      expect(vi.mocked(googleApi.searchEvents)).toHaveBeenLastCalledWith(
        expect.objectContaining({
          calendarIds: ['cal1'],
          timeMin: `${formatDate(expandedBackwardMin)}T00:00:00.000Z`,
          timeMax: `${formatDate(expandedForwardMax)}T23:59:59.999Z`,
        }),
      );
    });
  });

  it('should remove a deleted event from active search results', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(googleApi.searchEvents).mockResolvedValueOnce([
      {
        id: 'evt-search',
        summary: 'Jerusalem Day',
        description: 'City celebration',
        calendarId: 'cal1',
        start: { date: '2026-05-18' },
      },
    ]);
    vi.mocked(googleApi.deleteEvent).mockResolvedValueOnce(true);

    renderDashboard();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Search events' }))[0]);
    const searchInput = await screen.findByRole('textbox', { name: 'Search events' });

    fireEvent.change(searchInput, {
      target: { value: 'Jerusalem' },
    });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    const searchResultButton = await screen.findByRole('button', { name: /Jerusalem Day/ });
    fireEvent.click(searchResultButton);
    fireEvent.click(await screen.findByRole('button', { name: 'delete' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Jerusalem Day/ })).not.toBeInTheDocument();
    });
    expect(screen.getByText('0 results')).toBeInTheDocument();
  });

  it('should refresh recurring search results after deleting an entire series', async () => {
    vi.mocked(googleApi.searchEvents)
      .mockResolvedValueOnce([
        {
          id: 'evt-occ-1',
          recurringEventId: 'series1',
          summary: 'Weekly Event',
          calendarId: 'cal1',
          start: { date: '2026-05-18' },
          originalStartTime: { date: '2026-05-18' },
        },
        {
          id: 'evt-occ-2',
          recurringEventId: 'series1',
          summary: 'Weekly Event',
          calendarId: 'cal1',
          start: { date: '2026-05-25' },
          originalStartTime: { date: '2026-05-25' },
        },
      ])
      .mockResolvedValueOnce([]);
    vi.mocked(googleApi.deleteRecurringEventScope).mockResolvedValueOnce(true);

    renderDashboard();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Search events' }))[0]);
    const searchInput = await screen.findByRole('textbox', { name: 'Search events' });
    fireEvent.change(searchInput, {
      target: { value: 'Weekly' },
    });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    const resultButtons = await screen.findAllByRole('button', { name: /Weekly Event/ });
    expect(resultButtons).toHaveLength(2);

    fireEvent.click(resultButtons[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete selected scope' }));

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Weekly Event/ })).not.toBeInTheDocument();
    });
    expect(googleApi.searchEvents.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('should refresh search results after updating an event', async () => {
    vi.mocked(googleApi.searchEvents)
      .mockResolvedValueOnce([
        {
          id: 'evt-search',
          summary: 'Jerusalem Day',
          description: 'City celebration',
          calendarId: 'cal1',
          start: { date: '2026-05-18' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'evt-search',
          summary: 'Jerusalem Day Updated',
          description: 'Updated celebration',
          calendarId: 'cal1',
          start: { date: '2026-05-18' },
        },
      ]);
    vi.mocked(googleApi.updateEvent).mockResolvedValueOnce({
      id: 'evt-search',
      summary: 'Jerusalem Day Updated',
      description: 'Updated celebration',
      calendarId: 'cal1',
      start: { date: '2026-05-18' },
    });

    renderDashboard();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Search events' }))[0]);
    const searchInput = await screen.findByRole('textbox', { name: 'Search events' });
    fireEvent.change(searchInput, {
      target: { value: 'Jerusalem' },
    });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    fireEvent.click(await screen.findByRole('button', { name: /Jerusalem Day/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'edit' }));

    const titleInput = screen.getByPlaceholderText('eventName');
    const descriptionInput = screen.getByPlaceholderText('description');
    fireEvent.change(titleInput, { target: { value: 'Jerusalem Day Updated' } });
    fireEvent.change(descriptionInput, { target: { value: 'Updated celebration' } });
    fireEvent.click(screen.getByRole('button', { name: 'save' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Jerusalem Day Updated/ })).toBeInTheDocument();
    });
    expect(googleApi.searchEvents.mock.calls.length).toBeGreaterThanOrEqual(2);
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
    fireEvent.click(dayButtons[0].closest('[data-calendar-day-cell="true"]'));

    expect(
      await screen.findByText('addEventTitle', {}, { timeout: 15000 }),
    ).toBeInTheDocument();
    const [, yearSelect, monthSelect, daySelect] = screen.getAllByRole('combobox');

    expect(yearSelect.value).not.toBe('');
    expect(monthSelect.value).not.toBe('');
    expect(daySelect.value).not.toBe('');
    expect(mockNavigate).not.toHaveBeenCalledWith('/add-event', expect.anything());
  });

  it('should open add event modal from the floating add button', async () => {
    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'addEvent' }));

    expect(
      await screen.findByText('addEventTitle', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('add-event-dialog')).toHaveClass('md:max-w-4xl');
    expect(mockNavigate).not.toHaveBeenCalledWith('/add-event');
  });

  it('should ask for confirmation before closing add event modal from the backdrop', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'addEvent' }));
    expect(
      await screen.findByText('addEventTitle', {}, { timeout: 5000 }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('add-event-modal-backdrop'));

    expect(window.confirm).toHaveBeenCalledWith('Discard event draft?');
    expect(screen.getByText('addEventTitle')).toBeInTheDocument();
  });

  it('should close add event modal when backdrop confirmation is accepted', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'addEvent' }));
    expect(
      await screen.findByText('addEventTitle', {}, { timeout: 5000 }),
    ).toBeInTheDocument();

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
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValue([
      { id: 'evt1', summary: 'Event 1', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt2', summary: 'Event 2', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt3', summary: 'Event 3', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt4', summary: 'Event 4', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt5', summary: 'Event 5', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
    ]);

    renderDashboard();

    const moreButton = await screen.findByLabelText(/more events/i);
    fireEvent.click(moreButton);

    expect(await screen.findByTestId('day-events-popover')).toBeInTheDocument();
  });

  it('should close the overflow day dialog when pressing Escape', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValue([
      { id: 'evt1', summary: 'Event 1', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt2', summary: 'Event 2', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt3', summary: 'Event 3', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt4', summary: 'Event 4', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt5', summary: 'Event 5', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
    ]);

    renderDashboard();

    const moreButton = await screen.findByLabelText(/more events/i);
    moreButton.focus();
    fireEvent.click(moreButton);
    expect(await screen.findByTestId('day-events-popover')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('day-events-popover').querySelectorAll('button')[0]).toHaveFocus();
    });

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('day-events-popover')).not.toBeInTheDocument();
    });
  });

  it('should return focus to the + more button after closing the overflow day dialog', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValue([
      { id: 'evt1', summary: 'Event 1', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt2', summary: 'Event 2', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt3', summary: 'Event 3', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt4', summary: 'Event 4', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
      { id: 'evt5', summary: 'Event 5', calendarId: 'cal1', start: { date: '2026-05-18' }, extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } } },
    ]);

    renderDashboard();

    const moreButton = await screen.findByLabelText(/more events/i);
    moreButton.focus();
    fireEvent.click(moreButton);
    expect(await screen.findByTestId('day-events-popover')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('day-events-popover')).not.toBeInTheDocument();
    });
    expect(moreButton).toHaveFocus();
  });

  it('should focus the first display option and return focus to the toggle when it closes', async () => {
    renderDashboard();

    const displayOptionsToggle = await screen.findByTestId('display-options-toggle');
    fireEvent.click(displayOptionsToggle);

    const firstDisplayOption = await screen.findByRole('checkbox', { name: 'Show Gregorian dates' });
    await waitFor(() => {
      expect(firstDisplayOption).toHaveFocus();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('display-options-menu')).not.toBeInTheDocument();
    });
    expect(displayOptionsToggle).toHaveFocus();
  });

  it('should expose pressed state for the active calendar view toggle', async () => {
    renderDashboard();

    const monthButton = await screen.findByRole('button', { name: 'Month' });
    const scheduleButton = await screen.findByRole('button', { name: 'Schedule' });

    expect(monthButton).toHaveAttribute('aria-pressed', 'true');
    expect(scheduleButton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(scheduleButton);

    expect(monthButton).toHaveAttribute('aria-pressed', 'false');
    expect(scheduleButton).toHaveAttribute('aria-pressed', 'true');
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
        start: { dateTime: '2026-05-18T08:00:00.000Z' },
        end: { dateTime: '2026-05-18T09:00:00.000Z' },
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

  it('should show a deleting state after confirming event deletion', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValue([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValue([
      {
        id: 'evt1',
        summary: 'Event 1',
        description: 'Event description',
        calendarId: 'cal1',
        start: { dateTime: '2026-05-18T08:00:00.000Z' },
        end: { dateTime: '2026-05-18T09:00:00.000Z' },
        extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } },
      },
    ]);
    vi.mocked(googleApi.deleteEvent).mockImplementationOnce(
      () => new Promise(() => {}),
    );

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }));
    fireEvent.click(await screen.findByText((content) => content.includes('Event 1')));
    fireEvent.click(await screen.findByRole('button', { name: 'delete' }));

    expect(await screen.findByRole('button', { name: 'Deleting...' })).toBeDisabled();
  });

  it('should open a recurring delete dialog with entire series selected by default', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValue([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValue([
      {
        id: 'evt1',
        recurringEventId: 'series1',
        summary: 'Recurring event',
        description: 'Event description',
        calendarId: 'cal1',
        start: { date: '2026-05-18' },
        originalStartTime: { date: '2026-05-18' },
        extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } },
      },
    ]);

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }));
    fireEvent.click(await screen.findByText((content) => content.includes('Recurring event')));
    fireEvent.click(await screen.findByRole('button', { name: 'delete' }));

    expect(await screen.findByText('Delete recurring event')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Entire series/ })).toBeChecked();
  });

  it('should apply recurring delete to the default entire-series scope', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValue([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValue([
      {
        id: 'evt1',
        recurringEventId: 'series1',
        summary: 'Recurring event',
        description: 'Event description',
        calendarId: 'cal1',
        start: { date: '2026-05-18' },
        originalStartTime: { date: '2026-05-18' },
        extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } },
      },
    ]);
    vi.mocked(googleApi.deleteRecurringEventScope).mockResolvedValueOnce(true);

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }));
    fireEvent.click(await screen.findByText((content) => content.includes('Recurring event')));
    fireEvent.click(await screen.findByRole('button', { name: 'delete' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete selected scope' }));

    expect(googleApi.deleteRecurringEventScope).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'evt1',
        recurringEventId: 'series1',
      }),
      'series',
    );
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
        start: { date: '2026-05-18' },
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
        start: { dateTime: '2026-05-18T08:00:00.000Z' },
        end: { dateTime: '2026-05-18T09:00:00.000Z' },
        extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } },
      },
    ]);

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }));

    expect(await screen.findByRole('button', { name: /Event 1/ })).toBeInTheDocument();
  });

  it('should not show the month empty state when visible events exist', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValue([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValue([
      {
        id: 'evt1',
        summary: 'Visible Month Event',
        calendarId: 'cal1',
        start: { date: '2026-05-18' },
        extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } },
      },
    ]);

    renderDashboard();

    expect(await screen.findByText(/Visible Month Event/)).toBeInTheDocument();
    expect(screen.queryByText('The selected calendars do not have events in this time range.')).not.toBeInTheDocument();
  });

  it('should show schedule events on mobile', async () => {
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
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValue([
      {
        id: 'evt1',
        summary: 'Mobile Event',
        calendarId: 'cal1',
        start: { dateTime: '2026-05-18T08:00:00.000Z' },
        end: { dateTime: '2026-05-18T09:00:00.000Z' },
        extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } },
      },
    ]);

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }));
    expect(
      await screen.findByRole('button', { name: /Mobile Event/ }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('The selected calendars do not have events in this time range.')).not.toBeInTheDocument();
    });

    window.innerWidth = originalWidth;
  });

  it('should navigate between months when swiping on mobile', async () => {
    const originalWidth = window.innerWidth;
    window.innerWidth = 375;
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValue([]);

    renderDashboard();

    await screen.findByTestId('calendar-surface');

    const initialCallCount = vi.mocked(googleApi.fetchEventsInRange).mock.calls.length;
    const calendarSurface = screen.getByTestId('calendar-surface');

    fireEvent.touchStart(calendarSurface, {
      touches: [{ clientX: 280, clientY: 220 }],
    });
    fireEvent.touchMove(calendarSurface, {
      touches: [{ clientX: 180, clientY: 228 }],
    });
    fireEvent.touchEnd(calendarSurface, {
      changedTouches: [{ clientX: 180, clientY: 228 }],
    });

    await waitFor(() => {
      expect(vi.mocked(googleApi.fetchEventsInRange).mock.calls.length).toBeGreaterThan(initialCallCount);
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
    hideAllHebcalDisplayOptions();

    renderDashboard();

    expect(await screen.findByText('noCalendarsAvailable')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByTestId('calendar-loading-state')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Schedule' }));
    expect(await screen.findByText('No calendars are available yet. Create a calendar from the sidebar to start adding events.')).toBeInTheDocument();
  });

  it('should show a distinct empty state when calendars exist but none are selected', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'Personal',
        accessRole: 'owner',
      },
    ]);
    hideAllHebcalDisplayOptions();

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }));
    expect(await screen.findByText('There are calendars available, but none are selected. Choose one or more calendars from the sidebar.')).toBeInTheDocument();
  });

  it('should show a distinct empty state when selected calendars have no events in range', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      {
        id: 'cal1',
        summary: 'HebSync',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
      },
    ]);
    vi.mocked(googleApi.fetchEventsInRange).mockResolvedValueOnce([]);
    hideAllHebcalDisplayOptions();

    renderDashboard();

    fireEvent.click(await screen.findByRole('button', { name: 'Schedule' }));
    expect(await screen.findByText('The selected calendars do not have events in this time range.')).toBeInTheDocument();
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

  it('should auto-open the login modal and explain auth is required for unauthenticated calendar visits', async () => {
    vi.mocked(googleApi.getAccessToken).mockReturnValueOnce(null);
    vi.mocked(googleApi.fetchSession).mockResolvedValueOnce(null);

    render(
      <BrowserRouter>
        <MyCalendar />
      </BrowserRouter>
    );

    expect(await screen.findByTestId('login-modal')).toBeInTheDocument();
    expect(await screen.findByText('Connect your Google account to view calendars and start managing Hebrew events here.')).toBeInTheDocument();
    expect(await screen.findAllByText('login')).not.toHaveLength(0);
  });

  it('should open the login modal in connect mode when unauthenticated user clicks login', async () => {
    vi.mocked(googleApi.getAccessToken).mockReturnValueOnce(null);
    vi.mocked(googleApi.fetchSession).mockResolvedValueOnce(null);
    render(
      <BrowserRouter>
        <MyCalendar />
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('login'));
    expect(await screen.findByText('connect')).toBeInTheDocument();
  });

  it('should open event details when clicking an event chip in month view and not open add event modal', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'));
    try {
      vi.mocked(googleApi.fetchAllCalendars).mockResolvedValue([
        {
          id: 'cal1',
          summary: 'HebSync',
          accessRole: 'owner',
          description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
        },
      ]);
      vi.mocked(googleApi.fetchEventsInRange).mockResolvedValue([
        {
          id: 'evt1',
          summary: 'Month Event 1',
          description: 'Event description',
          calendarId: 'cal1',
          start: { date: '2026-05-18' },
          extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', originalHebrewYear: '5770' } },
        },
      ]);

      renderDashboard();

      // Find the event chip
      const eventChips = await screen.findAllByTestId('event-chip');
      expect(eventChips[0]).toBeInTheDocument();
      expect(eventChips[0]).toHaveTextContent('Month Event 1');

      // Click the event chip
      fireEvent.click(eventChips[0]);

      // Verify event details modal is open
      expect(await screen.findByText('eventDetails')).toBeInTheDocument();
      expect(await screen.findByRole('heading', { name: /Month Event 1/ })).toBeInTheDocument();

      // Verify add event modal did NOT open
      expect(screen.queryByText('addEventTitle')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('should open holiday details when clicking a hebcal holiday chip in month view and not open add event modal', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-18T12:00:00Z'));
    try {
      localStorage.setItem(
        'hebsync.calendar.displayOptions',
        JSON.stringify({
          showGregorian: true,
          showEventAges: true,
          showFasts: true,
          showHolidayEvents: true,
          showNationalHolidays: true,
          showRoshChodesh: true,
          showSpecialShabbat: true,
          showWeeklyParsha: true,
        }),
      );

      vi.mocked(googleApi.fetchAllCalendars).mockResolvedValue([
        {
          id: 'cal1',
          summary: 'HebSync',
          accessRole: 'owner',
          description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
        },
      ]);
      vi.mocked(googleApi.fetchEventsInRange).mockResolvedValue([]);

      renderDashboard();

      // Find the holiday chip
      const holidayChips = await screen.findAllByTestId('hebcal-chip');
      expect(holidayChips[0]).toBeInTheDocument();

      // Click the holiday chip
      fireEvent.click(holidayChips[0]);

      // Verify day/holiday details modal is open
      expect(await screen.findByText('Day details')).toBeInTheDocument();

      // Verify add event modal did NOT open
      expect(screen.queryByText('addEventTitle')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
