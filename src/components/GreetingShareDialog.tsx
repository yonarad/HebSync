import { Mail, MessageCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { GreetingEventCategory, GreetingOptions } from '../utils/eventGreeting';
import { buildHebrewGreeting, buildMailGreetingUrl, buildWhatsAppGreetingUrl } from '../utils/eventGreeting';

const GREETING_PREFERENCES_KEY = 'hebsync.greeting-preferences.v1';

interface GreetingShareDialogProps {
  category: GreetingEventCategory;
  isOpen: boolean;
  isRtl: boolean;
  name: string | null;
  onClose: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  years: number | null;
}

function readPreferences(): GreetingOptions {
  try {
    const rawValue = localStorage.getItem(GREETING_PREFERENCES_KEY);
    if (!rawValue) return { includeName: false, includeYears: false };
    const value = JSON.parse(rawValue) as Partial<GreetingOptions>;
    return { includeName: Boolean(value.includeName), includeYears: Boolean(value.includeYears) };
  } catch {
    return { includeName: false, includeYears: false };
  }
}

export default function GreetingShareDialog({
  category,
  isOpen,
  isRtl,
  name,
  onClose,
  t,
  years,
}: GreetingShareDialogProps) {
  const [options, setOptions] = useState<GreetingOptions>(readPreferences);

  useEffect(() => {
    if (isOpen) setOptions(readPreferences());
  }, [isOpen]);

  if (!isOpen) return null;

  const message = buildHebrewGreeting(category, name, years, options);
  const isMemorial = category === 'memorial';
  const savePreferences = (): void => {
    try {
      localStorage.setItem(GREETING_PREFERENCES_KEY, JSON.stringify(options));
    } catch {
      // Sharing remains available when browser storage is unavailable.
    }
  };
  const toggleOption = (key: keyof GreetingOptions): void => {
    setOptions((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <button type="button" className="absolute inset-0" aria-label={t('close')} onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="greeting-share-title" className="relative z-10 w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="greeting-share-title" className="text-xl font-bold text-slate-900 dark:text-white">{t('sendGreeting')}</h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('sendGreetingHint')}</p>
          </div>
          <button type="button" aria-label={t('close')} onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"><X className="h-5 w-5" /></button>
        </div>

        {!isMemorial ? (
          <div className="mt-5 space-y-3">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{t('includeGreetingName')}</span>
              <input type="checkbox" checked={options.includeName} disabled={!name} onChange={() => toggleOption('includeName')} aria-label={t('includeGreetingName')} className="h-5 w-5 accent-[#0038A8] disabled:cursor-not-allowed" />
            </label>
            {!name ? <p className="-mt-1 text-xs text-slate-500 dark:text-slate-400">{t('greetingNameUnavailable')}</p> : null}
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <span className="font-semibold text-slate-800 dark:text-slate-100">{t('includeGreetingYears')}</span>
              <input type="checkbox" checked={options.includeYears} disabled={years === null} onChange={() => toggleOption('includeYears')} aria-label={t('includeGreetingYears')} className="h-5 w-5 accent-[#0038A8] disabled:cursor-not-allowed" />
            </label>
          </div>
        ) : null}

        <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{t('greetingPreview')}</p>
          <p className="mt-2 text-lg font-bold text-[#0038A8] dark:text-blue-300">{message}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <a href={buildWhatsAppGreetingUrl(message)} onClick={savePreferences} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 font-bold text-white transition-colors hover:bg-[#1fb85a]">
            <MessageCircle className="h-5 w-5" /> {t('sendViaWhatsApp')}
          </a>
          <a href={buildMailGreetingUrl(message)} onClick={savePreferences} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0038A8] px-4 py-3 font-bold text-white transition-colors hover:bg-[#002d86]">
            <Mail className="h-5 w-5" /> {t('sendViaEmail')}
          </a>
        </div>
      </section>
    </div>
  );
}
