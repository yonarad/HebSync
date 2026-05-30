import { useEffect, useState } from 'react';
import { HDate } from '@hebcal/core';
import { getHebrewMonthGregorianRange } from '../utils/calendarView';
import {
  authenticateWithGoogle,
  canEditCalendars,
  createNewCalendar,
  fetchAllCalendars,
  fetchGoogleCalendarColors,
  fetchEventsInRange,
  fetchMyAppEvents,
  fetchSession,
  GCAL_AUTH_EXPIRED_EVENT,
  getAccessToken,
  getScopeMode,
  isAuthError,
  isHebSyncCalendar,
  revokeAccess,
  SCOPE_MODES,
  usesAllCalendarsMode,
} from '../utils/googleApi';
import { resolveCalendarColor, resolveEventColor } from '../utils/googleCalendarColors';
import type {
  Calendar,
  CalendarViewMode,
  GoogleCalendarColors,
  GoogleCalendarEvent,
  MyCalendarEventListItem,
  ScopeMode,
} from '../types/appTypes';

type LoginModalMode = 'connect' | 'upgrade' | 'reauthorize';

interface UseMyCalendarDataParams {
  t: (key: string, options?: Record<string, unknown>) => string;
}

const DISPLAY_OPTIONS_STORAGE_KEY = 'hebsync.calendar.displayOptions';
const SELECTED_CALENDAR_IDS_STORAGE_KEY = 'hebsync.calendar.selectedCalendarIds';

function readDisplayOptions(): {
  showGregorian: boolean;
  showEventAges: boolean;
  showFasts: boolean;
  showHolidayEvents: boolean;
  showNationalHolidays: boolean;
  showRoshChodesh: boolean;
  showWeeklyParsha: boolean;
} {
  if (typeof window === 'undefined') {
    return {
      showGregorian: true,
      showEventAges: true,
      showFasts: true,
      showHolidayEvents: true,
      showNationalHolidays: true,
      showRoshChodesh: true,
      showWeeklyParsha: true,
    };
  }

  try {
    const raw = window.localStorage.getItem(DISPLAY_OPTIONS_STORAGE_KEY);
    if (!raw) {
      return {
        showGregorian: true,
        showEventAges: true,
        showFasts: true,
        showHolidayEvents: true,
        showNationalHolidays: true,
        showRoshChodesh: true,
        showWeeklyParsha: true,
      };
    }

    const parsed = JSON.parse(raw) as Partial<{
      showGregorian: boolean;
      showEventAges: boolean;
      showFasts: boolean;
      showHolidayEvents: boolean;
      showNationalHolidays: boolean;
      showRoshChodesh: boolean;
      showWeeklyParsha: boolean;
    }>;

    return {
      showGregorian:
        typeof parsed.showGregorian === 'boolean' ? parsed.showGregorian : true,
      showEventAges:
        typeof parsed.showEventAges === 'boolean' ? parsed.showEventAges : true,
      showFasts:
        typeof parsed.showFasts === 'boolean' ? parsed.showFasts : true,
      showHolidayEvents:
        typeof parsed.showHolidayEvents === 'boolean'
          ? parsed.showHolidayEvents
          : true,
      showNationalHolidays:
        typeof parsed.showNationalHolidays === 'boolean'
          ? parsed.showNationalHolidays
          : true,
      showRoshChodesh:
        typeof parsed.showRoshChodesh === 'boolean'
          ? parsed.showRoshChodesh
          : true,
      showWeeklyParsha:
        typeof parsed.showWeeklyParsha === 'boolean' ? parsed.showWeeklyParsha : true,
    };
  } catch {
    return {
      showGregorian: true,
      showEventAges: true,
      showFasts: true,
      showHolidayEvents: true,
      showNationalHolidays: true,
      showRoshChodesh: true,
      showWeeklyParsha: true,
    };
  }
}

function readSavedSelectedCalendarIds(): string[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SELECTED_CALENDAR_IDS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return null;
  }
}

