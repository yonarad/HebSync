import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, PlusCircle, ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 dark:bg-slate-900 font-sans">
      <div className="max-w-3xl text-center space-y-8 flex flex-col items-center">
        <Logo className="w-24 h-24 mb-4 drop-shadow-xl" />
        
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          היומן העברי שלי <br />
          <span className="text-[#0038A8] dark:text-blue-400">HebCal-Sync</span>
        </h1>
        
        <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-medium">
          סנכרון חכם ופרטי לחלוטין של אירועים עבריים ליומן Google שלך. 
          תצוגת גיל אוטומטית, ניהול מרוכז ומעקב היסטורי מדויק ל-120 שנים קדימה.
        </p>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-[#0038A8] hover:bg-blue-800 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-blue-900/30 w-full sm:w-auto"
          >
            <CalendarDays className="w-5 h-5" />
            צפייה בלוח השנה שלי
          </button>
          
          <button 
            onClick={() => navigate('/add-event')}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-slate-50 text-[#0038A8] border-2 border-slate-200 hover:border-[#0038A8] rounded-xl font-bold text-lg transition-all shadow-sm w-full sm:w-auto dark:bg-slate-800 dark:text-blue-400 dark:border-slate-700 dark:hover:border-blue-500"
          >
            <PlusCircle className="w-5 h-5" />
            הוספת אירוע חדש
          </button>
        </div>

        <div className="pt-16 text-sm text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-center gap-3 font-medium">
          <span className="bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-700 dark:text-slate-300">Privacy-First No-DB</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180 text-slate-400" />
          <span className="bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full text-[#0038A8] dark:text-blue-300">שמירה ישירה ל-Google Calendar</span>
        </div>
      </div>
    </div>
  );
}
