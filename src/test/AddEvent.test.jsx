import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AddEvent from '../pages/AddEvent';
import * as googleApi from '../utils/googleApi';
import { GCAL_AUTH_EXPIRED_EVENT } from '../utils/googleApi';

let mockSheetRows = [];

vi.mock('xlsx', () => ({
  read: vi.fn(() => ({
    SheetNames: ['Events'],
    Sheets: { Events: { __mock: true } },
  })),
  utils: {
    sheet_to_json: vi.fn(() => mockSheetRows),
  },
}));

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
  fetchGoogleCalendarColors: vi.fn(() => Promise.resolve({ calendar: {} })),
  fetchSession: vi.fn(() => Promise.resolve({ scopeMode: 'all_events' })),
  authenticateWithGoogle: vi.fn(),
  revokeAccess: vi.fn(),
  logout: vi.fn(),
  createHebcalEvent: vi.fn(),
  createNewCalendar: vi.fn(),
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

const renderAddEvent = (props = {}) => {
  return render(
    <MemoryRouter>
      <AddEvent {...props} />
    </MemoryRouter>
  );
};

const BULK_IMPORT_HEADERS = ['שם האירוע', 'קטגוריה', 'הערות', 'שנת מקור', 'חודש', 'יום', 'מופעים'];

const setMockWorkbookRows = (rows) => {
  mockSheetRows = [BULK_IMPORT_HEADERS, ...rows];
};

const makeMockWorkbookFile = () => ({
  name: 'events.xlsx',
  arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
});

