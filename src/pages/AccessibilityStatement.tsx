import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import LegalPageLayout from '../components/LegalPageLayout';
import { LEGAL_DETAILS, hasPlaceholderLegalDetails } from '../config/legal';

interface SectionContent {
  title: string;
  body?: string[];
  list?: string[];
}

interface PageContent {
  title: string;
  subtitle: string;
  warning?: string;
  sections: SectionContent[];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{title}</h3>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-[15px]">
        {children}
      </div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 ps-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function AccessibilityStatement() {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';
  const placeholderWarning = hasPlaceholderLegalDetails();

  const content: PageContent = isHebrew
    ? {
        title: 'הצהרת נגישות',
        subtitle:
          'HebSync הוא שירות רשת חינמי לציבור, שנועד לעזור בניהול תאריכים עבריים חוזרים מול Google Calendar. אנו פועלים לשיפור מתמשך של נגישות האתר, כדי לאפשר שימוש רחב ככל האפשר גם לאנשים עם מוגבלות.',
        warning:
          'מומלץ לעדכן בעמוד זה פרטי קשר אמיתיים, תאריך עדכון אחרון, וכל שינוי מהותי שנעשה בהנגשה.',
        sections: [
          {
            title: 'מצב ההנגשה באתר',
            body: [
              'האתר נמצא בתהליך שיפור נגישות מתמשך. מטרתנו היא להתאים את התוכן והפעולות המרכזיות להוראות תקן ישראלי 5568 ברמת AA, המבוסס על WCAG 2.0.',
              'בשלב זה בוצעו באתר התאמות נגישות בסיסיות, ובמקביל אנו ממשיכים לאתר ולתקן פערים נוספים.',
            ],
          },
          {
            title: 'התאמות שבוצעו או נבדקות באופן שוטף',
            list: [
              'שיפור ניווט במקלדת עבור פעולות מרכזיות באתר.',
              'שימוש בטקסט חלופי לתמונות פונקציונליות ולוגו.',
              'שיפור תיוגים, כותרות ומאפייני דיאלוג ברכיבי ממשק ובחלונות קופצים.',
              'שיוך תוויות לשדות מרכזיים בטפסים כדי לשפר עבודה עם קוראי מסך.',
              'הוספת הודעות משוב נגישות בתוך המסך בחלק מזרימות העבודה המרכזיות.',
              'שיפור סמנטיקה של רכיבי בחירה, לשוניות וניווט בתוך ממשקים דינמיים.',
              'תמיכה בסגירה באמצעות מקש Escape בחלק מהשכבות והחלונות.',
              'התאמת תצוגה לשפות עברית ואנגלית ולמסכים בגדלים שונים.',
              'הוספת עמוד ייעודי לדיווח על פערי נגישות וליצירת קשר.',
            ],
          },
          {
            title: 'מגבלות ידועות',
            body: [
              'ייתכן שעדיין קיימים רכיבים או תרחישים שטרם הונגשו במלואם, ובפרט תזרימי עבודה מורכבים, חלונות דינמיים, או אינטגרציות התלויות בשירותים חיצוניים של Google.',
              'אם נתקלת ברכיב שאינו נגיש, נשמח לקבל דיווח כדי לבדוק ולתקן בהקדם האפשרי.',
            ],
          },
          {
            title: 'דרכי פנייה בנושא נגישות',
            body: [
              `לפניות בנושא נגישות, קושי בשימוש באתר או בקשה להתאמה חלופית, ניתן לפנות לכתובת ${LEGAL_DETAILS.supportEmail}.`,
              `אם הפנייה נוגעת לפרטיות, מחיקת נתונים או בקשה רשמית נוספת, ניתן לפנות גם ל-${LEGAL_DETAILS.privacyEmail}.`,
            ],
          },
          {
            title: 'חלופה במקרה של קושי',
            body: [
              'אם אינך מצליח או מצליחה להשלים פעולה באתר, אפשר לפנות אלינו בדוא"ל עם פירוט הפעולה המבוקשת והקושי שנתקלת בו, וננסה לספק מענה חלופי סביר.',
            ],
          },
          {
            title: 'פרטי עדכון',
            body: [
              `הצהרה זו עודכנה לאחרונה בתאריך ${LEGAL_DETAILS.effectiveDate}.`,
            ],
          },
        ],
      }
    : {
        title: 'Accessibility Statement',
        subtitle:
          'HebSync is a free public web service that helps people manage recurring Hebrew dates with Google Calendar. We are working to improve accessibility on an ongoing basis so the site can be used by as many people as possible, including people with disabilities.',
        warning:
          'It is recommended to keep this page updated with real contact details, the latest review date, and any material accessibility changes.',
        sections: [
          {
            title: 'Current accessibility status',
            body: [
              'The site is in an ongoing accessibility-improvement process. Our goal is to align key content and interactions with Israeli Standard 5568 at AA level, based on WCAG 2.0.',
              'At this stage, core accessibility improvements have already been added, and we continue to identify and fix additional gaps.',
            ],
          },
          {
            title: 'Adjustments already made or under continuous review',
            list: [
              'Improved keyboard navigation for major site actions.',
              'Alternative text for functional images and the logo.',
              'Better labels, headings, and dialog semantics for interface controls and modal windows.',
              'Improved label-to-field association in key forms for screen-reader support.',
              'Accessible in-page feedback messages in parts of the main workflows.',
              'Better semantics for selection controls, tabs, and dynamic interface states.',
              'Escape-key closing support for parts of the modal and overlay experience.',
              'Responsive support for Hebrew and English layouts across screen sizes.',
              'A dedicated page for reporting accessibility gaps and contacting us.',
            ],
          },
          {
            title: 'Known limitations',
            body: [
              'Some components or scenarios may still be only partially accessible, especially complex workflows, dynamic dialogs, or flows that depend on external Google services.',
              'If you encounter an accessibility issue, we would appreciate a report so we can review and address it as soon as reasonably possible.',
            ],
          },
          {
            title: 'How to contact us about accessibility',
            body: [
              `For accessibility issues, usability barriers, or requests for an alternative accessible path, contact ${LEGAL_DETAILS.supportEmail}.`,
              `For privacy, deletion, or other formal follow-up, you can also contact ${LEGAL_DETAILS.privacyEmail}.`,
            ],
          },
          {
            title: 'Alternative path if you cannot complete an action',
            body: [
              'If you cannot complete an action on the site, you can email us with the requested action and the barrier you encountered, and we will try to offer a reasonable alternative.',
            ],
          },
          {
            title: 'Last updated',
            body: [`This statement was last updated on ${LEGAL_DETAILS.effectiveDate}.`],
          },
        ],
      };

  return (
    <LegalPageLayout title={content.title} subtitle={content.subtitle}>
      {placeholderWarning && content.warning ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/20 dark:text-amber-200">
          {content.warning}
        </div>
      ) : null}

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
