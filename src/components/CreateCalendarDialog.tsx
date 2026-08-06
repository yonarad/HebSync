import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CalendarPlus, RefreshCw, X } from 'lucide-react';
import type { CreateCalendarFormValues } from '../types/appTypes';

interface CreateCalendarDialogProps {
  isOpen: boolean;
  isRtl: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: CreateCalendarFormValues) => Promise<void> | void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export default function CreateCalendarDialog({
  isOpen,
  isRtl,
  isSubmitting,
  onClose,
  onSubmit,
  t,
}: CreateCalendarDialogProps) {
  const [summary, setSummary] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSummary('');
      return;
    }

    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmedSummary = summary.trim();
  const canSubmit = trimmedSummary.length > 0 && !isSubmitting;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      summary: trimmedSummary,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 px-3 py-4 backdrop-blur-sm md:items-center"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <form
        aria-labelledby="create-calendar-dialog-title"
        className={`w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${
          isRtl ? 'text-right' : 'text-left'
        }`}
        dir={isRtl ? 'rtl' : 'ltr'}
        onSubmit={handleSubmit}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#0038A8] dark:text-blue-300">
              <CalendarPlus className="h-5 w-5" />
              <h2
                id="create-calendar-dialog-title"
                className="text-lg font-bold text-slate-900 dark:text-slate-100"
              >
                {t('createCalendarDialogTitle', {
                  defaultValue: isRtl ? 'יצירת יומן חדש' : 'Create a new calendar',
                })}
              </h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {t('createCalendarDialogSubtitle', {
                defaultValue: isRtl
                  ? 'היומן ייווצר ב-Google Calendar וישויך ל-HebSync.'
                  : 'The calendar will be created in Google Calendar and linked to HebSync.',
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t('close')}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:cursor-wait disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="create-calendar-summary"
              className="text-sm font-bold text-slate-700 dark:text-slate-200"
            >
              {t('calendarNameLabel', {
                defaultValue: isRtl ? 'שם היומן' : 'Calendar name',
              })}
            </label>
            <input
              ref={inputRef}
              id="create-calendar-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-[#0038A8] disabled:cursor-wait disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:disabled:bg-slate-800"
              placeholder={t('calendarNamePlaceholder', {
                defaultValue: isRtl ? 'למשל: ימי הולדת עבריים' : 'For example: Hebrew birthdays',
              })}
            />
          </div>

          {isSubmitting ? (
            <div
              role="status"
              className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100"
            >
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t('creatingCalendar')}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('cancel', { defaultValue: isRtl ? 'ביטול' : 'Cancel' })}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0038A8] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#002d86] disabled:cursor-wait disabled:opacity-60"
          >
            {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? t('creatingCalendar') : t('createCalendarToContinue')}
          </button>
        </div>
      </form>
    </div>
  );
}
