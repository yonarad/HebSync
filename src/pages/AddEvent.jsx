import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Calendar as CalendarIcon, Info, Moon, Sun, RefreshCw, Eye, CheckCircle } from 'lucide-react';
import Logo from '../components/Logo';
import { getMonthsForYear, getDaysInHebrewMonth, gregorianToHebrew, generateRdates, getPreviewDates } from '../utils/hebcal';
import { HDate, gematriya } from '@hebcal/core';
import { authenticateWithGoogle, getAccessToken, createHebcalEvent } from '../utils/googleApi';

export default function AddEvent() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('manual');
  const [isLoading, setIsLoading] = useState(false);
  const currentHDate = new HDate();
  const currentHebrewYear = currentHDate.getFullYear();
  
  // State for manual Hebrew date entry
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('birthday');
  const [year, setYear] = useState(currentHebrewYear.toString());
  const [month, setMonth] = useState(currentHDate.getMonthName());
  const [day, setDay] = useState(currentHDate.getDate());
  const [daysInMonth, setDaysInMonth] = useState(30);
  const [syncSpan, setSyncSpan] = useState(120);
  const [availableMonths, setAvailableMonths] = useState(() => getMonthsForYear(year));
  
  // Preview State
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  
  // State for 30th day fallback
  const [fallback30th, setFallback30th] = useState('skip'); // '29th', '1st', 'skip'
  
  // State for Gregorian conversion
  const [isGregorianEntry, setIsGregorianEntry] = useState(false);
  const [gregDate, setGregDate] = useState('');
  const [afterSunset, setAfterSunset] = useState(false);

  // Computed Hebrew date from Gregorian
  const convertedHDate = isGregorianEntry && gregDate ? gregorianToHebrew(new Date(gregDate), afterSunset) : null;

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

  const show30thFallback = !isGregorianEntry && day === 30 && ['Cheshvan', 'Kislev', 'Adar I'].includes(month);

  // Generate list of years for the dropdown
  const yearOptions = Array.from({length: 121}, (_, i) => currentHebrewYear - 120 + i).reverse();

  const handlePreview = () => {
    if (!title) {
      alert("נא להזין את שם האירוע");
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

    const data = getPreviewDates(targetYear, targetMonth, targetDay, 15, fallback30th);
    setPreviewData(data);
    setShowPreview(true);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    
    if (!getAccessToken()) {
      authenticateWithGoogle(() => submitEvent(), (err) => alert("שגיאה בהתחברות לגוגל"));
    } else {
      submitEvent();
    }
  };

  const submitEvent = async () => {
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

      await createHebcalEvent(title, category, targetYear, rdateString);
      alert("האירוע נוצר בהצלחה וסונכרן ליומן גוגל שלך!");
      navigate('/dashboard');
    } catch (e) {
      alert("שגיאה בשמירת האירוע: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo className="w-12 h-12" />
            <div>
              <h1 className="text-3xl font-bold text-[#0038A8] dark:text-blue-400">
                {showPreview ? 'תצוגה מקדימה' : 'הוספת אירוע'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                {showPreview ? 'בדוק את מועדי האירוע בשנים הקרובות' : 'הזן אירוע בודד או העלה קובץ מרוכז'}
              </p>
            </div>
          </div>
          <button 
            onClick={() => showPreview ? setShowPreview(false) : navigate('/')}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            {showPreview ? 'חזרה לעריכה' : 'חזרה'}
          </button>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden dark:bg-slate-800 dark:border-slate-700">
          {!showPreview ? (
            <>
              <div className="flex border-b border-slate-100 dark:border-slate-700">
                <button 
                  className={`flex-1 py-4 text-center font-medium transition-colors ${tab === 'manual' ? 'text-[#0038A8] border-b-2 border-[#0038A8] bg-blue-50/50 dark:bg-[#0038A8]/20 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'}`}
                  onClick={() => setTab('manual')}
                >
                  הזנה ידנית
                </button>
                <button 
                  className={`flex-1 py-4 text-center font-medium transition-colors ${tab === 'csv' ? 'text-[#0038A8] border-b-2 border-[#0038A8] bg-blue-50/50 dark:bg-[#0038A8]/20 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/50'}`}
                  onClick={() => setTab('csv')}
                >
                  העלאת קובץ CSV
                </button>
              </div>

              <div className="p-6 md:p-8">
                {tab === 'manual' ? (
                  <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handlePreview(); }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">שם האירוע</label>
                        <input 
                          type="text" 
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="לדוגמה: יום הולדת של דוד" 
                          className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#0038A8] focus:ring-2 focus:ring-blue-200 transition-all outline-none dark:bg-slate-900 dark:border-slate-600 dark:focus:ring-[#0038A8]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">קטגוריה</label>
                        <select 
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full p-3 rounded-xl border border-slate-200 focus:border-[#0038A8] focus:ring-2 focus:ring-blue-200 transition-all outline-none bg-white dark:bg-slate-900 dark:border-slate-600 dark:focus:ring-[#0038A8]">
                          <option value="birthday">יום הולדת</option>
                          <option value="anniversary">יום נישואין</option>
                          <option value="memorial">אזכרה</option>
                          <option value="other">אחר</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-6 dark:bg-slate-900/50 dark:border-slate-700">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg dark:text-slate-200">
                          <CalendarIcon className="w-5 h-5 text-[#0038A8]" />
                          תאריך האירוע המקורי
                        </h3>
                        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-400">
                          <input 
                            type="checkbox" 
                            checked={isGregorianEntry}
                            onChange={(e) => setIsGregorianEntry(e.target.checked)}
                            className="w-4 h-4 text-[#0038A8] rounded" 
                          />
                          הזן תאריך לועזי במקום
                        </label>
                      </div>
                      
                      {!isGregorianEntry ? (
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">שנת מקור (עברית)</label>
                            <select 
                              value={year}
                              onChange={(e) => setYear(e.target.value)}
                              className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-[#0038A8] dark:bg-slate-800 dark:border-slate-600 font-medium"
                            >
                              {yearOptions.map(y => (
                                <option key={y} value={y}>{gematriya(y)} (ה׳{gematriya(y)})</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">חודש</label>
                            <select 
                              value={month}
                              onChange={(e) => setMonth(e.target.value)}
                              className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-[#0038A8] dark:bg-slate-800 dark:border-slate-600 font-medium"
                            >
                              {availableMonths.map(m => (
                                <option key={m.id} value={m.id}>{m.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">יום</label>
                            <select 
                              value={day}
                              onChange={(e) => setDay(parseInt(e.target.value, 10))}
                              className="w-full p-3 rounded-lg border border-slate-200 outline-none focus:border-[#0038A8] dark:bg-slate-800 dark:border-slate-600 font-medium"
                            >
                              {Array.from({length: daysInMonth}).map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 dark:text-slate-400">תאריך לועזי מקורי</label>
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
                                {afterSunset ? 'אחרי השקיעה' : 'לפני השקיעה'}
                              </button>
                            </div>
                          </div>
                          
                          {convertedHDate && (
                            <div className="mt-4 p-4 bg-cyan-50 text-cyan-900 rounded-lg border border-cyan-100 flex items-center justify-between dark:bg-cyan-900/20 dark:text-cyan-100 dark:border-cyan-800">
                              <div>
                                <span className="block text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 mb-1">התאריך העברי המחושב</span>
                                <span className="text-xl font-bold">{convertedHDate.renderGematriya()}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {show30thFallback && (
                        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                          <h4 className="font-bold text-amber-800 mb-2 dark:text-amber-400">שים לב: בחרת ביום ה-30 בחודש (ל׳)</h4>
                          <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                              <input type="radio" name="fallback" checked={fallback30th === '29th'} onChange={() => setFallback30th('29th')} className="text-[#0038A8]" />
                              הקדמה ל-כ״ט
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                              <input type="radio" name="fallback" checked={fallback30th === '1st'} onChange={() => setFallback30th('1st')} className="text-[#0038A8]" />
                              דחייה ל-א׳ בחודש הבא
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                              <input type="radio" name="fallback" checked={fallback30th === 'skip'} onChange={() => setFallback30th('skip')} className="text-[#0038A8]" />
                              דלג בשנים חסרות
                            </label>
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">לכמה שנים קדימה לסנכרן?</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="number"
                            min="1"
                            max="120"
                            value={syncSpan}
                            onChange={(e) => setSyncSpan(Math.min(120, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                            className="w-24 p-3 rounded-xl border border-slate-200 focus:border-[#0038A8] outline-none bg-white dark:bg-slate-800 dark:border-slate-600 font-bold text-center"
                          />
                          <span className="text-slate-600 dark:text-slate-400 font-medium">שנים</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button 
                        type="submit" 
                        className="px-8 py-4 bg-[#0038A8] hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 text-lg w-full md:w-auto flex items-center justify-center gap-2"
                      >
                        <Eye className="w-5 h-5" />
                        הצג תצוגה מקדימה
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 dark:bg-slate-900/30 dark:border-slate-700">
                    <div className="w-16 h-16 bg-blue-100 text-[#0038A8] rounded-full flex items-center justify-center mb-2 dark:bg-[#0038A8]/30 dark:text-blue-400">
                      <Upload className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">העלה קובץ CSV</h3>
                    <button className="px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 shadow-sm transition-all dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700">
                      בחירת קובץ
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">סנכרון ל-{syncSpan} שנים קדימה</p>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-[#0038A8] bg-white px-2 py-1 rounded dark:bg-slate-700 dark:text-blue-300">
                    {category === 'birthday' ? 'יום הולדת' : category === 'anniversary' ? 'יום נישואין' : category === 'memorial' ? 'אזכרה' : 'אחר'}
                  </span>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-sm font-bold">
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">שנה עברית</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">תאריך עברי</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">תאריך לועזי</th>
                      <th className="p-4 border-b border-slate-200 dark:border-slate-700">הערות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((occ, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border-b border-slate-100 dark:border-slate-800">
                        <td className="p-4 font-medium text-slate-900 dark:text-white">ה׳{gematriya(occ.hebrewYear)}</td>
                        <td className="p-4 text-slate-700 dark:text-slate-300 font-bold">{occ.hebrewDate}</td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">{occ.gregorianDate}</td>
                        <td className="p-4 text-xs font-medium text-amber-600 dark:text-amber-400">{occ.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button 
                  onClick={() => setShowPreview(false)}
                  className="flex-1 px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                >
                  חזרה לעריכה
                </button>
                <button 
                  onClick={() => handleSubmit()}
                  disabled={isLoading}
                  className="flex-1 px-8 py-4 bg-[#0038A8] hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  {isLoading ? 'מסנכרן...' : 'אישור וסנכרון ליומן'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