export default function useMyCalendarData({ t }: UseMyCalendarDataParams) {
  const initialDisplayOptions = readDisplayOptions();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAccessToken());
  const [hasResolvedSession, setHasResolvedSession] = useState(false);
  const [myEvents, setMyEvents] = useState<MyCalendarEventListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoadingCount, setIsGoogleLoadingCount] = useState(0);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [hasLoadedCalendarData, setHasLoadedCalendarData] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAuthRedirecting, setIsAuthRedirecting] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<LoginModalMode>('connect');
  const [loginModalInitialScopeMode, setLoginModalInitialScopeMode] = useState<Exclude<ScopeMode, null>>(SCOPE_MODES.APP_CREATED);
  const [scopeMode, setScopeMode] = useState<ScopeMode>(getScopeMode());
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [viewHDate, setViewHDate] = useState<HDate>(new HDate());
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [googleCalendarColors, setGoogleCalendarColors] = useState<GoogleCalendarColors | null>(null);
  const [showGregorian, setShowGregorian] = useState(initialDisplayOptions.showGregorian);
  const [showEventAges, setShowEventAges] = useState(initialDisplayOptions.showEventAges);
  const [showFasts, setShowFasts] = useState(initialDisplayOptions.showFasts);
  const [showHolidayEvents, setShowHolidayEvents] = useState(initialDisplayOptions.showHolidayEvents);
  const [showNationalHolidays, setShowNationalHolidays] = useState(initialDisplayOptions.showNationalHolidays);
  const [showRoshChodesh, setShowRoshChodesh] = useState(initialDisplayOptions.showRoshChodesh);
  const [showWeeklyParsha, setShowWeeklyParsha] = useState(initialDisplayOptions.showWeeklyParsha);
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() => {
    if (typeof window === 'undefined') return 'month';
    return window.innerWidth < 768 ? 'schedule' : 'month';
  });

  const isFetchingGoogle = isGoogleLoadingCount > 0;
  const isAllCalendarsMode = usesAllCalendarsMode(scopeMode);
  const hasWriteAccess = canEditCalendars(scopeMode);
  const hebSyncCalendars = calendars.filter(isHebSyncCalendar);
  const otherCalendars = calendars.filter((calendar) => !isHebSyncCalendar(calendar));

  const getCalendarColor = (calendarId: string): string => {
    const calendar = calendars.find((cal) => cal.id === calendarId);
    return calendar?.color || '#0038A8';
  };

  const getEventColor = (event: GoogleCalendarEvent): string =>
    resolveEventColor(event, calendars, googleCalendarColors);

  useEffect(() => {
    let isMounted = true;

    fetchSession()
      .then((session) => {
        if (isMounted) {
          setIsAuthenticated(!!session);
          setScopeMode(session?.scopeMode || null);
          setHasResolvedSession(true);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAuthenticated(false);
          setScopeMode(null);
          setHasResolvedSession(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const loadCalendars = async (): Promise<void> => {
    setIsGoogleLoadingCount((count) => count + 1);
    try {
      const [fetchedCalendars, googleColors] = await Promise.all([
        fetchAllCalendars(),
        fetchGoogleCalendarColors().catch((): null => null),
      ]);
      const calendarsWithColors = fetchedCalendars.map((calendar, index) => ({
        ...calendar,
        color: resolveCalendarColor(calendar, index, googleColors),
      }));
      const hebSyncCalendarIds = calendarsWithColors
        .filter(isHebSyncCalendar)
        .map((calendar) => calendar.id);
      const savedSelectedCalendarIds = readSavedSelectedCalendarIds();
      const nextSelectedCalendarIds =
        savedSelectedCalendarIds === null
          ? hebSyncCalendarIds
          : savedSelectedCalendarIds.filter((calendarId) =>
              calendarsWithColors.some((calendar) => calendar.id === calendarId),
            );
      setCalendars(calendarsWithColors);
      setGoogleCalendarColors(googleColors);
      setSelectedCalendarIds(nextSelectedCalendarIds);
    } catch (error) {
      if (isAuthError(error)) return;
      console.error('Failed to load calendars', error);
    } finally {
      setIsGoogleLoadingCount((count) => Math.max(0, count - 1));
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadCalendars();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      DISPLAY_OPTIONS_STORAGE_KEY,
      JSON.stringify({
        showGregorian,
        showEventAges,
        showFasts,
        showHolidayEvents,
        showNationalHolidays,
        showRoshChodesh,
        showWeeklyParsha,
      }),
    );
  }, [
    showEventAges,
    showFasts,
    showGregorian,
    showHolidayEvents,
    showNationalHolidays,
    showRoshChodesh,
    showWeeklyParsha,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined' || calendars.length === 0) return;

    window.localStorage.setItem(
      SELECTED_CALENDAR_IDS_STORAGE_KEY,
      JSON.stringify(selectedCalendarIds),
    );
  }, [calendars, selectedCalendarIds]);

  useEffect(() => {
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setScopeMode(null);
      setCalendars([]);
      setGoogleCalendarColors(null);
      setSelectedCalendarIds([]);
      setCalendarEvents([]);
      setMyEvents([]);
      setIsAuthRedirecting(false);
      setLoginModalMode('reauthorize');
      setShowLoginModal(true);
    };

    window.addEventListener(GCAL_AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(GCAL_AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  const loadCalendarData = async (): Promise<void> => {
    setIsCalendarLoading(true);
    try {
      const { timeMin, timeMax } = getHebrewMonthGregorianRange(viewHDate);
      const events = await fetchEventsInRange(
        timeMin,
        timeMax,
        selectedCalendarIds,
      );
      setCalendarEvents(events);
    } catch (error) {
      if (isAuthError(error)) return;
      console.error(error);
    } finally {
      setIsCalendarLoading(false);
      setHasLoadedCalendarData(true);
    }
  };

  const loadEvents = async (): Promise<void> => {
    setIsLoading(true);
    setIsGoogleLoadingCount((count) => count + 1);
    try {
      const items = await fetchMyAppEvents(selectedCalendarIds);
      const currentHebrewYear = new HDate().getFullYear();
      const formattedEvents = items.map((item): MyCalendarEventListItem => {
        const props = item.extendedProperties?.private || {};
        const originalYear = parseInt(props.originalHebrewYear || '', 10);
        const age = originalYear ? currentHebrewYear - originalYear : 0;
        return {
          id: item.id,
          calendarId: item.calendarId,
          eventID: props.eventID,
          title: item.summary,
          age: age >= 0 ? age : 0,
          category: props.category,
          date: item.start?.date || t('unknownDate'),
        };
      });
      setMyEvents(formattedEvents);
    } catch (error) {
      console.error(error);
      if (isAuthError(error)) {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
      setIsGoogleLoadingCount((count) => Math.max(0, count - 1));
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (selectedCalendarIds.length > 0) {
        setHasLoadedCalendarData(false);
        loadCalendarData();
        loadEvents();
      } else {
        setCalendarEvents([]);
        setMyEvents([]);
        setHasLoadedCalendarData(true);
      }
    }
  }, [isAuthenticated, viewHDate, selectedCalendarIds]);

  const handleLogin = (): void => {
    setIsAuthRedirecting(false);
    setLoginModalMode('connect');
    setLoginModalInitialScopeMode(SCOPE_MODES.APP_CREATED);
    setShowLoginModal(true);
  };

  const onLoginSelect = (selectedScopeMode: Exclude<ScopeMode, null>): void => {
    setIsAuthRedirecting(true);
    setShowLoginModal(false);
    authenticateWithGoogle(selectedScopeMode, undefined, (error: Error) => {
      setIsAuthRedirecting(false);
      alert(t('loginErrorWithMessage', { message: error.message }));
    });
  };

  const promptForEditingUpgrade = (): void => {
    setLoginModalMode('upgrade');
    setShowLoginModal(true);
  };

  const handleChangePermissions = async (): Promise<void> => {
    if (isAllCalendarsMode && window.confirm(t('switchToHebsyncOnlyConfirm'))) {
      setIsLoading(true);
      await revokeAccess();
      setIsAuthenticated(false);
      setScopeMode(null);
      setIsLoading(false);
      setLoginModalMode('connect');
      setLoginModalInitialScopeMode(SCOPE_MODES.APP_CREATED);
      setShowLoginModal(true);
      return;
    }

    setLoginModalMode('connect');
    setLoginModalInitialScopeMode(SCOPE_MODES.READ_ONLY);
    setShowLoginModal(true);
  };

  const handleDisableEditing = async (): Promise<void> => {
    if (!window.confirm(t('switchToReadOnlyConfirm'))) return;

    setIsLoading(true);
    await revokeAccess();
    setIsAuthenticated(false);
    setScopeMode(null);
    setCalendars([]);
    setSelectedCalendarIds([]);
    setCalendarEvents([]);
    setMyEvents([]);
    setIsLoading(false);
    authenticateWithGoogle(SCOPE_MODES.READ_ONLY);
  };

  const handleCreateCalendar = async (): Promise<void> => {
    const name = window.prompt(t('newCalendarPrompt'));
    if (!name) return;
    try {
      await createNewCalendar(name);
      await loadCalendars();
    } catch {
      alert(t('createCalendarError'));
    }
  };

  const handleRefreshCalendars = (): void => {
    if (!isAuthenticated || isFetchingGoogle) return;
    loadCalendars();
  };

  const toggleCalendar = (id: string): void => {
    setSelectedCalendarIds((prev) =>
      prev.includes(id) ? prev.filter((calendarId) => calendarId !== id) : [...prev, id],
    );
  };

  const selectAllCalendars = (): void => {
    setSelectedCalendarIds(calendars.map((calendar) => calendar.id));
  };

  const deselectAllCalendars = (): void => {
    setSelectedCalendarIds([]);
  };

  const selectCalendarsByIds = (calendarIds: string[]): void => {
    setSelectedCalendarIds((prev) => [...new Set([...prev, ...calendarIds])]);
  };

  const deselectCalendarsByIds = (calendarIds: string[]): void => {
    const calendarIdSet = new Set(calendarIds);
    setSelectedCalendarIds((prev) => prev.filter((id) => !calendarIdSet.has(id)));
  };

  return {
    calendarEvents,
    calendars,
    getCalendarColor,
    getEventColor,
    handleChangePermissions,
    handleCreateCalendar,
    handleDisableEditing,
    handleLogin,
    handleRefreshCalendars,
    hasLoadedCalendarData,
    hasWriteAccess,
    hasResolvedSession,
    hebSyncCalendars,
    isAuthRedirecting,
    isAllCalendarsMode,
    isAuthenticated,
    isCalendarLoading,
    isFetchingGoogle,
    isGoogleLoadingCount,
    isLoading,
    loadCalendarData,
    loadCalendars,
    loadEvents,
    loginModalInitialScopeMode,
    loginModalMode,
    myEvents,
    onLoginSelect,
    otherCalendars,
    promptForEditingUpgrade,
    scopeMode,
    selectedCalendarIds,
    setCalendarEvents,
    setCalendars,
    setHasLoadedCalendarData,
    setIsAuthenticated,
    setLoginModalMode,
    setLoginModalInitialScopeMode,
    setMyEvents,
    setSelectedCalendarIds,
    setShowEventAges,
    setShowFasts,
    setShowGregorian,
    setShowHolidayEvents,
    setShowNationalHolidays,
    setShowWeeklyParsha,
    setShowLoginModal,
    setShowRoshChodesh,
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
  };
}
