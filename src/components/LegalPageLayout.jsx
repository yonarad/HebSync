import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import LegalLinks from './LegalLinks';

export default function LegalPageLayout({ title, subtitle, children }) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'he';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#eef4ff_45%,#f8fafc_100%)] px-4 py-8 dark:bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_38%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] md:px-6 md:py-10"
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col">
        <div className="flex items-center justify-between gap-4">
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
          <LanguageSwitcher />
        </div>

        <div className="mt-6">
          <Link
            to="/?about=1"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#0038A8] hover:text-[#0038A8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-400 dark:hover:text-blue-300"
          >
            <ChevronLeft className={`h-4 w-4 ${isRtl ? 'rotate-180' : ''}`} />
            {isRtl ? 'חזרה לאודות' : 'Back to About'}
          </Link>
        </div>

        <main className="mt-6 flex-1 rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-xl shadow-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/92 dark:shadow-none md:p-8">
          <header className="border-b border-slate-100 pb-6 dark:border-slate-800">
            <h2
              className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-4xl"
              style={{ fontFamily: isRtl ? "'Heebo', 'Rubik', sans-serif" : 'inherit' }}
            >
              {title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">
              {subtitle}
            </p>
          </header>
          <div className="mt-8 space-y-8">{children}</div>
        </main>

        <footer className="pb-2 pt-4 text-center text-[11px] font-medium text-slate-400">
          <LegalLinks
            className="flex items-center justify-center gap-2"
            linkClassName="font-bold text-[#0038A8] hover:underline dark:text-blue-400"
          />
        </footer>
      </div>
    </div>
  );
}
