import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, Filter, Trash2, LogIn, RefreshCw, ChevronRight, ChevronLeft, ChevronDown, LogOut, Shield, Eye, X, Upload, Menu, PencilLine } from 'lucide-react';
import Logo from '../components/Logo';
import LoginModal from '../components/LoginModal';
import { authenticateWithGoogle, canEditCalendars, GCAL_AUTH_EXPIRED_EVENT, getAccessToken, fetchMyAppEvents, deleteEvent, fetchEventsInRange, fetchAllCalendars, createNewCalendar, fetchSession, isAuthError, isHebSyncCalendar, revokeAccess, SCOPE_MODES, updateEvent, usesAllCalendarsMode } from '../utils/googleApi';
import { HEBREW_MONTHS, formatHebrewYear } from '../utils/hebcal';
import { HDate, gematriya } from '@hebcal/core';

import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

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
  const externalLabel = t('externalLabel');
  const closeDayEventsLabel = t('closeDayEvents');
  const dayEventsDialogLabel = t('dayEventsDialog');

  // Color palette for calendars
  const calendarColors = [
    '#0038A8', // Blue
    '#DC2626', // Red
    '#16A34A', // Green
    '#CA8A04', // Yellow
    '#9333EA', // Purple
    '#C2410C', // Orange
    '#0891B2', // Cyan
    '#BE185D', // Pink
    '#4B5563', // Gray
    '#7C2D12', // Brown
  ];

  const getCalendarColor = (calendarId) => {
    const calendar = calendars.find(c => c.id === calendarId);
    return calendar?.color || '#0038A8';
  };

  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());
  // ... rest of state remain same
  const [myEvents, setMyEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoadingCount, setIsGoogleLoadingCount] = useState(0);
  const isFetchingGoogle = isGoogleLoadingCount > 0;
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState('connect');
  const [scopeMode, setScopeMode] = useState(localStorage.getItem('gcal_scope_mode'));
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [overflowDay, setOverflowDay] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHebSyncGroupOpen, setIsHebSyncGroupOpen] = useState(true);
  const [isOtherGroupOpen, setIsOtherGroupOpen] = useState(false);

  // Calendar View State
  const [viewHDate, setViewHDate] = useState(new HDate());
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [showGregorian, setShowGregorian] = useState(true);
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === 'undefined') return 'month';
    return window.innerWidth < 768 ? 'schedule' : 'month';
  });
  const isAllCalendarsMode = usesAllCalendarsMode(scopeMode);
  const hasWriteAccess = canEditCalendars(scopeMode);
  const hebSyncCalendars = calendars.filter(isHebSyncCalendar);
  const otherCalendars = calendars.filter((calendar) => !isHebSyncCalendar(calendar));

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
      setSelectedEvent(null);
      setLoginModalMode('reauthorize');
      setShowLoginModal(true);
    };

    window.addEventListener(GCAL_AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(GCAL_AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (selectedCalendarIds.length > 0) {
        loadCalendarData();
        loadEvents();
      } else {
        setCalendarEvents([]);
        setMyEvents([]);
      }
    }
  }, [isAuthenticated, viewHDate, selectedCalendarIds]);

  useEffect(() => {
    if (hebSyncCalendars.length > 0) {
      setIsHebSyncGroupOpen(true);
    }
    if (otherCalendars.length === 0) {
      setIsOtherGroupOpen(false);
    }
  }, [hebSyncCalendars.length, otherCalendars.length]);

  const loadCalendars = async () => {
    setIsGoogleLoadingCount((count) => count + 1);
    try {
      const cals = await fetchAllCalendars();
      // Assign colors to calendars
      const calendarsWithColors = cals.map((cal, index) => ({
        ...cal,
        color: calendarColors[index % calendarColors.length]
      }));
      const hebSyncCalendarIds = calendarsWithColors
        .filter(isHebSyncCalendar)
        .map((calendar) => calendar.id);
      setCalendars(calendarsWithColors);
      setSelectedCalendarIds(hebSyncCalendarIds);
    } catch (e) {
      if (isAuthError(e)) return;
      console.error("Failed to load calendars", e);
    } finally {
      setIsGoogleLoadingCount((count) => Math.max(0, count - 1));
    }
  };

  const handleCreateCalendar = async () => {
    const name = window.prompt(t('newCalendarPrompt'));
    if (!name) return;
    try {
      await createNewCalendar(name);
      await loadCalendars();
    } catch (e) {
      alert(t('createCalendarError'));
    }
  };

  const toggleCalendar = (id) => {
    setSelectedCalendarIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const selectAllCalendars = () => {
    setSelectedCalendarIds(calendars.map(c => c.id));
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

  const handleRefreshCalendars = () => {
    if (!isAuthenticated || isFetchingGoogle) return;
    loadCalendars();
  };

  const renderCalendarGroup = (title, groupKey, groupCalendars, isOpen, setIsOpen) => {
    if (groupCalendars.length === 0) return null;

    const selectedCount = groupCalendars.filter((calendar) =>
      selectedCalendarIds.includes(calendar.id),
    ).length;
    const isHebSyncGroup = groupKey === 'hebsync';

    return (
      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex min-w-0 flex-1 items-center gap-2 text-right"
          >
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${isHebSyncGroup ? 'bg-blue-50 text-[#0038A8] dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
              {isOpen
                ? <ChevronDown className="w-3.5 h-3.5" />
                : isRtl
                  ? <ChevronLeft className="w-3.5 h-3.5" />
                  : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{title}</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                {selectedCount} / {groupCalendars.length} {selectedCountSuffix}
              </div>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2 text-[10px] font-bold">
            <button
              type="button"
              onClick={() => selectCalendarsByIds(groupCalendars.map((calendar) => calendar.id))}
              className="text-slate-500 transition-colors hover:text-[#0038A8]"
            >
              {t('selectAll')}
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => deselectCalendarsByIds(groupCalendars.map((calendar) => calendar.id))}
              className="text-slate-500 transition-colors hover:text-[#0038A8]"
            >
              {t('clearAll')}
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="border-t border-slate-100 px-2 pb-2 pt-1 dark:border-slate-800">
            <div className="space-y-1">
              {groupCalendars.map((cal) => (
                <label key={cal.id} className="flex items-center gap-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-50 p-1.5 rounded-lg dark:hover:bg-slate-800 transition-colors">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }}></div>
                  <input type="checkbox" checked={selectedCalendarIds.includes(cal.id)} onChange={() => toggleCalendar(cal.id)} className="w-3 h-3 rounded border-slate-300 text-[#0038A8]" />
                  <span className="truncate">{cal.summary}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const loadCalendarData = async () => {
    setIsCalendarLoading(true);
    try {
      const hMonth = viewHDate.getMonthName();
      const hYear = viewHDate.getFullYear();

      const firstDayH = new HDate(1, hMonth, hYear);
      const lastDayH = new HDate(HDate.daysInMonth(HDate.monthFromName(hMonth), hYear), hMonth, hYear);

      const timeMin = firstDayH.greg().toISOString();
      const timeMax = lastDayH.greg().toISOString();

      const events = await fetchEventsInRange(timeMin, timeMax, selectedCalendarIds);
      setCalendarEvents(events);
    } catch (e) {
      if (isAuthError(e)) return;
      console.error(e);
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const loadEvents = async () => {
    setIsLoading(true);
    setIsGoogleLoadingCount((count) => count + 1);
    try {
      const items = await fetchMyAppEvents(selectedCalendarIds);
      const currentHebrewYear = new HDate().getFullYear();
      const formattedEvents = items.map(item => {
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
          date: item.start?.date || t('unknownDate')
        };
      });
      setMyEvents(formattedEvents);
    } catch (e) {
      console.error(e);
      if (isAuthError(e)) {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
      setIsGoogleLoadingCount((count) => Math.max(0, count - 1));
    }
  };

  const handleLogin = () => {
    setLoginModalMode('connect');
    setShowLoginModal(true);
  };

  const onLoginSelect = (scopeMode) => {
    setShowLoginModal(false);
    authenticateWithGoogle(scopeMode, undefined, (err) => {
      alert(t('loginErrorWithMessage', { message: err.message }));
    });
  };

  const promptForEditingUpgrade = () => {
    setLoginModalMode('upgrade');
    setShowLoginModal(true);
  };

  const handleChangePermissions = async () => {
    if (isAllCalendarsMode) {
      if (window.confirm(t('switchToHebsyncOnlyConfirm'))) {
        setIsLoading(true);
        await revokeAccess();
        setIsAuthenticated(false);
        setScopeMode(null);
        setIsLoading(false);
        setLoginModalMode('connect');
        setShowLoginModal(true);
        return;
      }
    }
    setLoginModalMode('connect');
    setShowLoginModal(true);
  };

  const handleRevoke = async () => {
    if (!window.confirm(t('revokeAccessConfirm'))) return;
    setIsLoading(true);
    await revokeAccess();
    setIsAuthenticated(false);
    setIsLoading(false);
    navigate('/');
  };

  const handleDelete = async (calendarId, googleEventId) => {
    if (!hasWriteAccess) {
      promptForEditingUpgrade();
      return;
    }
    if (!window.confirm(t('deleteEventConfirm'))) return;
    try {
      await deleteEvent(calendarId, googleEventId);
      setSelectedEvent(null);
      loadCalendarData();
      loadEvents();
    } catch (e) {
      alert(t('deleteEventError'));
    }
  };

  const handleUpdate = async () => {
    if (!hasWriteAccess) {
      promptForEditingUpgrade();
      return;
    }
    try {
      await updateEvent(selectedEvent.calendarId, selectedEvent.id, {
        summary: editTitle,
        description: editDesc
      });
      setIsEditing(false);
      setSelectedEvent(null);
      loadCalendarData();
    } catch (e) {
      alert(t('updateEventError'));
    }
  };

  const handleEventClick = (event) => {
    const isHebCal = event.extendedProperties?.private?.appIdentifier === 'MyHebrewCalendar';
    if (!isHebCal) return;

    setSelectedEvent(event);
    setEditTitle(event.summary);
    setEditDesc(event.description || '');
    setIsEditing(false);
  };

  const handleOverflowDayOpen = (dayObj, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
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

  const handleOverflowEventClick = (event) => {
    setOverflowDay(null);
    handleEventClick(event);
  };

  const handleNextMonth = () => {
    setViewHDate(prev => {
      let m = prev.getMonth();
      let y = prev.getFullYear();
      const monthsInYear = HDate.monthsInYear(y);
      if (m === 6) { m = 7; y++; }
      else if (m === monthsInYear) { m = 1; }
      else { m++; }
      return new HDate(1, m, y);
    });
  };

  const handlePrevMonth = () => {
    setViewHDate(prev => {
      let m = prev.getMonth();
      let y = prev.getFullYear();
      if (m === 7) { m = 6; y--; }
      else if (m === 1) { m = HDate.monthsInYear(y); }
      else { m--; }
      return new HDate(1, m, y);
    });
  };

  const getDaysInHMonth = () => {
    const hMonth = viewHDate.getMonthName();
    const hYear = viewHDate.getFullYear();
    const firstDayH = new HDate(1, hMonth, hYear);
    const daysInMonth = HDate.daysInMonth(HDate.monthFromName(hMonth), hYear);
    const firstDayOfWeek = firstDayH.getDay();
    const days = [];
    for (let i = 0; i < firstDayOfWeek; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const hDate = new HDate(d, hMonth, hYear);
      const gDate = hDate.greg();
      const today = new Date();
      const isToday =
        gDate.getFullYear() === today.getFullYear() &&
        gDate.getMonth() === today.getMonth() &&
        gDate.getDate() === today.getDate();
      const dayEvents = calendarEvents.filter(event => {
        const start = event.start?.date || event.start?.dateTime;
        if (!start) return false;
        const eDate = new Date(start);
        const isSameDay = eDate.getFullYear() === gDate.getFullYear() &&
          eDate.getMonth() === gDate.getMonth() &&
          eDate.getDate() === gDate.getDate();
        if (!isSameDay) return false;
        return true;
      });
      days.push({
        hDay: d,
        hDayGematriya: gematriya(d),
        gDay: gDate.getDate(),
        gMonthLabel: gDate.toLocaleString('he-IL', { month: 'short' }),
        gDate,
        events: dayEvents,
        hYear: hDate.getFullYear(),
        isToday,
        isShabbat: hDate.getDay() === 6,
        weekday: hDate.getDay(),
      });
    }
    return days;
  };

  const days = getDaysInHMonth();
  const hMonthNameEnglish = viewHDate.getMonthName();
  const hMonthNameHebrew = HEBREW_MONTHS.find(m => m.id === hMonthNameEnglish)?.label || hMonthNameEnglish;
  const hYear = formatHebrewYear(viewHDate.getFullYear());
  const gMonthRange = `${new HDate(1, hMonthNameEnglish, viewHDate.getFullYear()).greg().toLocaleString('he-IL', { month: 'long' })} - ${new HDate(HDate.daysInMonth(HDate.monthFromName(hMonthNameEnglish), viewHDate.getFullYear()), hMonthNameEnglish, viewHDate.getFullYear()).greg().toLocaleString('he-IL', { month: 'long' })}`;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
  const isMobileViewport = viewportWidth < 768;
  const maxVisibleMonthEvents = isMobileViewport ? 3 : 4;
  const overflowPopoverWidth = 220;
  const overflowPopoverMargin = 12;
  const overflowAnchorRect = overflowDay?.anchorRect;
  const overflowEventCount = overflowDay?.events?.length ?? 0;
  const overflowPopoverHeight = Math.min(
    viewportHeight - overflowPopoverMargin * 2,
    56 + overflowEventCount * 44,
  );
  const overflowPreferredTop = (overflowAnchorRect?.bottom ?? 120) + 8;
  const overflowAboveTop = (overflowAnchorRect?.top ?? 120) - overflowPopoverHeight - 8;
  const overflowTop = Math.max(
    overflowPopoverMargin,
    Math.min(
      overflowPreferredTop + overflowPopoverHeight <= viewportHeight - overflowPopoverMargin
        ? overflowPreferredTop
        : overflowAboveTop,
      viewportHeight - overflowPopoverHeight - overflowPopoverMargin,
    ),
  );
  const overflowLeft = Math.max(
    overflowPopoverMargin,
    Math.min(
      (overflowAnchorRect?.right ?? overflowPopoverWidth + overflowPopoverMargin) - overflowPopoverWidth,
      viewportWidth - overflowPopoverWidth - overflowPopoverMargin,
    ),
  );
  const scheduleDays = days
    .filter((dayObj) => dayObj?.events?.length)
    .map((dayObj) => ({
      ...dayObj,
      events: [...dayObj.events].sort((a, b) => {
        const aStart = a.start?.dateTime || a.start?.date || '';
        const bStart = b.start?.dateTime || b.start?.date || '';
        return aStart.localeCompare(bStart);
      }),
    }));

  return (
    <div className={`h-screen bg-slate-50 dark:bg-slate-900 font-sans flex flex-col ${isRtl ? 'text-right' : 'text-left'} overflow-hidden`} dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -mr-2 text-slate-600 hover:bg-slate-50 rounded-lg dark:text-slate-400 dark:hover:bg-slate-800">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <Logo className="w-8 h-8" />
            <h1 className="text-lg md:text-xl font-black tracking-tight dark:text-white" style={{ fontFamily: isRtl ? "'Heebo', 'Rubik', sans-serif" : 'inherit' }}>
              <span className="text-[#0038A8] dark:text-blue-400">{t('appNameFirst')}</span>
              <span className="text-slate-900 dark:text-white">{t('appNameSecond')}</span>
            </h1>
          </div>
          <nav className={`hidden md:flex items-center gap-2 ${isRtl ? 'border-r pr-6 mr-2' : 'border-l pl-6 ml-2'} border-slate-200 dark:border-slate-700`}>
            <button onClick={() => navigate('/')} className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-[#0038A8] rounded-lg dark:text-slate-400">{t('home')}</button>
            <button onClick={() => navigate('/calendar')} className="px-3 py-2 text-sm font-bold text-[#0038A8] bg-blue-50 rounded-lg dark:bg-blue-900/30 dark:text-blue-300">{t('myCalendar')}</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {!isAuthenticated ? (
            <button onClick={handleLogin} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-[#0038A8] rounded-lg font-bold dark:bg-blue-900/30 dark:text-blue-300"><LogIn className="w-4 h-4" />{t('login')}</button>
          ) : (
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={handleRevoke} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all dark:text-red-400 dark:hover:bg-red-900/20" title={t('disconnect')}><LogOut className="w-5 h-5" /></button>
              <button onClick={() => navigate('/add-event')} className="px-3 md:px-4 py-2 bg-[#0038A8] text-white rounded-lg font-bold text-sm md:text-base">+ {t('addEvent')}</button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative min-h-0">
        <aside className={`fixed inset-y-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} z-40 w-72 bg-white border-slate-200 flex flex-col min-h-0 h-full dark:bg-slate-900 dark:border-slate-800 transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between p-4 border-b md:hidden dark:border-slate-800">
            <span className="font-bold dark:text-white">{menuLabel}</span>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg dark:hover:bg-slate-800"><X className="w-5 h-5 dark:text-slate-400" /></button>
          </div>
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>{t('calendarAccess')}</span>
                <button onClick={handleChangePermissions} className="text-[#0038A8] dark:text-blue-400 underline">{t('change')}</button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  {isAllCalendarsMode ? <><Eye className="w-3 h-3 text-blue-500" /> {t('permissionAllCalendars')}</> : <><Shield className="w-3 h-3 text-emerald-500" /> {t('permissionHebsyncOnly')}</>}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                  {isAllCalendarsMode
                    ? hasWriteAccess
                      ? t('editingEnabledStatus')
                      : t('viewingOnlyStatus')
                    : t('hebSyncOnlyStatus')}
                </p>
                {isAllCalendarsMode && !hasWriteAccess && (
                  <button
                    onClick={promptForEditingUpgrade}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-bold text-[#0038A8] transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    <PencilLine className="w-3.5 h-3.5" />
                    {t('enableEditing')}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 flex flex-col flex-1 min-h-0">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="min-w-0 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm"><CalendarIcon className="w-4 h-4 text-[#0038A8]" /> {t('myCalendars')}</h2>
                  <div className="flex shrink-0 items-center gap-2">
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={handleRefreshCalendars}
                        disabled={isFetchingGoogle}
                        aria-label={refreshCalendarsLabel}
                        title={refreshCalendarsLabel}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                          isFetchingGoogle
                            ? 'cursor-wait border-blue-100 bg-blue-50 text-[#0038A8] dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-300'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-[#0038A8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-900/30 dark:hover:bg-blue-900/20 dark:hover:text-blue-300'
                        }`}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGoogle ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    {isAuthenticated && (
                      <button
                        onClick={hasWriteAccess ? handleCreateCalendar : promptForEditingUpgrade}
                        className="shrink-0 text-[10px] bg-blue-50 text-[#0038A8] px-2 py-1 rounded font-bold dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        + {hasWriteAccess ? t('new') : t('allowCalendarCreation')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isAuthenticated && calendars.length > 0 && (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-bold dark:bg-slate-800/70">
                  <span className="text-slate-400 dark:text-slate-500">{allCalendarsGroupLabel}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={selectAllCalendars} className="text-slate-500 hover:text-[#0038A8] transition-colors">{t('selectAll')}</button>
                    <span className="text-slate-300">|</span>
                    <button onClick={deselectAllCalendars} className="text-slate-500 hover:text-[#0038A8] transition-colors">{t('clearAll')}</button>
                  </div>
                </div>
              )}

              <div className="space-y-3 flex flex-col flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                {renderCalendarGroup(
                  hebSyncGroupLabel,
                  'hebsync',
                  hebSyncCalendars,
                  isHebSyncGroupOpen,
                  setIsHebSyncGroupOpen,
                )}
                {renderCalendarGroup(
                  otherCalendarsGroupLabel,
                  'other',
                  otherCalendars,
                  isOtherGroupOpen,
                  setIsOtherGroupOpen,
                )}
                {calendars.length === 0 && !isFetchingGoogle && (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                    {noCalendarsAvailableLabel}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-auto border-t border-slate-100 dark:border-slate-800 space-y-4">
              <div className="p-3 bg-blue-50/20 dark:bg-blue-900/10 rounded-xl space-y-2">
                <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
                  <Upload className="w-4 h-4 opacity-50" />
                  <div>
                    <p className="text-[10px] font-bold">{t('importCsv')}</p>
                    <p className="text-[9px] opacity-70 italic">{t('comingSoon')}</p>
                  </div>
                </div>
              </div>
              <div className="text-[9px] text-slate-400 font-medium leading-tight">
                {t('thanksTo')} <a href="https://github.com/hebcal/hebcal-es6" target="_blank" rel="noopener noreferrer" className="text-[#0038A8] dark:text-blue-400 hover:underline">Hebcal</a>
              </div>
            </div>
          </div>
        </aside>

        {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />}

        <main className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top,_rgba(0,56,168,0.08),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94))] px-4 pb-4 pt-0 md:px-6 md:pb-6 md:pt-1 xl:px-8 xl:pb-8">
          <div className="mx-auto flex h-full w-full max-w-[1680px] flex-col gap-3">
            <section className="px-1 py-0">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className={`flex w-full items-center gap-1.5 md:gap-2.5 ${isRtl ? 'justify-end' : 'justify-start'} md:w-auto`}>
                  <button
                    type="button"
                    onClick={() => setViewHDate(new HDate())}
                    className="inline-flex h-10 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    {t('today')}
                  </button>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={isRtl ? handleNextMonth : handlePrevMonth}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                      {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={isRtl ? handlePrevMonth : handleNextMonth}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    >
                      {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className={`min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <h2 className="text-[1.6rem] font-black tracking-tight text-slate-900 dark:text-slate-50 md:text-[1.85rem]" style={{ fontFamily: isRtl ? "'Heebo', 'Rubik', sans-serif" : 'inherit' }}>
                      {hMonthNameHebrew} {hYear}
                    </h2>
                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 md:text-xs">
                      {gMonthRange} {viewHDate.greg().getFullYear()}
                    </p>
                  </div>
                </div>

                <div className={`flex w-full flex-wrap items-center gap-2 ${isRtl ? 'justify-end md:justify-start' : 'justify-start md:justify-end'} md:w-auto`}>
                  <div className="inline-flex rounded-full border border-slate-300 bg-white p-0.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setViewMode('month')}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                        viewMode === 'month'
                          ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white'
                          : 'text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t('viewMonth')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('schedule')}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors ${
                        viewMode === 'schedule'
                          ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white'
                          : 'text-slate-500 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t('viewSchedule')}
                    </button>
                  </div>
                  <label className="flex h-[34px] items-center gap-2 cursor-pointer rounded-full border border-slate-300 bg-white px-3 text-[11px] font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <input type="checkbox" checked={showGregorian} onChange={(e) => setShowGregorian(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-[#0038A8]" />
                    <span>{t('showGregorianDates')}</span>
                  </label>
                </div>
              </div>
            </section>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] dark:border-slate-700/60 dark:bg-slate-900">
              {viewMode === 'month' ? (
                <>
                  <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50/95 backdrop-blur dark:bg-slate-900/70">
                    {[0, 1, 2, 3, 4, 5, 6].map((idx) => {
                      const weekdayLabel = t(`days.${idx}`);
                      return (
                        <div key={idx} className={`px-2 py-3 text-center text-[10px] md:text-xs font-bold ${idx === 6 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-300'}`}>
                          <span className="hidden md:inline">{weekdayLabel}</span>
                          <span className="md:hidden">{weekdayLabel.substring(0, 1)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto bg-white dark:bg-slate-900">
                    {days.map((dayObj, i) => (
                      <div key={i} className={`min-h-[112px] md:min-h-[148px] xl:min-h-[164px] border-b border-l border-slate-200 dark:border-slate-700/60 ${!dayObj ? 'bg-slate-50 dark:bg-slate-900/40' : 'bg-white dark:bg-slate-900'} transition-colors`}>
                        {dayObj && (
                          <div className={`flex h-full min-h-0 flex-col overflow-hidden px-1 py-1 md:px-2 md:py-1.5 ${dayObj.isToday ? 'bg-blue-50/60 dark:bg-blue-950/20' : ''}`}>
                            <div className={`flex w-full items-start px-0.5 pb-1 md:px-1 ${isRtl ? 'justify-center md:justify-start text-center md:text-right' : 'justify-center md:justify-end text-center md:text-left'}`}>
                              <div className={`flex w-full items-center gap-0 ${isRtl ? 'justify-center md:justify-start' : 'justify-center md:justify-end'}`}>
                                <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] leading-none font-bold md:h-7 md:min-w-7 md:px-1.5 md:text-sm ${
                                  dayObj.isToday
                                    ? 'bg-[#1a73e8] text-white shadow-sm'
                                    : 'text-slate-800 dark:text-slate-100'
                                }`}>
                                  {dayObj.hDayGematriya}
                                </span>
                                {showGregorian && (
                                  <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 md:text-[10px]">
                                    ({dayObj.gDay})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex w-full flex-1 flex-col gap-0.5 overflow-hidden px-0.5 pb-0.5">
                              {dayObj.events.slice(0, maxVisibleMonthEvents).map((event, idx) => {
                                const props = event.extendedProperties?.private || {};
                                const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
                                const originalYear = isHebCal ? parseInt(props.originalHebrewYear, 10) : null;
                                const age = (originalYear && dayObj.hYear) ? (dayObj.hYear - originalYear) : 0;
                                const ageSuffix = isHebCal ? ` (${age})` : '';
                                const eventColor = getCalendarColor(event.calendarId);
                                return (
                                  <div
                                    key={idx}
                                    onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                                    className={`group relative w-full overflow-hidden rounded-md px-2 py-1 text-[10px] leading-tight font-bold transition-all flex-none ${
                                      isHebCal
                                        ? 'cursor-pointer text-white hover:brightness-95'
                                        : 'cursor-default bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100'
                                    }`}
                                    style={isHebCal ? { backgroundColor: eventColor } : { borderRight: `3px solid ${eventColor}` }}
                                    title={event.summary + ageSuffix}
                                  >
                                    <div className="truncate">{event.summary}{ageSuffix}</div>
                                  </div>
                                );
                              })}
                              {dayObj.events.length > maxVisibleMonthEvents && (
                                <button
                                  type="button"
                                  onClick={(event) => handleOverflowDayOpen(dayObj, event)}
                                  className="px-1 text-right text-[10px] font-bold text-[#1a73e8] hover:underline dark:text-blue-300"
                                  aria-label={t('moreEvents', { count: dayObj.events.length - maxVisibleMonthEvents })}
                                >
                                  {isMobileViewport ? '...' : t('moreEvents', { count: dayObj.events.length - maxVisibleMonthEvents })}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto bg-white px-3 py-3 dark:bg-slate-900 md:px-5 md:py-4">
                  {scheduleDays.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400 dark:text-slate-500">
                      {t('noEventsInView')}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {scheduleDays.map((dayObj) => (
                        <section
                          key={dayObj.gDate.toISOString()}
                          className="grid grid-cols-[60px_minmax(0,1fr)] gap-2.5 border-b border-slate-100 pb-3 last:border-b-0 dark:border-slate-800 md:grid-cols-[86px_minmax(0,1fr)] md:gap-4"
                        >
                          <div className={`pt-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-black md:h-10 md:w-10 md:text-base ${dayObj.isToday ? 'bg-[#1a73e8] text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100'}`}>
                              {dayObj.isToday ? dayObj.gDay : dayObj.hDayGematriya}
                            </div>
                            <div className="mt-1 text-[10px] font-bold text-slate-800 dark:text-slate-100 md:text-[11px]">
                              {t(`days.${dayObj.weekday}`)}
                            </div>
                            <div className="text-[9px] font-medium text-slate-400 dark:text-slate-500 md:text-[10px]">
                              {showGregorian ? `${dayObj.gMonthLabel} ${dayObj.gDay}` : hMonthNameHebrew}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            {dayObj.events.map((event, idx) => {
                              const props = event.extendedProperties?.private || {};
                              const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
                              const originalYear = isHebCal ? parseInt(props.originalHebrewYear, 10) : null;
                              const age = (originalYear && dayObj.hYear) ? (dayObj.hYear - originalYear) : 0;
                              const ageSuffix = isHebCal ? ` (${age})` : '';
                              const eventColor = getCalendarColor(event.calendarId);
                              const start = event.start?.dateTime || event.start?.date;
                              const end = event.end?.dateTime || event.end?.date;
                              const timeLabel = event.start?.dateTime
                                ? `${new Date(start).toLocaleTimeString(isRtl ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}${end ? ` - ${new Date(end).toLocaleTimeString(isRtl ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}`
                                : '';
                              return (
                                <button
                                  key={`${event.id || event.summary}-${idx}`}
                                  type="button"
                                  onClick={() => handleEventClick(event)}
                                  className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-2 text-right transition-all ${
                                    isHebCal
                                      ? 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
                                      : 'border-slate-100 bg-slate-50/80 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/70 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: eventColor }} />
                                  <div className={`min-w-0 flex-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                                    <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">{event.summary}{ageSuffix}</div>
                                  </div>
                                  {timeLabel && (
                                    <div className="shrink-0 pt-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500 md:text-xs">
                                      {timeLabel}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onSelect={onLoginSelect} mode={loginModalMode} />

      {overflowDay && (
        <div className="fixed inset-0 z-40" dir={isRtl ? 'rtl' : 'ltr'}>
          <button
            type="button"
            aria-label={closeDayEventsLabel}
            onClick={() => setOverflowDay(null)}
            className="absolute inset-0 cursor-default bg-transparent"
          />
          <div
            role="dialog"
            aria-label={dayEventsDialogLabel}
            className="absolute z-10 overflow-hidden rounded-[0.9rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            style={{
              width: `${overflowPopoverWidth}px`,
              maxWidth: `calc(100vw - ${overflowPopoverMargin * 2}px)`,
              top: `${overflowTop}px`,
              left: `${overflowLeft}px`,
            }}
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-2 py-1.5 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOverflowDay(null)}
                className="rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="text-center">
                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                  {showGregorian ? `${overflowDay.gDay}` : ''}
                </div>
                <div className="mt-0.5 text-lg font-black text-slate-900 dark:text-slate-50">
                  {overflowDay.hDayGematriya}
                </div>
              </div>
              <div className="w-5" />
            </div>

            <div className="space-y-1 px-1.5 py-1.5">
              {overflowDay.events.map((event, idx) => {
                const props = event.extendedProperties?.private || {};
                const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
                const originalYear = isHebCal ? parseInt(props.originalHebrewYear, 10) : null;
                const age = (originalYear && overflowDay.hYear) ? (overflowDay.hYear - originalYear) : 0;
                const ageSuffix = isHebCal ? ` (${age})` : '';
                const eventColor = getCalendarColor(event.calendarId);
                const start = event.start?.dateTime || event.start?.date;
                const timeLabel = start && event.start?.dateTime
                  ? new Date(start).toLocaleTimeString(isRtl ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                  : null;

                return (
                  <button
                    key={`${event.id || event.summary}-${idx}`}
                    type="button"
                    onClick={() => handleOverflowEventClick(event)}
                    className={`w-full overflow-hidden rounded-md border text-right transition-all ${
                      isHebCal
                        ? 'border-transparent text-white hover:brightness-95'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700'
                    }`}
                    style={isHebCal ? { backgroundColor: eventColor } : { borderRight: `4px solid ${eventColor}` }}
                  >
                    <div className="px-2 py-1.5">
                      <div className="truncate text-[10px] font-bold leading-4">{event.summary}{ageSuffix}</div>
                      {timeLabel && (
                        <div className={`mt-0.5 text-[9px] font-semibold ${isHebCal ? 'text-white/85' : 'text-slate-400 dark:text-slate-300'}`}>
                          {timeLabel}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('eventDetails')}</h2>
              <button onClick={() => setSelectedEvent(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700 outline-none focus:border-[#0038A8]" placeholder={t('eventName')} />
                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows="4" className="w-full p-3 rounded-xl border border-slate-200 dark:bg-slate-800 dark:border-slate-700 outline-none focus:border-[#0038A8] resize-none text-sm" placeholder={t('description')} />
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const props = selectedEvent.extendedProperties?.private || {};
                    const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
                    const originalYear = isHebCal ? parseInt(props.originalHebrewYear, 10) : null;
                    const currentHebrewYear = new HDate().getFullYear();
                    const age = (originalYear && currentHebrewYear) ? (currentHebrewYear - originalYear) : 0;
                    const ageSuffix = isHebCal ? ` (${age})` : '';
                    return (
                      <>
                        <h3 className="text-2xl font-bold text-[#0038A8] dark:text-blue-400">{selectedEvent.summary}{ageSuffix}</h3>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 min-h-[100px] text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{selectedEvent.description || t('noDescription')}</div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3 bg-slate-50 dark:bg-slate-900/50">
              <button onClick={() => handleDelete(selectedEvent.calendarId, selectedEvent.id)} className={`flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors dark:text-red-400 dark:hover:bg-red-900/20`}><Trash2 className="w-4 h-4" /> {hasWriteAccess ? t('delete') : t('allowDelete')}</button>
              <div className="flex gap-2">
                {isEditing ? (
                  <><button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-bold">{t('cancel')}</button><button onClick={handleUpdate} className="px-6 py-2 bg-[#0038A8] text-white rounded-xl font-bold hover:bg-blue-800 shadow-md">{t('save')}</button></>
                ) : (
                  <button onClick={() => (hasWriteAccess ? setIsEditing(true) : promptForEditingUpgrade())} className="px-6 py-2 bg-white border border-slate-200 text-slate-800 rounded-xl font-bold hover:bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700">{hasWriteAccess ? t('edit') : t('allowEdit')}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
