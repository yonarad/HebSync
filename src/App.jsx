import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MyCalendar from './pages/MyCalendar';
import AddEvent from './pages/AddEvent';

function App() {
  return (
    <div dir="rtl" className="min-h-screen text-slate-900 font-sans antialiased">
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<MyCalendar />} />
          <Route path="/add-event" element={<AddEvent />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
