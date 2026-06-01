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
  warning: string;
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

export default function TermsOfService() {
  const { i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';
  const placeholderWarning = hasPlaceholderLegalDetails();

  const content: PageContent = isHebrew
    ? {
        title: '\u05ea\u05e0\u05d0\u05d9 \u05e9\u05d9\u05de\u05d5\u05e9',
        subtitle:
          '\u05ea\u05e0\u05d0\u05d9\u05dd \u05d0\u05dc\u05d4 \u05de\u05e1\u05d3\u05d9\u05e8\u05d9\u05dd \u05d0\u05ea \u05d4\u05e9\u05d9\u05de\u05d5\u05e9 \u05d1-HebSync, \u05d0\u05ea \u05d0\u05d5\u05e4\u05df \u05d4\u05d7\u05d9\u05d1\u05d5\u05e8 \u05dc-Google Calendar, \u05d5\u05d0\u05ea \u05d4\u05d0\u05d7\u05e8\u05d9\u05d5\u05ea \u05e9\u05dc \u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05d1\u05e2\u05ea \u05d9\u05e6\u05d9\u05e8\u05d4, \u05e2\u05d3\u05db\u05d5\u05df \u05d5\u05d9\u05d9\u05d1\u05d5\u05d0 \u05e9\u05dc \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd.',
        warning:
          '\u05dc\u05e4\u05e0\u05d9 \u05e4\u05e8\u05e1\u05d5\u05dd \u05e6\u05d9\u05d1\u05d5\u05e8\u05d9 \u05d5\u05d0\u05d9\u05de\u05d5\u05ea \u05de\u05d5\u05dc Google \u05db\u05d3\u05d0\u05d9 \u05dc\u05d4\u05e9\u05dc\u05d9\u05dd \u05db\u05d0\u05df \u05d0\u05ea \u05e9\u05dd \u05d4\u05de\u05e4\u05e2\u05d9\u05dc \u05d5\u05e4\u05e8\u05d8\u05d9 \u05d4\u05e7\u05e9\u05e8 \u05d4\u05d0\u05de\u05d9\u05ea\u05d9\u05d9\u05dd.',
        sections: [
          {
            title: '\u05e7\u05d1\u05dc\u05ea \u05d4\u05ea\u05e0\u05d0\u05d9\u05dd',
            body: [
              `\u05d4\u05e9\u05d9\u05de\u05d5\u05e9 \u05d1-HebSync \u05db\u05e4\u05d5\u05e3 \u05dc\u05ea\u05e0\u05d0\u05d9\u05dd \u05d0\u05dc\u05d4. \u05d0\u05dd \u05d0\u05d9\u05e0\u05da \u05de\u05e1\u05db\u05d9\u05dd \u05dc\u05d4\u05dd, \u05d0\u05d9\u05df \u05dc\u05d4\u05e9\u05ea\u05de\u05e9 \u05d1\u05e9\u05d9\u05e8\u05d5\u05ea. \u05d4\u05e9\u05d9\u05e8\u05d5\u05ea \u05de\u05d5\u05e4\u05e2\u05dc \u05e2\u05dc \u05d9\u05d3\u05d9 ${LEGAL_DETAILS.operatorName}.`,
            ],
          },
          {
            title: '\u05de\u05d4 \u05d4\u05e9\u05d9\u05e8\u05d5\u05ea \u05e2\u05d5\u05e9\u05d4',
            body: [
              'HebSync \u05e0\u05d5\u05e2\u05d3 \u05dc\u05e2\u05d6\u05d5\u05e8 \u05dc\u05e0\u05d4\u05dc \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05e2\u05d1\u05e8\u05d9\u05d9\u05dd \u05d7\u05d5\u05d6\u05e8\u05d9\u05dd, \u05dc\u05d9\u05e6\u05d5\u05e8 \u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05d9\u05d9\u05e2\u05d5\u05d3\u05d9\u05d9\u05dd, \u05dc\u05d4\u05e6\u05d9\u05d2 \u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05e7\u05d9\u05d9\u05de\u05d9\u05dd, \u05d5\u05dc\u05d9\u05d9\u05d1\u05d0 \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05de\u05ea\u05d5\u05da \u05e7\u05d1\u05e6\u05d9 Excel \u05d1\u05d4\u05ea\u05d0\u05dd \u05dc\u05d4\u05e8\u05e9\u05d0\u05d5\u05ea \u05e9\u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05d1\u05d5\u05d7\u05e8 \u05dc\u05ea\u05ea.',
            ],
          },
          {
            title: '\u05d7\u05d9\u05d1\u05d5\u05e8 \u05dc\u05d7\u05e9\u05d1\u05d5\u05df Google',
            body: [
              '\u05db\u05d3\u05d9 \u05dc\u05d4\u05e9\u05ea\u05de\u05e9 \u05d1\u05e8\u05d5\u05d1 \u05d9\u05db\u05d5\u05dc\u05d5\u05ea \u05d4\u05e9\u05d9\u05e8\u05d5\u05ea \u05e6\u05e8\u05d9\u05da \u05dc\u05d7\u05d1\u05e8 \u05d7\u05e9\u05d1\u05d5\u05df Google. \u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05de\u05d0\u05e9\u05e8 \u05d0\u05ea \u05d4\u05d4\u05e8\u05e9\u05d0\u05d5\u05ea \u05d3\u05e8\u05da Google, \u05d5\u05d9\u05db\u05d5\u05dc \u05dc\u05e0\u05ea\u05e7 \u05d0\u05ea \u05d4\u05e9\u05d9\u05e8\u05d5\u05ea \u05d1\u05db\u05dc \u05e2\u05ea \u05de\u05ea\u05d5\u05da \u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05d0\u05d5 \u05d3\u05e8\u05da \u05d4\u05d2\u05d3\u05e8\u05d5\u05ea \u05d7\u05e9\u05d1\u05d5\u05df Google.',
              '\u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05d0\u05d7\u05e8\u05d0\u05d9 \u05dc\u05d5\u05d5\u05d3\u05d0 \u05e9\u05d9\u05e9 \u05dc\u05d5 \u05e1\u05de\u05db\u05d5\u05ea \u05dc\u05d4\u05e9\u05ea\u05de\u05e9 \u05d1\u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05e9\u05d0\u05dc\u05d9\u05d4\u05dd \u05d4\u05d5\u05d0 \u05de\u05d7\u05d1\u05e8 \u05d0\u05ea HebSync.',
            ],
          },
          {
            title: '\u05e9\u05d9\u05de\u05d5\u05e9 \u05de\u05d5\u05ea\u05e8',
            list: [
              '\u05dc\u05d4\u05e9\u05ea\u05de\u05e9 \u05d1\u05e9\u05d9\u05e8\u05d5\u05ea \u05dc\u05e6\u05e8\u05db\u05d9\u05dd \u05d0\u05d9\u05e9\u05d9\u05d9\u05dd, \u05d0\u05e8\u05d2\u05d5\u05e0\u05d9\u05d9\u05dd \u05d0\u05d5 \u05e7\u05d4\u05d9\u05dc\u05ea\u05d9\u05d9\u05dd \u05dc\u05d2\u05d9\u05d8\u05d9\u05de\u05d9\u05d9\u05dd.',
              '\u05dc\u05d1\u05d3\u05d5\u05e7 \u05ea\u05e6\u05d5\u05d2\u05d4 \u05de\u05e7\u05d3\u05d9\u05de\u05d4 \u05dc\u05e4\u05e0\u05d9 \u05d9\u05d9\u05d1\u05d5\u05d0 \u05d0\u05d5 \u05d9\u05e6\u05d9\u05e8\u05d4 \u05e9\u05dc \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd.',
              '\u05dc\u05d4\u05d9\u05de\u05e0\u05e2 \u05de\u05d4\u05e2\u05dc\u05d0\u05ea \u05ea\u05d5\u05db\u05df \u05d1\u05dc\u05ea\u05d9 \u05d7\u05d5\u05e7\u05d9, \u05e4\u05d5\u05d2\u05e2\u05e0\u05d9 \u05d0\u05d5 \u05db\u05d6\u05d4 \u05e9\u05de\u05e4\u05e8 \u05d6\u05db\u05d5\u05d9\u05d5\u05ea \u05e9\u05dc \u05d0\u05d7\u05e8\u05d9\u05dd.',
              '\u05dc\u05d0 \u05dc\u05e0\u05e1\u05d5\u05ea \u05dc\u05e2\u05e7\u05d5\u05e3 \u05d0\u05ea \u05de\u05e0\u05d2\u05e0\u05d5\u05e0\u05d9 \u05d4\u05d0\u05d1\u05d8\u05d7\u05d4 \u05d0\u05d5 \u05dc\u05d4\u05e9\u05ea\u05de\u05e9 \u05d1\u05e9\u05d9\u05e8\u05d5\u05ea \u05d1\u05d0\u05d5\u05e4\u05df \u05e9\u05e4\u05d5\u05d2\u05e2 \u05d1\u05d6\u05de\u05d9\u05e0\u05d5\u05ea\u05d5 \u05dc\u05d0\u05d7\u05e8\u05d9\u05dd.',
            ],
          },
          {
            title: '\u05d0\u05d7\u05e8\u05d9\u05d5\u05ea \u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05dc\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05d5\u05dc\u05d9\u05d5\u05de\u05e0\u05d9\u05dd',
            body: [
              '\u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05d0\u05d7\u05e8\u05d0\u05d9 \u05dc\u05d1\u05d3\u05d5\u05e7 \u05d0\u05ea \u05d4\u05d3\u05d9\u05d5\u05e7 \u05e9\u05dc \u05e0\u05ea\u05d5\u05e0\u05d9 \u05d4\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd, \u05e9\u05dc \u05e7\u05d1\u05e6\u05d9 \u05d4\u05d9\u05d9\u05d1\u05d5\u05d0, \u05d5\u05e9\u05dc \u05d4\u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05e9\u05e0\u05d1\u05d7\u05e8\u05d5 \u05db\u05d9\u05e2\u05d3.',
              '\u05dc\u05e4\u05e0\u05d9 \u05d9\u05e6\u05d9\u05e8\u05d4, \u05e2\u05d3\u05db\u05d5\u05df \u05d0\u05d5 \u05de\u05d7\u05d9\u05e7\u05d4 \u05e9\u05dc \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05d1\u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05e7\u05d9\u05d9\u05de\u05d9\u05dd, \u05de\u05d5\u05de\u05dc\u05e5 \u05dc\u05d5\u05d5\u05d3\u05d0 \u05e9\u05d4\u05ea\u05d5\u05e6\u05d0\u05d4 \u05d4\u05e6\u05e4\u05d5\u05d9\u05d4 \u05e0\u05db\u05d5\u05e0\u05d4 \u05d5\u05e9\u05d0\u05d9\u05df \u05e4\u05d2\u05d9\u05e2\u05d4 \u05d1\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05d0\u05d7\u05e8\u05d9\u05dd.',
            ],
          },
          {
            title: '\u05d6\u05de\u05d9\u05e0\u05d5\u05ea \u05d5\u05e9\u05d9\u05e0\u05d5\u05d9\u05d9\u05dd',
            body: [
              'HebSync \u05e2\u05e9\u05d5\u05d9 \u05dc\u05d4\u05e9\u05ea\u05e0\u05d5\u05ea, \u05dc\u05d4\u05e9\u05ea\u05e4\u05e8, \u05d0\u05d5 \u05dc\u05db\u05dc\u05d5\u05dc \u05e9\u05d9\u05e0\u05d5\u05d9\u05d9 UI, \u05d4\u05e8\u05e9\u05d0\u05d5\u05ea \u05d5\u05ea\u05d4\u05dc\u05d9\u05db\u05d9 \u05e2\u05d1\u05d5\u05d3\u05d4. \u05d9\u05d9\u05ea\u05db\u05e0\u05d5 \u05d4\u05e9\u05d1\u05ea\u05d5\u05ea, \u05ea\u05e7\u05dc\u05d5\u05ea, \u05d0\u05d5 \u05e9\u05d9\u05e0\u05d5\u05d9\u05d9\u05dd \u05e2\u05e7\u05d1 \u05de\u05d2\u05d1\u05dc\u05d5\u05ea \u05e9\u05dc Google \u05d0\u05d5 \u05e1\u05e4\u05e7\u05d9 \u05ea\u05e9\u05ea\u05d9\u05ea.',
            ],
          },
          {
            title: '\u05d1\u05d9\u05d8\u05d5\u05dc, \u05e0\u05d9\u05ea\u05d5\u05e7 \u05d5\u05de\u05d7\u05d9\u05e7\u05d4',
            body: [
              `\u05d0\u05e4\u05e9\u05e8 \u05dc\u05d4\u05e4\u05e1\u05d9\u05e7 \u05dc\u05d4\u05e9\u05ea\u05de\u05e9 \u05d1\u05e9\u05d9\u05e8\u05d5\u05ea \u05d1\u05db\u05dc \u05e2\u05ea. \u05e9\u05d0\u05dc\u05d5\u05ea \u05e2\u05dc \u05de\u05d7\u05d9\u05e7\u05ea \u05de\u05d9\u05d3\u05e2 \u05d0\u05d5 \u05de\u05d7\u05d9\u05e7\u05ea \u05e8\u05e9\u05d5\u05de\u05d5\u05ea \u05d7\u05e9\u05d1\u05d5\u05df \u05d0\u05e4\u05e9\u05e8 \u05dc\u05e9\u05dc\u05d5\u05d7 \u05dc-${LEGAL_DETAILS.privacyEmail}.`,
              '\u05e0\u05d9\u05ea\u05d5\u05e7 \u05de\u05ea\u05d5\u05da \u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05de\u05d1\u05d8\u05dc \u05d2\u05d9\u05e9\u05d4 \u05dc-Google \u05d5\u05de\u05e1\u05d9\u05d9\u05dd \u05d0\u05ea \u05d4-session \u05d4\u05e4\u05e2\u05d9\u05dc. \u05de\u05d7\u05d9\u05e7\u05d4 \u05de\u05dc\u05d0\u05d4 \u05de\u05ea\u05d5\u05da \u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05de\u05d5\u05d7\u05e7\u05ea \u05d2\u05dd \u05d0\u05ea \u05e8\u05e9\u05d5\u05de\u05ea \u05d4\u05d7\u05d9\u05d1\u05d5\u05e8 \u05d4\u05e9\u05de\u05d5\u05e8\u05d4 \u05e9\u05dc HebSync.',
            ],
          },
          {
            title: '\u05d4\u05d9\u05e2\u05d3\u05e8 \u05d0\u05d7\u05e8\u05d9\u05d5\u05ea \u05de\u05dc\u05d0\u05d4',
            body: [
              '\u05d4\u05e9\u05d9\u05e8\u05d5\u05ea \u05e0\u05d9\u05ea\u05df \u05db\u05e4\u05d9 \u05e9\u05d4\u05d5\u05d0, \u05d1\u05de\u05d9\u05d3\u05d4 \u05d4\u05de\u05d5\u05ea\u05e8\u05ea \u05dc\u05e4\u05d9 \u05d4\u05d3\u05d9\u05df \u05d4\u05d7\u05dc. \u05d0\u05e3 \u05de\u05e2\u05e8\u05db\u05ea \u05e1\u05e0\u05db\u05e8\u05d5\u05df \u05d0\u05d9\u05e0\u05d4 \u05d7\u05e1\u05d9\u05e0\u05d4 \u05de\u05e9\u05d2\u05d9\u05d0\u05d5\u05ea, \u05d5\u05dc\u05db\u05df \u05de\u05d5\u05de\u05dc\u05e5 \u05dc\u05d1\u05d3\u05d5\u05e7 \u05d9\u05d9\u05d1\u05d5\u05d0, \u05d9\u05e6\u05d9\u05e8\u05d4 \u05d5\u05e2\u05d3\u05db\u05d5\u05df \u05e9\u05dc \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05dc\u05e4\u05e0\u05d9 \u05d4\u05e1\u05ea\u05de\u05db\u05d5\u05ea \u05de\u05dc\u05d0\u05d4 \u05e2\u05dc\u05d9\u05d4\u05dd.',
            ],
          },
          {
            title: '\u05d9\u05e6\u05d9\u05e8\u05ea \u05e7\u05e9\u05e8',
            body: [
              `\u05dc\u05ea\u05de\u05d9\u05db\u05d4 \u05db\u05dc\u05dc\u05d9\u05ea: ${LEGAL_DETAILS.supportEmail}. \u05dc\u05e4\u05e8\u05d8\u05d9\u05d5\u05ea, \u05de\u05d7\u05d9\u05e7\u05d4 \u05d5\u05d6\u05db\u05d5\u05d9\u05d5\u05ea \u05de\u05d9\u05d3\u05e2: ${LEGAL_DETAILS.privacyEmail}.`,
            ],
          },
          {
            title: '\u05ea\u05d5\u05e7\u05e3 \u05d5\u05e2\u05d3\u05db\u05d5\u05e0\u05d9\u05dd',
            body: [
              `\u05ea\u05e0\u05d0\u05d9\u05dd \u05d0\u05dc\u05d4 \u05d1\u05ea\u05d5\u05e7\u05e3 \u05de-${LEGAL_DETAILS.effectiveDate}. \u05d4\u05de\u05e9\u05da \u05e9\u05d9\u05de\u05d5\u05e9 \u05d1-HebSync \u05dc\u05d0\u05d7\u05e8 \u05e2\u05d3\u05db\u05d5\u05df \u05de\u05d4\u05d5\u05ea\u05d9 \u05e9\u05dc \u05d4\u05ea\u05e0\u05d0\u05d9\u05dd \u05de\u05d4\u05d5\u05d5\u05d4 \u05d4\u05e1\u05db\u05de\u05d4 \u05dc\u05e0\u05d5\u05e1\u05d7 \u05d4\u05de\u05e2\u05d5\u05d3\u05db\u05df.`,
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
