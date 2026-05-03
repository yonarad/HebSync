import React, { useEffect, useState } from 'react';
import { X, Shield, Unlock, Eye, CheckCircle2, AlertTriangle } from 'lucide-react';

export const SCOPE_MODES = {
  APP_CREATED: 'app_created',
  ALL_EVENTS: 'all_events',
  READ_ONLY: 'read_only'
};

const OPTIONS = [
  {
    id: SCOPE_MODES.APP_CREATED,
    title: 'פרטיות מקסימלית',
    description: 'ניהול רק יומנים שנוצרו על ידי האפליקציה. האפליקציה לא תקבל גישה לשאר היומנים שלך.',
    icon: <Shield className="w-6 h-6 text-green-500" />
  },
  {
    id: SCOPE_MODES.READ_ONLY,
    title: 'צפייה בלבד',
    description: 'הצגת כל האירועים הקיימים ביומנים שלך בלי אפשרות לערוך אותם.',
    icon: <Eye className="w-6 h-6 text-purple-500" />
  },
  {
    id: SCOPE_MODES.ALL_EVENTS,
    title: 'גישה מלאה',
    description: 'צפייה ועריכה של אירועים בכל היומנים שלך, כולל יצירת אירועים עבריים.',
    icon: <Unlock className="w-6 h-6 text-blue-500" />
  }
];

export default function LoginModal({ isOpen, onClose, onSelect, mode = 'connect' }) {
  const [selectedMode, setSelectedMode] = useState(SCOPE_MODES.APP_CREATED);

  useEffect(() => {
    if (isOpen) {
      setSelectedMode(SCOPE_MODES.APP_CREATED);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isReauth = mode === 'reauthorize';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {isReauth && (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              {isReauth ? 'נדרש חיבור מחדש לגוגל' : 'בחר רמת הרשאה'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className={`text-sm mb-4 leading-relaxed ${isReauth ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-400'}`}>
            {isReauth
              ? 'תוקף ההתחברות או ההרשאות שלך פג. כדי להמשיך להשתמש באפליקציה צריך להתחבר מחדש ולאשר הרשאות שוב.'
              : 'כדי להתחבר לגוגל, בחר איזה סוג גישה תרצה לתת לאפליקציה:'}
          </p>

          <div className="space-y-3">
            {OPTIONS.map((option) => (
              <div
                key={option.id}
                onClick={() => setSelectedMode(option.id)}
                className={`cursor-pointer border-2 rounded-2xl p-4 transition-all relative ${
                  selectedMode === option.id
                    ? 'border-[#0038A8] bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-500 shadow-sm'
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50'
                }`}
              >
                {selectedMode === option.id && (
                  <div className="absolute top-4 left-4">
                    <CheckCircle2 className="w-5 h-5 text-[#0038A8] dark:text-blue-400" />
                  </div>
                )}
                <div className="flex gap-4">
                  <div className={`p-2 rounded-xl h-fit ${selectedMode === option.id ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {option.icon}
                  </div>
                  <div>
                    <h3 className={`font-bold ${selectedMode === option.id ? 'text-[#0038A8] dark:text-blue-400' : 'text-slate-800 dark:text-white'}`}>
                      {option.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors dark:text-slate-300 dark:hover:bg-slate-800"
          >
            ביטול
          </button>
          <button
            onClick={() => onSelect(selectedMode)}
            className="px-6 py-2.5 bg-[#0038A8] hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-900/20"
          >
            {isReauth ? 'המשך לחיבור מחדש' : 'המשך להתחברות'}
          </button>
        </div>
      </div>
    </div>
  );
}
