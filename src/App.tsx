import { BrowserRouter as Router, Route, Routes, useLocation, type Location } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Home from './pages/Home';
import MyCalendar from './pages/MyCalendar';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

interface ModalLocationState {
  backgroundLocation?: Location;
}

function AppRoutes() {
  const location = useLocation();
  const backgroundLocation = (location.state as ModalLocationState | null)?.backgroundLocation;

  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/" element={<Home />} />
        <Route path="/calendar" element={<MyCalendar />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
      </Routes>

      {backgroundLocation ? (
        <Routes>
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
      ) : null}
    </>
  );
}

export default function App() {
  const { i18n } = useTranslation();
  const direction = i18n.language === 'he' ? 'rtl' : 'ltr';

  return (
    <div dir={direction} className="min-h-screen font-sans text-slate-900 antialiased">
      <Router>
        <AppRoutes />
      </Router>
    </div>
  );
}
