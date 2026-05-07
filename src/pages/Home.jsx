import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Download, Eye, FileSpreadsheet, Info, Shield, Sparkles } from 'lucide-react';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { authenticateWithGoogle, fetchSession, getAccessToken, SCOPE_MODES } from '../utils/googleApi';
import { useTranslation } from 'react-i18next';
import useInstallPrompt from '../hooks/useInstallPrompt';

const CONNECT_OPTIONS = [
  {
    id: SCOPE_MODES.APP_CREATED,
    titleKey: 'permissionHebsyncOnly',
    descriptionKey: 'permissionHebsyncOnlyDesc',
    icon: Shield,
    accentClassName:
      'border-emerald-200 bg-emerald-50/60 hover:border-emerald-400 dark:border-emerald-900/40 dark:bg-emerald-950/20',
    iconClassName: 'text-emerald-500',
  },
  {
    id: SCOPE_MODES.READ_ONLY,
    titleKey: 'permissionAllCalendars',
    descriptionKey: 'permissionAllCalendarsDesc',
    helperKey: 'permissionAllCalendarsHelper',
    icon: Eye,
    accentClassName:
      'border-blue-200 bg-blue-50/60 hover:border-blue-400 dark:border-blue-900/40 dark:bg-blue-950/20',
    iconClassName: 'text-blue-500',
  },
];

