import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, LogIn, LogOut, X, Menu } from 'lucide-react';
import { HDate } from '@hebcal/core';
import Logo from '../components/Logo';
import LoginModal from '../components/LoginModal';
import AddEvent from './AddEvent';
import { revokeAccess } from '../utils/googleApi';
import { buildMonthDays, buildScheduleDays, getHebrewMonthMeta, getNextMonthHDate, getOverflowPopoverLayout, getPrevMonthHDate } from '../utils/calendarView';

import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { CalendarToolbar, MonthCalendarView, ScheduleCalendarView, DayEventsPopover } from '../components/MyCalendarViews';
import MyCalendarSidebar from '../components/MyCalendarSidebar';
import useMyCalendarData from '../hooks/useMyCalendarData';
import useCalendarEventActions from '../hooks/useCalendarEventActions';

const PENDING_CREATE_EVENT_KEY = 'pending_calendar_create_event';

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

  const {
    calendarEvents,
    calendars,
    getCalendarColor,
    handleChangePermissions,
    handleCreateCalendar,
    handleLogin,
    handleRefreshCalendars,
    hasLoadedCalendarData,
    hasWriteAccess,
    hebSyncCalendars,
    isAllCalendarsMode,
    isAuthenticated,
    isCalendarLoading,
    isFetchingGoogle,
    loadCalendarData,
    loadEvents,
    loginModalMode,
    myEvents,
    onLoginSelect,
    otherCalendars,
    promptForEditingUpgrade,
    selectedCalendarIds,
    setIsAuthenticated,
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
  } = useMyCalendarData({ t });

  const [overflowDay, setOverflowDay] = useState(null);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [createPrefillDate, setCreatePrefillDate] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHebSyncGroupOpen, setIsHebSyncGroupOpen] = useState(true);
  const [isOtherGroupOpen, setIsOtherGroupOpen] = useState(false);
  const {
    editDesc,
    editTitle,
    handleDelete,
    handleEventClick,
    handleUpdate,
    isEditing,
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
    if (!isAuthenticated || !hasWriteAccess) return;

    const rawPendingCreate = sessionStorage.getItem(PENDING_CREATE_EVENT_KEY);
    if (!rawPendingCreate) return;

    sessionStorage.removeItem(PENDING_CREATE_EVENT_KEY);

    try {
      const pendingCreate = JSON.parse(rawPendingCreate);
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

  const handleRevoke = async () => {
    if (!window.confirm(t('revokeAccessConfirm'))) return;
    await revokeAccess();
    setIsAuthenticated(false);
    navigate('/');
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

  const requestCreatePermissions = (prefillDate = null) => {
    sessionStorage.setItem(
      PENDING_CREATE_EVENT_KEY,
      JSON.stringify({ prefillDate }),
    );
    promptForEditingUpgrade();
  };

  const handleCreateFromDay = (dayObj) => {
    const year = dayObj.gDate.getFullYear();
    const month = String(dayObj.gDate.getMonth() + 1).padStart(2, '0');
    const day = String(dayObj.gDate.getDate()).padStart(2, '0');
    const prefillDate = {
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

  const handleCreateEvent = () => {
    if (!hasWriteAccess) {
      requestCreatePermissions();
      return;
    }

    setCreatePrefillDate(null);
    setIsAddEventModalOpen(true);
  };

  const handleCloseAddEventModal = () => {
    setIsAddEventModalOpen(false);
    setCreatePrefillDate(null);
  };

  const handleAddEventComplete = async () => {
    handleCloseAddEventModal();
    await loadCalendarData();
    await loadEvents();
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
  const isMonthLoading = isScheduleLoading;

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
                  handleCreateFromDay={handleCreateFromDay}
                  isCalendarLoading={isMonthLoading}
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
                  handleCreateFromDay={handleCreateFromDay}
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

      {isAddEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm md:p-6" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="absolute inset-0" onClick={handleCloseAddEventModal} aria-hidden="true" />
          <div className="relative z-10 flex max-h-full w-full justify-center">
            <button
              type="button"
              onClick={handleCloseAddEventModal}
              className={`absolute top-3 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/85 text-slate-700 shadow-lg backdrop-blur transition hover:bg-white dark:border-slate-700 dark:bg-slate-900/85 dark:text-slate-200 ${isRtl ? 'left-3 md:left-5' : 'right-3 md:right-5'}`}
              aria-label={t('close')}
            >
              <X className="h-5 w-5" />
            </button>
            <AddEvent
              embedded
              onClose={handleCloseAddEventModal}
              onComplete={handleAddEventComplete}
              prefillDate={createPrefillDate}
            />
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
