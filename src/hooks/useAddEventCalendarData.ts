import { useEffect, useState } from 'react';
import { resolveCalendarColor } from '../utils/googleCalendarColors';
import {
  canEditCalendars,
  createNewCalendar,
  fetchAllCalendars,
  fetchGoogleCalendarColors,
  fetchSession,
  GCAL_AUTH_EXPIRED_EVENT,
  getScopeMode,
  isAuthError,
} from '../utils/googleApi';

import type { Calendar, ScopeMode } from '../types/appTypes';

type AuthModalMode = 'upgrade' | 'reauthorize';

interface UseAddEventCalendarDataParams {
  onAuthExpired?: (mode: AuthModalMode) => void;
  onCalendarsChanged?: (() => Promise<void> | void) | null;
  t: (key: string) => string;
}

export default function useAddEventCalendarData({
  onAuthExpired,
  onCalendarsChanged,
  t,
}: UseAddEventCalendarDataParams) {
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [scopeMode, setScopeMode] = useState<ScopeMode>(getScopeMode());
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [showReadOnlyCalendars, setShowReadOnlyCalendars] = useState(false);

  const hasWriteAccess = canEditCalendars(scopeMode);
  const writableCalendars = calendars.filter((calendar) =>
    ['owner', 'writer'].includes(calendar.accessRole),
  );
  const readOnlyCalendars = calendars.filter(
    (calendar) => !['owner', 'writer'].includes(calendar.accessRole),
  );

  const clearCalendarSession = () => {
    setCalendars([]);
    setSelectedCalendarIds([]);
    setScopeMode(null);
  };

  const loadCalendars = async () => {
    setIsCalendarLoading(true);
    try {
      const [fetchedCalendars, googleColors] = await Promise.all([
        fetchAllCalendars(),
        fetchGoogleCalendarColors().catch((): null => null),
      ]);
      const calendarsWithColors = fetchedCalendars.map((calendar, index) => ({
        ...calendar,
        color: resolveCalendarColor(calendar, index, googleColors),
      }));
      setCalendars(calendarsWithColors);
    } catch (error) {
      if (isAuthError(error)) return;
      console.error('Failed to load calendars', error);
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const handleCreateCalendar = async () => {
    if (!hasWriteAccess) {
      onAuthExpired?.('upgrade');
      return;
    }

    const name = window.prompt(t('newCalendarPrompt'));
    if (!name) return;

    setIsCalendarLoading(true);
    try {
      await createNewCalendar(name);
      await loadCalendars();
      if (onCalendarsChanged) {
        await onCalendarsChanged();
      }
    } catch (error) {
      alert(t('createCalendarError'));
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const toggleCalendar = (id: string) => {
    setSelectedCalendarIds((prev) =>
      prev.includes(id)
        ? prev.filter((calendarId) => calendarId !== id)
        : [...prev, id],
    );
  };

  useEffect(() => {
    let isMounted = true;

    fetchSession()
      .then((session) => {
        if (isMounted && session) {
          setScopeMode(session.scopeMode || null);
          loadCalendars();
        }
      })
      .catch(() => {
        if (isMounted) {
          setScopeMode(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      clearCalendarSession();
      onAuthExpired?.('reauthorize');
    };

    window.addEventListener(GCAL_AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(GCAL_AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  return {
    calendars,
    clearCalendarSession,
    handleCreateCalendar,
    hasWriteAccess,
    isCalendarLoading,
    loadCalendars,
    readOnlyCalendars,
    selectedCalendarIds,
    setShowReadOnlyCalendars,
    showReadOnlyCalendars,
    toggleCalendar,
    writableCalendars,
  };
}
