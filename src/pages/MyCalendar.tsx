import { useState, useEffect, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, LogIn, LogOut, X, Menu, LoaderCircle, Download, Search } from 'lucide-react';
import Logo from '../components/Logo';
import LoginModal from '../components/LoginModal';
import AddEvent from './AddEvent';
import {
  isRecurringEvent,
  revokeAccess,
  searchEvents,
  SCOPE_MODES,
  supportsFutureScopedChanges,
  type RecurringEventActionScope,
} from '../utils/googleApi';
import {
  buildMonthDays,
  buildScheduleDays,
  getEventOccurrenceHebrewYear,
  getHebrewMonthMeta,
  getNextMonthHDate,
  getOverflowPopoverLayout,
  getPrevMonthHDate,
} from '../utils/calendarView';

import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import {
  CalendarToolbar,
  DesktopCalendarSearch,
  MobileTextSearchDialog,
  MonthCalendarView,
  SearchResultsView,
  ScheduleCalendarView,
  DayEventsPopover,
} from '../components/MyCalendarViews';
import MyCalendarSidebar from '../components/MyCalendarSidebar';
import useMyCalendarData from '../hooks/useMyCalendarData';
import useCalendarEventActions from '../hooks/useCalendarEventActions';
import useInstallPrompt from '../hooks/useInstallPrompt';
import type {
  AddEventPrefillDate,
  GoogleCalendarEvent,
  EventSearchParams,
  HebcalDisplayDetail,
  OverflowDay,
  PendingCalendarCreateState,
} from '../types/appTypes';

const PENDING_CREATE_EVENT_KEY = 'pending_calendar_create_event';

function activateOnKeyboard(
  event: KeyboardEvent<HTMLElement>,
  action: () => void,
): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

function toSearchBoundary(value: string | undefined, boundary: 'start' | 'end'): string {
  if (!value) return '';
  const suffix = boundary === 'start' ? 'T00:00:00.000Z' : 'T23:59:59.999Z';
  return `${value}${suffix}`;
}

function formatHebcalCategory(
  category: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const categoryKeyMap: Record<string, string> = {
    holiday: 'hebcalCategoryHoliday',
    major: 'hebcalCategoryMajor',
    fast: 'hebcalCategoryFast',
    roshchodesh: 'hebcalCategoryRoshChodesh',
    modern: 'hebcalCategoryModern',
    minor: 'hebcalCategoryMinor',
    parashat: 'hebcalCategoryParashat',
  };

  const translationKey = categoryKeyMap[category.toLowerCase()];
  if (translationKey) {
    return t(translationKey);
  }

  return category;
}

