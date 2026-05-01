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
      description: 'ניהול של יומני האפליקציה הזו בלבד. האפליקציה לא תוכל לגשת לאירועים ביומנים האחרים שלך.',
      icon: <Shield className="w-8 h-8 text-green-500" />,
      color: 'border-green-100 hover:border-green-500 bg-green-50/30'
    },
    {
      id: 'read_only',
      title: 'צפייה בלבד',
      description: 'הצגת כל האירועים הקיימים ביומנים שלך בתצוגת לוח שנה עברי, ללא אפשרות עריכה.',
      icon: <Eye className="w-8 h-8 text-purple-500" />,
      color: 'border-purple-100 hover:border-purple-500 bg-purple-50/30'
    },
    {
      id: 'all_events',
      title: 'גישה מלאה',
      description: 'צפייה ועריכה של אירועים בכל היומנים שלך. מאפשר הוספת אירועים עבריים לכל יומני המשתמש.',
      icon: <Unlock className="w-8 h-8 text-blue-500" />,
      color: 'border-blue-100 hover:border-blue-500 bg-blue-50/30'
    }
  ];

  return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center p-6 dark:bg-slate-900 font-sans overflow-hidden">
      <div className="max-w-4xl w-full text-center space-y-4 flex flex-col items-center">
        <Logo className="w-20 h-20 mb-2 drop-shadow-xl" />
        
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          היומן העברי שלי <br />
          <span className="text-[#0038A8] dark:text-blue-400">HebCal-Sync</span>
        </h1>
        
        <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-medium">
          סנכרון חכם ופרטי של אירועים עבריים ליומן Google שלך.
        </p>

        <div className="pt-2 text-slate-800 dark:text-slate-200 font-bold text-lg">
          בחר את רמת הגישה המתאימה לך:
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 w-full">
          {loginOptions.map((opt) => (
            <div 
              key={opt.id}
              onClick={() => handleLogin(opt.id)}
              className={`group cursor-pointer p-6 rounded-[2.5rem] border-2 transition-all duration-300 text-right flex flex-col gap-4 dark:bg-slate-800/50 dark:border-slate-700 ${opt.color} hover:shadow-2xl hover:-translate-y-1`}
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                  {opt.icon}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{opt.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {opt.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-500">
          <span className="bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm">Privacy-First Architecture</span>
          <span className="bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm">No Database</span>
          <span className="bg-[#0038A8]/10 text-[#0038A8] dark:bg-blue-900/30 dark:text-blue-300 px-4 py-2 rounded-full">Google OAuth</span>
        </div>
      </div>
      
      <footer className="mt-8 py-4 text-slate-400 text-[10px] font-medium flex flex-col items-center gap-1">
        <p>היומן העברי שלי © {new Date().getFullYear()}</p>
        <p className="flex items-center gap-1">
          תודה לקהילת הקוד הפתוח ולספריית <a href="https://github.com/hebcal/hebcal-es6" target="_blank" rel="noopener noreferrer" className="text-[#0038A8] dark:text-blue-400 hover:underline">Hebcal</a> על המנוע החישובי
        </p>
      </footer>
    </div>
  );
}
