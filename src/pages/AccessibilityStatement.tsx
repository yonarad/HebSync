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
        title: '\u05d4\u05e6\u05d4\u05e8\u05ea \u05e0\u05d2\u05d9\u05e9\u05d5\u05ea',
        subtitle:
          'HebSync \u05d4\u05d5\u05d0 \u05e9\u05d9\u05e8\u05d5\u05ea \u05e8\u05e9\u05ea \u05d7\u05d9\u05e0\u05de\u05d9 \u05dc\u05e6\u05d9\u05d1\u05d5\u05e8, \u05e9\u05e0\u05d5\u05e2\u05d3 \u05dc\u05e2\u05d6\u05d5\u05e8 \u05d1\u05e0\u05d9\u05d4\u05d5\u05dc \u05ea\u05d0\u05e8\u05d9\u05db\u05d9\u05dd \u05e2\u05d1\u05e8\u05d9\u05d9\u05dd \u05d7\u05d5\u05d6\u05e8\u05d9\u05dd \u05de\u05d5\u05dc Google Calendar. \u05d0\u05e0\u05d5 \u05e4\u05d5\u05e2\u05dc\u05d9\u05dd \u05dc\u05e9\u05d9\u05e4\u05d5\u05e8 \u05de\u05ea\u05de\u05e9\u05da \u05e9\u05dc \u05e0\u05d2\u05d9\u05e9\u05d5\u05ea \u05d4\u05d0\u05ea\u05e8, \u05db\u05d3\u05d9 \u05dc\u05d0\u05e4\u05e9\u05e8 \u05e9\u05d9\u05de\u05d5\u05e9 \u05e8\u05d7\u05d1 \u05db\u05db\u05dc \u05d4\u05d0\u05e4\u05e9\u05e8 \u05d2\u05dd \u05dc\u05d0\u05e0\u05e9\u05d9\u05dd \u05e2\u05dd \u05de\u05d5\u05d2\u05d1\u05dc\u05d5\u05ea.',
        warning:
          '\u05de\u05d5\u05de\u05dc\u05e5 \u05dc\u05e2\u05d3\u05db\u05df \u05d1\u05e2\u05de\u05d5\u05d3 \u05d6\u05d4 \u05e4\u05e8\u05d8\u05d9 \u05e7\u05e9\u05e8 \u05d0\u05de\u05d9\u05ea\u05d9\u05d9\u05dd, \u05ea\u05d0\u05e8\u05d9\u05da \u05e2\u05d3\u05db\u05d5\u05df \u05d0\u05d7\u05e8\u05d5\u05df, \u05d5\u05db\u05dc \u05e9\u05d9\u05e0\u05d5\u05d9 \u05de\u05d4\u05d5\u05ea\u05d9 \u05e9\u05e0\u05e2\u05e9\u05d4 \u05d1\u05d4\u05e0\u05d2\u05e9\u05d4.',
        sections: [
          {
            title: '\u05de\u05e6\u05d1 \u05d4\u05d4\u05e0\u05d2\u05e9\u05d4 \u05d1\u05d0\u05ea\u05e8',
            body: [
              '\u05d4\u05d0\u05ea\u05e8 \u05e0\u05de\u05e6\u05d0 \u05d1\u05ea\u05d4\u05dc\u05d9\u05da \u05e9\u05d9\u05e4\u05d5\u05e8 \u05e0\u05d2\u05d9\u05e9\u05d5\u05ea \u05de\u05ea\u05de\u05e9\u05da. \u05de\u05d8\u05e8\u05ea\u05e0\u05d5 \u05d4\u05d9\u05d0 \u05dc\u05d4\u05ea\u05d0\u05d9\u05dd \u05d0\u05ea \u05d4\u05ea\u05d5\u05db\u05df \u05d5\u05d4\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea \u05d4\u05de\u05e8\u05db\u05d6\u05d9\u05d5\u05ea \u05dc\u05d4\u05d5\u05e8\u05d0\u05d5\u05ea \u05ea\u05e7\u05df \u05d9\u05e9\u05e8\u05d0\u05dc\u05d9 5568 \u05d1\u05e8\u05de\u05ea AA, \u05d4\u05de\u05d1\u05d5\u05e1\u05e1 \u05e2\u05dc WCAG 2.0.',
              '\u05d1\u05e9\u05dc\u05d1 \u05d6\u05d4 \u05d1\u05d5\u05e6\u05e2\u05d5 \u05d1\u05d0\u05ea\u05e8 \u05d4\u05ea\u05d0\u05de\u05d5\u05ea \u05e0\u05d2\u05d9\u05e9\u05d5\u05ea \u05d1\u05e1\u05d9\u05e1\u05d9\u05d5\u05ea, \u05d5\u05d1\u05de\u05e7\u05d1\u05d9\u05dc \u05d0\u05e0\u05d5 \u05de\u05de\u05e9\u05d9\u05db\u05d9\u05dd \u05dc\u05d0\u05ea\u05e8 \u05d5\u05dc\u05ea\u05e7\u05df \u05e4\u05e2\u05e8\u05d9\u05dd \u05e0\u05d5\u05e1\u05e4\u05d9\u05dd.',
            ],
          },
          {
            title: '\u05d4\u05ea\u05d0\u05de\u05d5\u05ea \u05e9\u05d1\u05d5\u05e6\u05e2\u05d5 \u05d0\u05d5 \u05e0\u05d1\u05d3\u05e7\u05d5\u05ea \u05d1\u05d0\u05d5\u05e4\u05df \u05e9\u05d5\u05d8\u05e3',
            list: [
              '\u05e9\u05d9\u05e4\u05d5\u05e8 \u05e0\u05d9\u05d5\u05d5\u05d8 \u05d1\u05de\u05e7\u05dc\u05d3\u05ea \u05e2\u05d1\u05d5\u05e8 \u05e4\u05e2\u05d5\u05dc\u05d5\u05ea \u05de\u05e8\u05db\u05d6\u05d9\u05d5\u05ea \u05d1\u05d0\u05ea\u05e8.',
              '\u05e9\u05d9\u05de\u05d5\u05e9 \u05d1\u05d8\u05e7\u05e1\u05d8 \u05d7\u05dc\u05d5\u05e4\u05d9 \u05dc\u05ea\u05de\u05d5\u05e0\u05d5\u05ea \u05e4\u05d5\u05e0\u05e7\u05e6\u05d9\u05d5\u05e0\u05dc\u05d9\u05d5\u05ea \u05d5\u05dc\u05d5\u05d2\u05d5.',
              '\u05e9\u05d9\u05e4\u05d5\u05e8 \u05ea\u05d9\u05d5\u05d2\u05d9\u05dd, \u05db\u05d5\u05ea\u05e8\u05d5\u05ea \u05d5\u05de\u05d0\u05e4\u05d9\u05d9\u05e0\u05d9 \u05d3\u05d9\u05d0\u05dc\u05d5\u05d2 \u05d1\u05e8\u05db\u05d9\u05d1\u05d9 \u05de\u05de\u05e9\u05e7 \u05d5\u05d1\u05d7\u05dc\u05d5\u05e0\u05d5\u05ea \u05e7\u05d5\u05e4\u05e6\u05d9\u05dd.',
              '\u05e9\u05d9\u05d5\u05da \u05ea\u05d5\u05d5\u05d9\u05d5\u05ea \u05dc\u05e9\u05d3\u05d5\u05ea \u05de\u05e8\u05db\u05d6\u05d9\u05d9\u05dd \u05d1\u05d8\u05e4\u05e1\u05d9\u05dd \u05db\u05d3\u05d9 \u05dc\u05e9\u05e4\u05e8 \u05e2\u05d1\u05d5\u05d3\u05d4 \u05e2\u05dd \u05e7\u05d5\u05e8\u05d0\u05d9 \u05de\u05e1\u05da.',
              '\u05d4\u05d5\u05e1\u05e4\u05ea \u05d4\u05d5\u05d3\u05e2\u05d5\u05ea \u05de\u05e9\u05d5\u05d1 \u05e0\u05d2\u05d9\u05e9\u05d5\u05ea \u05d1\u05ea\u05d5\u05da \u05d4\u05de\u05e1\u05da \u05d1\u05d7\u05dc\u05e7 \u05de\u05d6\u05e8\u05d9\u05de\u05d5\u05ea \u05d4\u05e2\u05d1\u05d5\u05d3\u05d4 \u05d4\u05de\u05e8\u05db\u05d6\u05d9\u05d5\u05ea.',
              '\u05e9\u05d9\u05e4\u05d5\u05e8 \u05e1\u05de\u05e0\u05d8\u05d9\u05e7\u05d4 \u05e9\u05dc \u05e8\u05db\u05d9\u05d1\u05d9 \u05d1\u05d7\u05d9\u05e8\u05d4, \u05dc\u05e9\u05d5\u05e0\u05d9\u05d5\u05ea \u05d5\u05e0\u05d9\u05d5\u05d5\u05d8 \u05d1\u05ea\u05d5\u05da \u05de\u05de\u05e9\u05e7\u05d9\u05dd \u05d3\u05d9\u05e0\u05de\u05d9\u05d9\u05dd.',
              '\u05ea\u05de\u05d9\u05db\u05d4 \u05d1\u05e1\u05d2\u05d9\u05e8\u05d4 \u05d1\u05d0\u05de\u05e6\u05e2\u05d5\u05ea \u05de\u05e7\u05e9 Escape \u05d1\u05d7\u05dc\u05e7 \u05de\u05d4\u05e9\u05db\u05d1\u05d5\u05ea \u05d5\u05d4\u05d7\u05dc\u05d5\u05e0\u05d5\u05ea.',
              '\u05d4\u05ea\u05d0\u05de\u05ea \u05ea\u05e6\u05d5\u05d2\u05d4 \u05dc\u05e9\u05e4\u05d5\u05ea \u05e2\u05d1\u05e8\u05d9\u05ea \u05d5\u05d0\u05e0\u05d2\u05dc\u05d9\u05ea \u05d5\u05dc\u05de\u05e1\u05db\u05d9\u05dd \u05d1\u05d2\u05d3\u05dc\u05d9\u05dd \u05e9\u05d5\u05e0\u05d9\u05dd.',
              '\u05d4\u05d5\u05e1\u05e4\u05ea \u05e2\u05de\u05d5\u05d3 \u05d9\u05d9\u05e2\u05d5\u05d3\u05d9 \u05dc\u05d3\u05d9\u05d5\u05d5\u05d7 \u05e2\u05dc \u05e4\u05e2\u05e8\u05d9 \u05e0\u05d2\u05d9\u05e9\u05d5\u05ea \u05d5\u05dc\u05d9\u05e6\u05d9\u05e8\u05ea \u05e7\u05e9\u05e8.',
            ],
          },
          {
            title: '\u05de\u05d2\u05d1\u05dc\u05d5\u05ea \u05d9\u05d3\u05d5\u05e2\u05d5\u05ea',
            body: [
              '\u05d9\u05d9\u05ea\u05db\u05df \u05e9\u05e2\u05d3\u05d9\u05d9\u05df \u05e7\u05d9\u05d9\u05de\u05d9\u05dd \u05e8\u05db\u05d9\u05d1\u05d9\u05dd \u05d0\u05d5 \u05ea\u05e8\u05d7\u05d9\u05e9\u05d9\u05dd \u05e9\u05d8\u05e8\u05dd \u05d4\u05d5\u05e0\u05d2\u05e9\u05d5 \u05d1\u05de\u05dc\u05d5\u05d0\u05dd, \u05d5\u05d1\u05e4\u05e8\u05d8 \u05ea\u05d6\u05e8\u05d9\u05de\u05d9 \u05e2\u05d1\u05d5\u05d3\u05d4 \u05de\u05d5\u05e8\u05db\u05d1\u05d9\u05dd, \u05d7\u05dc\u05d5\u05e0\u05d5\u05ea \u05d3\u05d9\u05e0\u05de\u05d9\u05d9\u05dd, \u05d0\u05d5 \u05d0\u05d9\u05e0\u05d8\u05d2\u05e8\u05e6\u05d9\u05d5\u05ea \u05d4\u05ea\u05dc\u05d5\u05d9\u05d5\u05ea \u05d1\u05e9\u05d9\u05e8\u05d5\u05ea\u05d9\u05dd \u05d7\u05d9\u05e6\u05d5\u05e0\u05d9\u05d9\u05dd \u05e9\u05dc Google.',
              '\u05d0\u05dd \u05e0\u05ea\u05e7\u05dc\u05ea \u05d1\u05e8\u05db\u05d9\u05d1 \u05e9\u05d0\u05d9\u05e0\u05d5 \u05e0\u05d2\u05d9\u05e9, \u05e0\u05e9\u05de\u05d7 \u05dc\u05e7\u05d1\u05dc \u05d3\u05d9\u05d5\u05d5\u05d7 \u05db\u05d3\u05d9 \u05dc\u05d1\u05d3\u05d5\u05e7 \u05d5\u05dc\u05ea\u05e7\u05df \u05d1\u05d4\u05e7\u05d3\u05dd \u05d4\u05d0\u05e4\u05e9\u05e8\u05d9.',
            ],
          },
          {
            title: '\u05d3\u05e8\u05db\u05d9 \u05e4\u05e0\u05d9\u05d9\u05d4 \u05d1\u05e0\u05d5\u05e9\u05d0 \u05e0\u05d2\u05d9\u05e9\u05d5\u05ea',
            body: [
              `\u05dc\u05e4\u05e0\u05d9\u05d5\u05ea \u05d1\u05e0\u05d5\u05e9\u05d0 \u05e0\u05d2\u05d9\u05e9\u05d5\u05ea, \u05e7\u05d5\u05e9\u05d9 \u05d1\u05e9\u05d9\u05de\u05d5\u05e9 \u05d1\u05d0\u05ea\u05e8 \u05d0\u05d5 \u05d1\u05e7\u05e9\u05d4 \u05dc\u05d4\u05ea\u05d0\u05de\u05d4 \u05d7\u05dc\u05d5\u05e4\u05d9\u05ea, \u05e0\u05d9\u05ea\u05df \u05dc\u05e4\u05e0\u05d5\u05ea \u05dc\u05db\u05ea\u05d5\u05d1\u05ea ${LEGAL_DETAILS.supportEmail}.`,
              `\u05d0\u05dd \u05d4\u05e4\u05e0\u05d9\u05d9\u05d4 \u05e0\u05d5\u05d2\u05e2\u05ea \u05dc\u05e4\u05e8\u05d8\u05d9\u05d5\u05ea, \u05de\u05d7\u05d9\u05e7\u05ea \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05d0\u05d5 \u05d1\u05e7\u05e9\u05d4 \u05e8\u05e9\u05de\u05d9\u05ea \u05e0\u05d5\u05e1\u05e4\u05ea, \u05e0\u05d9\u05ea\u05df \u05dc\u05e4\u05e0\u05d5\u05ea \u05d2\u05dd \u05dc-${LEGAL_DETAILS.privacyEmail}.`,
            ],
          },
          {
            title: '\u05d7\u05dc\u05d5\u05e4\u05d4 \u05d1\u05de\u05e7\u05e8\u05d4 \u05e9\u05dc \u05e7\u05d5\u05e9\u05d9',
            body: [
              '\u05d0\u05dd \u05d0\u05d9\u05e0\u05da \u05de\u05e6\u05dc\u05d9\u05d7 \u05d0\u05d5 \u05de\u05e6\u05dc\u05d9\u05d7\u05d4 \u05dc\u05d4\u05e9\u05dc\u05d9\u05dd \u05e4\u05e2\u05d5\u05dc\u05d4 \u05d1\u05d0\u05ea\u05e8, \u05d0\u05e4\u05e9\u05e8 \u05dc\u05e4\u05e0\u05d5\u05ea \u05d0\u05dc\u05d9\u05e0\u05d5 \u05d1\u05d3\u05d5\u05d0"\u05dc \u05e2\u05dd \u05e4\u05d9\u05e8\u05d5\u05d8 \u05d4\u05e4\u05e2\u05d5\u05dc\u05d4 \u05d4\u05de\u05d1\u05d5\u05e7\u05e9\u05ea \u05d5\u05d4\u05e7\u05d5\u05e9\u05d9 \u05e9\u05e0\u05ea\u05e7\u05dc\u05ea \u05d1\u05d5, \u05d5\u05e0\u05e0\u05e1\u05d4 \u05dc\u05e1\u05e4\u05e7 \u05de\u05e2\u05e0\u05d4 \u05d7\u05dc\u05d5\u05e4\u05d9 \u05e1\u05d1\u05d9\u05e8.',
            ],
          },
          {
            title: '\u05e4\u05e8\u05d8\u05d9 \u05e2\u05d3\u05db\u05d5\u05df',
            body: [
              `\u05d4\u05e6\u05d4\u05e8\u05d4 \u05d6\u05d5 \u05e2\u05d5\u05d3\u05db\u05e0\u05d4 \u05dc\u05d0\u05d7\u05e8\u05d5\u05e0\u05d4 \u05d1\u05ea\u05d0\u05e8\u05d9\u05da ${LEGAL_DETAILS.effectiveDate}.`,
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
