import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function LegalLinks({ className = '', linkClassName = '' }) {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';

  return (
    <div className={className}>
      <Link to="/privacy" className={linkClassName}>
        {isHebrew ? 'פרטיות' : 'Privacy'}
      </Link>
      <span className="text-slate-300 dark:text-slate-600">|</span>
      <Link to="/terms" className={linkClassName}>
        {isHebrew ? 'תנאי שימוש' : 'Terms'}
      </Link>
    </div>
  );
}