describe('AddEvent Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSheetRows = [];
  });

  it('should render the form headers', () => {
    renderAddEvent();
    expect(screen.getByText('addEventTitle')).toBeInTheDocument();
    expect(screen.getByText('eventName')).toBeInTheDocument();
  });

  it('should not have any calendar selected by default', async () => {
    renderAddEvent();
    expect(await screen.findByText('selectTargetCalendars')).toBeInTheDocument();
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

  it('should require selecting at least one calendar before opening preview', async () => {
    renderAddEvent();

    fireEvent.change(screen.getByLabelText('eventName'), {
      target: { value: 'Birthday' },
    });

    fireEvent.click(screen.getByText('showPreview'));

    const calendarSelection = await screen.findByText('selectTargetCalendars');
    expect(await screen.findByText('errorNoCalendar')).toBeInTheDocument();
    expect(calendarSelection.closest('[aria-invalid="true"]')).toBeInTheDocument();
    expect(screen.queryByText('preview')).not.toBeInTheDocument();
  }, 15000);

  it('should mark the event title field invalid when preview is requested without a title', async () => {
    renderAddEvent();

    fireEvent.click(screen.getByText('showPreview'));

    const titleInput = screen.getByLabelText('eventName');
    expect(await screen.findByText('errorNoTitle')).toBeInTheDocument();
    expect(titleInput).toHaveAttribute('aria-invalid', 'true');
    expect(titleInput).toHaveAttribute('aria-describedby', 'event-title-error');
    expect(screen.queryByText('preview')).not.toBeInTheDocument();
  });

  it('should allow clearing and retyping the occurrences count before blur normalization', () => {
    renderAddEvent();

    const syncSpanInput = screen.getByLabelText('howManyOccurrences');
    expect(syncSpanInput).toHaveValue('121');

    fireEvent.change(syncSpanInput, { target: { value: '' } });
    expect(syncSpanInput).toHaveValue('');

    fireEvent.change(syncSpanInput, { target: { value: '12' } });
    expect(syncSpanInput).toHaveValue('12');

    fireEvent.blur(syncSpanInput);
    expect(syncSpanInput).toHaveValue('12');
  });

  it('should show a clear empty state when no calendars are available', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([]);

    renderAddEvent();

    expect(await screen.findByText('selectTargetCalendars')).toBeInTheDocument();
    expect(await screen.findByText('noCalendarsForEventCreation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'createCalendarToContinue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'refreshCalendars' })).toBeInTheDocument();
  });

  it('should create a calendar from the empty state and refresh the list', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('New Calendar');
    vi.mocked(googleApi.fetchAllCalendars)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'cal1', summary: 'New Calendar', accessRole: 'owner' }
      ]);

    renderAddEvent();

    fireEvent.click(await screen.findByRole('button', { name: 'createCalendarToContinue' }));

    await waitFor(() => {
      expect(googleApi.createNewCalendar).toHaveBeenCalledWith('New Calendar');
      expect(screen.getByText('New Calendar')).toBeInTheDocument();
    });
  });

  it('should notify the parent when a calendar is created from the empty state', async () => {
    const onCalendarsChanged = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'prompt').mockReturnValue('New Calendar');
    vi.mocked(googleApi.fetchAllCalendars)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'cal1', summary: 'New Calendar', accessRole: 'owner' }
      ]);

    renderAddEvent({ onCalendarsChanged });

    fireEvent.click(await screen.findByRole('button', { name: 'createCalendarToContinue' }));

    await waitFor(() => {
      expect(onCalendarsChanged).toHaveBeenCalledTimes(1);
    });
  });

  it('should prefill the clicked day as a Gregorian date when opened from the calendar', async () => {
    renderAddEvent({
      prefillDate: {
        gregorianDate: '2026-05-07',
        hebrewYear: '5786',
        hebrewMonth: 'Iyyar',
        hebrewDay: 20,
      },
    });

    await waitFor(() => {
      const gregorianToggle = screen.getByRole('checkbox', { name: 'enterGregorian' });
      const [categorySelect, yearSelect, monthSelect, daySelect] = screen.getAllByRole('combobox');

      expect(gregorianToggle).not.toBeChecked();
      expect(categorySelect).toHaveValue('birthday');
      expect(yearSelect).toHaveValue('5786');
      expect(monthSelect).toHaveValue('Iyyar');
      expect(daySelect).toHaveValue('20');
    });
  });

  it('should open the login modal in reauthorize mode when the Google session expires', async () => {
    renderAddEvent();
    act(() => {
      window.dispatchEvent(new CustomEvent(GCAL_AUTH_EXPIRED_EVENT));
    });
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

    await screen.findByText('selectTargetCalendars');
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[checkboxes.length - 1]);

    fireEvent.click(screen.getByText('showPreview'));
    expect(await screen.findByText('preview')).toBeInTheDocument();

    fireEvent.click(screen.getByText('confirmAndSync'));
    await waitFor(() => {
      expect(googleApi.createHebcalEvent).toHaveBeenCalled();
    });
    expect(await screen.findByText('reauthorize', {}, { timeout: 10000 })).toBeInTheDocument();
  }, 15000);

  it('should hide read-only calendars by default and reveal them as disabled when toggled', async () => {
    vi.mocked(googleApi.fetchAllCalendars).mockResolvedValueOnce([
      { id: 'cal1', summary: 'Personal', accessRole: 'owner' },
      { id: 'cal2', summary: 'Team Calendar', accessRole: 'reader' },
    ]);

    renderAddEvent();

    expect(await screen.findByText('Personal')).toBeInTheDocument();
    expect(screen.queryByText('Team Calendar')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: 'showReadOnlyCalendars' }));

    expect(await screen.findByText('Team Calendar')).toBeInTheDocument();
    expect(screen.getByText('readOnlyCalendarBadge')).toBeInTheDocument();

    const teamCheckbox = screen.getAllByRole('checkbox').find((checkbox) => checkbox.disabled);
    expect(teamCheckbox).toBeDefined();
    expect(teamCheckbox.checked).toBe(false);
  });

  it('should ask for an editing upgrade before syncing in all-calendars view mode', async () => {
    vi.mocked(googleApi.fetchSession).mockResolvedValueOnce({ scopeMode: 'read_only' });

    renderAddEvent();

    fireEvent.change(screen.getAllByRole('textbox')[0], {
      target: { value: 'Birthday' },
    });

    await screen.findByText('selectTargetCalendars');
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[checkboxes.length - 1]);

    fireEvent.click(screen.getByText('showPreview'));
    expect(await screen.findByText('preview')).toBeInTheDocument();

    fireEvent.click(screen.getByText('allowEditingToContinue'));
    expect(await screen.findByText('upgrade')).toBeInTheDocument();
  });

  it('should show an excel file picker in the import tab', async () => {
    const { container } = renderAddEvent();

    fireEvent.click(screen.getByText('uploadWorkbook'));

    expect(screen.getByText('bulkImportUploadTitle')).toBeInTheDocument();
    expect(screen.getByText('bulkImportNoFileYet')).toBeInTheDocument();
    expect(screen.queryByText('bulkImportPreviewButton')).not.toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [makeMockWorkbookFile()] } });

    expect(await screen.findByText('bulkImportPreviewButton')).toBeInTheDocument();
  });

  it('should keep import disabled for special dates until a fallback is selected', async () => {
    setMockWorkbookRows([
      ['יום הולדת א', 'יום הולדת', '', '5784', 'חשוון', 'ל', '2'],
    ]);

    const { container } = renderAddEvent();
    fireEvent.click(screen.getByText('uploadWorkbook'));

    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [makeMockWorkbookFile()] } });

    fireEvent.click(await screen.findByText('bulkImportPreviewButton'));
    expect(await screen.findByText('bulkImportRowNeedsDecision')).toBeInTheDocument();

    const checkboxes = await screen.findAllByRole('checkbox');
    fireEvent.click(checkboxes[checkboxes.length - 1]);

    const importButton = await screen.findByText('bulkImportConfirmButton');
    expect(importButton).toBeDisabled();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '29th' } });

    await waitFor(() => {
      expect(screen.getByText('bulkImportRowDecisionSelected')).toBeInTheDocument();
      expect(importButton).not.toBeDisabled();
    });
  });

  it('should allow removing invalid import rows', async () => {
    setMockWorkbookRows([
      ['אירוע שגוי', 'יום הולדת', '', '5784', 'ניסן', '40', '1'],
    ]);

    const { container } = renderAddEvent();
    fireEvent.click(screen.getByText('uploadWorkbook'));

    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [makeMockWorkbookFile()] } });

    fireEvent.click(await screen.findByText('bulkImportPreviewButton'));
    expect(await screen.findByText('התאריך לא קיים בשנת המקור')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'bulkImportRemoveRow' }));

    await waitFor(() => {
      expect(screen.queryByText('אירוע שגוי')).not.toBeInTheDocument();
      expect(screen.queryByText('bulkImportPreviewResults')).not.toBeInTheDocument();
    });
  });
});
