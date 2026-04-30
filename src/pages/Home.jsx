import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, PlusCircle, ArrowRight, Shield, Unlock, Eye, CheckCircle2 } from 'lucide-react';
import Logo from '../components/Logo';
import { authenticateWithGoogle, getAccessToken } from '../utils/googleApi';

export default function Home() {
  const navigate = useNavigate();

  const handleLogin = (mode) => {
    authenticateWithGoogle(mode, () => {
      navigate('/dashboard');
    }, (err) => {
      alert("שגיאה בהתחברות: " + (err.message || "נסה שנית"));
    });
  };

  const loginOptions = [
    {
      id: 'app_created',
      title: 'פרטיות מקסימלית',
      subtitle: 'מומלץ למשתמשי קצה',
      description: 'ניהול אירועים ביומן ייעודי בלבד. האפליקציה לא רואה את האירועים הפרטיים שלך.',
      icon: <Shield className="w-8 h-8 text-green-500" />,
      color: 'border-green-100 hover:border-green-500 bg-green-50/30'
    },
    {
      id: 'read_only',
      title: 'צפייה בלבד',
      subtitle: 'למעקב וצפייה',
      description: 'הצגת כל האירועים הקיימים ביומנים שלך בלוח השנה העברי, ללא אפשרות עריכה.',
      icon: <Eye className="w-8 h-8 text-purple-500" />,
      color: 'border-purple-100 hover:border-purple-500 bg-purple-50/30'
    },
    {
      id: 'all_events',
      title: 'גישה מלאה',
      subtitle: 'למשתמשים מתקדמים',
      description: 'צפייה ועריכה של אירועים בכל היומנים שלך. מאפשר הוספת אירועים עבריים ליומן הראשי.',
      icon: <Unlock className="w-8 h-8 text-blue-500" />,
      color: 'border-blue-100 hover:border-blue-500 bg-blue-50/30'
    }
  ];

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 w-full">
          {loginOptions.map((opt) => (
            <div 
              key={opt.id}
              onClick={() => handleLogin(opt.id)}
              className={`group cursor-pointer p-6 rounded-3xl border-2 transition-all duration-300 text-right flex flex-col gap-4 dark:bg-slate-800/50 dark:border-slate-700 ${opt.color} hover:shadow-xl hover:-translate-y-1`}
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                  {opt.icon}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {opt.subtitle}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{opt.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {opt.description}
                </p>
              </div>
              <div className="mt-auto pt-4 flex items-center gap-2 text-[#0038A8] dark:text-blue-400 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                התחבר עכשיו <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-12 flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
          {getAccessToken() && (
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-xl font-bold text-lg transition-all shadow-lg w-full sm:w-auto"
            >
              <CalendarDays className="w-5 h-5" />
              חזרה ללוח הבקרה שלי
            </button>
          )}
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
