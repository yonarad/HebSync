import LegalPageLayout from '../components/LegalPageLayout';
import { LEGAL_DETAILS, hasPlaceholderLegalDetails } from '../config/legal';
import { useTranslation } from 'react-i18next';

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-[15px]">
        {children}
      </div>
    </section>
  );
}

function List({ items }) {
  return (
    <ul className="list-disc space-y-2 ps-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function TermsOfService() {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';
  const placeholderWarning = hasPlaceholderLegalDetails();

  const content = isHebrew
    ? {
        title: 'תנאי שימוש',
        subtitle:
          'תנאים אלה מסדירים את השימוש ב-HebSync, את אופן החיבור ל-Google Calendar, ואת האחריות של המשתמש בעת יצירה, עדכון וייבוא של אירועים.',
        warning:
          'לפני פרסום ציבורי ואימות מול Google כדאי להשלים כאן את שם המפעיל ופרטי הקשר האמיתיים.',
        sections: [
          {
            title: 'קבלת התנאים',
            body: [
              `השימוש ב-HebSync כפוף לתנאים אלה. אם אינך מסכים להם, אין להשתמש בשירות. השירות מופעל על ידי ${LEGAL_DETAILS.operatorName}.`,
            ],
          },
          {
            title: 'מה השירות עושה',
            body: [
              'HebSync נועד לעזור לנהל אירועים עבריים חוזרים, ליצור יומנים ייעודיים, להציג יומנים קיימים, ולייבא אירועים מתוך קבצי Excel בהתאם להרשאות שהמשתמש בוחר לתת.',
            ],
          },
          {
            title: 'חיבור לחשבון Google',
            body: [
              'כדי להשתמש ברוב יכולות השירות צריך לחבר חשבון Google. המשתמש מאשר את ההרשאות דרך Google, ויכול לנתק את השירות בכל עת מתוך האפליקציה או דרך הגדרות חשבון Google.',
              'המשתמש אחראי לוודא שיש לו סמכות להשתמש ביומנים שאליהם הוא מחבר את HebSync.',
            ],
          },
          {
            title: 'שימוש מותר',
            list: [
              'להשתמש בשירות לצרכים אישיים, ארגוניים או קהילתיים לגיטימיים.',
              'לבדוק תצוגה מקדימה לפני ייבוא או יצירה של אירועים.',
              'להימנע מהעלאת תוכן בלתי חוקי, פוגעני או כזה שמפר זכויות של אחרים.',
              'לא לנסות לעקוף את מנגנוני האבטחה או להשתמש בשירות באופן שפוגע בזמינותו לאחרים.',
            ],
          },
          {
            title: 'אחריות המשתמש לנתונים וליומנים',
            body: [
              'המשתמש אחראי לבדוק את הדיוק של נתוני האירועים, של קבצי הייבוא, ושל היומנים שנבחרו כיעד.',
              'לפני יצירה, עדכון או מחיקה של אירועים ביומנים קיימים, מומלץ לוודא שהתוצאה הצפויה נכונה ושאין פגיעה בנתונים אחרים.',
            ],
          },
          {
            title: 'זמינות ושינויים',
            body: [
              'HebSync עשוי להשתנות, להשתפר, או לכלול שינויי UI, הרשאות ותהליכי עבודה. ייתכנו השבתות, תקלות, או שינויים עקב מגבלות של Google או ספקי תשתית.',
            ],
          },
          {
            title: 'ביטול, ניתוק ומחיקה',
            body: [
              `אפשר להפסיק להשתמש בשירות בכל עת. שאלות על מחיקת מידע או מחיקת רשומות חשבון אפשר לשלוח ל-${LEGAL_DETAILS.privacyEmail}.`,
              'ניתוק מתוך האפליקציה מבטל גישה ל-Google ומסיים את ה-session הפעיל. מחיקה מלאה מתוך האפליקציה מוחקת גם את רשומת החיבור השמורה של HebSync.',
            ],
          },
          {
            title: 'היעדר אחריות מלאה',
            body: [
              'השירות ניתן כפי שהוא, במידה המותרת לפי הדין החל. אף מערכת סנכרון אינה חסינה משגיאות, ולכן מומלץ לבדוק ייבוא, יצירה ועדכון של אירועים לפני הסתמכות מלאה עליהם.',
            ],
          },
          {
            title: 'יצירת קשר',
            body: [
              `לתמיכה כללית: ${LEGAL_DETAILS.supportEmail}. לפרטיות, מחיקה וזכויות מידע: ${LEGAL_DETAILS.privacyEmail}.`,
            ],
          },
          {
            title: 'תוקף ועדכונים',
            body: [
              `תנאים אלה בתוקף מ-${LEGAL_DETAILS.effectiveDate}. המשך שימוש ב-HebSync לאחר עדכון מהותי של התנאים מהווה הסכמה לנוסח המעודכן.`,
            ],
          },
        ],
      }
    : {
        title: 'Terms of Service',
        subtitle:
          'These terms govern the use of HebSync, the way it connects to Google Calendar, and the responsibilities of users when creating, updating, and importing events.',
        warning:
          'Before public launch or Google verification, complete this page with real operator and contact details.',
        sections: [
          {
            title: 'Acceptance of these terms',
            body: [
              `Use of HebSync is subject to these terms. If you do not agree with them, do not use the service. The service is operated by ${LEGAL_DETAILS.operatorName}.`,
            ],
          },
          {
            title: 'What the service does',
            body: [
              'HebSync helps users manage recurring Hebrew-calendar events, create dedicated calendars, review existing calendars, and import events from Excel files based on the permissions the user chooses to grant.',
            ],
          },
          {
            title: 'Connecting a Google account',
            body: [
              'Most service features require connecting a Google account. Users grant permissions through Google and may disconnect HebSync at any time through the app or through their Google account settings.',
              'Users are responsible for ensuring they have authority to access and manage the calendars they connect to HebSync.',
            ],
          },
          {
            title: 'Permitted use',
            list: [
              'Use the service for legitimate personal, organizational, or community purposes.',
              'Review previews before importing or creating events.',
              'Do not upload unlawful, abusive, or infringing content.',
              'Do not attempt to bypass security controls or use the service in a way that harms availability for others.',
            ],
          },
          {
            title: 'User responsibility for data and calendars',
            body: [
              'Users are responsible for verifying the accuracy of event data, imported files, and selected destination calendars.',
              'Before creating, updating, or deleting events in existing calendars, users should confirm that the expected result is correct and does not harm unrelated data.',
            ],
          },
          {
            title: 'Availability and changes',
            body: [
              'HebSync may evolve over time and may include changes to UI, permissions, workflows, or infrastructure. Downtime, bugs, and provider-dependent limitations may occur.',
            ],
          },
          {
            title: 'Cancellation, disconnect, and deletion',
            body: [
              `Users may stop using the service at any time. Questions about data deletion or account-record deletion can be sent to ${LEGAL_DETAILS.privacyEmail}.`,
              'Disconnecting through the app revokes Google access and ends the active session. Full deletion through the app also removes the saved HebSync connection record.',
            ],
          },
          {
            title: 'No full warranty',
            body: [
              'The service is provided on an as-is basis to the extent permitted by applicable law. No calendar synchronization workflow is error-free, so users should review imports and edits before relying on them completely.',
            ],
          },
          {
            title: 'Contact',
            body: [
              `General support: ${LEGAL_DETAILS.supportEmail}. Privacy, deletion, and data-rights requests: ${LEGAL_DETAILS.privacyEmail}.`,
            ],
          },
          {
            title: 'Effective date and updates',
            body: [
              `These terms are effective as of ${LEGAL_DETAILS.effectiveDate}. Continued use of HebSync after a material update means acceptance of the revised terms.`,
            ],
          },
        ],
      };

  return (
    <LegalPageLayout title={content.title} subtitle={content.subtitle}>
      {placeholderWarning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-200">
          {content.warning}
        </div>
      )}

      {content.sections.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.body?.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {section.list ? <List items={section.list} /> : null}
        </Section>
      ))}
    </LegalPageLayout>
  );
}
