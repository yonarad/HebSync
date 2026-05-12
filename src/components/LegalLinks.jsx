import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function LegalLinks({ className = '', linkClassName = '' }) {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation || location;
  const isModal = Boolean(location.state?.backgroundLocation);
  const returnTo = `${backgroundLocation.pathname}${backgroundLocation.search}${backgroundLocation.hash}`;
  const linkState = {
    backgroundLocation,
    returnTo,
  };

  return (
    <div className={className}>
      <Link to="/privacy" state={linkState} replace={isModal} className={linkClassName}>
        {isHebrew ? 'פרטיות' : 'Privacy'}
      </Link>
      <span className="text-slate-300 dark:text-slate-600">|</span>
      <Link to="/terms" state={linkState} replace={isModal} className={linkClassName}>
        {isHebrew ? 'תנאי שימוש' : 'Terms'}
      </Link>
    </div>
  );
}
