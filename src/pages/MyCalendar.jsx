import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, LogIn, LogOut, X, Menu } from 'lucide-react';
import Logo from '../components/Logo';
import LoginModal from '../components/LoginModal';
import { authenticateWithGoogle, canEditCalendars, GCAL_AUTH_EXPIRED_EVENT, getAccessToken, fetchMyAppEvents, deleteEvent, fetchEventsInRange, fetchAllCalendars, createNewCalendar, fetchSession, isAuthError, isHebSyncCalendar, revokeAccess, SCOPE_MODES, updateEvent, usesAllCalendarsMode } from '../utils/googleApi';
import { HDate } from '@hebcal/core';
import { buildMonthDays, buildScheduleDays, getHebrewMonthMeta, getNextMonthHDate, getOverflowPopoverLayout, getPrevMonthHDate } from '../utils/calendarView';

import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { CalendarToolbar, MonthCalendarView, ScheduleCalendarView, DayEventsPopover } from '../components/MyCalendarViews';
import MyCalendarSidebar from '../components/MyCalendarSidebar';

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
  const [hasLoadedCalendarData, setHasLoadedCalendarData] = useState(false);
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
      setHasLoadedCalendarData(true);
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
    setViewHDate((prev) => getNextMonthHDate(prev));
  };

  const handlePrevMonth = () => {
    setViewHDate((prev) => getPrevMonthHDate(prev));
  };

  const days = buildMonthDays(viewHDate, calendarEvents);
  const { hMonthNameHebrew, hYear, gMonthRange } = getHebrewMonthMeta(viewHDate);
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
  const isMobileViewport = viewportWidth < 768;
  const maxVisibleMonthEvents = isMobileViewport ? 3 : 4;
  const { overflowPopoverWidth, overflowPopoverMargin, overflowTop, overflowLeft } = getOverflowPopoverLayout({
    overflowDay,
    viewportWidth,
    viewportHeight,
  });
  const scheduleDays = buildScheduleDays(days);
  const isScheduleLoading =
    isCalendarLoading ||
    (isAuthenticated && isFetchingGoogle) ||
    (isAuthenticated && selectedCalendarIds.length === 0) ||
    !hasLoadedCalendarData;

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
        <MyCalendarSidebar
          isRtl={isRtl}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          menuLabel={menuLabel}
          t={t}
          handleChangePermissions={handleChangePermissions}
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
        />

        <main className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top,_rgba(0,56,168,0.08),_transparent_35%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.94))] px-4 pb-4 pt-0 md:px-6 md:pb-6 md:pt-1 xl:px-8 xl:pb-8">
          <div className="mx-auto flex h-full w-full max-w-[1680px] flex-col gap-3">
            <CalendarToolbar
              isRtl={isRtl}
              t={t}
              viewHDate={viewHDate}
              hMonthNameHebrew={hMonthNameHebrew}
              hYear={hYear}
              gMonthRange={gMonthRange}
              viewMode={viewMode}
              setViewMode={setViewMode}
              showGregorian={showGregorian}
              setShowGregorian={setShowGregorian}
              handleNextMonth={handleNextMonth}
              handlePrevMonth={handlePrevMonth}
              setViewHDate={setViewHDate}
            />

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] dark:border-slate-700/60 dark:bg-slate-900">
              {viewMode === 'month' ? (
                <MonthCalendarView
                  t={t}
                  isRtl={isRtl}
                  days={days}
                  showGregorian={showGregorian}
                  isMobileViewport={isMobileViewport}
                  maxVisibleMonthEvents={maxVisibleMonthEvents}
                  getCalendarColor={getCalendarColor}
                  handleEventClick={handleEventClick}
                  handleOverflowDayOpen={handleOverflowDayOpen}
                />
              ) : (
                <ScheduleCalendarView
                  t={t}
                  isRtl={isRtl}
                  showGregorian={showGregorian}
                  scheduleDays={scheduleDays}
                  hMonthNameHebrew={hMonthNameHebrew}
                  getCalendarColor={getCalendarColor}
                  handleEventClick={handleEventClick}
                  isCalendarLoading={isScheduleLoading}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onSelect={onLoginSelect} mode={loginModalMode} />

      <DayEventsPopover
        overflowDay={overflowDay}
        isRtl={isRtl}
        closeDayEventsLabel={closeDayEventsLabel}
        dayEventsDialogLabel={dayEventsDialogLabel}
        overflowPopoverWidth={overflowPopoverWidth}
        overflowPopoverMargin={overflowPopoverMargin}
        overflowTop={overflowTop}
        overflowLeft={overflowLeft}
        showGregorian={showGregorian}
        getCalendarColor={getCalendarColor}
        setOverflowDay={setOverflowDay}
        handleOverflowEventClick={handleOverflowEventClick}
      />

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
