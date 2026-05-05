import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AddEvent from '../pages/AddEvent';
import * as googleApi from '../utils/googleApi';
import { GCAL_AUTH_EXPIRED_EVENT } from '../utils/googleApi';

vi.mock('../utils/googleApi', () => ({
  GCAL_AUTH_EXPIRED_EVENT: 'gcal-auth-expired',
  getAccessToken: vi.fn(() => 'mock-token'),
  getScopeMode: vi.fn(() => 'all_events'),
  canEditCalendars: vi.fn((scopeMode) => scopeMode === 'app_created' || scopeMode === 'all_events'),
  SCOPE_MODES: {
    APP_CREATED: 'app_created',
    READ_ONLY: 'read_only',
    ALL_EVENTS: 'all_events',
  },
  fetchAllCalendars: vi.fn(() => Promise.resolve([
    { id: 'cal1', summary: 'Personal', accessRole: 'owner' }
  ])),
  fetchSession: vi.fn(() => Promise.resolve({ scopeMode: 'all_events' })),
  authenticateWithGoogle: vi.fn(),
  revokeAccess: vi.fn(),
  createHebcalEvent: vi.fn(),
  isAuthError: vi.fn((error) => error?.code === 'AUTH_EXPIRED'),
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

// Mock Logo
vi.mock('../components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>
}));

vi.mock('../components/LoginModal', () => ({
  default: ({ isOpen, mode }) =>
    isOpen ? <div data-testid="login-modal">{mode}</div> : null
}));

const renderAddEvent = () => {
  return render(
    <BrowserRouter>
      <AddEvent />
    </BrowserRouter>
  );
};

describe('AddEvent Component', () => {
  it('should render the form headers', () => {
    renderAddEvent();
    expect(screen.getByText('addEventTitle')).toBeInTheDocument();
    expect(screen.getByText('eventName')).toBeInTheDocument();
  });

  it('should not have any calendar selected by default', async () => {
    renderAddEvent();
    const selectAllBtn = await screen.findByText('selectAll');
    expect(selectAllBtn).toBeInTheDocument();
    // Check that no checkbox is checked
    const checkboxes = screen.getAllByRole('checkbox');
    const calendarCheckboxes = checkboxes.filter(cb => !cb.name || cb.name === 'calendar-selection'); // filters out the gregorian toggle
    calendarCheckboxes.forEach(cb => {
      if (cb.id !== 'gregorian-toggle') { // simple check to avoid the toggle
        expect(cb.checked).toBe(false);
      }
    });
  });

  it('should show Hebrew/Gregorian toggle option', () => {
    renderAddEvent();
    expect(screen.getByText('enterGregorian')).toBeInTheDocument();
  });

  it('should open the login modal in reauthorize mode when the Google session expires', async () => {
    renderAddEvent();
    window.dispatchEvent(new CustomEvent(GCAL_AUTH_EXPIRED_EVENT));
    expect(await screen.findByText('reauthorize')).toBeInTheDocument();
  });

  it('should reopen login modal in reauthorize mode after submit gets a 401-style error', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(googleApi.createHebcalEvent).mockRejectedValueOnce(new Error('401 unauthorized'));

    renderAddEvent();

    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: 'Birthday' },
    });

    await screen.findByText('selectAll');
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[checkboxes.length - 1]);

    fireEvent.click(screen.getByText('showPreview'));
    expect(await screen.findByText('preview')).toBeInTheDocument();

    fireEvent.click(screen.getByText('confirmAndSync'));
    expect(await screen.findByText('reauthorize')).toBeInTheDocument();
  });

  it('should ask for an editing upgrade before syncing in all-calendars view mode', async () => {
    vi.mocked(googleApi.fetchSession).mockResolvedValueOnce({ scopeMode: 'read_only' });

    renderAddEvent();

    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: 'Birthday' },
    });

    await screen.findByText('selectAll');
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[checkboxes.length - 1]);

    fireEvent.click(screen.getByText('showPreview'));
    expect(await screen.findByText('preview')).toBeInTheDocument();

    fireEvent.click(screen.getByText('allowEditingToContinue'));
    expect(await screen.findByText('upgrade')).toBeInTheDocument();
  });
});
