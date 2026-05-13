import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyCalendarSidebar from '../components/MyCalendarSidebar';

vi.mock('../components/LegalLinks', () => ({
  default: () => <div data-testid="legal-links" />,
}));

describe('MyCalendarSidebar', () => {
  const t = (key: string, options?: Record<string, unknown>) =>
    (options?.defaultValue as string | undefined) || key;

  const buildProps = () => ({
    isRtl: true,
    isSidebarOpen: true,
    setIsSidebarOpen: vi.fn(),
    menuLabel: 'menu',
    t,
    handleChangePermissions: vi.fn(),
    handleDisableEditing: vi.fn(),
    isAllCalendarsMode: true,
    hasWriteAccess: false,
    promptForEditingUpgrade: vi.fn(),
    calendars: [
      {
        id: 'cal1',
        summary: 'HebSync 1',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
        color: '#0038A8',
      },
      {
        id: 'cal2',
        summary: 'Other Calendar',
        accessRole: 'reader',
        color: '#999999',
      },
    ],
    isFetchingGoogle: false,
    refreshCalendarsLabel: 'Refresh calendars',
    handleRefreshCalendars: vi.fn(),
    handleCreateCalendar: vi.fn(),
    allCalendarsGroupLabel: 'All Calendars',
    selectAllCalendars: vi.fn(),
    deselectAllCalendars: vi.fn(),
    hebSyncGroupLabel: 'HebSync Calendars',
    otherCalendarsGroupLabel: 'Other Calendars',
    hebSyncCalendars: [
      {
        id: 'cal1',
        summary: 'HebSync 1',
        accessRole: 'owner',
        description: 'Created by HebCal-Sync. [ID:hebcal-sync-app]',
        color: '#0038A8',
      },
    ],
    otherCalendars: [
      {
        id: 'cal2',
        summary: 'Other Calendar',
        accessRole: 'reader',
        color: '#999999',
      },
    ],
    isHebSyncGroupOpen: true,
    setIsHebSyncGroupOpen: vi.fn(),
    isOtherGroupOpen: true,
    setIsOtherGroupOpen: vi.fn(),
    noCalendarsAvailableLabel: 'No calendars yet',
    selectedCalendarIds: ['cal1'],
    selectedCountSuffix: 'selected',
    selectCalendarsByIds: vi.fn(),
    deselectCalendarsByIds: vi.fn(),
    toggleCalendar: vi.fn(),
    handleOpenLanding: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders action controls and triggers the main sidebar callbacks', () => {
    const props = buildProps();

    render(<MyCalendarSidebar {...props} />);

    fireEvent.click(screen.getByText('switchToHebsyncOnly'));
    fireEvent.click(screen.getByText('enableEditing'));
    fireEvent.click(screen.getByLabelText('Refresh calendars'));
    fireEvent.click(screen.getByText('+ new'));
    fireEvent.click(
      screen.getByRole('button', {
        name: /אודות HebSync/i,
      }),
    );
    fireEvent.click(screen.getAllByText('selectAll')[0]);
    fireEvent.click(screen.getAllByText('clearAll')[0]);

    expect(props.handleChangePermissions).toHaveBeenCalled();
    expect(props.promptForEditingUpgrade).toHaveBeenCalled();
    expect(props.handleRefreshCalendars).toHaveBeenCalled();
    expect(props.handleCreateCalendar).toHaveBeenCalled();
    expect(props.handleOpenLanding).toHaveBeenCalled();
    expect(props.selectAllCalendars).toHaveBeenCalled();
    expect(props.deselectAllCalendars).toHaveBeenCalled();
  }, 15000);

  it('supports per-group selection, toggles, and empty-state rendering', () => {
    const props = buildProps();
    const { rerender } = render(<MyCalendarSidebar {...props} />);

    fireEvent.click(screen.getAllByText('selectAll')[1]);
    fireEvent.click(screen.getAllByText('clearAll')[1]);
    fireEvent.click(screen.getByLabelText('Other Calendar'));
    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.click(screen.getByText('menu').nextElementSibling as Element);

    expect(props.selectCalendarsByIds).toHaveBeenCalledWith(['cal1']);
    expect(props.deselectCalendarsByIds).toHaveBeenCalledWith(['cal1']);
    expect(props.toggleCalendar).toHaveBeenCalledWith('cal2');
    expect(props.setIsSidebarOpen).toHaveBeenCalledWith(false);

    rerender(
      <MyCalendarSidebar
        {...props}
        calendars={[]}
        hebSyncCalendars={[]}
        otherCalendars={[]}
      />,
    );

    expect(screen.getByText('No calendars yet')).toBeInTheDocument();
  });
});