export default function MyCalendar() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he';
  const refreshCalendarsLabel = t('refreshCalendars');
  const hebSyncGroupLabel = t('hebSyncGroupLabel');
  const otherCalendarsGroupLabel = t('otherCalendarsGroupLabel');
  const allCalendarsGroupLabel = t('allCalendarsGroupLabel');
  const selectedCountSuffix = t('selectedCountSuffix');
  const noCalendarsAvailableLabel = t('noCalendarsAvailable');
  const menuLabel = t('menu');
  const closeDayEventsLabel = t('closeDayEvents');
  const dayEventsDialogLabel = t('dayEventsDialog');
  const discardEventConfirmLabel = t('discardEventConfirm');
  const { canInstall, promptInstall } = useInstallPrompt();

  const {
    calendarEvents,
    calendars,
    getEventColor,
    handleChangePermissions,
    handleCreateCalendar,
    handleDisableEditing,
    handleLogin,
    handleRefreshCalendars,
    hasLoadedCalendarData,
    hasResolvedSession,
    hasWriteAccess,
    hebSyncCalendars,
    isAuthRedirecting,
    isAllCalendarsMode,
    isAuthenticated,
    isCalendarLoading,
    isFetchingGoogle,
    loadCalendarData,
    loadCalendars,
    loadEvents,
    loginModalInitialScopeMode,
    loginModalMode,
    onLoginSelect,
    otherCalendars,
    promptForEditingUpgrade,
    selectedCalendarIds,
    setIsAuthenticated,
    setShowEventAges,
    setShowFasts,
    setLoginModalInitialScopeMode,
    setLoginModalMode,
    setShowGregorian,
    setShowHolidayEvents,
    setShowLoginModal,
    setShowNationalHolidays,
    setShowRoshChodesh,
    setShowWeeklyParsha,
    setViewHDate,
    setViewMode,
    showEventAges,
    showFasts,
    showGregorian,
    showHolidayEvents,
    showNationalHolidays,
    showRoshChodesh,
    showWeeklyParsha,
    showLoginModal,
    toggleCalendar,
    selectAllCalendars,
    deselectAllCalendars,
    selectCalendarsByIds,
    deselectCalendarsByIds,
    viewHDate,
    viewMode,
  } = useMyCalendarData({ t });

  const [overflowDay, setOverflowDay] = useState<OverflowDay | null>(null);
  const [selectedHebcalDetails, setSelectedHebcalDetails] = useState<{
    title: string;
    details: HebcalDisplayDetail[];
  } | null>(null);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [createPrefillDate, setCreatePrefillDate] = useState<AddEventPrefillDate | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHebSyncGroupOpen, setIsHebSyncGroupOpen] = useState(true);
  const [isOtherGroupOpen, setIsOtherGroupOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<EventSearchParams>({
    calendarIds: [],
    query: '',
    timeMin: '',
    timeMax: '',
  });
  const [searchCalendarMode, setSearchCalendarMode] = useState<string>('selected');
  const [isDesktopSearchOpen, setIsDesktopSearchOpen] = useState(false);
  const [isSearchPanelOpen, setIsSearchPanelOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<GoogleCalendarEvent[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [hasAutoPromptedLogin, setHasAutoPromptedLogin] = useState(false);
  const [recurringActionMode, setRecurringActionMode] = useState<'delete' | 'update' | null>(null);
  const [recurringActionScope, setRecurringActionScope] = useState<RecurringEventActionScope>('series');
  const {
    editDesc,
    editTitle,
    handleDelete,
    handleEventClick,
    handleUpdate,
    isDeleting,
    isEditing,
    isUpdating,
    selectedEvent,
    setEditDesc,
    setEditTitle,
    setIsEditing,
    setSelectedEvent,
  } = useCalendarEventActions({
    hasWriteAccess,
    promptForEditingUpgrade,
    t,
    loadCalendarData,
    loadEvents,
  });

  useEffect(() => {
    if (hebSyncCalendars.length > 0) {
      setIsHebSyncGroupOpen(true);
    }
    if (otherCalendars.length === 0) {
      setIsOtherGroupOpen(false);
    }
  }, [hebSyncCalendars.length, otherCalendars.length]);

  useEffect(() => {
    setSearchFilters((prev) => ({
      ...prev,
      calendarIds:
        searchCalendarMode === 'selected'
          ? selectedCalendarIds
          : searchCalendarMode === 'all'
            ? calendars.map((calendar) => calendar.id)
            : searchCalendarMode
              ? [searchCalendarMode]
              : [],
    }));
  }, [calendars, searchCalendarMode, selectedCalendarIds]);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== 'Escape') return;

      if (selectedEvent) {
        setSelectedEvent(null);
        return;
      }

      if (selectedHebcalDetails) {
        setSelectedHebcalDetails(null);
        return;
      }

      if (isAddEventModalOpen) {
        handleCloseAddEventModal();
        return;
      }

      if (isSidebarOpen) {
        setIsSidebarOpen(false);
        return;
      }

      if (isMobileSearchOpen) {
        setIsMobileSearchOpen(false);
        return;
      }

      if (isDesktopSearchOpen) {
        setIsDesktopSearchOpen(false);
        setIsSearchPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddEventModalOpen, isDesktopSearchOpen, isMobileSearchOpen, isSidebarOpen, selectedEvent, selectedHebcalDetails, setSelectedEvent]);

  useEffect(() => {
    if (!isAuthenticated || !hasWriteAccess) return;

    const rawPendingCreate = sessionStorage.getItem(PENDING_CREATE_EVENT_KEY);
    if (!rawPendingCreate) return;

    sessionStorage.removeItem(PENDING_CREATE_EVENT_KEY);

    try {
      const pendingCreate = JSON.parse(rawPendingCreate) as PendingCalendarCreateState;
      if (pendingCreate?.prefillDate) {
        setCreatePrefillDate(pendingCreate.prefillDate);
        setIsAddEventModalOpen(true);
        return;
      }
    } catch {
      // Fall through to opening the generic add event flow.
    }

    setCreatePrefillDate(null);
    setIsAddEventModalOpen(true);
  }, [hasWriteAccess, isAuthenticated]);

  useEffect(() => {
    if (
      !hasResolvedSession ||
      isAuthenticated ||
      showLoginModal ||
      hasAutoPromptedLogin ||
      isAuthRedirecting
    ) {
      return;
    }

    setLoginModalMode('connect');
    setLoginModalInitialScopeMode(SCOPE_MODES.APP_CREATED);
    setShowLoginModal(true);
    setHasAutoPromptedLogin(true);
  }, [
    hasAutoPromptedLogin,
    hasResolvedSession,
    isAuthRedirecting,
    isAuthenticated,
    setLoginModalInitialScopeMode,
    setLoginModalMode,
    setShowLoginModal,
    showLoginModal,
  ]);

  const handleRevoke = async (): Promise<void> => {
    if (!window.confirm(t('revokeAccessConfirm'))) return;
    await revokeAccess();
    setIsAuthenticated(false);
    navigate('/');
  };

  const handleOpenLanding = (): void => {
    navigate('/?about=1');
  };

  const handleOverflowDayOpen = (
    dayObj: OverflowDay,
    event: React.MouseEvent<HTMLButtonElement>,
  ): void => {
    const dayCell = event.currentTarget.closest('[data-calendar-day-cell="true"]');
    const rect = (dayCell instanceof HTMLElement ? dayCell : event.currentTarget).getBoundingClientRect();
    setOverflowDay({
      ...dayObj,
      anchorRect: {
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      },
    });
  };

  const handleOverflowEventClick = (event: GoogleCalendarEvent): void => {
    setOverflowDay(null);
    handleEventClick(event);
  };

  const handleHebcalDetailsClick = (
    title: string,
    details: HebcalDisplayDetail[],
  ): void => {
    if (details.length === 0) return;
    setSelectedHebcalDetails({ title, details });
  };

  const requestCreatePermissions = (
    prefillDate: AddEventPrefillDate | null = null,
  ): void => {
    sessionStorage.setItem(
      PENDING_CREATE_EVENT_KEY,
      JSON.stringify({ prefillDate }),
    );
    promptForEditingUpgrade();
  };

  const handleCreateFromDay = (dayObj: OverflowDay): void => {
    const year = dayObj.gDate.getFullYear();
    const month = String(dayObj.gDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayObj.gDate.getDate()).padStart(2, '0');
    const prefillDate: AddEventPrefillDate = {
      gregorianDate: `${year}-${month}-${day}`,
      hebrewYear: String(dayObj.hYear),
      hebrewMonth: dayObj.hMonthName,
      hebrewDay: dayObj.hDay,
    };

    if (!hasWriteAccess) {
      requestCreatePermissions(prefillDate);
      return;
    }

    setCreatePrefillDate(prefillDate);
    setIsAddEventModalOpen(true);
  };

  const handleCreateEvent = (): void => {
    if (!hasWriteAccess) {
      requestCreatePermissions();
      return;
    }

    setCreatePrefillDate(null);
    setIsAddEventModalOpen(true);
  };

  const closeRecurringActionDialog = (): void => {
    setRecurringActionMode(null);
    setRecurringActionScope('series');
  };

  const handleDeleteClick = (): void => {
    if (selectedEvent && isRecurringEvent(selectedEvent)) {
      setRecurringActionMode('delete');
      setRecurringActionScope('series');
      return;
    }

    void handleDelete();
  };

  const handleSaveClick = (): void => {
    if (selectedEvent && isRecurringEvent(selectedEvent)) {
      setRecurringActionMode('update');
      setRecurringActionScope('series');
      return;
    }

    void handleUpdate();
  };

  const confirmRecurringAction = async (): Promise<void> => {
    if (!recurringActionMode) return;

    if (recurringActionMode === 'delete') {
      await handleDelete(recurringActionScope, { skipConfirm: true });
    } else {
      await handleUpdate(recurringActionScope);
    }

    closeRecurringActionDialog();
  };

  const handleCloseAddEventModal = (): void => {
    setIsAddEventModalOpen(false);
    setCreatePrefillDate(null);
  };

  const handleRequestCloseAddEventModal = (): void => {
    if (!window.confirm(discardEventConfirmLabel)) return;
    handleCloseAddEventModal();
  };

  const handleAddEventComplete = async (): Promise<void> => {
    handleCloseAddEventModal();
    await loadCalendarData();
    await loadEvents();
  };

  const handleCalendarsChanged = async (): Promise<void> => {
    await loadCalendars();
  };

  const handleNextMonth = (): void => {
    setViewHDate((prev) => getNextMonthHDate(prev));
  };

  const handlePrevMonth = (): void => {
    setViewHDate((prev) => getPrevMonthHDate(prev));
  };

  const days = buildMonthDays(viewHDate, calendarEvents);
  const { hMonthNameHebrew, hYear, gMonthRange } = getHebrewMonthMeta(viewHDate);
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
  const isMobileViewport = viewportWidth < 768;
  const maxVisibleMonthEvents = isMobileViewport ? 3 : 4;
  const {
    overflowPopoverWidth,
    overflowPopoverMargin,
    overflowPopoverMaxHeight,
    overflowTop,
    overflowLeft,
  } = getOverflowPopoverLayout({
    overflowDay,
    viewportWidth,
    viewportHeight,
  });
  const scheduleDays = buildScheduleDays(days, {
    showFasts,
    showHolidayEvents,
    showNationalHolidays,
    showRoshChodesh,
    showWeeklyParsha,
  });
  const isScheduleLoading =
    !hasResolvedSession ||
    (isAuthenticated &&
      (isCalendarLoading || isFetchingGoogle || !hasLoadedCalendarData));
  const isMonthLoading = isScheduleLoading;
  const emptyStateMessage =
    !isAuthenticated
      ? t('loginRequiredInCalendarView')
      : calendars.length === 0
      ? t('noCalendarsYetInCalendarView')
      : selectedCalendarIds.length === 0
        ? t('noSelectedCalendarsInCalendarView')
        : t('noEventsInView');
  const emptyStateAction = !isAuthenticated ? (
    <button
      type="button"
      onClick={handleLogin}
      className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl bg-[#0038A8] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-800"
    >
      <LogIn className="h-4 w-4" />
      <span>{t('login')}</span>
    </button>
  ) : undefined;

  const performSearch = async (): Promise<void> => {
    const query = searchFilters.query?.trim() || '';
    const effectiveCalendarIds =
      searchCalendarMode === 'selected'
        ? selectedCalendarIds
        : searchCalendarMode === 'all'
          ? calendars.map((calendar) => calendar.id)
          : searchCalendarMode
            ? [searchCalendarMode]
            : [];

    const hasAnyFilter = Boolean(
      query || searchFilters.timeMin || searchFilters.timeMax || effectiveCalendarIds.length > 0,
    );

    if (!hasAnyFilter) {
      setSearchResults([]);
      setIsSearchActive(false);
      return;
    }

    setIsSearchLoading(true);
    try {
      const results = await searchEvents({
        ...searchFilters,
        query,
        timeMin: toSearchBoundary(searchFilters.timeMin, 'start'),
        timeMax: toSearchBoundary(searchFilters.timeMax, 'end'),
        calendarIds: effectiveCalendarIds,
      });
      setSearchResults(results);
      setIsSearchActive(true);
    } catch (error) {
      console.error('Failed to search calendar events', error);
      alert(t('searchEventsError'));
    } finally {
      setIsSearchLoading(false);
    }
  };

  const clearSearch = (): void => {
    setSearchFilters({
      calendarIds:
        searchCalendarMode === 'selected'
          ? selectedCalendarIds
          : searchCalendarMode === 'all'
            ? calendars.map((calendar) => calendar.id)
            : searchCalendarMode
              ? [searchCalendarMode]
              : [],
      query: '',
      timeMin: '',
      timeMax: '',
    });
    setSearchResults([]);
    setIsSearchActive(false);
    setIsSearchPanelOpen(false);
    setIsDesktopSearchOpen(false);
  };

  const formatEventTimeRange = (event: GoogleCalendarEvent): string => {
    if (!event?.start?.dateTime) return '';

    const locale = isRtl ? 'he-IL' : 'en-US';
    const formatOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
    };
    const startLabel = new Date(event.start.dateTime).toLocaleTimeString(locale, formatOptions);

    if (!event?.end?.dateTime) return startLabel;

    const endLabel = new Date(event.end.dateTime).toLocaleTimeString(locale, formatOptions);
    return `${startLabel} - ${endLabel}`;
  };

  const showRecurringFutureOption = supportsFutureScopedChanges(selectedEvent);
  const isRecurringActionPending =
    (recurringActionMode === 'delete' && isDeleting) ||
    (recurringActionMode === 'update' && isUpdating);
  const recurringScopeOptions: Array<{
    value: RecurringEventActionScope;
    label: string;
    description: string;
  }> = [
    {
      value: 'series',
      label: t('recurringActionScopeSeries'),
      description: t('recurringActionScopeSeriesHint'),
    },
    {
      value: 'single',
      label: t('recurringActionScopeSingle'),
      description: t('recurringActionScopeSingleHint'),
    },
    ...(showRecurringFutureOption
      ? [{
          value: 'future' as RecurringEventActionScope,
          label: t('recurringActionScopeFuture'),
          description: t('recurringActionScopeFutureHint'),
        }]
      : []),
  ];

  return (
    <div className={`h-full min-h-0 overflow-hidden bg-slate-50 dark:bg-slate-900 font-sans flex flex-col ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between shrink-0 z-30">
        <div className="min-w-0 flex items-center gap-3 md:gap-6">
          <button type="button" aria-label={menuLabel} onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -mr-2 text-slate-600 hover:bg-slate-50 rounded-lg dark:text-slate-400 dark:hover:bg-slate-800">
            <Menu className="w-6 h-6" />
          </button>
          <div
            role="link"
            tabIndex={0}
            className="flex min-w-0 items-center gap-2 md:gap-3 cursor-pointer"
            onClick={() => navigate('/calendar')}
            onKeyDown={(event) => activateOnKeyboard(event, () => navigate('/calendar'))}
            aria-label={t('myCalendar')}
          >
            <Logo className="h-8 w-8 shrink-0" />
            <h1 className="truncate whitespace-nowrap text-lg font-black tracking-tight dark:text-white md:text-xl" style={{ fontFamily: isRtl ? "'Heebo', 'Rubik', sans-serif" : 'inherit' }}>
              <span className="text-[#0038A8] dark:text-blue-400">{t('appNameFirst')}</span>
              <span className="text-slate-900 dark:text-white">{t('appNameSecond')}</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-4">
          <DesktopCalendarSearch
            isRtl={isRtl}
            t={t}
            searchFilters={searchFilters}
            setSearchFilters={setSearchFilters}
            searchCalendarMode={searchCalendarMode}
            setSearchCalendarMode={setSearchCalendarMode}
            calendarSearchOptions={calendars}
            isSearchOpen={isDesktopSearchOpen}
            setIsSearchOpen={setIsDesktopSearchOpen}
            isSearchPanelOpen={isSearchPanelOpen}
            setIsSearchPanelOpen={setIsSearchPanelOpen}
            onSearchSubmit={() => performSearch()}
            onSearchClear={clearSearch}
            isSearchLoading={isSearchLoading}
          />
          <div className="flex items-center gap-0.5 md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-all hover:border-[#0038A8] hover:text-[#0038A8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              aria-label={t('searchEvents')}
            >
              <Search className="h-4 w-4" />
            </button>
            <LanguageSwitcher />
          </div>
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>
          {canInstall ? (
            <button
              type="button"
              onClick={promptInstall}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition-all hover:border-[#0038A8] hover:text-[#0038A8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2 sm:text-sm sm:font-bold"
              aria-label={t('installApp')}
              title={t('installApp')}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t('installApp')}</span>
            </button>
          ) : null}
          {!isAuthenticated ? (
            <button onClick={handleLogin} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-[#0038A8] rounded-lg font-bold dark:bg-blue-900/30 dark:text-blue-300"><LogIn className="w-4 h-4" />{t('login')}</button>
          ) : (
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={handleRevoke}
                className="flex items-center gap-2 rounded-lg p-2 text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 md:px-4 md:py-2"
                title={t('disconnect')}
                aria-label={t('disconnect')}
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline">{t('disconnect')}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <MyCalendarSidebar
          isRtl={isRtl}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          menuLabel={menuLabel}
          t={t}
          handleChangePermissions={handleChangePermissions}
          handleDisableEditing={handleDisableEditing}
          isAllCalendarsMode={isAllCalendarsMode}
          hasWriteAccess={hasWriteAccess}
          promptForEditingUpgrade={promptForEditingUpgrade}
          calendars={calendars}
          isFetchingGoogle={isFetchingGoogle}
          refreshCalendarsLabel={refreshCalendarsLabel}
          handleRefreshCalendars={handleRefreshCalendars}
          handleCreateCalendar={handleCreateCalendar}
          allCalendarsGroupLabel={allCalendarsGroupLabel}
          selectAllCalendars={selectAllCalendars}
          deselectAllCalendars={deselectAllCalendars}
          hebSyncGroupLabel={hebSyncGroupLabel}
          otherCalendarsGroupLabel={otherCalendarsGroupLabel}
          hebSyncCalendars={hebSyncCalendars}
          otherCalendars={otherCalendars}
          isHebSyncGroupOpen={isHebSyncGroupOpen}
          setIsHebSyncGroupOpen={setIsHebSyncGroupOpen}
          isOtherGroupOpen={isOtherGroupOpen}
          setIsOtherGroupOpen={setIsOtherGroupOpen}
          noCalendarsAvailableLabel={noCalendarsAvailableLabel}
          selectedCalendarIds={selectedCalendarIds}
          selectedCountSuffix={selectedCountSuffix}
          selectCalendarsByIds={selectCalendarsByIds}
          deselectCalendarsByIds={deselectCalendarsByIds}
          toggleCalendar={toggleCalendar}
          handleOpenLanding={handleOpenLanding}
        />

        <main className="min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(0,56,168,0.08),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94))] px-4 pb-4 pt-0 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_32%),linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(15,23,42,0.96))] md:px-6 md:pb-6 md:pt-1 xl:px-8 xl:pb-8">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-[1680px] flex-col gap-3">
            <CalendarToolbar
              isRtl={isRtl}
              t={t}
              viewHDate={viewHDate}
              hMonthNameHebrew={hMonthNameHebrew}
              hYear={hYear}
              gMonthRange={gMonthRange}
              viewMode={viewMode}
              showEventAges={showEventAges}
              showFasts={showFasts}
              showHolidayEvents={showHolidayEvents}
              showNationalHolidays={showNationalHolidays}
              showRoshChodesh={showRoshChodesh}
              showWeeklyParsha={showWeeklyParsha}
              setShowEventAges={setShowEventAges}
              setShowFasts={setShowFasts}
              setShowHolidayEvents={setShowHolidayEvents}
              setShowNationalHolidays={setShowNationalHolidays}
              setShowRoshChodesh={setShowRoshChodesh}
              setShowWeeklyParsha={setShowWeeklyParsha}
              setViewMode={setViewMode}
              showGregorian={showGregorian}
              setShowGregorian={setShowGregorian}
              handleNextMonth={handleNextMonth}
              handlePrevMonth={handlePrevMonth}
              setViewHDate={setViewHDate}
              isSearchActive={isSearchActive}
            />

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] dark:border-slate-700/60 dark:bg-slate-900">
              {isSearchActive ? (
                <SearchResultsView
                  t={t}
                  isRtl={isRtl}
                  isSearchLoading={isSearchLoading}
                  searchResults={searchResults}
                  showEventAges={showEventAges}
                  showGregorian={showGregorian}
                  getEventColor={getEventColor}
                  handleEventClick={handleEventClick}
                  calendars={calendars}
                  onClearSearch={clearSearch}
                />
              ) : viewMode === 'month' ? (
                <MonthCalendarView
                  t={t}
                  isRtl={isRtl}
                  days={days}
                  showEventAges={showEventAges}
                  showFasts={showFasts}
                  showHolidayEvents={showHolidayEvents}
                  showNationalHolidays={showNationalHolidays}
                  showRoshChodesh={showRoshChodesh}
                  showWeeklyParsha={showWeeklyParsha}
                  showGregorian={showGregorian}
                  isMobileViewport={isMobileViewport}
                  maxVisibleMonthEvents={maxVisibleMonthEvents}
                  getEventColor={getEventColor}
                  handleEventClick={handleEventClick}
                  handleHebcalDetailsClick={handleHebcalDetailsClick}
                  handleOverflowDayOpen={handleOverflowDayOpen}
                  handleCreateFromDay={handleCreateFromDay}
                  isCalendarLoading={isMonthLoading}
                  emptyStateMessage={emptyStateMessage}
                  emptyStateAction={emptyStateAction}
                />
              ) : (
                <ScheduleCalendarView
                  t={t}
                  isRtl={isRtl}
                  showEventAges={showEventAges}
                  showFasts={showFasts}
                  showHolidayEvents={showHolidayEvents}
                  showNationalHolidays={showNationalHolidays}
                  showRoshChodesh={showRoshChodesh}
                  showWeeklyParsha={showWeeklyParsha}
                  showGregorian={showGregorian}
                  scheduleDays={scheduleDays}
                  hMonthNameHebrew={hMonthNameHebrew}
                  getEventColor={getEventColor}
                  handleEventClick={handleEventClick}
                  handleHebcalDetailsClick={handleHebcalDetailsClick}
                  isCalendarLoading={isScheduleLoading}
                  handleCreateFromDay={handleCreateFromDay}
                  emptyStateMessage={emptyStateMessage}
                  emptyStateAction={emptyStateAction}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSelect={onLoginSelect}
        mode={loginModalMode}
        initialSelectedMode={loginModalInitialScopeMode}
      />

      <MobileTextSearchDialog
        isOpen={isMobileSearchOpen}
        onClose={() => setIsMobileSearchOpen(false)}
        isRtl={isRtl}
        t={t}
        searchFilters={searchFilters}
        setSearchFilters={setSearchFilters}
        onSearchSubmit={() => performSearch()}
        onSearchClear={clearSearch}
        isSearchLoading={isSearchLoading}
      />

      <DayEventsPopover
        overflowDay={overflowDay}
        isRtl={isRtl}
        closeDayEventsLabel={closeDayEventsLabel}
        dayEventsDialogLabel={dayEventsDialogLabel}
        holidayDetailsLabel={t('holidayDetails')}
        parshaDetailsLabel={t('parshaDetails')}
        overflowPopoverWidth={overflowPopoverWidth}
        overflowPopoverMargin={overflowPopoverMargin}
        overflowPopoverMaxHeight={overflowPopoverMaxHeight}
        overflowTop={overflowTop}
        overflowLeft={overflowLeft}
        showEventAges={showEventAges}
        showGregorian={showGregorian}
        showFasts={showFasts}
        showHolidayEvents={showHolidayEvents}
        showNationalHolidays={showNationalHolidays}
        showRoshChodesh={showRoshChodesh}
        showWeeklyParsha={showWeeklyParsha}
        getEventColor={getEventColor}
        setOverflowDay={setOverflowDay}
        handleOverflowEventClick={handleOverflowEventClick}
        handleHebcalDetailsClick={handleHebcalDetailsClick}
      />

      {selectedHebcalDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" dir={isRtl ? 'rtl' : 'ltr'}>
          <button
            type="button"
            className="absolute inset-0"
            onClick={() => setSelectedHebcalDetails(null)}
            aria-label={t('close')}
          />
          <div role="dialog" aria-modal="true" aria-labelledby="hebcal-details-title" className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-slate-800">
              <h2 id="hebcal-details-title" className="text-xl font-bold text-slate-800 dark:text-white">{selectedHebcalDetails.title}</h2>
              <button type="button" aria-label={t('close')} onClick={() => setSelectedHebcalDetails(null)} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4 p-6">
              {selectedHebcalDetails.details.map((detail) => (
                <div key={detail.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-[#0038A8] dark:text-blue-400">
                        {detail.emoji ? `${detail.emoji} ` : ''}{detail.title}
                      </h3>
                      {detail.brief && detail.brief !== detail.title ? (
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail.brief}</p>
                      ) : null}
                    </div>
                    {detail.url ? (
                      <a
                        href={detail.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#0038A8] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                      >
                        {t('viewDetails')}
                      </a>
                    ) : null}
                  </div>
                  {detail.categories.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {detail.categories.map((category) => (
                        <span key={category} className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                          {formatHebcalCategory(category, t)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {detail.memo ? (
                    <div className="mt-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{detail.memo}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm md:items-center md:p-6" dir={isRtl ? 'rtl' : 'ltr'}>
          <button
            type="button"
            className="absolute inset-0"
            onClick={handleRequestCloseAddEventModal}
            aria-label={t('close')}
            data-testid="add-event-modal-backdrop"
          />
          <div className="pointer-events-none relative z-10 flex h-full max-h-full w-full justify-center md:h-auto">
            <button
              type="button"
              onClick={handleRequestCloseAddEventModal}
              className={`pointer-events-auto absolute top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/85 text-slate-700 shadow-lg backdrop-blur transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 ${isRtl ? 'left-4 md:left-5' : 'right-4 md:right-5'}`}
              aria-label={t('close')}
            >
              <X className="h-5 w-5" />
            </button>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('addEvent')}
              className="pointer-events-auto flex h-full w-full justify-center md:h-auto md:w-auto"
            >
              <AddEvent
                onClose={handleRequestCloseAddEventModal}
                onComplete={handleAddEventComplete}
                onCalendarsChanged={handleCalendarsChanged}
                prefillDate={createPrefillDate}
              />
            </div>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <button
          type="button"
          onClick={handleCreateEvent}
          className={`fixed bottom-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#0038A8] px-4 py-3 text-sm font-bold text-white shadow-[0_18px_40px_-18px_rgba(0,56,168,0.9)] transition-all hover:bg-[#002d86] hover:shadow-[0_20px_45px_-18px_rgba(0,56,168,0.95)] md:bottom-7 md:px-5 md:py-3.5 ${isRtl ? 'left-5 md:left-7' : 'right-5 md:right-7'}`}
          aria-label={t('addEvent')}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/18 text-lg leading-none">+</span>
          <span className="hidden sm:inline">{t('addEvent')}</span>
        </button>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir={isRtl ? 'rtl' : 'ltr'}>
          <div role="dialog" aria-modal="true" aria-labelledby="event-details-title" className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 id="event-details-title" className="text-xl font-bold text-slate-800 dark:text-white">{t('eventDetails')}</h2>
              <button type="button" aria-label={t('close')} onClick={() => setSelectedEvent(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#0038A8] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500" placeholder={t('eventName')} />
                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={4} className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#0038A8] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500" placeholder={t('description')} />
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const props = selectedEvent.extendedProperties?.private || {};
                    const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
                    const originalYear = isHebCal ? parseInt(props.originalHebrewYear || '', 10) : null;
                    const occurrenceHebrewYear = getEventOccurrenceHebrewYear(selectedEvent);
                    const age = (originalYear && occurrenceHebrewYear) ? (occurrenceHebrewYear - originalYear) : 0;
                    const ageSuffix = isHebCal && showEventAges ? ` (${age})` : '';
                    const timeRange = formatEventTimeRange(selectedEvent);
                    return (
                      <>
                        <h3 className="text-2xl font-bold text-[#0038A8] dark:text-blue-400">{selectedEvent.summary}{ageSuffix}</h3>
                        {timeRange && (
                          <div
                            data-testid="event-time-range"
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            {timeRange}
                          </div>
                        )}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 min-h-[100px] text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{selectedEvent.description || t('noDescription')}</div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3 bg-slate-50 dark:bg-slate-900/50">
              <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition-colors ${
                  isDeleting
                    ? 'cursor-wait bg-red-50 text-red-400 dark:bg-red-900/10 dark:text-red-300'
                    : 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
                }`}
              >
                {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {isDeleting ? t('deletingEvent') : hasWriteAccess ? t('delete') : t('allowDelete')}
              </button>
              <div className="flex gap-2">
                {isEditing ? (
                  <><button onClick={() => setIsEditing(false)} disabled={isUpdating} className="rounded-xl px-4 py-2 font-bold text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-wait disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800">{t('cancel')}</button><button onClick={handleSaveClick} disabled={isUpdating} className="inline-flex items-center gap-2 rounded-xl bg-[#0038A8] px-6 py-2 font-bold text-white shadow-md transition-colors hover:bg-blue-800 disabled:cursor-wait disabled:opacity-70">{isUpdating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{t('save')}</button></>
                ) : (
                  <button onClick={() => (hasWriteAccess ? setIsEditing(true) : promptForEditingUpgrade())} className="px-6 py-2 bg-white border border-slate-200 text-slate-800 rounded-xl font-bold hover:bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700">{hasWriteAccess ? t('edit') : t('allowEdit')}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedEvent && recurringActionMode && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" dir={isRtl ? 'rtl' : 'ltr'}>
          <button
            type="button"
            className="absolute inset-0"
            onClick={closeRecurringActionDialog}
            aria-label={t('close')}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="recurring-action-title"
            className="relative z-10 w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 id="recurring-action-title" className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  {recurringActionMode === 'delete'
                    ? t('recurringDeleteDialogTitle')
                    : t('recurringUpdateDialogTitle')}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {recurringActionMode === 'delete'
                    ? t('recurringDeleteDialogBody')
                    : t('recurringUpdateDialogBody')}
                </p>
              </div>
              <button
                type="button"
                onClick={closeRecurringActionDialog}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label={t('close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {recurringScopeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors ${
                    recurringActionScope === option.value
                      ? 'border-[#0038A8] bg-blue-50/70 dark:border-blue-400 dark:bg-blue-950/30'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-500'
                  }`}
                >
                  <input
                    type="radio"
                    name="recurring-action-scope"
                    value={option.value}
                    checked={recurringActionScope === option.value}
                    onChange={() => setRecurringActionScope(option.value)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[#0038A8]"
                  />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-50">
                      <span>{option.label}</span>
                      {option.value === 'series' ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-amber-800 dark:bg-amber-400/20 dark:text-amber-200">
                          {t('recommended')}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeRecurringActionDialog}
              disabled={isRecurringActionPending}
              className="rounded-xl px-4 py-2 font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={() => void confirmRecurringAction()}
              disabled={isRecurringActionPending}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2 font-bold text-white transition-colors disabled:cursor-wait disabled:opacity-70 ${
                  recurringActionMode === 'delete'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-[#0038A8] hover:bg-blue-800'
                }`}
            >
              {isRecurringActionPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              {recurringActionMode === 'delete'
                ? t('recurringDeleteConfirm')
                : t('recurringUpdateConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
