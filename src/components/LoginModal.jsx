import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, Shield, Unlock, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SCOPE_MODES } from '../utils/googleApi';

export { SCOPE_MODES };

const CONNECT_OPTIONS = [
  {
    id: SCOPE_MODES.APP_CREATED,
    titleKey: 'permissionHebsyncOnly',
    descriptionKey: 'permissionHebsyncOnlyDesc',
    icon: Shield,
    iconClassName: 'text-emerald-500',
  },
  {
    id: SCOPE_MODES.READ_ONLY,
    titleKey: 'permissionAllCalendars',
    descriptionKey: 'permissionAllCalendarsDesc',
    helperKey: 'permissionAllCalendarsHelper',
    icon: Eye,
    iconClassName: 'text-blue-500',
  },
];

export default function LoginModal({ isOpen, onClose, onSelect, mode = 'connect' }) {
  const { t, i18n } = useTranslation();
  const [selectedMode, setSelectedMode] = useState(SCOPE_MODES.APP_CREATED);
  const isRtl = i18n.language === 'he';
  const isReauth = mode === 'reauthorize';
  const isUpgrade = mode === 'upgrade';

  useEffect(() => {
    if (isOpen) {
      setSelectedMode(SCOPE_MODES.APP_CREATED);
    }
  }, [isOpen, mode]);

  const title = useMemo(() => {
    if (isUpgrade) return t('permissionUpgradeTitle');
    if (isReauth) return t('permissionReconnectTitle');
    return t('permissionModalTitle');
  }, [isReauth, isUpgrade, t]);

  const description = useMemo(() => {
    if (isUpgrade) return t('permissionUpgradeBody');
    if (isReauth) return t('permissionReconnectBody');
    return t('permissionModalBody');
  }, [isReauth, isUpgrade, t]);

  if (!isOpen) return null;

  const handleContinue = () => {
    onSelect(isUpgrade ? SCOPE_MODES.ALL_EVENTS : selectedMode);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-sm"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div className="flex items-start gap-3">
            {(isReauth || isUpgrade) && (
              <div className={`mt-1 flex h-11 w-11 items-center justify-center rounded-2xl ${isUpgrade ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                <AlertTriangle className="h-5 w-5" />
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                {t('calendarSetup')}
              </p>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                {title}
              </h2>
              <p className={`max-w-2xl text-sm leading-6 ${isUpgrade ? 'text-blue-700 dark:text-blue-200' : isReauth ? 'text-amber-700 dark:text-amber-200' : 'text-slate-600 dark:text-slate-400'}`}>
                {description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isUpgrade ? (
          <div className="px-6 py-6 md:px-8 md:py-8">
            <div className="rounded-[1.75rem] border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 dark:border-blue-800 dark:from-blue-950/40 dark:to-slate-900">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-slate-800">
                  <Unlock className="h-6 w-6 text-blue-500" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {t('permissionUpgradeCardTitle')}
                  </h3>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t('permissionUpgradeCardBody')}
                  </p>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                    {t('permissionUpgradeTrust')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 px-6 py-6 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] md:px-8 md:py-8">
            <section className="rounded-[1.75rem] bg-slate-50 p-6 dark:bg-slate-800/60">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
                {t('howAccessWorks')}
              </p>
              <h3 className="mt-3 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                {t('permissionInfoTitle')}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t('permissionInfoBody')}
              </p>
              <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  {t('permissionInfoTrustTitle')}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t('permissionInfoTrustBody')}
                </p>
              </div>
            </section>

            <section className="space-y-4">
              {CONNECT_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedMode === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedMode(option.id)}
                    className={`relative w-full rounded-[1.75rem] border-2 p-5 text-start transition-all ${
                      isSelected
                        ? 'border-[#0038A8] bg-blue-50 shadow-lg shadow-blue-900/10 dark:border-blue-400 dark:bg-blue-950/30'
                        : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-500 dark:hover:bg-slate-800'
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle2 className={`absolute top-5 ${isRtl ? 'left-5' : 'right-5'} h-5 w-5 text-[#0038A8] dark:text-blue-300`} />
                    )}
                    <div className="flex gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isSelected ? 'bg-white shadow-sm dark:bg-slate-800' : 'bg-slate-100 dark:bg-slate-800'}`}>
                        <Icon className={`h-6 w-6 ${option.iconClassName}`} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className={`text-lg font-black tracking-tight ${isSelected ? 'text-[#0038A8] dark:text-blue-300' : 'text-slate-900 dark:text-white'}`}>
                            {t(option.titleKey)}
                          </h3>
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
            </section>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-end dark:border-slate-800 dark:bg-slate-900/60">
          <button
            onClick={onClose}
            className="rounded-2xl px-5 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleContinue}
            className="rounded-2xl bg-[#0038A8] px-6 py-3 font-black text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-800"
          >
            {isUpgrade ? t('permissionUpgradeCta') : isReauth ? t('permissionReconnectCta') : t('continue')}
          </button>
        </div>
      </div>
    </div>
  );
}
