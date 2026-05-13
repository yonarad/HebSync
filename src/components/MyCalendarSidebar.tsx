import type { Dispatch, SetStateAction } from 'react';
import LegalLinks from './LegalLinks';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  PencilLine,
  RefreshCw,
  Shield,
  X,
} from 'lucide-react';
import type { Calendar } from '../types/appTypes';

interface CalendarGroupProps {
  title: string;
  groupKey: 'hebsync' | 'other';
  groupCalendars: Calendar[];
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  isRtl: boolean;
  selectedCalendarIds: string[];
  selectedCountSuffix: string;
  selectCalendarsByIds: (calendarIds: string[]) => void;
  deselectCalendarsByIds: (calendarIds: string[]) => void;
  toggleCalendar: (calendarId: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function CalendarGroup({
  title,
  groupKey,
  groupCalendars,
  isOpen,
  setIsOpen,
  isRtl,
  selectedCalendarIds,
  selectedCountSuffix,
  selectCalendarsByIds,
  deselectCalendarsByIds,
  toggleCalendar,
  t,
}: CalendarGroupProps) {
  if (groupCalendars.length === 0) return null;

  const selectedCount = groupCalendars.filter((calendar) =>
    selectedCalendarIds.includes(calendar.id),
  ).length;
  const isHebSyncGroup = groupKey === 'hebsync';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex min-w-0 flex-1 items-center gap-2 text-right"
        >
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${isHebSyncGroup ? 'bg-blue-50 text-[#0038A8] dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : isRtl ? (
              <ChevronLeft className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {title}
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500">
              {selectedCount} / {groupCalendars.length} {selectedCountSuffix}
            </div>
          </div>
        </button>
        <div className="flex shrink-0 items-center gap-2 text-[10px] font-bold">
          <button
            type="button"
            onClick={() =>
              selectCalendarsByIds(groupCalendars.map((calendar) => calendar.id))
            }
            className="text-slate-500 transition-colors hover:text-[#0038A8]"
          >
            {t('selectAll')}
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={() =>
              deselectCalendarsByIds(groupCalendars.map((calendar) => calendar.id))
            }
            className="text-slate-500 transition-colors hover:text-[#0038A8]"
          >
            {t('clearAll')}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-slate-100 px-2 pb-2 pt-1 dark:border-slate-800">
          <div className="space-y-1">
            {groupCalendars.map((cal) => (
              <label
                key={cal.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg p-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <div
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: cal.color }}
                />
                <input
                  type="checkbox"
                  checked={selectedCalendarIds.includes(cal.id)}
                  onChange={() => toggleCalendar(cal.id)}
                  className="h-3 w-3 rounded border-slate-300 text-[#0038A8]"
                />
                <span className="truncate">{cal.summary}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface MyCalendarSidebarProps {
  isRtl: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: Dispatch<SetStateAction<boolean>>;
  menuLabel: string;
  t: (key: string, options?: Record<string, unknown>) => string;
  handleChangePermissions: () => Promise<void> | void;
  handleDisableEditing: () => Promise<void> | void;
  isAllCalendarsMode: boolean;
  hasWriteAccess: boolean;
  promptForEditingUpgrade: () => void;
  calendars: Calendar[];
  isFetchingGoogle: boolean;
  refreshCalendarsLabel: string;
  handleRefreshCalendars: () => void;
  handleCreateCalendar: () => Promise<void> | void;
  allCalendarsGroupLabel: string;
  selectAllCalendars: () => void;
  deselectAllCalendars: () => void;
  hebSyncGroupLabel: string;
  otherCalendarsGroupLabel: string;
  hebSyncCalendars: Calendar[];
  otherCalendars: Calendar[];
  isHebSyncGroupOpen: boolean;
  setIsHebSyncGroupOpen: Dispatch<SetStateAction<boolean>>;
  isOtherGroupOpen: boolean;
  setIsOtherGroupOpen: Dispatch<SetStateAction<boolean>>;
  noCalendarsAvailableLabel: string;
  selectedCalendarIds: string[];
  selectedCountSuffix: string;
  selectCalendarsByIds: (calendarIds: string[]) => void;
  deselectCalendarsByIds: (calendarIds: string[]) => void;
  toggleCalendar: (calendarId: string) => void;
  handleOpenLanding: () => void;
}

export default function MyCalendarSidebar({
  isRtl,
  isSidebarOpen,
  setIsSidebarOpen,
  menuLabel,
  t,
  handleChangePermissions,
  handleDisableEditing,
  isAllCalendarsMode,
  hasWriteAccess,
  promptForEditingUpgrade,
  calendars,
  isFetchingGoogle,
  refreshCalendarsLabel,
  handleRefreshCalendars,
  handleCreateCalendar,
  allCalendarsGroupLabel,
  selectAllCalendars,
  deselectAllCalendars,
  hebSyncGroupLabel,
  otherCalendarsGroupLabel,
  hebSyncCalendars,
  otherCalendars,
  isHebSyncGroupOpen,
  setIsHebSyncGroupOpen,
  isOtherGroupOpen,
  setIsOtherGroupOpen,
  noCalendarsAvailableLabel,
  selectedCalendarIds,
  selectedCountSuffix,
  selectCalendarsByIds,
  deselectCalendarsByIds,
  toggleCalendar,
  handleOpenLanding,
}: MyCalendarSidebarProps) {
  return (
    <>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={menuLabel}
        className={`fixed inset-y-0 ${isRtl ? 'right-0 border-l' : 'left-0 border-r'} z-40 flex h-full min-h-0 w-72 flex-col border-slate-200 bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between border-b p-4 dark:border-slate-800 md:hidden">
          <span className="font-bold dark:text-white">{menuLabel}</span>
          <button
            type="button"
            aria-label={t('close')}
            onClick={() => setIsSidebarOpen(false)}
            className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5 dark:text-slate-400" />
          </button>
        </div>
        <div className="flex flex-1 flex-col space-y-6 overflow-hidden p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>{t('calendarAccess')}</span>
              <button
                type="button"
                onClick={handleChangePermissions}
                className="text-[#0038A8] underline dark:text-blue-400"
              >
                {isAllCalendarsMode
                  ? t('switchToHebsyncOnly')
                  : t('switchToAllCalendars')}
              </button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/70">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                {isAllCalendarsMode ? (
                  <>
                    <Eye className="h-3 w-3 text-blue-500" />{' '}
                    {t('permissionAllCalendars')}
                  </>
                ) : (
                  <>
                    <Shield className="h-3 w-3 text-emerald-500" />{' '}
                    {t('permissionHebsyncOnly')}
                  </>
                )}
              </div>
              <div className={`mt-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                  {isAllCalendarsMode
                    ? hasWriteAccess
                      ? t('editingEnabledStatus')
                      : t('viewingOnlyStatus')
                    : t('hebSyncOnlyStatus')}
                  {isAllCalendarsMode &&
                    (hasWriteAccess ? (
                      <button
                        type="button"
                        onClick={handleDisableEditing}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Eye className="h-3 w-3" />
                        {t('disableEditing')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={promptForEditingUpgrade}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0038A8] transition-colors hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
                      >
                        <PencilLine className="h-3 w-3" />
                        {t('enableEditing')}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="flex min-w-0 items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                    <CalendarIcon className="h-4 w-4 text-[#0038A8]" />{' '}
                    {t('myCalendars')}
                  </h2>
                  <button
                    type="button"
                    onClick={handleRefreshCalendars}
                    disabled={!calendars.length && isFetchingGoogle}
                    aria-label={refreshCalendarsLabel}
                    title={refreshCalendarsLabel}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                      isFetchingGoogle
                        ? 'cursor-wait border-blue-100 bg-blue-50 text-[#0038A8] dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-[#0038A8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-900/30 dark:hover:bg-blue-900/20 dark:hover:text-blue-300'
                    }`}
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isFetchingGoogle ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreateCalendar}
                    className="shrink-0 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-[#0038A8] dark:bg-blue-900/30 dark:text-blue-300"
                  >
                    + {t('new')}
                  </button>
                </div>
              </div>
            </div>

            {calendars.length > 0 && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-bold dark:bg-slate-800/70">
                <span className="text-slate-400 dark:text-slate-500">
                  {allCalendarsGroupLabel}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllCalendars}
                    className="text-slate-500 transition-colors hover:text-[#0038A8]"
                  >
                    {t('selectAll')}
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAllCalendars}
                    className="text-slate-500 transition-colors hover:text-[#0038A8]"
                  >
                    {t('clearAll')}
                  </button>
                </div>
              </div>
            )}

            <div className="custom-scrollbar flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto pr-1">
              <CalendarGroup
                title={hebSyncGroupLabel}
                groupKey="hebsync"
                groupCalendars={hebSyncCalendars}
                isOpen={isHebSyncGroupOpen}
                setIsOpen={setIsHebSyncGroupOpen}
                isRtl={isRtl}
                selectedCalendarIds={selectedCalendarIds}
                selectedCountSuffix={selectedCountSuffix}
                selectCalendarsByIds={selectCalendarsByIds}
                deselectCalendarsByIds={deselectCalendarsByIds}
                toggleCalendar={toggleCalendar}
                t={t}
              />
              <CalendarGroup
                title={otherCalendarsGroupLabel}
                groupKey="other"
                groupCalendars={otherCalendars}
                isOpen={isOtherGroupOpen}
                setIsOpen={setIsOtherGroupOpen}
                isRtl={isRtl}
                selectedCalendarIds={selectedCalendarIds}
                selectedCountSuffix={selectedCountSuffix}
                selectCalendarsByIds={selectCalendarsByIds}
                deselectCalendarsByIds={deselectCalendarsByIds}
                toggleCalendar={toggleCalendar}
                t={t}
              />
              {calendars.length === 0 && !isFetchingGoogle && (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                  {noCalendarsAvailableLabel}
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto space-y-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="rounded-xl bg-blue-50/20 px-3 py-2.5 dark:bg-blue-900/10">
              <button
                type="button"
                onClick={handleOpenLanding}
                className="flex w-full items-center gap-2 rounded-lg text-start text-blue-700 transition-colors hover:text-[#0038A8] dark:text-blue-300 dark:hover:text-blue-200"
              >
                <Info className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <div>
                  <p className="text-[10px] font-bold">
                    {t('aboutHebSync', {
                      defaultValue: '\u05d0\u05d5\u05d3\u05d5\u05ea HebSync',
                    })}
                  </p>
                  <p className="text-[9px] leading-3 opacity-80">
                    {t('aboutHebSyncHint', {
                      defaultValue:
                        '\u05d4\u05e1\u05d1\u05e8 \u05e2\u05dc \u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4, \u05d0\u05d5\u05e4\u05df \u05d4\u05e2\u05d1\u05d5\u05d3\u05d4 \u05d5\u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05d4\u05d7\u05d9\u05d1\u05d5\u05e8 \u05d4\u05e8\u05d0\u05e9\u05d5\u05e0\u05d9\u05d5\u05ea.',
                    })}
                  </p>
                </div>
              </button>
            </div>
            <div className="text-[9px] font-medium leading-tight text-slate-400">
              {t('thanksTo')}{' '}
              <a
                href="https://github.com/hebcal/hebcal-es6"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0038A8] hover:underline dark:text-blue-400"
              >
                Hebcal
              </a>
              .
            </div>
            <LegalLinks
              className="flex items-center gap-2 text-[10px]"
              linkClassName="font-bold text-[#0038A8] hover:underline dark:text-blue-400"
            />
          </div>
        </div>
      </aside>

      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm md:hidden"
          aria-label={t('close')}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
}
