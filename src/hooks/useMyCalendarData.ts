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

export default function useMyCalendarData({ t }: UseMyCalendarDataParams) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getAccessToken());
  const [myEvents, setMyEvents] = useState<MyCalendarEventListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoadingCount, setIsGoogleLoadingCount] = useState(0);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [hasLoadedCalendarData, setHasLoadedCalendarData] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState<LoginModalMode>('connect');
  const [loginModalInitialScopeMode, setLoginModalInitialScopeMode] = useState<Exclude<ScopeMode, null>>(SCOPE_MODES.APP_CREATED);
  const [scopeMode, setScopeMode] = useState<ScopeMode>(getScopeMode());
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [viewHDate, setViewHDate] = useState<HDate>(new HDate());
  const [calendarEvents, setCalendarEvents] = useState<GoogleCalendarEvent[]>([]);
  const [googleCalendarColors, setGoogleCalendarColors] = useState<GoogleCalendarColors | null>(null);
  const [showGregorian, setShowGregorian] = useState(true);
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
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAuthenticated(false);
          setScopeMode(null);
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
      setCalendars(calendarsWithColors);
      setGoogleCalendarColors(googleColors);
      setSelectedCalendarIds(hebSyncCalendarIds);
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
    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setScopeMode(null);
      setCalendars([]);
      setGoogleCalendarColors(null);
      setSelectedCalendarIds([]);
      setCalendarEvents([]);
      setMyEvents([]);
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
    setLoginModalMode('connect');
    setLoginModalInitialScopeMode(SCOPE_MODES.APP_CREATED);
    setShowLoginModal(true);
  };

  const onLoginSelect = (selectedScopeMode: Exclude<ScopeMode, null>): void => {
    setShowLoginModal(false);
    authenticateWithGoogle(selectedScopeMode, undefined, (error: Error) => {
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
    hebSyncCalendars,
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
    setShowGregorian,
    setShowLoginModal,
    setViewHDate,
    setViewMode,
    showGregorian,
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
