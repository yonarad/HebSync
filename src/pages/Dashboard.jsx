import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, Filter, Trash2, LogIn, RefreshCw, ChevronRight, ChevronLeft, Info, LogOut, Shield, Unlock, Eye } from 'lucide-react';
import Logo from '../components/Logo';
import LoginModal from '../components/LoginModal';
import { authenticateWithGoogle, getAccessToken, fetchMyAppEvents, deleteEvent, fetchEventsInRange, fetchAllCalendars, createNewCalendar, revokeAccess } from '../utils/googleApi';
import { HEBREW_MONTHS } from '../utils/hebcal';
import { HDate, gematriya } from '@hebcal/core';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());
  const [myEvents, setMyEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [scopeMode, setScopeMode] = useState(sessionStorage.getItem('gcal_scope_mode'));
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState([]);

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
    try {
      const cals = await fetchAllCalendars();
      setCalendars(cals);
      setSelectedCalendarIds(cals.map(c => c.id));
    } catch (e) {
      console.error("Failed to load calendars", e);
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
      console.error(e);
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const loadEvents = async () => {
    setIsLoading(true);
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
      if (e.message.includes("Not authenticated") || e.message.includes("401")) {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
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
    // If moving from high access to low, we recommend revoking
    if (scopeMode === 'all_events') {
      if (window.confirm("כדי לעבור לרמת פרטיות גבוהה יותר, עלינו לבטל את ההרשאות הרחבות הקיימות. האם לבצע ניתוק והתחברות מחדש?")) {
        setIsLoading(true);
        await revokeAccess();
        setIsAuthenticated(false);
        setIsLoading(false);
        setShowLoginModal(true);
        return;
      }
    }
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

  const handleDelete = async (googleEventId) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק אירוע זה (ואת כל המופעים שלו) מהיומן?")) return;
    try {
      const eventObj = myEvents.find(e => e.id === googleEventId);
      if (eventObj) {
        await deleteEvent(eventObj.calendarId, googleEventId);
      }
      setMyEvents(myEvents.filter(e => e.id !== googleEventId));
      loadCalendarData();
    } catch (e) {
      alert("שגיאה במחיקה");
    }
  };

  const handleNextMonth = () => {
    setViewHDate(prev => {
      let m = prev.getMonth();
      let y = prev.getFullYear();
      const monthsInYear = HDate.monthsInYear(y);

      if (m === 6) { // Elul
        m = 7; // Tishrei
        y++;
      } else if (m === monthsInYear) {
        m = 1; // Nisan
      } else {
        m++;
      }
      return new HDate(1, m, y);
    });
  };

  const handlePrevMonth = () => {
    setViewHDate(prev => {
      let m = prev.getMonth();
      let y = prev.getFullYear();

      if (m === 7) { // Tishrei
        m = 6; // Elul
        y--;
      } else if (m === 1) { // Nisan
        m = HDate.monthsInYear(y); // Go to last month of same year
      } else {
        m--;
      }
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
        
        if (!showAllEvents) {
          return event.extendedProperties?.private?.appIdentifier === 'MyHebrewCalendar';
        }
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
  const hYear = gematriya(viewHDate.getFullYear());
  const gMonthRange = `${new HDate(1, hMonthNameEnglish, viewHDate.getFullYear()).greg().toLocaleString('he-IL', { month: 'long' })} - ${new HDate(HDate.daysInMonth(HDate.monthFromName(hMonthNameEnglish), viewHDate.getFullYear()), hMonthNameEnglish, viewHDate.getFullYear()).greg().toLocaleString('he-IL', { month: 'long' })}`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans flex flex-col text-right" dir="rtl">
      <header className="bg-white border-b border-slate-200 px-6 py-4 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/')}>
            <Logo className="w-10 h-10" />
            <h1 className="text-xl font-bold text-[#0038A8] dark:text-blue-400">היומן העברי שלי</h1>
          </div>
          <nav className="hidden md:flex items-center gap-2 border-r border-slate-200 pr-6 mr-2 dark:border-slate-700">
            <button
              onClick={() => navigate('/')}
              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-[#0038A8] rounded-lg hover:bg-slate-50 transition-all dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-300"
            >
              דף הבית
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3 py-2 text-sm font-bold text-[#0038A8] bg-blue-50 rounded-lg dark:bg-blue-900/30 dark:text-blue-300"
            >
              לוח בקרה
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {!isAuthenticated ? (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-[#0038A8] hover:bg-blue-100 rounded-lg font-bold transition-colors dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
            >
              <LogIn className="w-4 h-4" />
              התחבר לגוגל
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                onClick={handleRevoke}
                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all dark:text-red-400 dark:hover:bg-red-900/20"
                title="ביטול הרשאות וניתוק מלא מגוגל"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">ניתוק חשבון</span>
              </button>
              <button
                onClick={() => navigate('/add-event')}
                className="px-4 py-2 bg-[#0038A8] text-white hover:bg-blue-800 rounded-lg font-bold transition-all shadow-md shadow-blue-900/20"
              >
                + הוספת אירוע
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 bg-white border-l border-slate-200 hidden md:flex flex-col dark:bg-slate-900 dark:border-slate-800">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">רמת הרשאה</span>
                <button 
                  onClick={handleChangePermissions}
                  className="text-[10px] font-bold text-[#0038A8] hover:underline dark:text-blue-400"
                >
                  שינוי
                </button>
              </div>
              <div className="flex items-center gap-2">
                {scopeMode === 'app_created' ? (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold text-sm">
                    <Shield className="w-4 h-4" />
                    פרטיות מקסימלית
                  </div>
                ) : scopeMode === 'read_only' ? (
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-sm">
                    <Eye className="w-4 h-4" />
                    צפייה בלבד
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                    <Unlock className="w-4 h-4" />
                    גישה מלאה
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 dark:text-slate-100">
                <CalendarIcon className="w-4 h-4 text-[#0038A8]" />
                היומנים שלי
              </h2>
              {isAuthenticated && scopeMode !== 'read_only' && (
                <button onClick={handleCreateCalendar} className="text-xs bg-blue-50 text-[#0038A8] px-2 py-1 rounded font-bold hover:bg-blue-100 transition-colors dark:bg-blue-900/30 dark:text-blue-300">
                  + יומן חדש
                </button>
              )}
            </div>
            {isAuthenticated ? (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {calendars.map(cal => (
                  <label key={cal.id} className="flex items-center gap-2 text-sm cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-50 p-1.5 rounded-lg transition-colors dark:hover:bg-slate-800">
                    <input 
                      type="checkbox" 
                      checked={selectedCalendarIds.includes(cal.id)} 
                      onChange={() => toggleCalendar(cal.id)} 
                      className="w-4 h-4 rounded border-slate-300 text-[#0038A8]" 
                    />
                    <span className="truncate" title={cal.summary}>{cal.summary}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">התחבר כדי לראות יומנים</p>
            )}
          </div>

          <div className="p-4 border-b border-slate-100 flex justify-between items-center dark:border-slate-800">
            <h2 className="font-bold text-slate-800 flex items-center gap-2 dark:text-slate-100">
              <CalendarIcon className="w-4 h-4 text-[#0038A8]" />
              האירועים שלי
            </h2>
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full font-bold dark:bg-slate-700 dark:text-slate-300">
              {isAuthenticated ? myEvents.length : 0}
            </span>
          </div>

          <div className="p-4 flex-1 overflow-auto">
            {!isAuthenticated ? (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                <p className="text-sm">טרם התחברת לחשבון.</p>
                <p className="text-xs mt-1">התחבר כדי לנהל את האירועים החוזרים שלך.</p>
              </div>
            ) : isLoading ? (
              <div className="flex justify-center py-10">
                <RefreshCw className="w-6 h-6 animate-spin text-[#0038A8]" />
              </div>
            ) : myEvents.length === 0 ? (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                <p className="text-sm">אין אירועים להצגה.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myEvents.map(event => (
                  <div key={event.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group dark:bg-slate-900/50 dark:border-slate-700 dark:hover:border-[#0038A8]/50">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-bold text-slate-900 text-sm dark:text-slate-100">
                        {event.title} <span className="text-[#0038A8] dark:text-blue-400">({event.age})</span>
                      </h3>
                      <button onClick={() => handleDelete(event.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" title="מחיקת סדרה">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded dark:bg-slate-800 dark:text-slate-400 border border-slate-100 dark:border-slate-700">
                        {event.category === 'birthday' ? 'יום הולדת' : event.category === 'memorial' ? 'אזכרה' : 'אחר'}
                      </span>
                      <span className="text-[10px] font-bold text-[#0038A8] dark:text-blue-300">
                        {event.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-5xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  {hMonthNameHebrew} ה׳{hYear}
                </h2>
                <p className="text-slate-400 font-medium text-sm mt-1">
                  {gMonthRange} {viewHDate.greg().getFullYear()}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700">
                  <input 
                    type="checkbox" 
                    checked={showGregorian}
                    onChange={(e) => setShowGregorian(e.target.checked)}
                    className="w-4 h-4 text-[#0038A8] rounded border-slate-300"
                  />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">הצג גם תאריך לועזי</span>
                </label>

                <label 
                  className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm dark:bg-slate-800 dark:border-slate-700"
                  title="בברירת מחדל אנחנו מציגים רק אירועים שהאפליקציה יצרה, אך אם ברצונך לראות את כלל האירועים מהיומן שלך, תוכל לסמן תיבה זו."
                >
                  <input 
                    type="checkbox" 
                    checked={showAllEvents}
                    onChange={(e) => setShowAllEvents(e.target.checked)}
                    className="w-4 h-4 text-[#0038A8] rounded border-slate-300"
                  />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">הצג גם אירועים חיצוניים</span>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </label>

                <div className="flex bg-white rounded-xl shadow-sm border border-slate-100 p-1 dark:bg-slate-800 dark:border-slate-700">
                  <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-lg transition-colors dark:hover:bg-slate-700" title="חודש קודם">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button onClick={() => setViewHDate(new HDate())} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-[#0038A8] dark:text-slate-300">
                    היום
                  </button>
                  <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 rounded-lg transition-colors dark:hover:bg-slate-700" title="חודש הבא">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 flex-1 overflow-hidden dark:bg-slate-800 dark:border-slate-700 flex flex-col relative min-h-[600px]">
              {isCalendarLoading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#0038A8]" />
                </div>
              )}

              <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                {['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'].map(day => (
                  <div key={day} className="p-4 text-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                    {day}
                  </div>
                ))}
              </div>

              <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                {days.map((dayObj, i) => (
                  <div
                    key={i}
                    className={`h-[140px] p-2 border-b border-l border-slate-50 dark:border-slate-700/50 flex flex-col gap-2 ${!dayObj ? 'bg-slate-50/50 dark:bg-slate-900/20' : 'hover:bg-blue-50/30 transition-colors dark:hover:bg-blue-900/10'}`}
                  >
                    {dayObj && (
                      <>
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">{dayObj.hDayGematriya}</span>
                            {showGregorian && (
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                                {dayObj.gDay} {dayObj.hDay === 1 || dayObj.gDay === 1 ? dayObj.gMonthLabel : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 overflow-y-auto max-h-[90px] pr-1 custom-scrollbar pt-1">
                          {dayObj.events.map((event, idx) => {
                            const props = event.extendedProperties?.private || {};
                            const isHebCal = props.appIdentifier === 'MyHebrewCalendar';
                            
                            const originalYear = isHebCal ? parseInt(props.originalHebrewYear, 10) : null;
                            const age = (originalYear && dayObj.hYear) ? (dayObj.hYear - originalYear) : 0;
                            const ageSuffix = isHebCal ? ` (${age})` : '';

                            return (
                              <div 
                                key={idx} 
                                className={`text-[10px] leading-tight px-2 py-1.5 rounded-lg truncate font-bold shadow-sm flex-shrink-0 ${isHebCal ? 'bg-[#0038A8] text-white dark:bg-blue-600' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'}`}
                                title={event.summary + ageSuffix}
                              >
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
        </div>
      </div>
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onSelect={onLoginSelect} 
      />
    </div>
  );
}
