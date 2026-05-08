import LegalPageLayout from '../components/LegalPageLayout';
import { LEGAL_DETAILS, hasPlaceholderLegalDetails } from '../config/legal';
import { useTranslation } from 'react-i18next';

function Section({ title, children }) {
  return (
    <section>
      <h3 className="text-xl font-black tracking-tight text-slate-900">{title}</h3>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 md:text-[15px]">
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

export default function PrivacyPolicy() {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';
  const placeholderWarning = hasPlaceholderLegalDetails();

  const content = isHebrew
    ? {
        title: 'מדיניות פרטיות',
        subtitle:
          'עמוד זה מסביר איזה מידע HebSync אוסף, איך הוא משתמש בו, אילו הרשאות Google Calendar נדרשות, ואיך אפשר לנתק גישה או לבקש מחיקה.',
        warning:
          'לפני הגשת האפליקציה לאימות של Google צריך להחליף את כתובות הקשר הזמניות בפרטי מפעיל אמיתיים.',
        sections: [
          {
            title: 'מי מפעיל את השירות',
            body: [
              `${LEGAL_DETAILS.operatorName} מפעיל את HebSync.`,
              `לשאלות פרטיות, מחיקה או מימוש זכויות אפשר לפנות ל-${LEGAL_DETAILS.privacyEmail}. לשאלות תמיכה כלליות אפשר לפנות ל-${LEGAL_DETAILS.supportEmail}.`,
            ],
          },
          {
            title: 'איזה מידע אנחנו אוספים',
            list: [
              'מידע בסיסי מחשבון Google שהמשתמש מחבר, כמו מזהה Google, כתובת אימייל ונתוני חיבור בסיסיים.',
              'רמת ההרשאה שנבחרה ב-HebSync: יומני HebSync בלבד, צפייה ביומנים קיימים, או עריכת אירועים כשנדרשת הרשאה כזו.',
              'מטא-דאטה של יומנים ואירועים שנדרש כדי להציג יומנים, לצפות באירועים, וליצור או לעדכן אירועים לפי הפעולות שהמשתמש בוחר.',
              'Cookies הכרחיים ל-authentication ולשמירה על session מאובטח.',
              'נתוני צד-לקוח ב-localStorage לצורך שמירת מצב התחברות וסנכרון בין טאבים.',
            ],
          },
          {
            title: 'איך אנחנו משתמשים במידע',
            list: [
              'להתחבר לחשבון Google שבחרת ולאמת שהבקשה לחיבור הגיעה ממך.',
              'להציג את היומנים והאירועים שרלוונטיים להרשאות שאישרת.',
              'ליצור, לעדכן או למחוק אירועים רק כאשר בחרת בפעולה כזו והרשית לכך.',
              'לשמור את המצב שנבחר כדי שהאפליקציה תוכל להמשיך לעבוד גם בין טעינות דף או טאבים.',
              'להגן על האפליקציה מפני שימוש לא מורשה באמצעות session, CSRF token ואימות שרת.',
            ],
          },
          {
            title: 'הרשאות Google שהאפליקציה מבקשת',
            body: [
              'HebSync מבקש הרשאות מדורגות ולא מבקש גישת עריכה מלאה מראש.',
            ],
            list: [
              'openid ו-email כדי לזהות את המשתמש המחובר.',
              'calendar.app.created כדי לעבוד עם יומנים שהאפליקציה יוצרת.',
              'calendar.calendarlist.readonly כדי להציג את רשימת היומנים הזמינים.',
              'calendar.readonly כאשר בוחרים לעבוד גם עם יומנים קיימים במצב צפייה.',
              'calendar.events רק כאשר המשתמש בוחר לבצע פעולת עריכה או ניהול אירועים שדורשת זאת.',
            ],
          },
          {
            title: 'איפה המידע נשמר ולכמה זמן',
            body: [
              'Cookie ה-session נשמר עד 30 יום, אלא אם המשתמש מתנתק קודם.',
              'Cookie זמני של OAuth state נשמר עד 10 דקות לצורך השלמת תהליך החיבור ל-Google.',
              'Access token ו-refresh token נשמרים בצד השרת כדי לאפשר גישה מאובטחת ל-Google Calendar. בעת ניתוק, הטוקנים מבוטלים וה-session-ים הפעילים נמחקים.',
              'נתוני localStorage נשמרים בדפדפן עד לניתוק, ניקוי ידני או מחיקת נתוני האתר.',
              'רשומת חיבור בסיסית עשויה להישמר גם אחרי ניתוק עד בקשת מחיקה, ולכן לפני עלייה לפרודקשן מומלץ להגדיר מדיניות retention ומחיקה יזומה.',
            ],
          },
          {
            title: 'עם מי המידע משותף',
            body: [
              'המידע משותף עם Google לצורך OAuth וקריאות ל-Google Calendar API, ועם ספקי תשתית שנדרשים להפעלת האפליקציה, כמו אירוח ומסד נתונים.',
              'לא נעשה שימוש במידע לצורכי פרסום, מכירה או tracking שיווקי.',
            ],
          },
          {
            title: 'Cookies ואחסון מקומי',
            body: [
              'האפליקציה משתמשת ב-cookies הכרחיים לצורך התחברות מאובטחת ושמירת session, וב-localStorage לצורך מצב התחברות ומצב הרשאות.',
              'אם יתווספו בעתיד analytics, advertising cookies או כלי tracking לא הכרחיים, יהיה צורך לעדכן את המדיניות ולשקול מנגנון consent בהתאם לדין החל.',
            ],
          },
          {
            title: 'זכויות פרטיות ובקשות מחיקה',
            body: [
              `אם GDPR חל עליך, ייתכן שיש לך זכויות כמו גישה, תיקון, מחיקה, הגבלת עיבוד והתנגדות. לבקשות כאלה אפשר לפנות ל-${LEGAL_DETAILS.privacyEmail}.`,
              'ניתוק דרך האפליקציה מבטל את הרשאת Google ומוחק את ה-session הפעיל, אבל לא בהכרח מוחק כל מטא-דאטה שנשמר בשרת. לכן חשוב להוסיף גם מסלול מחיקה מלא או טיפול ידני בבקשות מחיקה.',
            ],
          },
          {
            title: 'העברות בינלאומיות ואבטחה',
            body: [
              'ייתכן שהמידע יעובד מחוץ למדינת המגורים של המשתמש על ידי Google וספקי התשתית של השירות.',
              'HebSync משתמש ב-HTTP-only session cookies, CSRF protection, ואחסון מוצפן של refresh token כדי לצמצם סיכונים סבירים.',
            ],
          },
          {
            title: 'תוקף ועדכונים',
            body: [
              `מדיניות זו בתוקף מ-${LEGAL_DETAILS.effectiveDate}. אם נשנה מהותית את אופן השימוש במידע או את ההרשאות המבוקשות, נעדכן את העמוד הזה.`,
            ],
          },
        ],
      }
    : {
        title: 'Privacy Policy',
        subtitle:
          'This page explains what data HebSync collects, how it uses it, which Google Calendar permissions are requested, and how users can disconnect access or request deletion.',
        warning:
          'Before submitting the app for Google verification, replace the temporary contact details with real operator and privacy contact information.',
        sections: [
          {
            title: 'Who operates the service',
            body: [
              `${LEGAL_DETAILS.operatorName} operates HebSync.`,
              `For privacy, deletion, or data rights requests, contact ${LEGAL_DETAILS.privacyEmail}. For general support, contact ${LEGAL_DETAILS.supportEmail}.`,
            ],
          },
          {
            title: 'What data we collect',
            list: [
              'Basic Google account connection data such as Google user ID, email address, and connection details.',
              'The permission mode selected in HebSync: HebSync-only calendars, existing-calendar view mode, or event editing when explicitly enabled.',
              'Calendar and event metadata needed to display calendars, review events, and create or update events the user asks HebSync to manage.',
              'Strictly necessary authentication cookies used to maintain a secure server session.',
              'Client-side localStorage entries used to keep session state and sync authentication state across tabs.',
            ],
          },
          {
            title: 'How we use data',
            list: [
              'To connect the Google account you choose and verify that the connection request came from you.',
              'To display the calendars and events relevant to the permissions you approved.',
              'To create, update, or delete events only when you request those actions and grant the required permissions.',
              'To remember the selected connection mode across page reloads and browser tabs.',
              'To protect the service against unauthorized use by using server sessions, CSRF protection, and backend authorization checks.',
            ],
          },
          {
            title: 'Google permissions requested',
            body: ['HebSync uses incremental permissions rather than requesting broad write access up front.'],
            list: [
              'openid and email to identify the signed-in user.',
              'calendar.app.created to work with calendars created by HebSync.',
              'calendar.calendarlist.readonly to show the list of available calendars.',
              'calendar.readonly when the user chooses to work with existing calendars in view mode.',
              'calendar.events only when the user chooses an editing action that requires event modification.',
            ],
          },
          {
            title: 'Where data is stored and for how long',
            body: [
              'The authentication session cookie is retained for up to 30 days unless the user disconnects earlier.',
              'The temporary OAuth state cookie is retained for up to 10 minutes while completing Google sign-in.',
              'Server-side access and refresh tokens are retained so the service can securely call Google Calendar. On disconnect, those tokens are revoked or cleared and active sessions are removed.',
              'Client-side localStorage entries remain in the browser until logout, manual clearing, or site data removal.',
              'A basic connection record may remain after disconnect unless a deletion request is processed, so production use should define and enforce an explicit retention policy.',
            ],
          },
          {
            title: 'Who data is shared with',
            body: [
              'Data is shared with Google for OAuth and Google Calendar API access, and with infrastructure providers required to host and operate the service, such as hosting and database vendors.',
              'HebSync does not use Google user data for advertising, sale, or marketing tracking purposes.',
            ],
          },
          {
            title: 'Cookies and local storage',
            body: [
              'HebSync uses strictly necessary cookies for authentication and session management, and uses localStorage to remember session and permission mode state in the browser.',
              'If analytics, advertising cookies, or non-essential trackers are added later, this policy should be updated and a consent mechanism may become necessary depending on applicable law.',
            ],
          },
          {
            title: 'Privacy rights and deletion requests',
            body: [
              `If GDPR or similar privacy laws apply to you, you may have rights such as access, correction, deletion, restriction, and objection. Requests can be sent to ${LEGAL_DETAILS.privacyEmail}.`,
              'Disconnecting the app revokes Google access and clears the active session, but may not remove all metadata stored on the server. A production-ready service should provide a full deletion path or a manual deletion process.',
            ],
          },
          {
            title: 'International transfers and security',
            body: [
              'Your data may be processed outside your country by Google and the service infrastructure providers.',
              'HebSync uses HTTP-only session cookies, CSRF protection, and encrypted refresh-token storage to reduce reasonable security risk.',
            ],
          },
          {
            title: 'Effective date and updates',
            body: [
              `This policy is effective as of ${LEGAL_DETAILS.effectiveDate}. If HebSync materially changes the way it uses personal data or the Google permissions it requests, this page should be updated.`,
            ],
          },
        ],
      };

  return (
    <LegalPageLayout title={content.title} subtitle={content.subtitle}>
      {placeholderWarning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
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
