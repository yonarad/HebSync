import { useEffect, useState } from 'react';
import { HDate } from '@hebcal/core';
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
  isAuthError,
  isHebSyncCalendar,
  revokeAccess,
  SCOPE_MODES,
  usesAllCalendarsMode,
} from '../utils/googleApi';
import { resolveCalendarColor } from '../utils/googleCalendarColors';

export default function useMyCalendarData({ t }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());
  const [myEvents, setMyEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoadingCount, setIsGoogleLoadingCount] = useState(0);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [hasLoadedCalendarData, setHasLoadedCalendarData] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState('connect');
  const [scopeMode, setScopeMode] = useState(localStorage.getItem('gcal_scope_mode'));
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState([]);
  const [viewHDate, setViewHDate] = useState(new HDate());
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [showGregorian, setShowGregorian] = useState(true);
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === 'undefined') return 'month';
    return window.innerWidth < 768 ? 'schedule' : 'month';
  });

  const isFetchingGoogle = isGoogleLoadingCount > 0;
  const isAllCalendarsMode = usesAllCalendarsMode(scopeMode);
  const hasWriteAccess = canEditCalendars(scopeMode);
  const hebSyncCalendars = calendars.filter(isHebSyncCalendar);
  const otherCalendars = calendars.filter((calendar) => !isHebSyncCalendar(calendar));

  const getCalendarColor = (calendarId) => {
    const calendar = calendars.find((cal) => cal.id === calendarId);
    return calendar?.color || '#0038A8';
  };

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

  const loadCalendars = async () => {
    setIsGoogleLoadingCount((count) => count + 1);
    try {
      const [fetchedCalendars, googleColors] = await Promise.all([
        fetchAllCalendars(),
        fetchGoogleCalendarColors().catch(() => null),
      ]);
      const calendarsWithColors = fetchedCalendars.map((calendar, index) => ({
        ...calendar,
        color: resolveCalendarColor(calendar, index, googleColors),
      }));
      const hebSyncCalendarIds = calendarsWithColors
        .filter(isHebSyncCalendar)
        .map((calendar) => calendar.id);
      setCalendars(calendarsWithColors);
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

  const loadCalendarData = async () => {
    setIsCalendarLoading(true);
    try {
      const hMonth = viewHDate.getMonthName();
      const hYear = viewHDate.getFullYear();
      const firstDayH = new HDate(1, hMonth, hYear);
      const lastDayH = new HDate(HDate.daysInMonth(HDate.monthFromName(hMonth), hYear), hMonth, hYear);
      const events = await fetchEventsInRange(
        firstDayH.greg().toISOString(),
        lastDayH.greg().toISOString(),
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

  const loadEvents = async () => {
    setIsLoading(true);
    setIsGoogleLoadingCount((count) => count + 1);
    try {
      const items = await fetchMyAppEvents(selectedCalendarIds);
      const currentHebrewYear = new HDate().getFullYear();
      const formattedEvents = items.map((item) => {
        const props = item.extendedProperties?.private || {};
        const originalYear = parseInt(props.originalHebrewYear, 10);
        const age = originalYear ? (currentHebrewYear - originalYear) : 0;
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

  const handleLogin = () => {
    setLoginModalMode('connect');
    setShowLoginModal(true);
  };

  const onLoginSelect = (selectedScopeMode) => {
    setShowLoginModal(false);
    authenticateWithGoogle(selectedScopeMode, undefined, (error) => {
      alert(t('loginErrorWithMessage', { message: error.message }));
    });
  };

  const promptForEditingUpgrade = () => {
    setLoginModalMode('upgrade');
    setShowLoginModal(true);
  };

  const handleChangePermissions = async () => {
    if (isAllCalendarsMode && window.confirm(t('switchToHebsyncOnlyConfirm'))) {
      setIsLoading(true);
      await revokeAccess();
      setIsAuthenticated(false);
      setScopeMode(null);
      setIsLoading(false);
      setLoginModalMode('connect');
      setShowLoginModal(true);
      return;
    }

    setLoginModalMode('connect');
    setShowLoginModal(true);
  };

  const handleDisableEditing = async () => {
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

  const handleCreateCalendar = async () => {
    const name = window.prompt(t('newCalendarPrompt'));
    if (!name) return;
    try {
      await createNewCalendar(name);
      await loadCalendars();
    } catch (error) {
      alert(t('createCalendarError'));
    }
  };

  const handleRefreshCalendars = () => {
    if (!isAuthenticated || isFetchingGoogle) return;
    loadCalendars();
  };

  const toggleCalendar = (id) => {
    setSelectedCalendarIds((prev) =>
      prev.includes(id) ? prev.filter((calendarId) => calendarId !== id) : [...prev, id],
    );
  };

  const selectAllCalendars = () => {
    setSelectedCalendarIds(calendars.map((calendar) => calendar.id));
  };

  const deselectAllCalendars = () => {
    setSelectedCalendarIds([]);
  };

  const selectCalendarsByIds = (calendarIds) => {
    setSelectedCalendarIds((prev) => [...new Set([...prev, ...calendarIds])]);
  };

  const deselectCalendarsByIds = (calendarIds) => {
    const calendarIdSet = new Set(calendarIds);
    setSelectedCalendarIds((prev) => prev.filter((id) => !calendarIdSet.has(id)));
  };

  return {
    calendarEvents,
    calendars,
    getCalendarColor,
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
