import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import MyCalendar from './pages/MyCalendar';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

import { useTranslation } from 'react-i18next';

function AppRoutes() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;

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

function App() {
  const { i18n } = useTranslation();
  const direction = i18n.language === 'he' ? 'rtl' : 'ltr';

  return (
    <div dir={direction} className="min-h-screen text-slate-900 font-sans antialiased">
      <Router>
        <AppRoutes />
      </Router>
    </div>
  );
}

export default App;
