import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface LegalLinksProps {
  className?: string;
  linkClassName?: string;
}

export default function LegalLinks({
  className = '',
  linkClassName = '',
}: LegalLinksProps) {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';
  const location = useLocation();
  const locationState = location.state as
    | { backgroundLocation?: typeof location; returnTo?: string }
    | undefined;
  const backgroundLocation = locationState?.backgroundLocation || location;
  const isModal = Boolean(locationState?.backgroundLocation);
  const returnTo = `${backgroundLocation.pathname}${backgroundLocation.search}${backgroundLocation.hash}`;
  const linkState = {
    backgroundLocation,
    returnTo,
  };

  return (
    <div className={className}>
      <Link
        to="/privacy"
        state={linkState}
        replace={isModal}
        className={linkClassName}
      >
        {isHebrew ? '\u05e4\u05e8\u05d8\u05d9\u05d5\u05ea' : 'Privacy'}
      </Link>
      <span className="text-slate-300 dark:text-slate-600">|</span>
      <Link
        to="/terms"
        state={linkState}
        replace={isModal}
        className={linkClassName}
      >
        {isHebrew ? '\u05ea\u05e0\u05d0\u05d9 \u05e9\u05d9\u05de\u05d5\u05e9' : 'Terms'}
      </Link>
      <span className="text-slate-300 dark:text-slate-600">|</span>
      <Link
        to="/accessibility"
        state={linkState}
        replace={isModal}
        className={linkClassName}
      >
        {isHebrew ? '\u05e0\u05d2\u05d9\u05e9\u05d5\u05ea' : 'Accessibility'}
      </Link>
    </div>
  );
}
