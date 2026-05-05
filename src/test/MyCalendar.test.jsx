import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MyCalendar from '../pages/MyCalendar';
import * as googleApi from '../utils/googleApi';
import { GCAL_AUTH_EXPIRED_EVENT } from '../utils/googleApi';

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
    t: (key) => key,
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

describe('My Calendar Component', () => {
  it('should render the dashboard header and logo', () => {
    renderDashboard();
    expect(screen.getAllByText('appNameFirst')[0]).toBeInTheDocument();
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('should have Select All and Clear All buttons in the sidebar', async () => {
    renderDashboard();
    const selectAllBtns = await screen.findAllByText('selectAll');
    const clearAllBtns = await screen.findAllByText('clearAll');
    expect(selectAllBtns.length).toBeGreaterThan(0);
    expect(clearAllBtns.length).toBeGreaterThan(0);
  });

  it('should have external events toggle', () => {
    renderDashboard();
    const externalToggle = screen.getAllByText('externalEvents');
    expect(externalToggle.length).toBeGreaterThan(0);
  });

  it('should show a refresh button near the calendars header', async () => {
    renderDashboard();
    expect(await screen.findByRole('button', { name: 'Refresh calendars' })).toBeInTheDocument();
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

    fireEvent.click(await screen.findByRole('button', { name: /יומנים נוספים/i }));

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

    expect(await screen.findByRole('button', { name: /יומני HebSync/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /יומנים נוספים/i })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Personal' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /יומנים נוספים/i }));

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
