import React, { useState } from 'react';
import { X, Shield, Unlock, Eye, CheckCircle2 } from 'lucide-react';

export const SCOPE_MODES = {
  APP_CREATED: 'app_created',
  ALL_EVENTS: 'all_events',
  READ_ONLY: 'read_only'
};

export default function LoginModal({ isOpen, onClose, onSelect }) {
  const [selectedMode, setSelectedMode] = useState(SCOPE_MODES.APP_CREATED);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onSelect(selectedMode);
  };

  const options = [
    {
      id: SCOPE_MODES.APP_CREATED,
      title: 'מקסימום פרטיות (מומלץ)',
      description: 'האפליקציה תוכל לראות ולערוך אך ורק יומנים שהיא יצרה בעצמה. לא תהיה גישה ליומן האישי שלך.',
      icon: <Shield className="w-6 h-6 text-green-500" />
    },
    {
      id: SCOPE_MODES.ALL_EVENTS,
      title: 'גישה מלאה ליומנים',
      description: 'האפליקציה תוכל לקרוא ולערוך אירועים בכל היומנים שלך (כדי להציג אירועים חיצוניים ולהוסיף ליומן הראשי).',
      icon: <Unlock className="w-6 h-6 text-blue-500" />
    },
    {
      id: SCOPE_MODES.READ_ONLY,
      title: 'צפייה בלבד',
      description: 'האפליקציה תוכל רק לקרוא אירועים כדי להציג אותם בלוח השנה, ללא אפשרות עריכה או הוספה.',
      icon: <Eye className="w-6 h-6 text-purple-500" />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" dir="rtl">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">בחר רמת הרשאה</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            כדי להתחבר לגוגל, אנא בחר איזה סוג גישה תרצה לתת לאפליקציה:
          </p>
          
          <div className="space-y-3">
            {options.map(opt => (
              <div 
                key={opt.id}
                onClick={() => setSelectedMode(opt.id)}
                className={`cursor-pointer border-2 rounded-2xl p-4 transition-all relative ${
                  selectedMode === opt.id 
                    ? 'border-[#0038A8] bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-500 shadow-sm' 
                    : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/50'
                }`}
              >
                {selectedMode === opt.id && (
                  <div className="absolute top-4 left-4">
                    <CheckCircle2 className="w-5 h-5 text-[#0038A8] dark:text-blue-400" />
                  </div>
                )}
                <div className="flex gap-4">
                  <div className={`p-2 rounded-xl h-fit ${selectedMode === opt.id ? 'bg-white dark:bg-slate-800 shadow-sm' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {opt.icon}
                  </div>
                  <div>
                    <h3 className={`font-bold ${selectedMode === opt.id ? 'text-[#0038A8] dark:text-blue-400' : 'text-slate-800 dark:text-white'}`}>
                      {opt.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {opt.description}
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
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-[#0038A8] hover:bg-blue-800 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-900/20"
          >
            המשך להתחברות
          </button>
        </div>
      </div>
    </div>
  );
}
