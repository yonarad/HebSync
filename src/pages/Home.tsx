import { useEffect, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import LegalLinks from '../components/LegalLinks';
import Logo from '../components/Logo';
import useInstallPrompt from '../hooks/useInstallPrompt';
import {
  authenticateWithGoogle,
  fetchSession,
  getAccessToken,
  SCOPE_MODES,
  usesAllCalendarsMode,
} from '../utils/googleApi';
import type { ScopeMode } from '../types/appTypes';

interface ConnectOption {
  id: ScopeMode;
  titleKey: string;
  descriptionKey: string;
  helperKey?: string;
  badgeKey?: string;
  icon: LucideIcon;
  accentClassName: string;
  iconClassName: string;
}

const CONNECT_OPTIONS: ConnectOption[] = [
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

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAccessToken()));
  const [isSessionResolved, setIsSessionResolved] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ScopeMode>(SCOPE_MODES.APP_CREATED);
  const [activeMode, setActiveMode] = useState<ScopeMode | null>(null);
  const [connectErrorMessage, setConnectErrorMessage] = useState<string | null>(null);
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const isRtl = i18n.language === 'he';
  const searchParams = new URLSearchParams(location.search);
  const isAboutView = searchParams.get('about') === '1';
  const authError = searchParams.get('authError');
  const authErrorDetail = searchParams.get('authErrorDetail');
  const activeOptionId = activeMode
    ? usesAllCalendarsMode(activeMode)
      ? SCOPE_MODES.READ_ONLY
      : SCOPE_MODES.APP_CREATED
    : null;
  const authErrorMessage = (() => {
    if (!authError) return null;
    if (authError === 'invalid_auth_state') return t('authErrorInvalidState');
    if (authError === 'google_oauth_error') {
      return authErrorDetail === 'access_denied'
        ? t('authErrorAccessDenied')
        : t('authErrorGoogleOauth');
    }
    if (authError === 'authentication_failed') return t('authErrorAuthenticationFailed');
    return t('authErrorGeneric');
  })();

  useEffect(() => {
    let isMounted = true;

    fetchSession()
      .then((session) => {
        if (!isMounted) return;

        if (session && !isAboutView) {
          setIsAuthenticated(true);
          setActiveMode(session.scopeMode || null);
          setIsSessionResolved(true);
          navigate('/calendar', { replace: true });
          return;
        }

        setIsAuthenticated(Boolean(session));
        setActiveMode(session?.scopeMode || null);
        if (session?.scopeMode) {
          setSelectedMode(
            usesAllCalendarsMode(session.scopeMode) ? SCOPE_MODES.READ_ONLY : SCOPE_MODES.APP_CREATED,
          );
        }
        setIsSessionResolved(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setIsAuthenticated(false);
        setActiveMode(null);
        setIsSessionResolved(true);
      });

    return () => {
      isMounted = false;
    };
  }, [isAboutView, navigate]);

  const handleInstall = async () => {
    await promptInstall();
  };

  const activateOnKeyboard = (
    event: KeyboardEvent<HTMLElement>,
    action: () => void,
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
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
            <div className="pt-0.5">
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
              <h2
                className="mt-4 text-4xl font-black tracking-tight text-slate-900 dark:text-white md:text-6xl"
                style={{ fontFamily: isRtl ? "'Heebo', 'Rubik', sans-serif" : 'inherit' }}
              >
                {t('landingHeroTitle', {
                  defaultValue: '\u05ea\u05d0\u05e8\u05d9\u05db\u05d9\u05dd \u05e2\u05d1\u05e8\u05d9\u05d9\u05dd \u05d7\u05d5\u05d6\u05e8\u05d9\u05dd \u05d1\u05d9\u05d5\u05de\u05df \u05d2\u05d5\u05d2\u05dc, \u05d1\u05dc\u05d9 \u05dc\u05d7\u05e9\u05d1 \u05db\u05dc \u05e9\u05e0\u05d4 \u05de\u05d7\u05d3\u05e9',
                })}
              </h2>
              <ul className="mt-5 max-w-3xl space-y-3 text-base leading-7 text-slate-600 dark:text-slate-300 md:text-lg">
                {[
                  t('landingHeroPointOne', {
                    defaultValue:
                      'HebSync \u05e2\u05d5\u05d6\u05e8 \u05dc\u05da \u05dc\u05d4\u05d5\u05e1\u05d9\u05e3 \u05d5\u05dc\u05e0\u05d4\u05dc \u05d9\u05de\u05d9 \u05d4\u05d5\u05dc\u05d3\u05ea, \u05d9\u05de\u05d9 \u05e0\u05d9\u05e9\u05d5\u05d0\u05d9\u05df, \u05d9\u05de\u05d9 \u05d6\u05d9\u05db\u05e8\u05d5\u05df \u05d5\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05dc\u05e4\u05d9 \u05ea\u05d0\u05e8\u05d9\u05da \u05e2\u05d1\u05e8\u05d9.',
                  }),
                  t('landingHeroPointTwo', {
                    defaultValue: '\u05d0\u05e4\u05e9\u05e8 \u05dc\u05d4\u05d5\u05e1\u05d9\u05e3 \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05d9\u05d3\u05e0\u05d9\u05ea \u05d0\u05d5 \u05dc\u05d9\u05d9\u05d1\u05d0 \u05d0\u05d5\u05ea\u05dd \u05d1\u05de\u05e8\u05d5\u05db\u05d6 \u05de\u05e7\u05d5\u05d1\u05e5 \u05d0\u05e7\u05e1\u05dc.',
                  }),
                  t('landingHeroPointThree', {
                    defaultValue: '\u05d1\u05e0\u05d5\u05e1\u05e3 \u05dc\u05ea\u05d0\u05e8\u05d9\u05da \u05e2\u05e6\u05de\u05d5, \u05d0\u05e4\u05e9\u05e8 \u05dc\u05e8\u05d0\u05d5\u05ea \u05d1\u05ea\u05e6\u05d5\u05d2\u05d4 \u05d2\u05dd \u05d0\u05ea \u05d2\u05d9\u05dc \u05d4\u05d0\u05d9\u05e8\u05d5\u05e2.',
                  }),
                  t('landingHeroPointFour', {
                    defaultValue:
                      '\u05d0\u05e4\u05e9\u05e8 \u05dc\u05e2\u05d1\u05d5\u05d3 \u05e2\u05dd \u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05d9\u05d9\u05e2\u05d5\u05d3\u05d9\u05d9\u05dd \u05e9\u05dc HebSync \u05d1\u05dc\u05d1\u05d3, \u05d0\u05d5 \u05dc\u05d7\u05d1\u05e8 \u05d2\u05dd \u05d0\u05ea \u05d4\u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05d4\u05e7\u05d9\u05d9\u05de\u05d9\u05dd \u05e9\u05dc\u05da.',
                  }),
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#0038A8] dark:bg-blue-400" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

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
                  <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {t('landingConnectTitle', {
                      defaultValue: 'Choose how HebSync should connect to your calendars',
                    })}
                  </h3>
                </div>
              </div>

              {authErrorMessage ? (
                <div role="alert" aria-live="assertive" className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50/90 px-4 py-3.5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/80 text-amber-700 shadow-sm dark:bg-slate-900/70 dark:text-amber-300">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-black">{t('authErrorTitle')}</p>
                      <p className="mt-1 text-sm leading-6">{authErrorMessage}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              {connectErrorMessage ? (
                <div role="alert" aria-live="assertive" className="mt-5 rounded-[1.5rem] border border-rose-200 bg-rose-50/90 px-4 py-3.5 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-100">
                  <p className="text-sm font-bold">{connectErrorMessage}</p>
                </div>
              ) : null}

              {!isAuthenticated && (
                <p className="mt-4 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t('landingConnectBody', {
                    defaultValue:
                      '\u05d0\u05e4\u05e9\u05e8 \u05dc\u05d4\u05ea\u05d7\u05d9\u05dc \u05e8\u05e7 \u05e2\u05dd \u05d9\u05d5\u05de\u05e0\u05d9 HebSync, \u05d0\u05d5 \u05dc\u05d7\u05d1\u05e8 \u05d2\u05dd \u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05e7\u05d9\u05d9\u05de\u05d9\u05dd. \u05d4\u05d2\u05d9\u05e9\u05d4 \u05dc\u05e2\u05e8\u05d9\u05db\u05d4 \u05ea\u05ea\u05d1\u05e7\u05e9 \u05e8\u05e7 \u05db\u05e9\u05d1\u05d0\u05de\u05ea \u05e6\u05e8\u05d9\u05da \u05dc\u05d1\u05e6\u05e2 \u05e9\u05d9\u05e0\u05d5\u05d9.',
                  })}
                </p>
              )}

              <div className="mt-6 space-y-4" role="radiogroup" aria-label={t('landingConnectTitle')}>
                {CONNECT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedMode === option.id;

                  return (
                    <div
                      key={option.id}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => setSelectedMode(option.id)}
                      onKeyDown={(event) => activateOnKeyboard(event, () => setSelectedMode(option.id))}
                      className={`relative w-full cursor-pointer rounded-[1.75rem] border-2 p-5 text-start transition-all ${option.accentClassName} ${
                        isSelected
                          ? 'shadow-[0_20px_45px_-30px_rgba(0,56,168,0.45)] ring-2 ring-[#0038A8]/20 dark:ring-blue-400/20'
                          : 'hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-34px_rgba(15,23,42,0.35)]'
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2
                          className={`absolute top-5 ${isRtl ? 'left-5' : 'right-5'} h-5 w-5 text-[#0038A8] dark:text-blue-300`}
                        />
                      )}
                      <div className="flex w-full gap-4 text-start">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                          <Icon className={`h-6 w-6 ${option.iconClassName}`} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                              {t(option.titleKey)}
                            </h4>
                            {isAuthenticated && activeOptionId === option.id && (
                              <span className="rounded-full bg-[#0038A8]/10 px-2.5 py-1 text-[11px] font-black text-[#0038A8] dark:bg-blue-900/30 dark:text-blue-300">
                                {t('activeConnectionMethod', {
                                  defaultValue: '\u05e9\u05d9\u05d8\u05ea \u05d4\u05d7\u05d9\u05d1\u05d5\u05e8 \u05d4\u05e4\u05e2\u05d9\u05dc\u05d4',
                                })}
                              </span>
                            )}
                            {!isSelected && (
                              <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-slate-400 ring-1 ring-slate-200 dark:bg-slate-900/70 dark:text-slate-500 dark:ring-slate-700">
                                {t('tapToSelect', { defaultValue: '\u05d4\u05e7\u05e9 \u05dc\u05d1\u05d7\u05d9\u05e8\u05d4' })}
                              </span>
                            )}
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
                      <div className="pt-4">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedMode(option.id);
                            setConnectErrorMessage(null);
                            if (isAuthenticated && activeOptionId === option.id) {
                              navigate('/calendar');
                              return;
                            }
                            authenticateWithGoogle(option.id, undefined, (err: Error) => {
                              setConnectErrorMessage(`${t('errorSyncFailed')}: ${err.message || ''}`);
                            });
                          }}
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition-all ${
                            isAuthenticated && activeOptionId === option.id
                              ? 'bg-[#0038A8] text-white shadow-lg shadow-blue-900/20 hover:bg-blue-800'
                              : 'bg-white text-[#0038A8] shadow-sm ring-1 ring-[#0038A8]/20 hover:bg-blue-50 dark:bg-slate-900'
                          }`}
                        >
                          {isAuthenticated && activeOptionId === option.id
                            ? t('enterCalendar')
                            : isAuthenticated
                              ? t('connectUsingThisMethod', {
                                  defaultValue: '\u05d4\u05ea\u05d7\u05d1\u05e8 \u05d1\u05d0\u05de\u05e6\u05e2\u05d5\u05ea \u05d4\u05e9\u05d9\u05d8\u05d4 \u05d4\u05d6\u05d5',
                                })
                              : t('continue')}
                          <ArrowLeft className={`h-4 w-4 ${isRtl ? '' : 'rotate-180'}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </section>
          </div>
        </div>

        <footer className="pb-2 pt-4 text-center text-[11px] font-medium text-slate-400">
          <p>{t('copyright', { year: new Date().getFullYear() })}</p>
          <LegalLinks
            className="mt-2 flex items-center justify-center gap-2"
            linkClassName="font-bold text-[#0038A8] hover:underline dark:text-blue-400"
          />
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
            .
          </p>
        </footer>
      </div>
    </div>
  );
}
