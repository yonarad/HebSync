import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MyCalendar from './pages/MyCalendar';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

import { useTranslation } from 'react-i18next';

function App() {
  const { i18n } = useTranslation();
  const direction = i18n.language === 'he' ? 'rtl' : 'ltr';

  return (
    <div dir={direction} className="min-h-screen text-slate-900 font-sans antialiased">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calendar" element={<MyCalendar />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
