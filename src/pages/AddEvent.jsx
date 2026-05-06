import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Calendar as CalendarIcon, Info, Moon, Sun, RefreshCw, Eye, CheckCircle, LogOut } from 'lucide-react';
import Logo from '../components/Logo';
import LoginModal from '../components/LoginModal';
import { getMonthsForYear, getDaysInHebrewMonth, gregorianToHebrew, generateRdates, getPreviewDates, formatHebrewYear } from '../utils/hebcal';
import { HDate, gematriya } from '@hebcal/core';
import { authenticateWithGoogle, canEditCalendars, GCAL_AUTH_EXPIRED_EVENT, getAccessToken, createHebcalEvent, fetchAllCalendars, fetchSession, getScopeMode, isAuthError, revokeAccess, SCOPE_MODES } from '../utils/googleApi';

import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function AddEvent({
  embedded = false,
  onClose = null,
  onComplete = null,
  prefillDate: prefillDateProp = null,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he';
  const hasAppliedPrefillRef = useRef(false);
  const prefillDate = prefillDateProp ?? location.state?.prefillDate ?? null;

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

  const [tab, setTab] = useState('manual');
  // ... rest of the code remains same but strings replaced
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState('connect');
  const [scopeMode, setScopeMode] = useState(getScopeMode());
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState([]);
  const currentHDate = new HDate();
  const currentHebrewYear = currentHDate.getFullYear();
  
  // State for manual Hebrew date entry
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('birthday');
  const [year, setYear] = useState(currentHebrewYear.toString());
  const [month, setMonth] = useState(currentHDate.getMonthName());
  const [day, setDay] = useState(currentHDate.getDate());
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [syncSpan, setSyncSpan] = useState(121);
  const [notes, setNotes] = useState('');
  const [availableMonths, setAvailableMonths] = useState(() => getMonthsForYear(year));
  
  // Preview State
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  
  // State for 30th day fallback
  const [fallback30th, setFallback30th] = useState('29th'); // '29th', '1st', 'skip'
  
  // State for Gregorian conversion
  const [isGregorianEntry, setIsGregorianEntry] = useState(false);
  const [gregDate, setGregDate] = useState('');
  const [afterSunset, setAfterSunset] = useState(false);

  // Computed Hebrew date from Gregorian
  const convertedHDate = isGregorianEntry && gregDate ? gregorianToHebrew(new Date(gregDate), afterSunset) : null;
  const hasWriteAccess = canEditCalendars(scopeMode);

  const handleClose = () => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }

    if (onClose) {
      onClose();
      return;
    }

    navigate('/calendar');
  };

  useEffect(() => {
    if (!prefillDate || hasAppliedPrefillRef.current) return;

    hasAppliedPrefillRef.current = true;
    setTab('manual');
    setShowPreview(false);
    setIsGregorianEntry(false);
    setGregDate(prefillDate.gregorianDate || '');
    setAfterSunset(false);

    if (prefillDate.hebrewYear) setYear(String(prefillDate.hebrewYear));
    if (prefillDate.hebrewMonth) setMonth(prefillDate.hebrewMonth);
    if (prefillDate.hebrewDay) setDay(Number(prefillDate.hebrewDay));
  }, [prefillDate]);

  // When year changes, update available months and fallback month if current is no longer valid
  useEffect(() => {
    if (!isGregorianEntry) {
      const newMonths = getMonthsForYear(year);
      setAvailableMonths(newMonths);
      
      // If the currently selected month is not in the new year's list (e.g. Adar I in a non-leap year)
      if (!newMonths.find(m => m.id === month)) {
        if (month === 'Adar') setMonth('Adar II');
        else setMonth('Adar');
      }
    }
  }, [year]);

  // When year or month changes, calculate valid days
  useEffect(() => {
    const num = getDaysInHebrewMonth(parseInt(year, 10), month);
    setDaysInMonth(num);
    if (day > num) setDay(num);
  }, [year, month]);

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
      setCalendars([]);
      setSelectedCalendarIds([]);
      setScopeMode(null);
      setLoginModalMode('reauthorize');
      setShowLoginModal(true);
      setIsLoading(false);
    };

    window.addEventListener(GCAL_AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(GCAL_AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  const loadCalendars = async () => {
    setIsCalendarLoading(true);
    try {
      const cals = await fetchAllCalendars();
      // Filter to only calendars where the user has write access
      const writableCals = cals.filter(c => c.accessRole === 'owner' || c.accessRole === 'writer');
      // Assign colors to calendars
      const calendarsWithColors = writableCals.map((cal, index) => ({
        ...cal,
        color: calendarColors[index % calendarColors.length]
      }));
      setCalendars(calendarsWithColors);
    } catch (e) {
      if (isAuthError(e)) return;
      console.error("Failed to load calendars", e);
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const toggleCalendar = (id) => {
    setSelectedCalendarIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const show30thFallback = !isGregorianEntry && day === 30 && ['Cheshvan', 'Kislev', 'Adar I'].includes(month);

  // Generate list of years for the dropdown
  const yearOptions = Array.from({length: 121}, (_, i) => currentHebrewYear - 120 + i).reverse();

  const handlePreview = () => {
    if (!title) {
      alert("נא להזין את שם האירוע");
      return;
    }
    if (selectedCalendarIds.length === 0) {
      alert(t('errorNoCalendar'));
      return;
    }

    let targetYear, targetMonth, targetDay;
    if (isGregorianEntry) {
      if (!convertedHDate) return;
      targetYear = convertedHDate.getFullYear();
      targetMonth = convertedHDate.getMonthName();
      targetDay = convertedHDate.getDate();
    } else {
      targetYear = parseInt(year, 10);
      targetMonth = month;
      targetDay = day;
    }

    const data = getPreviewDates(targetYear, targetMonth, targetDay, syncSpan, fallback30th);
    setPreviewData(data);
    setShowPreview(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!getAccessToken()) {
      setLoginModalMode('connect');
      setShowLoginModal(true);
    } else {
      submitEvent();
    }
  };

  const onLoginSelect = (scopeMode) => {
    setShowLoginModal(false);
    authenticateWithGoogle(scopeMode, undefined, (err) => {
      alert(t('errorSyncFailed') + ": " + err.message);
    });
  };

  const handleRevoke = async () => {
    if (!window.confirm(isRtl ? "פעולה זו תנתק את האפליקציה מחשבון הגוגל שלך ותבטל את כל ההרשאות שנתת לה. האם להמשיך?" : "This will disconnect the app from your Google account and revoke all permissions. Continue?")) return;
    setIsLoading(true);
    await revokeAccess();
    setScopeMode(null);
    setIsLoading(false);
    navigate('/');
  };

  const submitEvent = async () => {
    if (isLoading) return; // Guard against double submission
    if (!hasWriteAccess) {
      setLoginModalMode('upgrade');
      setShowLoginModal(true);
      return;
    }
    setIsLoading(true);
    try {
      let targetYear, targetMonth, targetDay;
      
      if (isGregorianEntry) {
        if (!convertedHDate) throw new Error("תאריך לועזי לא חוקי");
        targetYear = convertedHDate.getFullYear();
        targetMonth = convertedHDate.getMonthName();
        targetDay = convertedHDate.getDate();
      } else {
        targetYear = parseInt(year, 10);
        targetMonth = month;
        targetDay = day;
      }

      const rdateString = generateRdates(targetYear, targetMonth, targetDay, syncSpan, fallback30th);
      
      if (!rdateString) {
        throw new Error("לא ניתן היה לחשב תאריכים עבור האירוע");
      }

      if (selectedCalendarIds.length === 0) {
        throw new Error("אנא בחר לפחות יומן אחד לסנכרון");
      }

      // Create event in all selected calendars
      await Promise.all(selectedCalendarIds.map(calendarId => 
        createHebcalEvent(title, category, targetYear, rdateString, calendarId, notes)
      ));

      alert(isRtl ? `האירוע נוצר בהצלחה וסונכרן ל-${selectedCalendarIds.length} יומנים!` : `Event created successfully and synced to ${selectedCalendarIds.length} calendars!`);
      if (onComplete) {
        await onComplete();
      } else {
        navigate('/calendar');
      }
    } catch (e) {
      console.error("Submission error:", e);
      if (e.message.includes("401") || e.message.includes("authentication") || e.message.includes("Not authenticated")) {
        localStorage.removeItem('gcal_token');
        if (window.confirm("פג תוקף ההתחברות לגוגל. האם ברצונך להתחבר מחדש כדי לשמור את האירוע?")) {
          setLoginModalMode('reauthorize');
          setShowLoginModal(true);
          }
      } else {
        alert("שגיאה בשמירת האירוע: " + e.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${embedded ? 'flex max-h-[min(92vh,960px)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-slate-50 shadow-2xl dark:bg-slate-900' : 'min-h-screen bg-slate-50 dark:bg-slate-900'} font-sans ${isRtl ? 'text-right' : 'text-left'}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {!embedded && (
      <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between shrink-0 z-30 sticky top-0">
        <div className="flex items-center gap-4 md:gap-6">
          <button 
            onClick={handleClose}
            className="p-2 -mr-2 text-slate-600 hover:bg-slate-50 rounded-lg dark:text-slate-400"
          >
            <ArrowLeft className={`w-5 h-5 ${isRtl ? '' : 'rotate-180'}`} />
          </button>
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Logo className="w-8 h-8" />
            <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight dark:text-white">
              <span className="text-[#0038A8] dark:text-blue-400">Heb</span>Sync
            </h1>
          </div>

          <nav className={`hidden md:flex items-center gap-2 ${isRtl ? 'border-r pr-6 mr-2' : 'border-l pl-6 ml-2'} border-slate-200 dark:border-slate-700`}>
            <button onClick={() => navigate('/')} className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-[#0038A8] rounded-lg hover:bg-slate-50 transition-all dark:text-slate-400">{t('home')}</button>
            <button onClick={() => navigate('/calendar')} className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-[#0038A8] rounded-lg hover:bg-slate-50 transition-all dark:text-slate-400">{t('myCalendar')}</button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {getAccessToken() && (
            <button
              onClick={handleRevoke}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all dark:text-red-400 dark:hover:bg-red-900/20"
              title={t('disconnect')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>
      )}

      <main className={`${embedded ? 'overflow-auto px-4 py-4 md:px-6 md:py-5' : 'p-4 md:p-8 overflow-auto'} flex-1`}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col gap-1 mb-2">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              {showPreview ? t('preview') : t('addEventTitle')}
            </h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">
              {showPreview ? t('checkUpcomingDates') : t('addEventSubtitle')}
            </p>
          </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
          {!showPreview ? (
            <>
              <div className="flex border-b border-slate-100 dark:border-slate-700">
                <button 
                  className={`flex-1 py-4 text-center font-medium transition-colors ${tab === 'manual' ? 'text-[#0038A8] border-b-2 border-[#0038A8] bg-blue-50/50 dark:bg-[#0038A8]/20 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'}`}
                  onClick={() => setTab('manual')}
                >
                  {t('manualEntry')}
                </button>
                <button 
                  className={`flex-1 py-4 text-center font-medium transition-colors ${tab === 'csv' ? 'text-[#0038A8] border-b-2 border-[#0038A8] bg-blue-50/50 dark:bg-[#0038A8]/20 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'}`}
                  onClick={() => setTab('csv')}
                >
                  {t('uploadCsv')}
                </button>
              </div>

              <div className="p-6 md:p-8">
                {tab === 'manual' ? (
                  <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handlePreview(); }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('eventName')}</label>
                        <input 
                          type="text" 
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder={isRtl ? "לדוגמה: יום הולדת של דוד" : "e.g. David's Birthday"} 
                          className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#0038A8] focus:ring-2 focus:ring-blue-200 transition-all outline-none dark:bg-slate-900 dark:border-slate-600 dark:focus:ring-[#0038A8]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('category')}</label>
                        <select 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#0038A8] focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white dark:bg-slate-900 dark:border-slate-600 dark:focus:ring-[#0038A8]">
                          <option value="birthday">{t('birthday')}</option>
                          <option value="anniversary">{t('anniversary')}</option>
                          <option value="memorial">{t('memorial')}</option>
                          <option value="other">{t('other')}</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('description')}</label>
                      <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={isRtl ? "הוסף פרטים נוספים שיופיעו ביומן..." : "Add more details for the calendar..."} 
                        rows="2"
                        className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#0038A8] focus:ring-2 focus:ring-blue-200 transition-all outline-none dark:bg-slate-900 dark:border-slate-600 dark:focus:ring-[#0038A8] resize-none"
                      />
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-6 dark:bg-slate-900/50 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg dark:text-slate-200">
                          <CalendarIcon className="w-5 h-5 text-[#0038A8]" />
                          {t('originalEventDate')}
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-400">
                          <input 
                            type="checkbox" 
                            checked={isGregorianEntry}
                            onChange={(e) => setIsGregorianEntry(e.target.checked)}
                            className="w-4 h-4 text-[#0038A8] rounded" 
                          />
                          {t('enterGregorian')}
                        </label>
                      </div>
                      
                      {!isGregorianEntry ? (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('sourceYear')}</label>
                            <select 
                              value={year}
                              onChange={(e) => setYear(e.target.value)}
                              className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-[#0038A8] dark:bg-slate-800 dark:border-slate-600 font-medium"
                            >
                              {yearOptions.map(y => (
                                <option key={y} value={y}>{isRtl ? formatHebrewYear(y) : y}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('month')}</label>
                            <select 
                              value={month}
                              onChange={(e) => setMonth(e.target.value)}
                              className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-[#0038A8] dark:bg-slate-800 dark:border-slate-600 font-medium"
                            >
                              {availableMonths.map(m => (
                                <option key={m.id} value={m.id}>{isRtl ? m.label : m.id}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('day')}</label>
                            <select 
                              value={day}
                              onChange={(e) => setDay(parseInt(e.target.value, 10))}
                              className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-[#0038A8] dark:bg-slate-800 dark:border-slate-600 font-medium"
                            >
                              {Array.from({length: daysInMonth}).map((_, i) => (
                                <option key={i+1} value={i+1}>
                                  {isRtl ? gematriya(i+1) : i+1}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">{t('gregorianDate')}</label>
                              <input 
                                type="date" 
                                value={gregDate}
                                onChange={(e) => setGregDate(e.target.value)}
                                className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-[#0038A8] dark:bg-slate-800 dark:border-slate-600"
                              />
                            </div>
                            <div className="flex flex-col justify-end pb-1">
                              <button 
                                type="button"
                                onClick={() => setAfterSunset(!afterSunset)}
                                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-all ${afterSunset ? 'bg-[#0038A8]/10 border-[#0038A8] text-[#0038A8]' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                              >
                                {afterSunset ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                {afterSunset ? t('afterSunset') : (isRtl ? 'לפני השקיעה' : 'Before Sunset')}
                              </button>
                            </div>
                          </div>
                          
                          {convertedHDate && (
                            <div className="mt-4 p-4 bg-cyan-50 text-cyan-900 rounded-lg border border-cyan-100 flex items-center justify-between dark:bg-cyan-900/20 dark:text-cyan-100 dark:border-cyan-800">
                              <div>
                                <span className="block text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 mb-1">{isRtl ? 'התאריך העברי המחושב' : 'Calculated Hebrew Date'}</span>
                                <span className="text-xl font-bold">{isRtl ? convertedHDate.renderGematriya() : convertedHDate.toString()}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {show30thFallback && (
                        <div className="mt-4 p-5 bg-amber-50 rounded-2xl border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 shadow-sm">
                          <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2 dark:text-amber-400">
                            <Info className="w-4 h-4" />
                            {isRtl ? 'שים לב: בחרת ביום ה-30 בחודש (ל׳)' : 'Note: You selected the 30th day of the month'}
                          </h4>
                          <p className="text-sm text-amber-700 mb-4 leading-relaxed dark:text-amber-300/80">
                            {isRtl ? 'בחלק מהשנים העבריות חודש זה הוא "חסר" (בן 29 ימים בלבד), ולכן התאריך ל׳ לא קיים בהן. בחר כיצד תרצה לנהוג בשנים אלו:' : 'In some Hebrew years, this month is "short" (only 29 days), so the 30th doesn\'t exist. Choose how to handle these years:'}
                          </p>
                          <div className="grid grid-cols-1 gap-3">
                            <label className="flex items-center gap-3 cursor-pointer p-3 bg-white/50 rounded-xl border border-amber-100 hover:bg-white transition-colors dark:bg-slate-800/40 dark:border-amber-900/30">
                              <input type="radio" name="fallback" checked={fallback30th === '29th'} onChange={() => setFallback30th('29th')} className="w-4 h-4 text-[#0038A8]" />
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{isRtl ? 'הקדמה ל-כ״ט באותו חודש' : 'Move to 29th of the same month'}</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer p-3 bg-white/50 rounded-xl border border-amber-100 hover:bg-white transition-colors dark:bg-slate-800/40 dark:border-amber-900/30">
                              <input type="radio" name="fallback" checked={fallback30th === '1st'} onChange={() => setFallback30th('1st')} className="w-4 h-4 text-[#0038A8]" />
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{isRtl ? 'דחייה ל-א׳ בחודש הבא' : 'Move to 1st of the next month'}</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer p-3 bg-white/50 rounded-xl border border-amber-100 hover:bg-white transition-colors dark:bg-slate-800/40 dark:border-amber-900/30">
                              <input type="radio" name="fallback" checked={fallback30th === 'skip'} onChange={() => setFallback30th('skip')} className="w-4 h-4 text-[#0038A8]" />
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{isRtl ? 'דילוג על השנה (לא ליצור אירוע)' : 'Skip the year (don\'t create event)'}</span>
                            </label>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('howManyOccurrences')}</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="number"
                            min="1"
                            max="121"
                            value={syncSpan}
                            onChange={(e) => setSyncSpan(Math.min(121, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                            className="w-24 p-3 rounded-xl border border-slate-200 focus:border-[#0038A8] outline-none bg-white dark:bg-slate-800 dark:border-slate-600 font-bold text-center"
                          />
                          <span className="text-slate-600 dark:text-slate-400 font-medium">{t('occurrences')}</span>
                        </div>
                      </div>

                      {isCalendarLoading ? (
                        <div className="mt-6 p-6 rounded-2xl border border-slate-200 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-900">
                          <RefreshCw className="mx-auto w-6 h-6 animate-spin text-[#0038A8]" />
                          <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">{t('loadingGoogleData')}</p>
                        </div>
                      ) : calendars.length > 0 ? (
                        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('selectTargetCalendars')}</label>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {calendars.map(cal => (
                              <label 
                                key={cal.id} 
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                  selectedCalendarIds.includes(cal.id) 
                                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                                    : 'bg-white border-slate-100 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700'
                                }`}
                              >
                                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }}></div>
                                <input 
                                  type="checkbox"
                                  checked={selectedCalendarIds.includes(cal.id)}
                                  onChange={() => toggleCalendar(cal.id)}
                                  className="w-4 h-4 rounded text-[#0038A8]"
                                />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate" title={cal.summary}>
                                  {cal.summary}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button 
                        type="submit" 
                        className="px-8 py-4 bg-[#0038A8] hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 text-lg w-full md:w-auto flex items-center justify-center gap-2"
                      >
                        <Eye className="w-5 h-5" />
                        {t('showPreview')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 dark:bg-slate-900/30 dark:border-slate-700">
                    <div className="w-20 h-20 bg-blue-50 text-[#0038A8] rounded-full flex items-center justify-center mb-2 dark:bg-[#0038A8]/20 dark:text-blue-400">
                      <Upload className="w-10 h-10 opacity-50" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">ייבוא מרוכז מ-CSV</h3>
                    <p className="text-slate-500 max-w-xs mx-auto dark:text-slate-400">
                      אנחנו עובדים על אפשרות לייבוא של מאות אירועים בבת אחת מקובץ אקסל או CSV. 
                      <br />
                      <span className="font-bold text-[#0038A8] dark:text-blue-400 mt-2 block">יכולת זו תהיה זמינה בקרוב!</span>
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col p-6 md:p-8">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('occurrences')}: {syncSpan}</p>
                </div>
                <div className={isRtl ? 'text-left' : 'text-right'}>
                  <span className="text-xs font-bold text-[#0038A8] bg-white px-2 py-1 rounded dark:bg-slate-700 dark:text-blue-300">
                    {t(category)}
                  </span>
                </div>
              </div>

              <div className="mt-6 min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="max-h-[min(52vh,32rem)] overflow-auto">
                  <table className={`w-full table-fixed ${isRtl ? 'text-right' : 'text-left'} border-collapse`}>
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-900">
                      <tr className="text-slate-600 dark:text-slate-400 text-sm font-bold">
                        <th aria-hidden="true" className="w-10 p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 text-xs md:text-sm"></th>
                        <th className="w-[32%] p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap text-xs md:text-sm">{t('hebrewDate')}</th>
                        <th className="w-[30%] p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap text-xs md:text-sm">{t('gregorianDate')}</th>
                        <th className="w-[38%] p-3 md:p-4 border-b border-slate-200 dark:border-slate-700 text-xs md:text-sm">{t('notes')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((occ, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border-b border-slate-100 dark:border-slate-800">
                          <td className="p-3 md:p-4 text-slate-400 dark:text-slate-500 whitespace-nowrap text-xs md:text-sm">{idx + 1}</td>
                          <td className="p-3 md:p-4 text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap text-xs md:text-sm">{occ.hebrewDate}</td>
                          <td className="p-3 md:p-4 text-slate-600 dark:text-slate-400 whitespace-nowrap text-xs md:text-sm">{occ.gregorianDate}</td>
                          <td className="p-3 md:p-4 text-[11px] md:text-xs font-medium text-amber-600 dark:text-amber-400 break-words">{occ.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="sticky bottom-0 mt-4 flex flex-col gap-4 border-t border-slate-200 bg-white/95 pt-4 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 sm:flex-row">
                <button 
                  onClick={() => setShowPreview(false)}
                  className="flex-1 px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                >
                  {t('backToEdit')}
                </button>
                <button 
                  onClick={() => submitEvent()}
                  disabled={isLoading}
                  className={`flex-1 px-8 py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-70 ${
                    hasWriteAccess
                      ? 'bg-[#0038A8] hover:bg-blue-800 text-white shadow-blue-900/20'
                      : 'bg-blue-50 hover:bg-blue-100 text-[#0038A8] shadow-blue-900/5 dark:bg-blue-900/30 dark:text-blue-300'
                  }`}
                >
                  {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : hasWriteAccess ? <CheckCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                  {isLoading
                    ? t('syncing')
                    : hasWriteAccess
                      ? t('confirmAndSync')
                      : t('allowEditingToContinue')}
                </button>
              </div>
            </div>
          )}
          </div>
        </div>
      </main>
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onSelect={onLoginSelect}
        mode={loginModalMode}
      />
    </div>
  );
}


