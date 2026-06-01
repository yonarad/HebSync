import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation, type Location } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Home = lazy(() => import('./pages/Home'));
const MyCalendar = lazy(() => import('./pages/MyCalendar'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const AccessibilityStatement = lazy(() => import('./pages/AccessibilityStatement'));

interface ModalLocationState {
  backgroundLocation?: Location;
}

function AppRoutes() {
  const location = useLocation();
  const backgroundLocation = (location.state as ModalLocationState | null)?.backgroundLocation;

  return (
    <>
      <Suspense fallback={<AppShellFallback />}>
        <Routes location={backgroundLocation || location}>
          <Route path="/" element={<Home />} />
          <Route path="/calendar" element={<MyCalendar />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/accessibility" element={<AccessibilityStatement />} />
        </Routes>
      </Suspense>

      {backgroundLocation ? (
        <Suspense fallback={null}>
          <Routes>
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/accessibility" element={<AccessibilityStatement />} />
          </Routes>
        </Suspense>
      ) : null}
    </>
  );
}

function AppShellFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-300">
      Loading...
    </div>
  );
}

export default function App() {
  const { i18n } = useTranslation();
  const direction = i18n.language === 'he' ? 'rtl' : 'ltr';

  return (
    <div dir={direction} className="h-full min-h-0 font-sans text-slate-900 antialiased">
      <Router>
        <AppRoutes />
      </Router>
    </div>
  );
}