const VALUE_PROPS = [
  {
    icon: CalendarDays,
    titleKey: 'landingValueSyncTitle',
    descriptionKey: 'landingValueSyncBody',
    defaultTitle: {
      en: 'Hebrew dates that stay in sync',
      he: 'תאריכים עבריים שנשארים מסונכרנים',
    },
    defaultDescription: {
      en: 'Birthdays, anniversaries, memorial dates, and custom Hebrew events continue appearing in your calendar years ahead.',
      he: 'ימי הולדת, ימי נישואין, אזכרות ואירועים עבריים מותאמים ממשיכים להופיע ביומן שלך גם בשנים הבאות.',
    },
    accentClassName: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
  },
  {
    icon: FileSpreadsheet,
    titleKey: 'landingValueImportTitle',
    descriptionKey: 'landingValueImportBody',
    defaultTitle: {
      en: 'Bulk import from Excel',
      he: 'ייבוא מרוכז מאקסל',
    },
    defaultDescription: {
      en: 'Upload a workbook, review the parsed rows, and confirm only after you see exactly what will be created.',
      he: 'מעלים חוברת, בודקים את השורות שפוענחו, ומאשרים רק אחרי שרואים בדיוק מה הולך להיווצר.',
    },
    accentClassName: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-300',
  },
  {
    icon: Shield,
    titleKey: 'landingValueControlTitle',
    descriptionKey: 'landingValueControlBody',
    defaultTitle: {
      en: 'Gradual access and calendar control',
      he: 'שליטה ביומנים והרשאות מדורגות',
    },
    defaultDescription: {
      en: 'Start with safer access, choose whether to work only in HebSync calendars or in existing calendars too, and upgrade editing only when needed.',
      he: 'אפשר להתחיל בגישה בטוחה יותר, לבחור אם לעבוד רק עם יומני HebSync או גם עם יומנים קיימים, ולשדרג עריכה רק כשבאמת צריך.',
    },
    accentClassName: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());
  const [isSessionResolved, setIsSessionResolved] = useState(false);
  const [selectedMode, setSelectedMode] = useState(SCOPE_MODES.APP_CREATED);
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const isRtl = i18n.language === 'he';
  const locale = isRtl ? 'he' : 'en';

  useEffect(() => {
    let isMounted = true;

    fetchSession()
      .then((session) => {
        if (!isMounted) return;

        if (session) {
          setIsAuthenticated(true);
          setIsSessionResolved(true);
          navigate('/calendar', { replace: true });
          return;
        }

        setIsAuthenticated(false);
        setIsSessionResolved(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setIsAuthenticated(false);
        setIsSessionResolved(true);
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleInstall = async () => {
    await promptInstall();
  };

  const handleContinue = () => {
    authenticateWithGoogle(selectedMode, undefined, (err) => {
      alert(`${t('errorSyncFailed')}: ${err.message || ''}`);
    });
  };

  if (!isSessionResolved) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_45%,#f8fafc_100%)] px-4 py-8 dark:bg-slate-950 md:px-6 md:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="h-11 w-11 drop-shadow-xl" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">
                {t('calendarSetup')}
              </p>
              <h1
                className="text-xl font-black tracking-tight text-slate-900 dark:text-white"
                style={{ fontFamily: isRtl ? "'Heebo', 'Rubik', sans-serif" : 'inherit' }}
              >
                <span className="text-[#0038A8] dark:text-blue-400">{t('appNameFirst')}</span>
                <span>{t('appNameSecond')}</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canInstall && (
              <button
                onClick={handleInstall}
                className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#0038A8] hover:text-[#0038A8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 md:flex"
              >
                <Download className="h-4 w-4" />
                {t('installApp')}
              </button>
            )}
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex flex-1 items-center py-8 md:py-10">
          <div className="grid w-full gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-xl shadow-slate-200/70 backdrop-blur md:p-8 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-none">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">
                {t('landingEyebrow', { defaultValue: 'Hebrew dates for real life' })}
              </p>
              <h2
                className="mt-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-6xl"
                style={{ fontFamily: isRtl ? "'Heebo', 'Rubik', sans-serif" : 'inherit' }}
              >
                {t('landingHeroTitle', {
                  defaultValue: 'תאריכים עבריים שנשארים מסונכרנים עם היומן שלך',
                })}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 md:text-lg">
                {t('landingHeroBody', {
                  defaultValue: 'HebSync עוזר לנהל ימי הולדת, אזכרות, ימי נישואין ואירועים עבריים חוזרים בלי לחשב כל שנה מחדש. בוחרים יומן, מייבאים או יוצרים אירועים, ומקבלים תצוגה מקדימה לפני שהכול נכתב ליומן.',
                })}
              </p>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {VALUE_PROPS.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.titleKey}
                      className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/85 p-4 dark:border-slate-800 dark:bg-slate-800/60"
                    >
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.accentClassName}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-black tracking-tight text-slate-900 dark:text-white">
                        {t(item.titleKey, { defaultValue: item.defaultTitle[locale] })}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {t(item.descriptionKey, { defaultValue: item.defaultDescription[locale] })}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 rounded-[1.75rem] bg-slate-50 p-5 dark:bg-slate-800/60">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                  {t('landingHowItWorksEyebrow', { defaultValue: 'How it works' })}
                </p>
                <h3 className="mt-3 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                  {t('landingHowItWorksTitle', { defaultValue: 'A short, safe setup and then the calendar becomes the center' })}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {t('landingHowItWorksBody', {
                    defaultValue: 'בפעם הראשונה בוחרים איך HebSync יתחבר ליומנים שלך. משם העבודה השוטפת קורית במסך היומן: צפייה, יצירה, ייבוא, ועדכון אירועים חוזרים במקום אחד.',
                  })}
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-blue-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                      <Sparkles className="h-4 w-4 text-[#0038A8] dark:text-blue-300" />
                      {t('landingChecklistOneTitle', { defaultValue: 'What you can do here' })}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {t('landingChecklistOneBody', {
                        defaultValue: 'להבין איך האפליקציה עובדת, להתקין אותה, ולבחור את מודל הגישה שמתאים לך לפני שמתחילים.',
                      })}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
                      {t('landingChecklistTwoTitle', { defaultValue: 'What happens next' })}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {t('landingChecklistTwoBody', {
                        defaultValue: 'אחרי החיבור הראשוני נכנסים למסך היומן, ושם מנהלים את כל הזרימה היומית בלי צורך לחזור לכאן כל הזמן.',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {isInstalled && (
                <p className="mt-5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                  {t('appInstalled')}
                </p>
              )}

              {canInstall && (
                <button
                  onClick={handleInstall}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition-all hover:border-[#0038A8] hover:text-[#0038A8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 md:hidden"
                >
                  <Download className="h-4 w-4" />
                  {t('installApp')}
                </button>
              )}
            </section>

            <section className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-xl shadow-slate-200/70 backdrop-blur md:p-8 dark:border-slate-800 dark:bg-slate-900/92 dark:shadow-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                    {t('landingConnectEyebrow', { defaultValue: 'Connect once' })}
                  </p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {t('landingConnectTitle', { defaultValue: 'Choose how HebSync should connect to your calendars' })}
                  </h3>
                </div>
                {isAuthenticated && (
                  <button
                    onClick={() => navigate('/calendar')}
                    className="group flex items-center gap-2 rounded-2xl bg-[#0038A8] px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-800"
                  >
                    {t('enterCalendar')}
                    <ArrowLeft className={`h-4 w-4 transition-transform ${isRtl ? 'group-hover:-translate-x-1' : 'rotate-180 group-hover:translate-x-1'}`} />
                  </button>
                )}
              </div>

              {!isAuthenticated && (
                <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t('landingConnectBody', {
                    defaultValue: 'אפשר להתחיל רק עם יומני HebSync, או לחבר גם יומנים קיימים. הגישה לעריכה תתבקש רק כשבאמת צריך לבצע שינוי.',
                  })}
                </p>
              )}

              <div className="mt-6 space-y-4">
                {CONNECT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedMode === option.id;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedMode(option.id)}
                      className={`relative w-full rounded-[1.75rem] border-2 p-5 text-start transition-all ${option.accentClassName} ${
                        isSelected
                          ? 'ring-2 ring-[#0038A8]/15 dark:ring-blue-400/15'
                          : ''
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 className={`absolute top-5 ${isRtl ? 'left-5' : 'right-5'} h-5 w-5 text-[#0038A8] dark:text-blue-300`} />
                      )}
                      <div className="flex gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                          <Icon className={`h-6 w-6 ${option.iconClassName}`} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                              {t(option.titleKey)}
                            </h4>
                            {option.badgeKey && (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                                {t(option.badgeKey)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {t(option.descriptionKey)}
                          </p>
                          {option.helperKey && (
                            <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                              {t(option.helperKey)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/85 px-4 py-3.5 dark:border-slate-700 dark:bg-slate-800/40">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
                    <Info className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {t('howAccessWorks')}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {selectedMode === SCOPE_MODES.APP_CREATED
                        ? t('permissionHebsyncOnlyFooter')
                        : t('permissionAllCalendarsFooter')}
                    </p>
                  </div>
                </div>
              </div>

              {isAuthenticated ? (
                <p className="mt-4 text-sm font-bold text-slate-500 dark:text-slate-400">
                  {t('orSelectOther')}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  onClick={handleContinue}
                  className="rounded-2xl bg-[#0038A8] px-6 py-3.5 text-base font-black text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-800"
                >
                  {t('continue')}
                </button>
              </div>
            </section>
          </div>
        </div>

        <footer className="pb-2 pt-4 text-center text-[11px] font-medium text-slate-400">
          <p>{t('copyright', { year: new Date().getFullYear() })}</p>
          <p className="mt-1">
            {t('thanksTo')}{' '}
            <a
              href="https://github.com/hebcal/hebcal-es6"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#0038A8] hover:underline dark:text-blue-400"
            >
              Hebcal
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
