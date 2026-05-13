import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = (): void => {
    const nextLang = i18n.language === 'he' ? 'en' : 'he';
    i18n.changeLanguage(nextLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:bg-slate-800"
      title={
        i18n.language === 'he'
          ? 'Switch to English'
          : '\u05e2\u05d1\u05d5\u05e8 \u05dc\u05e2\u05d1\u05e8\u05d9\u05ea'
      }
    >
      <Languages className="w-4 h-4" />
      <span>{i18n.language === 'he' ? 'EN' : '\u05e2\u05d1'}</span>
    </button>
  );
}
