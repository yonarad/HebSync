import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Download, Trash2, Calendar as CalendarIcon, Info, Moon, Sun, RefreshCw, Eye, CheckCircle, GripHorizontal } from 'lucide-react';
import * as XLSX from 'xlsx';
import LoginModal from '../components/LoginModal';
import { getMonthsForYear, getDaysInHebrewMonth, gregorianToHebrew, generateRdates, getPreviewDates, formatHebrewYear, requires30thFallbackDecision, validateHebrewDateForYear } from '../utils/hebcal';
import { resolveCalendarColor } from '../utils/googleCalendarColors';
import { HDate, gematriya } from '@hebcal/core';
import { authenticateWithGoogle, canEditCalendars, GCAL_AUTH_EXPIRED_EVENT, getAccessToken, createHebcalEvent, createNewCalendar, fetchAllCalendars, fetchGoogleCalendarColors, fetchSession, getScopeMode, isAuthError, logout, revokeAccess, SCOPE_MODES } from '../utils/googleApi';

import { useTranslation } from 'react-i18next';

export default function AddEvent({
  onClose = () => {},
  onComplete = null,
  onCalendarsChanged = null,
  prefillDate = null,
}) {
  const BULK_IMPORT_COLUMNS = ['שם האירוע', 'קטגוריה', 'הערות', 'שנת מקור', 'חודש', 'יום', 'מופעים'];
  const HEBREW_NUMBER_MAP = {
    א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
    י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90,
    ק: 100, ר: 200, ש: 300, ת: 400,
  };
  const IMPORT_MONTH_MAP = {
    תשרי: 'Tishrei',
    חשון: 'Cheshvan',
    חשוון: 'Cheshvan',
    כסלו: 'Kislev',
    טבת: 'Tevet',
    שבט: 'Sh\'vat',
    אדר: 'Adar',
    'אדר א׳': 'Adar I',
    'אדר א\'': 'Adar I',
    'אדר א': 'Adar I',
    'אדר ב׳': 'Adar II',
    'אדר ב\'': 'Adar II',
    'אדר ב': 'Adar II',
    ניסן: 'Nisan',
    אייר: 'Iyyar',
    סיון: 'Sivan',
    תמוז: 'Tamuz',
    אב: 'Av',
    אלול: 'Elul',
  };
  const IMPORT_CATEGORY_MAP = {
    'יום הולדת': 'birthday',
    'יום נישואין': 'anniversary',
    'יום זיכרון': 'memorial',
    אחר: 'other',
  };
  const importTemplatePath = '/templates/hebsync-events-import-template.xlsx';
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he';
  const hasAppliedPrefillRef = useRef(false);
  const notesRef = useRef(null);
  const importFileInputRef = useRef(null);

  const getCalendarColor = (calendarId) => {
    const calendar = calendars.find(c => c.id === calendarId);
    return calendar?.color || '#0038A8';
  };

  const normalizeHebrewToken = (value) => String(value ?? '').replace(/\u00A0/g, ' ').trim();

  const parseHebrewNumeral = (value) => {
    const normalized = normalizeHebrewToken(value).replace(/["׳״']/g, '');
    return [...normalized].reduce((sum, char) => sum + (HEBREW_NUMBER_MAP[char] ?? 0), 0);
  };

  const parseSourceYearValue = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    const normalized = normalizeHebrewToken(value);
    if (!normalized) return null;
    if (/^\d+$/.test(normalized)) return Number(normalized);

    const cleaned = normalized.replace(/\s/g, '');
    const firstMarkerIndex = cleaned.search(/[׳']/);
    if (firstMarkerIndex === 1) {
      const thousandsPart = parseHebrewNumeral(cleaned.slice(0, 1));
      const remainderPart = parseHebrewNumeral(cleaned.slice(2));
      return thousandsPart * 1000 + remainderPart;
    }

    const total = parseHebrewNumeral(cleaned);
    return total >= 1000 ? total : total + 5000;
  };

  const parseDayValue = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    const normalized = normalizeHebrewToken(value);
    if (!normalized) return null;
    if (/^\d+$/.test(normalized)) return Number(normalized);
    return parseHebrewNumeral(normalized);
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
  const [showReadOnlyCalendars, setShowReadOnlyCalendars] = useState(false);
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
  const [selectedImportFile, setSelectedImportFile] = useState(null);
  const [isImportParsing, setIsImportParsing] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState([]);
  const [importPreviewError, setImportPreviewError] = useState('');
  const [importFallbackSelections, setImportFallbackSelections] = useState({});
  const [isMobileLayout, setIsMobileLayout] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 768;
  });
  
  // State for 30th day fallback
  const [fallback30th, setFallback30th] = useState('29th'); // '29th', '1st', 'skip'
  
  // State for Gregorian conversion
  const [isGregorianEntry, setIsGregorianEntry] = useState(false);
  const [gregDate, setGregDate] = useState('');
  const [afterSunset, setAfterSunset] = useState(false);

  // Computed Hebrew date from Gregorian
  const convertedHDate = isGregorianEntry && gregDate ? gregorianToHebrew(new Date(gregDate), afterSunset) : null;
  const hasWriteAccess = canEditCalendars(scopeMode);
  const writableCalendars = calendars.filter((calendar) => ['owner', 'writer'].includes(calendar.accessRole));
  const readOnlyCalendars = calendars.filter((calendar) => !['owner', 'writer'].includes(calendar.accessRole));

  const handleClose = () => {
    if (showPreview) {
      setShowPreview(false);
      return;
    }

    onClose();
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

  useEffect(() => {
    if (!notesRef.current) return;
    notesRef.current.style.height = 'auto';
    notesRef.current.style.height = `${Math.max(notesRef.current.scrollHeight, 48)}px`;
  }, [notes]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateLayoutMode = () => {
      setIsMobileLayout(window.innerWidth < 768);
    };

    updateLayoutMode();
    window.addEventListener('resize', updateLayoutMode);
    return () => window.removeEventListener('resize', updateLayoutMode);
  }, []);

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
      const [cals, googleColors] = await Promise.all([
        fetchAllCalendars(),
        fetchGoogleCalendarColors().catch(() => null),
      ]);
      // Assign colors to calendars
      const calendarsWithColors = cals.map((cal, index) => ({
        ...cal,
        color: resolveCalendarColor(cal, index, googleColors),
      }));
      setCalendars(calendarsWithColors);
    } catch (e) {
      if (isAuthError(e)) return;
      console.error("Failed to load calendars", e);
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const handleCreateCalendar = async () => {
    if (!hasWriteAccess) {
      setLoginModalMode('upgrade');
      setShowLoginModal(true);
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

  const toggleCalendar = (id) => {
    setSelectedCalendarIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const show30thFallback = !isGregorianEntry && requires30thFallbackDecision(month, day);
  const sourceDateValidation = !isGregorianEntry
    ? validateHebrewDateForYear(parseInt(year, 10), month, day)
    : { isValid: true };

  // Generate list of years for the dropdown
  const yearOptions = Array.from({length: 121}, (_, i) => currentHebrewYear - 120 + i).reverse();

  const handlePreview = () => {
    if (!title) {
      alert("נא להזין את שם האירוע");
      return;
    }
    if (!isGregorianEntry && !sourceDateValidation.isValid) {
      alert(
        sourceDateValidation.reason === 'missing_flexible_30th'
          ? (isRtl ? "התאריך שבחרת לא קיים בשנת המקור. ל׳ בחשוון, ל׳ בכסלו ול׳ באדר א׳ קיימים רק בחלק מהשנים." : "The selected date does not exist in the source year. 30 Cheshvan, 30 Kislev, and 30 Adar I exist only in some years.")
          : (isRtl ? "התאריך שבחרת לא קיים בשנת המקור שנבחרה." : "The selected date does not exist in the selected source year.")
      );
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
    if (!isGregorianEntry && !sourceDateValidation.isValid) {
      throw new Error(isRtl ? 'התאריך שנבחר אינו קיים בשנת המקור.' : 'The selected date does not exist in the source year.');
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
      await Promise.all(selectedCalendarIds.map((calendarId) =>
        createHebcalEvent(title, category, targetYear, rdateString, calendarId, notes, {
          specialDate: requires30thFallbackDecision(targetMonth, targetDay)
            ? { monthName: targetMonth, day: targetDay, fallback: fallback30th }
            : null,
        })
      ));

      alert(isRtl ? `האירוע נוצר בהצלחה וסונכרן ל-${selectedCalendarIds.length} יומנים!` : `Event created successfully and synced to ${selectedCalendarIds.length} calendars!`);
      if (onComplete) {
        await onComplete();
      }
    } catch (e) {
      console.error("Submission error:", e);
      if (e.message.includes("401") || e.message.includes("authentication") || e.message.includes("Not authenticated")) {
        logout();
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

  const renderCalendarSelection = () => {
    if (isCalendarLoading) {
      return (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900">
          <RefreshCw className="mx-auto h-6 w-6 animate-spin text-[#0038A8]" />
          <p className="mt-3 text-sm font-bold text-slate-600 dark:text-slate-300">{t('loadingGoogleData')}</p>
        </div>
      );
    }

    if (calendars.length === 0) {
      return (
        <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div>
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('selectTargetCalendars')}</label>
          </div>
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
              {hasWriteAccess ? t('noCalendarsForEventCreation') : t('noCalendarsForEventCreationReadOnly')}
            </p>
            <div className={`mt-4 flex flex-wrap gap-2 ${isRtl ? 'justify-end' : 'justify-start'}`}>
              <button
                type="button"
                onClick={handleCreateCalendar}
                className="inline-flex items-center justify-center rounded-full bg-[#0038A8] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#002d86]"
              >
                {hasWriteAccess ? t('createCalendarToContinue') : t('allowCalendarCreation')}
              </button>
              <button
                type="button"
                onClick={loadCalendars}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('refreshCalendars')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    const renderCalendarOption = (cal, { disabled = false, readOnly = false } = {}) => (
      <label
        key={cal.id}
        className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${isRtl ? 'flex-row-reverse text-right' : ''} ${
          disabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-100/80 opacity-75 dark:border-slate-700 dark:bg-slate-800/70'
            : 'cursor-pointer'
        } ${
          !disabled && selectedCalendarIds.includes(cal.id)
            ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
            : !disabled
              ? 'border-slate-100 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800'
              : ''
        }`}
      >
        <div className="h-4 w-4 flex-shrink-0 rounded-full" style={{ backgroundColor: cal.color }}></div>
        <input
          type="checkbox"
          checked={selectedCalendarIds.includes(cal.id)}
          onChange={() => toggleCalendar(cal.id)}
          disabled={disabled}
          className="h-4 w-4 rounded text-[#0038A8] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className={`min-w-0 flex-1 ${isRtl ? 'text-right' : 'text-left'}`}>
          <span
            className={`block truncate text-sm font-medium ${
              disabled ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'
            }`}
            title={cal.summary}
          >
            {cal.summary}
          </span>
          {readOnly ? (
            <span className="mt-1 inline-flex rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {t('readOnlyCalendarBadge', { defaultValue: isRtl ? 'לצפייה בלבד' : 'View only' })}
            </span>
          ) : null}
        </div>
      </label>
    );

    return (
      <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('selectTargetCalendars')}</label>
        </div>
        {writableCalendars.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
            {t('noWritableCalendars', { defaultValue: isRtl ? 'אין יומנים עם הרשאת כתיבה כרגע. אפשר להציג גם יומנים לצפייה בלבד.' : 'There are no writable calendars right now. You can also show view-only calendars.' })}
          </div>
        ) : null}
        {writableCalendars.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {writableCalendars.map((cal) => renderCalendarOption(cal))}
          </div>
        ) : null}
        {readOnlyCalendars.length > 0 ? (
          <div className="space-y-2">
            <label className={`flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300 ${isRtl ? 'flex-row-reverse justify-end' : ''}`}>
              <input
                type="checkbox"
                checked={showReadOnlyCalendars}
                onChange={(event) => setShowReadOnlyCalendars(event.target.checked)}
                className="h-4 w-4 rounded text-[#0038A8]"
              />
              <span>{t('showReadOnlyCalendars', { defaultValue: isRtl ? 'הצג גם יומנים לצפייה בלבד' : 'Show view-only calendars too' })}</span>
            </label>
            {showReadOnlyCalendars ? (
              <>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('readOnlyCalendarHint', { defaultValue: isRtl ? 'אין לך הרשאה ליצור אירועים ביומנים האלו.' : 'You do not have permission to create events in these calendars.' })}
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {readOnlyCalendars.map((cal) => renderCalendarOption(cal, { disabled: true, readOnly: true }))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

  const handleImportFileChange = (event) => {
    const [file] = event.target.files ?? [];
    setSelectedImportFile(file ?? null);
    setImportPreviewRows([]);
    setImportPreviewError('');
  };

  const openImportFilePicker = () => {
    importFileInputRef.current?.click();
  };

  const getImportRowStatus = (row) => {
    if (row.needsFallbackDecision && !getImportFallbackSelection(row.rowNumber)) {
      return 'needs_decision';
    }

    return row.issues.length > 0 ? 'invalid' : 'valid';
  };

  const updateImportFallbackSelection = (rowNumber, value) => {
    setImportFallbackSelections((prev) => ({
      ...prev,
      [rowNumber]: value,
    }));
  };

  const removeImportPreviewRow = (rowNumber) => {
    setImportPreviewRows((prev) => prev
      .filter((row) => row.rowNumber !== rowNumber)
      .map((row, index) => ({ ...row, displayIndex: index + 1 })));
    setImportFallbackSelections((prev) => {
      const next = { ...prev };
      delete next[rowNumber];
      return next;
    });
  };

  const getImportFallbackSelection = (rowNumber) => importFallbackSelections[rowNumber] ?? '';

  const renderImportRowStatus = (row) => {
    if (row.needsFallbackDecision) {
      return (
        <div className="space-y-2">
          <div className={`rounded-lg px-2 py-1 text-xs font-medium ${
            getImportFallbackSelection(row.rowNumber)
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'
          }`}>
            {getImportFallbackSelection(row.rowNumber)
              ? t('bulkImportRowDecisionSelected', { defaultValue: 'נבחר טיפול לתאריך המיוחד' })
              : t('bulkImportRowNeedsDecision', { defaultValue: 'נדרש לבחור טיפול לתאריך מיוחד' })}
          </div>
          <select
            value={getImportFallbackSelection(row.rowNumber)}
            onChange={(event) => updateImportFallbackSelection(row.rowNumber, event.target.value)}
            className="w-full rounded-lg border border-amber-200 bg-white px-2 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0038A8] dark:border-amber-900/30 dark:bg-slate-900 dark:text-slate-200"
          >
            <option value="">{t('bulkImportFallbackSelect', { defaultValue: 'בחר טיפול' })}</option>
            <option value="29th">{t('bulkImportFallback29', { defaultValue: 'להעביר ל-כ״ט באותו חודש' })}</option>
            <option value="1st">{t('bulkImportFallback1st', { defaultValue: 'לדחות ל-א׳ בחודש הבא' })}</option>
            <option value="skip">{t('bulkImportFallbackSkip', { defaultValue: 'לדלג על אותה שנה' })}</option>
          </select>
        </div>
      );
    }

    if (getImportRowStatus(row) === 'valid') {
      return (
        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          {t('bulkImportRowValid', { defaultValue: 'תקין לתצוגה' })}
        </span>
      );
    }

    return (
      <div className="space-y-1">
        {row.issues.map((issue) => (
          <div key={issue} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
            {issue}
          </div>
        ))}
      </div>
    );
  };

  const importValidCount = importPreviewRows.filter((row) => getImportRowStatus(row) === 'valid').length;
  const importNeedsDecisionCount = importPreviewRows.filter((row) => getImportRowStatus(row) === 'needs_decision').length;
  const importInvalidCount = importPreviewRows.filter((row) => getImportRowStatus(row) === 'invalid').length;
  const importExecutableRows = importPreviewRows.filter((row) => getImportRowStatus(row) === 'valid');
  const canConfirmImport =
    importPreviewRows.length > 0 &&
    importInvalidCount === 0 &&
    importNeedsDecisionCount === 0 &&
    importExecutableRows.length > 0 &&
    selectedCalendarIds.length > 0;

  const parseImportWorkbook = async () => {
    if (!selectedImportFile) {
      setImportPreviewError(isRtl ? 'יש לבחור קובץ Excel לפני התצוגה המקדימה.' : 'Select an Excel file first.');
      return;
    }

    setIsImportParsing(true);
    setImportPreviewError('');

    try {
      const buffer = await selectedImportFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const firstSheet = workbook.Sheets[firstSheetName];

      if (!firstSheet) {
        throw new Error(isRtl ? 'לא נמצא גיליון ראשון בקובץ.' : 'No first sheet was found in the workbook.');
      }

      const rows = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: '',
        blankrows: false,
      });

      const [headerRow = []] = rows;
      const normalizedHeaders = headerRow.map(normalizeHebrewToken);
      const missingColumns = BULK_IMPORT_COLUMNS.filter((column) => !normalizedHeaders.includes(column));

      if (missingColumns.length > 0) {
        throw new Error(
          isRtl
            ? `חסרות עמודות חובה בגיליון Events: ${missingColumns.join(', ')}`
            : `Missing required columns in Events sheet: ${missingColumns.join(', ')}`
        );
      }

      const headerIndexMap = Object.fromEntries(
        BULK_IMPORT_COLUMNS.map((column) => [column, normalizedHeaders.indexOf(column)])
      );

      const parsedRows = rows
        .slice(1)
        .map((row, rowIndex) => {
          const titleValue = normalizeHebrewToken(row[headerIndexMap['שם האירוע']]);
          const categoryLabel = normalizeHebrewToken(row[headerIndexMap['קטגוריה']]);
          const notesValue = normalizeHebrewToken(row[headerIndexMap['הערות']]);
          const sourceYearLabel = normalizeHebrewToken(row[headerIndexMap['שנת מקור']]);
          const monthLabel = normalizeHebrewToken(row[headerIndexMap['חודש']]);
          const dayLabel = normalizeHebrewToken(row[headerIndexMap['יום']]);
          const occurrencesValue = row[headerIndexMap['מופעים']];

          if (![titleValue, categoryLabel, notesValue, sourceYearLabel, monthLabel, dayLabel, occurrencesValue]
            .some((value) => String(value ?? '').trim() !== '')) {
            return null;
          }

          const sourceYearValue = parseSourceYearValue(sourceYearLabel);
          const dayValue = parseDayValue(dayLabel);
          const monthId = IMPORT_MONTH_MAP[monthLabel];
          const categoryId = IMPORT_CATEGORY_MAP[categoryLabel];
          const occurrencesNumber = Number(occurrencesValue);

          const issues = [];
          if (!titleValue) issues.push(isRtl ? 'חסר שם אירוע' : 'Missing event title');
          if (!categoryId) issues.push(isRtl ? 'קטגוריה לא מזוהה' : 'Unknown category');
          if (!sourceYearValue) issues.push(isRtl ? 'שנת מקור לא תקינה' : 'Invalid source year');
          if (!monthId) issues.push(isRtl ? 'חודש לא מזוהה' : 'Unknown month');
          if (!dayValue) issues.push(isRtl ? 'יום לא תקין' : 'Invalid day');
          if (!Number.isFinite(occurrencesNumber) || occurrencesNumber < 1) {
            issues.push(isRtl ? 'מספר מופעים לא תקין' : 'Invalid occurrences count');
          }

          const validation = sourceYearValue && monthId && dayValue
            ? validateHebrewDateForYear(sourceYearValue, monthId, dayValue)
            : null;
          const canResolveWithFallback =
            validation &&
            (validation.reason === 'ok' || validation.reason === 'missing_flexible_30th');
          const needsFallbackDecision =
            requires30thFallbackDecision(monthId, dayValue) && canResolveWithFallback;

          if (validation && !validation.isValid) {
            if (validation.reason !== 'missing_flexible_30th') {
              issues.push(isRtl ? 'התאריך לא קיים בשנת המקור' : 'Date does not exist in source year');
            }
          }

          return {
            displayIndex: rowIndex + 1,
            rowNumber: rowIndex + 2,
            title: titleValue,
            categoryLabel,
            notes: notesValue,
            sourceYearLabel,
            sourceYearValue,
            monthLabel,
            monthId,
            dayLabel,
            dayValue,
            occurrences: Number.isFinite(occurrencesNumber) ? occurrencesNumber : occurrencesValue,
            issues,
            validation,
            needsFallbackDecision,
          };
        })
        .filter(Boolean);

      setImportPreviewRows(parsedRows);
      setImportFallbackSelections({});

      if (parsedRows.length === 0) {
        setImportPreviewError(isRtl ? 'לא נמצאו שורות אירועים בגיליון Events.' : 'No event rows were found in the Events sheet.');
      }
    } catch (error) {
      setImportPreviewRows([]);
      setImportPreviewError(error.message || (isRtl ? 'קריאת הקובץ נכשלה.' : 'Failed to read workbook.'));
    } finally {
      setIsImportParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (isLoading) return;
    if (!hasWriteAccess) {
      setLoginModalMode('upgrade');
      setShowLoginModal(true);
      return;
    }
    if (selectedCalendarIds.length === 0) {
      alert(t('errorNoCalendar'));
      return;
    }
    if (importExecutableRows.length === 0) {
      alert(isRtl ? 'אין שורות מוכנות לייבוא.' : 'There are no rows ready to import.');
      return;
    }

    setIsLoading(true);
    try {
      let createdCount = 0;
      let skippedCount = 0;
      const failedRows = [];

      for (const row of importExecutableRows) {
        const fallback = row.needsFallbackDecision
          ? (importFallbackSelections[row.rowNumber] ?? '29th')
          : 'skip';

        const rdateString = generateRdates(
          row.sourceYearValue,
          row.monthId,
          row.dayValue,
          Number(row.occurrences) || 1,
          fallback,
        );

        if (!rdateString) {
          skippedCount += 1;
          continue;
        }

        try {
          await Promise.all(
            selectedCalendarIds.map((calendarId) =>
              createHebcalEvent(
                row.title,
                IMPORT_CATEGORY_MAP[row.categoryLabel] ?? 'other',
                row.sourceYearValue,
                rdateString,
                calendarId,
                row.notes,
                {
                  specialDate: requires30thFallbackDecision(row.monthId, row.dayValue)
                    ? { monthName: row.monthId, day: row.dayValue, fallback }
                    : null,
                },
              ),
            ),
          );
          createdCount += 1;
        } catch (error) {
          if (
            error?.message?.includes('401') ||
            error?.message?.includes('authentication') ||
            error?.message?.includes('Not authenticated')
          ) {
            throw error;
          }
          failedRows.push(row.displayIndex);
        }
      }

      const summaryParts = [
        isRtl ? `נוצרו: ${createdCount}` : `Created: ${createdCount}`,
        isRtl ? `דולגו: ${skippedCount}` : `Skipped: ${skippedCount}`,
      ];

      if (failedRows.length > 0) {
        summaryParts.push(
          isRtl
            ? `נכשלו בשורות: ${failedRows.join(', ')}`
            : `Failed rows: ${failedRows.join(', ')}`,
        );
      }

      alert(summaryParts.join(' | '));

      if (createdCount > 0 && onComplete) {
        await onComplete();
      }
    } catch (e) {
      console.error('Bulk import error:', e);
      if (e.message.includes('401') || e.message.includes('authentication') || e.message.includes('Not authenticated')) {
        localStorage.removeItem('gcal_token');
        setLoginModalMode('reauthorize');
        setShowLoginModal(true);
      } else {
        alert((isRtl ? 'שגיאה בייבוא: ' : 'Import error: ') + e.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[1.75rem] bg-slate-50 shadow-2xl dark:bg-slate-900 md:h-[min(92vh,960px)] md:rounded-[2rem] font-sans ${isRtl ? 'text-right' : 'text-left'}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <main className="flex-1 overflow-auto px-4 py-4 md:px-6 md:py-5">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          <div className="flex flex-col gap-1 mb-2">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              {showPreview ? t('preview') : t('addEventTitle')}
            </h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">
              {showPreview ? t('checkUpcomingDates') : t('addEventSubtitle')}
            </p>
          </div>

        <div className="overflow-hidden rounded-none border-0 bg-transparent shadow-none dark:bg-slate-900 md:rounded-2xl md:border md:border-slate-100 md:bg-white md:shadow-sm dark:md:border-slate-700 dark:md:bg-slate-800">
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
                  {t('uploadWorkbook', { defaultValue: 'ייבוא מקובץ Excel' })}
                </button>
              </div>

              <div className="px-4 pb-6 pt-4 md:p-8">
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
                          className="w-full rounded-xl border border-slate-200 p-3 text-slate-900 transition-all outline-none placeholder:text-slate-400 focus:border-[#0038A8] focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-[#0038A8]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('category')}</label>
                        <select 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900 transition-all outline-none focus:border-[#0038A8] focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-[#0038A8]">
                          <option value="birthday">{t('birthday')}</option>
                          <option value="anniversary">{t('anniversary')}</option>
                          <option value="memorial">{t('memorial')}</option>
                          <option value="other">{t('other')}</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('description')}</label>
                      <div className="relative">
                        <textarea
                          ref={notesRef}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder={t('descriptionPlaceholder')}
                          rows="1"
                          className="w-full min-h-12 resize-none overflow-hidden rounded-xl border border-slate-200 p-3 pb-7 text-slate-900 transition-all outline-none placeholder:text-slate-400 focus:border-[#0038A8] focus:ring-2 focus:ring-blue-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-[#0038A8]"
                        />
                        <span className={`pointer-events-none absolute bottom-2 text-slate-300 dark:text-slate-600 ${isRtl ? 'left-3' : 'right-3'}`}>
                          <GripHorizontal className="h-4 w-4" />
                        </span>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-6 dark:bg-slate-900/50 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg dark:text-slate-200">
                          <CalendarIcon className="w-5 h-5 text-[#0038A8]" />
                          {t('originalEventDate')}
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600 md:text-sm dark:text-slate-400">
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
                        <div className="grid grid-cols-[1.35fr_1fr_0.8fr] gap-2.5 md:grid-cols-3 md:gap-4">
                          <div className="space-y-1 md:space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 md:text-xs dark:text-slate-400">{t('sourceYear')}</label>
                            <select 
                              value={year}
                              onChange={(e) => setYear(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-[13px] font-medium text-slate-900 outline-none focus:border-[#0038A8] md:p-3 md:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            >
                              {yearOptions.map(y => (
                                <option key={y} value={y}>{isRtl ? formatHebrewYear(y) : y}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1 md:space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 md:text-xs dark:text-slate-400">{t('month')}</label>
                            <select 
                              value={month}
                              onChange={(e) => setMonth(e.target.value)}
                              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-[13px] font-medium text-slate-900 outline-none focus:border-[#0038A8] md:p-3 md:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            >
                              {availableMonths.map(m => (
                                <option key={m.id} value={m.id}>{isRtl ? m.label : m.id}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1 md:space-y-2">
                            <label className="text-[11px] font-bold text-slate-500 md:text-xs dark:text-slate-400">{t('day')}</label>
                            <select 
                              value={day}
                              onChange={(e) => setDay(parseInt(e.target.value, 10))}
                              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-[13px] font-medium text-slate-900 outline-none focus:border-[#0038A8] md:p-3 md:text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
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
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
                            <div className="space-y-1.5 md:space-y-2">
                              <label className="text-[11px] font-bold text-slate-500 md:text-xs dark:text-slate-400">{t('gregorianDate')}</label>
                              <input 
                                type="date" 
                                value={gregDate}
                                onChange={(e) => setGregDate(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 p-2.5 text-sm text-slate-900 outline-none focus:border-[#0038A8] md:p-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                              />
                            </div>
                            <div className="flex flex-col justify-end pb-1">
                              <button 
                                type="button"
                                onClick={() => setAfterSunset(!afterSunset)}
                                className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-sm transition-all md:p-3 ${afterSunset ? 'border-[#0038A8] bg-[#0038A8]/10 text-[#0038A8] dark:border-blue-400 dark:bg-blue-950/30 dark:text-blue-300' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
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
                            <label className="flex items-center gap-3 rounded-xl border border-amber-100 bg-white/50 p-3 transition-colors hover:bg-white dark:border-amber-900/30 dark:bg-slate-800/40 dark:hover:bg-slate-800/70">
                              <input type="radio" name="fallback" checked={fallback30th === '29th'} onChange={() => setFallback30th('29th')} className="w-4 h-4 text-[#0038A8]" />
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{isRtl ? 'הקדמה ל-כ״ט באותו חודש' : 'Move to 29th of the same month'}</span>
                            </label>
                            <label className="flex items-center gap-3 rounded-xl border border-amber-100 bg-white/50 p-3 transition-colors hover:bg-white dark:border-amber-900/30 dark:bg-slate-800/40 dark:hover:bg-slate-800/70">
                              <input type="radio" name="fallback" checked={fallback30th === '1st'} onChange={() => setFallback30th('1st')} className="w-4 h-4 text-[#0038A8]" />
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{isRtl ? 'דחייה ל-א׳ בחודש הבא' : 'Move to 1st of the next month'}</span>
                            </label>
                            <label className="flex items-center gap-3 rounded-xl border border-amber-100 bg-white/50 p-3 transition-colors hover:bg-white dark:border-amber-900/30 dark:bg-slate-800/40 dark:hover:bg-slate-800/70">
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
                            className="w-24 rounded-xl border border-slate-200 bg-white p-3 text-center font-bold text-slate-900 outline-none focus:border-[#0038A8] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <span className="text-slate-600 dark:text-slate-400 font-medium">{t('occurrences')}</span>
                        </div>
                      </div>

                      {renderCalendarSelection()}
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
                  <>
                    <div className="space-y-6">
                      <input
                        ref={importFileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleImportFileChange}
                      />

                      <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/40 md:p-6">
                        <div className="flex flex-col gap-5">
                          <div className="space-y-3">
                            <div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{t('bulkImportTitle', { defaultValue: 'ייבוא אירועים מרוכז' })}</h3>
                              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                                {t('bulkImportBody', { defaultValue: 'הורד את תבנית ה-Excel, מלא את הגיליון Events בלבד, ואז העלה כאן את הקובץ לתצוגה מקדימה.' })}
                              </p>
                            </div>
                          </div>
                          <div className={`flex flex-col gap-3 sm:flex-row ${isRtl ? 'sm:justify-start' : 'sm:justify-start'}`}>
                            <a
                              href={importTemplatePath}
                              download
                              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0038A8] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-800"
                            >
                              <Download className="h-4 w-4" />
                              {t('downloadImportTemplate', { defaultValue: 'הורדת תבנית למילוי' })}
                            </a>
                            <button
                              type="button"
                              onClick={openImportFilePicker}
                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:border-[#0038A8] hover:text-[#0038A8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            >
                              <Upload className="h-4 w-4" />
                              {t('bulkImportUploadTitle', { defaultValue: 'העלאת קובץ ממולא' })}
                            </button>
                          </div>

                          <div className={`rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/20 ${selectedImportFile ? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between' : ''}`}>
                            <div className="min-w-0">
                              {selectedImportFile ? (
                                <span className="block truncate font-bold text-slate-800 dark:text-slate-100">
                                  {t('bulkImportSelectedFile', { defaultValue: 'קובץ שנבחר:' })} {selectedImportFile.name}
                                </span>
                              ) : (
                                <span className="text-slate-500 dark:text-slate-400">
                                  {t('bulkImportNoFileYet', { defaultValue: 'לא נבחר קובץ' })}
                                </span>
                              )}
                            </div>
                            {selectedImportFile ? (
                              <button
                                type="button"
                                onClick={parseImportWorkbook}
                                disabled={isImportParsing}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0038A8] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isImportParsing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                {t('bulkImportPreviewButton', { defaultValue: 'תצוגה מקדימה לקובץ' })}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {importPreviewError ? (
                          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
                            {importPreviewError}
                          </div>
                        ) : null}

                        {importPreviewRows.length > 0 ? (
                          <div className="mt-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100">
                              {t('bulkImportPreviewResults', { defaultValue: 'תוצאות קריאת הקובץ' })}: {importPreviewRows.length}
                            </div>
                            <div className="grid gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70 md:grid-cols-3">
                              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                                {t('bulkImportValidRows', { defaultValue: 'תקינות' })}: {importValidCount}
                              </div>
                              <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                {t('bulkImportDecisionRows', { defaultValue: 'דורשות החלטה' })}: {importNeedsDecisionCount}
                              </div>
                              <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-900/20 dark:text-rose-200">
                                {t('bulkImportInvalidRows', { defaultValue: 'שגויות' })}: {importInvalidCount}
                              </div>
                            </div>
                            {isMobileLayout ? (
                            <div className="max-h-80 overflow-auto">
                              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                {importPreviewRows.map((row) => (
                                  <div key={`${row.rowNumber}-${row.title}`} className="space-y-3 bg-white px-4 py-4 dark:bg-slate-900/70">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0 space-y-1">
                                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500">#{row.displayIndex}</div>
                                        <div className="break-words text-sm font-bold text-slate-900 dark:text-slate-100">{row.title || '-'}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{row.categoryLabel || '-'}</div>
                                      </div>
                                      {getImportRowStatus(row) === 'invalid' ? (
                                        <button
                                          type="button"
                                          onClick={() => removeImportPreviewRow(row.rowNumber)}
                                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition-all hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-200"
                                          aria-label={t('bulkImportRemoveRow', { defaultValue: 'הסר שורה' })}
                                          title={t('bulkImportRemoveRow', { defaultValue: 'הסר שורה' })}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      ) : null}
                                    </div>
                                    <div className="grid gap-3 text-sm text-slate-700 dark:text-slate-200">
                                      <div>
                                        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('hebrewDate')}</div>
                                        <div className="break-words">{row.dayLabel} {row.monthLabel}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{row.sourceYearLabel}</div>
                                      </div>
                                      <div>
                                        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('occurrences')}</div>
                                        <div>{row.occurrences}</div>
                                      </div>
                                      <div>
                                        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('notes')}</div>
                                        {renderImportRowStatus(row)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            ) : (
                            <div className="max-h-80 overflow-auto">
                              <table className={`w-full table-fixed border-collapse ${isRtl ? 'text-right' : 'text-left'}`}>
                                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                                  <tr className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                    <th className="w-12 border-b border-slate-200 px-2 py-2 dark:border-slate-700">#</th>
                                    <th className="w-[23%] border-b border-slate-200 px-2 py-2 dark:border-slate-700">{t('eventName')}</th>
                                    <th className="w-[15%] border-b border-slate-200 px-2 py-2 dark:border-slate-700">{t('category')}</th>
                                    <th className="w-[18%] border-b border-slate-200 px-2 py-2 dark:border-slate-700">{t('hebrewDate')}</th>
                                    <th className="w-[11%] border-b border-slate-200 px-2 py-2 dark:border-slate-700">{t('occurrences')}</th>
                                    <th className="w-[23%] border-b border-slate-200 px-2 py-2 dark:border-slate-700">{t('notes')}</th>
                                    <th className="w-12 border-b border-slate-200 px-2 py-2 dark:border-slate-700"></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {importPreviewRows.map((row) => (
                                    <tr key={`${row.rowNumber}-${row.title}`} className="align-top text-sm text-slate-700 dark:text-slate-200">
                                      <td className="border-b border-slate-100 px-2 py-3 dark:border-slate-800">{row.displayIndex}</td>
                                      <td className="border-b border-slate-100 px-2 py-3 font-medium dark:border-slate-800">{row.title || '-'}</td>
                                      <td className="border-b border-slate-100 px-2 py-3 dark:border-slate-800">{row.categoryLabel || '-'}</td>
                                      <td className="border-b border-slate-100 px-2 py-3 dark:border-slate-800">
                                        <div>{row.dayLabel} {row.monthLabel}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{row.sourceYearLabel}</div>
                                      </td>
                                      <td className="border-b border-slate-100 px-2 py-3 dark:border-slate-800">{row.occurrences}</td>
                                      <td className="border-b border-slate-100 px-2 py-3 dark:border-slate-800">
                                        {row.needsFallbackDecision ? (
                                          <div className="space-y-2">
                                            <div className={`rounded-lg px-2 py-1 text-xs font-medium ${
                                              getImportFallbackSelection(row.rowNumber)
                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                : 'bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200'
                                            }`}>
                                              {getImportFallbackSelection(row.rowNumber)
                                                ? t('bulkImportRowDecisionSelected', { defaultValue: 'נבחר טיפול לתאריך המיוחד' })
                                                : t('bulkImportRowNeedsDecision', { defaultValue: 'נדרש לבחור טיפול לתאריך מיוחד' })}
                                            </div>
                                            <select
                                              value={getImportFallbackSelection(row.rowNumber)}
                                              onChange={(event) => updateImportFallbackSelection(row.rowNumber, event.target.value)}
                                              className="w-full rounded-lg border border-amber-200 bg-white px-2 py-2 text-xs font-medium text-slate-700 outline-none focus:border-[#0038A8] dark:border-amber-900/30 dark:bg-slate-900 dark:text-slate-200"
                                            >
                                              <option value="">{t('bulkImportFallbackSelect', { defaultValue: 'בחר טיפול' })}</option>
                                              <option value="29th">{t('bulkImportFallback29', { defaultValue: 'להעביר ל-כ״ט באותו חודש' })}</option>
                                              <option value="1st">{t('bulkImportFallback1st', { defaultValue: 'לדחות ל-א׳ בחודש הבא' })}</option>
                                              <option value="skip">{t('bulkImportFallbackSkip', { defaultValue: 'לדלג על אותה שנה' })}</option>
                                            </select>
                                          </div>
                                        ) : getImportRowStatus(row) === 'valid' ? (
                                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                            {t('bulkImportRowValid', { defaultValue: 'תקין לתצוגה' })}
                                          </span>
                                        ) : (
                                          <div className="space-y-1">
                                            {row.issues.map((issue) => (
                                              <div key={issue} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                                {issue}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                      <td className="border-b border-slate-100 px-2 py-3 dark:border-slate-800">
                                        {getImportRowStatus(row) === 'invalid' ? (
                                          <button
                                            type="button"
                                            onClick={() => removeImportPreviewRow(row.rowNumber)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 transition-all hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-900/20 dark:text-rose-200"
                                            aria-label={t('bulkImportRemoveRow', { defaultValue: 'הסר שורה' })}
                                            title={t('bulkImportRemoveRow', { defaultValue: 'הסר שורה' })}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        ) : null}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            )}
                          </div>
                        ) : null}

                      </div>


                      <div className="space-y-2">
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {t('bulkImportCalendarsHint', { defaultValue: 'הקובץ לא מכיל סימון יומנים. כל פעולת ייבוא תחול על אותו סט יומנים שבחרת כאן.' })}
                        </div>
                        {renderCalendarSelection()}
                      </div>

                      {importPreviewRows.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {selectedCalendarIds.length === 0
                              ? t('bulkImportConfirmHintCalendars', { defaultValue: 'בחר לפחות יומן אחד לפני הייבוא.' })
                              : importInvalidCount > 0
                              ? t('bulkImportConfirmHintInvalid', { defaultValue: 'הסר שורות שגויות לפני הייבוא.' })
                              : importNeedsDecisionCount > 0
                                ? t('bulkImportConfirmHintDecision', { defaultValue: 'בחר טיפול לכל תאריך מיוחד לפני הייבוא.' })
                                : t('bulkImportConfirmHint', { defaultValue: 'כל השורות מוכנות לייבוא.' })}
                          </div>
                          <button
                            type="button"
                            onClick={handleConfirmImport}
                            disabled={isLoading || !canConfirmImport}
                            className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 ${isRtl ? 'self-start' : 'self-start'}`}
                          >
                            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            {t('bulkImportConfirmButton', { defaultValue: 'ייבוא האירועים' })}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-4 md:p-8">
              <div className="flex items-start justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-3 md:items-center md:p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <div>
                  <h3 className="font-bold text-base text-slate-900 md:text-lg dark:text-white">{title}</h3>
                  <p className="text-xs text-slate-500 md:text-sm dark:text-slate-400">{t('occurrences')}: {syncSpan}</p>
                </div>
                <div className={isRtl ? 'text-left' : 'text-right'}>
                  <span className="rounded bg-white px-2 py-1 text-[11px] font-bold text-[#0038A8] md:text-xs dark:bg-slate-700 dark:text-blue-300">
                    {t(category)}
                  </span>
                </div>
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <div className="hidden max-h-[min(52vh,32rem)] overflow-auto md:block">
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
                <div className="max-h-[min(48dvh,26rem)] overflow-auto bg-white dark:bg-slate-900 md:hidden">
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {previewData.map((occ, idx) => (
                      <div key={idx} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 px-3 py-3">
                        <div className="pt-0.5 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{occ.hebrewDate}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{occ.gregorianDate}</div>
                          {occ.note ? (
                            <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 break-words">
                              {occ.note}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 mt-3 flex flex-col gap-3 border-t border-slate-200 bg-white/95 pt-3 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 sm:mt-4 sm:flex-row sm:gap-4 sm:pt-4">
                <button 
                  onClick={() => setShowPreview(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 sm:px-8 sm:py-4 sm:text-base dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {t('backToEdit')}
                </button>
                <button 
                  onClick={() => submitEvent()}
                  disabled={isLoading}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-lg transition-all disabled:opacity-70 sm:px-8 sm:py-4 sm:text-base ${
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


