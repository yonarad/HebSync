import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, Filter, Trash2, LogIn, RefreshCw, ChevronRight, ChevronLeft, Info, LogOut, Shield, Unlock, Eye, X, Upload, Menu } from 'lucide-react';
import Logo from '../components/Logo';
import LoginModal from '../components/LoginModal';
import { authenticateWithGoogle, GCAL_AUTH_EXPIRED_EVENT, getAccessToken, fetchMyAppEvents, deleteEvent, fetchEventsInRange, fetchAllCalendars, createNewCalendar, isAuthError, revokeAccess, updateEvent } from '../utils/googleApi';
import { HEBREW_MONTHS, formatHebrewYear } from '../utils/hebcal';
import { HDate, gematriya } from '@hebcal/core';

import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function MyCalendar() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he';

  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());
  // ... rest of state remain same
  const [myEvents, setMyEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoadingCount, setIsGoogleLoadingCount] = useState(0);
  const isFetchingGoogle = isGoogleLoadingCount > 0;
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState('connect');
  const [scopeMode, setScopeMode] = useState(sessionStorage.getItem('gcal_scope_mode'));
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Calendar View State
  const [viewHDate, setViewHDate] = useState(new HDate());
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [showGregorian, setShowGregorian] = useState(true);
  const [showAllEvents, setShowAllEvents] = useState(false);

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

  const loadCalendars = async () => {
    setIsGoogleLoadingCount((count) => count + 1);
    try {
      const cals = await fetchAllCalendars();
      setCalendars(cals);
      setSelectedCalendarIds(cals.map(c => c.id));
    } catch (e) {
      if (isAuthError(e)) return;
      console.error("Failed to load calendars", e);
    } finally {
      setIsGoogleLoadingCount((count) => Math.max(0, count - 1));
    }
  };

  const handleCreateCalendar = async () => {
    const name = window.prompt("הזן שם ליומן החדש:");
    if (!name) return;
    try {
      await createNewCalendar(name);
      await loadCalendars();
    } catch (e) {
      alert("שגיאה ביצירת יומן");
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
          date: item.start?.date || 'תאריך כלשהו'
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
    authenticateWithGoogle(scopeMode, (token) => {
      setIsAuthenticated(true);
      setScopeMode(scopeMode);
      loadCalendars();
    }, (err) => {
      alert("שגיאה בהתחברות: " + err.message);
    });
  };

  const handleChangePermissions = async () => {
    if (scopeMode === 'all_events') {
      if (window.confirm("כדי לעבור לרמת פרטיות גבוהה יותר, עלינו לבטל את ההרשאות הרחבות הקיימות. האם לבצע ניתוק והתחברות מחדש?")) {
        setIsLoading(true);
        await revokeAccess();
        setIsAuthenticated(false);
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
    if (!window.confirm("פעולה זו תנתק את האפליקציה מחשבון הגוגל שלך ותבטל את כל ההרשאות שנתת לה. האם להמשיך?")) return;
    setIsLoading(true);
    await revokeAccess();
    setIsAuthenticated(false);
    setIsLoading(false);
    navigate('/');
  };

  const handleDelete = async (calendarId, googleEventId) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק אירוע זה (ואת כל המופעים שלו) מהיומן?")) return;
    try {
      await deleteEvent(calendarId, googleEventId);
      setSelectedEvent(null);
      loadCalendarData();
      loadEvents();
    } catch (e) {
      alert("שגיאה במחיקה");
    }
  };

  const handleUpdate = async () => {
    try {
      await updateEvent(selectedEvent.calendarId, selectedEvent.id, {
        summary: editTitle,
        description: editDesc
      });
      setIsEditing(false);
      setSelectedEvent(null);
      loadCalendarData();
    } catch (e) {
      alert("שגיאה בעדכון");
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
      const dayEvents = calendarEvents.filter(event => {
        const start = event.start?.date || event.start?.dateTime;
        if (!start) return false;
        const eDate = new Date(start);
        const isSameDay = eDate.getFullYear() === gDate.getFullYear() &&
          eDate.getMonth() === gDate.getMonth() &&
          eDate.getDate() === gDate.getDate();
        if (!isSameDay) return false;
        if (!showAllEvents) return event.extendedProperties?.private?.appIdentifier === 'MyHebrewCalendar';
        return true;
      });
      days.push({
        hDay: d,
        hDayGematriya: gematriya(d),
        gDay: gDate.getDate(),
        gMonthLabel: gDate.toLocaleString('he-IL', { month: 'short' }),
        events: dayEvents,
        hYear: hDate.getFullYear()
      });
    }
    return days;
  };

  const days = getDaysInHMonth();
  const hMonthNameEnglish = viewHDate.getMonthName();
  const hMonthNameHebrew = HEBREW_MONTHS.find(m => m.id === hMonthNameEnglish)?.label || hMonthNameEnglish;
  const hYear = formatHebrewYear(viewHDate.getFullYear());
  const gMonthRange = `${new HDate(1, hMonthNameEnglish, viewHDate.getFullYear()).greg().toLocaleString('he-IL', { month: 'long' })} - ${new HDate(HDate.daysInMonth(HDate.monthFromName(hMonthNameEnglish), viewHDate.getFullYear()), hMonthNameEnglish, viewHDate.getFullYear()).greg().toLocaleString('he-IL', { month: 'long' })}`;

  return (
    <div className={`h-screen bg-slate-50 dark:bg-slate-900 font-sans flex flex-col ${isRtl ? 'text-right' : 'text-left'} overflow-hidden`} dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-4 md:gap-6">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -mr-2 text-slate-600 hover:bg-slate-50 rounded-lg dark:text-slate-400 dark:hover:bg-slate-800">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <Logo className="w-8 h-8" />
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight dark:text-white">
              {t('appName')}
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
            <span className="font-bold dark:text-white">{isRtl ? 'תפריט ניהול' : 'Menu'}</span>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg dark:hover:bg-slate-800"><X className="w-5 h-5 dark:text-slate-400" /></button>
          </div>
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>{isRtl ? 'רמת הרשאה' : 'Access Level'}</span>
                <button onClick={handleChangePermissions} className="text-[#0038A8] dark:text-blue-400 underline">{isRtl ? 'שינוי' : 'Change'}</button>
              </div>
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                {scopeMode === 'app_created' ? <><Shield className="w-3 h-3 text-green-500" /> {t('maxPrivacy')}</> : scopeMode === 'read_only' ? <><Eye className="w-3 h-3 text-purple-500" /> {t('readOnly')}</> : <><Unlock className="w-3 h-3 text-blue-500" /> {t('fullAccess')}</>}
              </div>
            </div>

            <div className="space-y-4 flex flex-col flex-1 min-h-0">
              <div className="flex justify-between items-center gap-2">
                <h2 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm"><CalendarIcon className="w-4 h-4 text-[#0038A8]" /> {t('myCalendars')}</h2>
                {isFetchingGoogle && (
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#0038A8]" />
                    <span>{t('loadingGoogleData')}</span>
                  </div>
                )}
                {isAuthenticated && scopeMode !== 'read_only' && <button onClick={handleCreateCalendar} className="text-[10px] bg-blue-50 text-[#0038A8] px-2 py-1 rounded font-bold dark:bg-blue-900/30 dark:text-blue-300">+ {t('new')}</button>}
              </div>

              {isAuthenticated && calendars.length > 0 && (
                <div className="flex gap-2">
                  <button onClick={selectAllCalendars} className="text-[10px] font-bold text-slate-500 hover:text-[#0038A8] transition-colors">{t('selectAll')}</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={deselectAllCalendars} className="text-[10px] font-bold text-slate-500 hover:text-[#0038A8] transition-colors">{t('clearAll')}</button>
                </div>
              )}

              <div className="space-y-1 flex flex-col flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                {calendars.map(cal => (
                  <label key={cal.id} className="flex items-center gap-2 text-xs cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-50 p-1.5 rounded-lg dark:hover:bg-slate-800 transition-colors">
                    <input type="checkbox" checked={selectedCalendarIds.includes(cal.id)} onChange={() => toggleCalendar(cal.id)} className="w-3 h-3 rounded border-slate-300 text-[#0038A8]" />
                    <span className="truncate">{cal.summary}</span>
                  </label>
                ))}
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

        <main className="flex-1 p-4 md:p-6 xl:p-8 overflow-auto">
          <div className="w-full h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">{hMonthNameHebrew} {hYear}</h2>
                <p className="text-slate-400 font-medium text-xs mt-1">{gMonthRange} {viewHDate.greg().getFullYear()}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                  <input type="checkbox" checked={showGregorian} onChange={(e) => setShowGregorian(e.target.checked)} className="w-3.5 h-3.5 text-[#0038A8] rounded border-slate-300" />
                  <span className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-400">{t('gregorian')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                  <input type="checkbox" checked={showAllEvents} onChange={(e) => setShowAllEvents(e.target.checked)} className="w-3.5 h-3.5 text-[#0038A8] rounded border-slate-300" />
                  <span className="text-[10px] md:text-xs font-bold text-slate-600 dark:text-slate-400">{t('externalEvents')}</span>
                  <Info className="w-3 h-3 text-slate-400" />
                </label>
                <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1 dark:bg-slate-800 dark:border-slate-700">
                  <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 rounded-lg dark:hover:bg-slate-700">{isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}</button>
                  <button onClick={() => setViewHDate(new HDate())} className="px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">{t('today')}</button>
                  <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50 rounded-lg dark:hover:bg-slate-700">{isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 flex-1 overflow-hidden dark:bg-slate-800 dark:border-slate-700 flex flex-col relative">
              {isCalendarLoading && <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] z-10 flex items-center justify-center"><RefreshCw className="w-8 h-8 animate-spin text-[#0038A8]" /></div>}
              {isFetchingGoogle && !isCalendarLoading && (
                <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 z-20 flex items-center justify-center">
                  <div className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-4 shadow-lg dark:border-slate-700 dark:bg-slate-900/90 flex items-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#0038A8]" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-100">{t('loadingGoogleData')}</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
                  <div key={idx} className="p-2 md:p-4 text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span className="hidden md:inline">{t(`days.${idx}`)}</span>
                    <span className="md:hidden">{isRtl ? 'אבגדהוש'[idx] : t(`days.${idx}`).substring(0, 1)}</span>
                  </div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto">
                {days.map((dayObj, i) => (
                  <div key={i} className={`min-h-[60px] md:min-h-[100px] p-1 md:p-2 border-b border-l border-slate-50 dark:border-slate-700/50 flex flex-col gap-1 ${!dayObj ? 'bg-slate-50/50 dark:bg-slate-900/20' : 'hover:bg-blue-50/30 transition-colors dark:hover:bg-blue-900/10'}`}>
                    {dayObj && (
                      <>
                        <div className="flex flex-col">
                          <span className="text-sm md:text-xl font-bold text-slate-900 dark:text-slate-100">{dayObj.hDayGematriya}</span>
                          {showGregorian && <span className="text-[8px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{dayObj.gDay}</span>}
                        </div>
                        <div className="flex flex-col gap-1 overflow-y-auto max-h-[40px] md:max-h-[70px] pr-0.5 custom-scrollbar">
                          {dayObj.events.map((event, idx) => {
                            const props = event.extendedProperties?.private || {};
                            const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
                            const originalYear = isHebCal ? parseInt(props.originalHebrewYear, 10) : null;
                            const age = (originalYear && dayObj.hYear) ? (dayObj.hYear - originalYear) : 0;
                            const ageSuffix = isHebCal ? ` (${age})` : '';
                            return (
                              <div key={idx} onClick={(e) => { e.stopPropagation(); handleEventClick(event); }} className={`text-[8px] md:text-[10px] leading-tight px-1 md:px-2 py-0.5 md:py-1 rounded-md md:rounded-lg truncate font-bold cursor-pointer hover:brightness-95 transition-all flex-shrink-0 ${isHebCal ? 'bg-[#0038A8] text-white shadow-sm' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'}`} title={event.summary + ageSuffix}>
                                {event.summary}{ageSuffix}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onSelect={onLoginSelect} mode={loginModalMode} />

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
                  <h3 className="text-2xl font-bold text-[#0038A8] dark:text-blue-400">{selectedEvent.summary}</h3>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 min-h-[100px] text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{selectedEvent.description || t('noDescription')}</div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3 bg-slate-50 dark:bg-slate-900/50">
              <button onClick={() => handleDelete(selectedEvent.calendarId, selectedEvent.id)} className={`flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-colors dark:text-red-400 dark:hover:bg-red-900/20`}><Trash2 className="w-4 h-4" /> {t('delete')}</button>
              <div className="flex gap-2">
                {isEditing ? (
                  <><button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl font-bold">{t('cancel')}</button><button onClick={handleUpdate} className="px-6 py-2 bg-[#0038A8] text-white rounded-xl font-bold hover:bg-blue-800 shadow-md">{t('save')}</button></>
                ) : (
                  <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-white border border-slate-200 text-slate-800 rounded-xl font-bold hover:bg-slate-50 dark:bg-slate-800 dark:text-white dark:border-slate-700">{t('edit')}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
