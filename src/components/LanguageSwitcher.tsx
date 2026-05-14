import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';

  const toggleLanguage = (): void => {
    const nextLang = isHebrew ? 'en' : 'he';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs sm:font-bold"
      aria-label={
        isHebrew
          ? 'Switch site language to English'
          : 'Switch site language to Hebrew'
      }
      title={isHebrew ? 'Switch to English' : 'Switch to Hebrew'}
    >
      <Languages className="h-4 w-4" />
      <span className="hidden sm:inline">{isHebrew ? 'EN' : 'עב'}</span>
    </button>
  );
}
