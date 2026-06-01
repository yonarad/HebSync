import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LegalPageLayout from '../components/LegalPageLayout';
import { LEGAL_DETAILS, hasPlaceholderLegalDetails } from '../config/legal';
import { deleteAccountData, getAccessToken } from '../utils/googleApi';

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

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const isHebrew = i18n.language === 'he';
  const placeholderWarning = hasPlaceholderLegalDetails();
  const [isDeletingAccountData, setIsDeletingAccountData] = useState(false);
  const isAuthenticated = Boolean(getAccessToken());

  const content: PageContent = isHebrew
    ? {
        title: '\u05de\u05d3\u05d9\u05e0\u05d9\u05d5\u05ea \u05e4\u05e8\u05d8\u05d9\u05d5\u05ea',
        subtitle:
          '\u05e2\u05de\u05d5\u05d3 \u05d6\u05d4 \u05de\u05e1\u05d1\u05d9\u05e8 \u05d0\u05d9\u05d6\u05d4 \u05de\u05d9\u05d3\u05e2 HebSync \u05d0\u05d5\u05e1\u05e3, \u05d0\u05d9\u05da \u05d4\u05d5\u05d0 \u05de\u05e9\u05ea\u05de\u05e9 \u05d1\u05d5, \u05d0\u05d9\u05dc\u05d5 \u05d4\u05e8\u05e9\u05d0\u05d5\u05ea Google Calendar \u05e0\u05d3\u05e8\u05e9\u05d5\u05ea, \u05d5\u05d0\u05d9\u05da \u05d0\u05e4\u05e9\u05e8 \u05dc\u05e0\u05ea\u05e7 \u05d2\u05d9\u05e9\u05d4 \u05d0\u05d5 \u05dc\u05d1\u05e7\u05e9 \u05de\u05d7\u05d9\u05e7\u05d4.',
        warning:
          '\u05dc\u05e4\u05e0\u05d9 \u05d4\u05d2\u05e9\u05ea \u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05dc\u05d0\u05d9\u05de\u05d5\u05ea \u05e9\u05dc Google \u05e6\u05e8\u05d9\u05da \u05dc\u05d4\u05d7\u05dc\u05d9\u05e3 \u05d0\u05ea \u05db\u05ea\u05d5\u05d1\u05d5\u05ea \u05d4\u05e7\u05e9\u05e8 \u05d4\u05d6\u05de\u05e0\u05d9\u05d5\u05ea \u05d1\u05e4\u05e8\u05d8\u05d9 \u05de\u05e4\u05e2\u05d9\u05dc \u05d0\u05de\u05d9\u05ea\u05d9\u05d9\u05dd.',
        sections: [
          {
            title: '\u05de\u05d9 \u05de\u05e4\u05e2\u05d9\u05dc \u05d0\u05ea \u05d4\u05e9\u05d9\u05e8\u05d5\u05ea',
            body: [
              `${LEGAL_DETAILS.operatorName} \u05de\u05e4\u05e2\u05d9\u05dc \u05d0\u05ea HebSync.`,
              `\u05dc\u05e9\u05d0\u05dc\u05d5\u05ea \u05e4\u05e8\u05d8\u05d9\u05d5\u05ea, \u05de\u05d7\u05d9\u05e7\u05d4 \u05d0\u05d5 \u05de\u05d9\u05de\u05d5\u05e9 \u05d6\u05db\u05d5\u05d9\u05d5\u05ea \u05d0\u05e4\u05e9\u05e8 \u05dc\u05e4\u05e0\u05d5\u05ea \u05dc-${LEGAL_DETAILS.privacyEmail}. \u05dc\u05e9\u05d0\u05dc\u05d5\u05ea \u05ea\u05de\u05d9\u05db\u05d4 \u05db\u05dc\u05dc\u05d9\u05d5\u05ea \u05d0\u05e4\u05e9\u05e8 \u05dc\u05e4\u05e0\u05d5\u05ea \u05dc-${LEGAL_DETAILS.supportEmail}.`,
            ],
          },
          {
            title: '\u05d0\u05d9\u05d6\u05d4 \u05de\u05d9\u05d3\u05e2 \u05d0\u05e0\u05d7\u05e0\u05d5 \u05d0\u05d5\u05e1\u05e4\u05d9\u05dd',
            list: [
              '\u05de\u05d9\u05d3\u05e2 \u05d1\u05e1\u05d9\u05e1\u05d9 \u05de\u05d7\u05e9\u05d1\u05d5\u05df Google \u05e9\u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05de\u05d7\u05d1\u05e8, \u05db\u05de\u05d5 \u05de\u05d6\u05d4\u05d4 Google, \u05db\u05ea\u05d5\u05d1\u05ea \u05d0\u05d9\u05de\u05d9\u05d9\u05dc \u05d5\u05e0\u05ea\u05d5\u05e0\u05d9 \u05d7\u05d9\u05d1\u05d5\u05e8 \u05d1\u05e1\u05d9\u05e1\u05d9\u05d9\u05dd.',
              '\u05e8\u05de\u05ea \u05d4\u05d4\u05e8\u05e9\u05d0\u05d4 \u05e9\u05e0\u05d1\u05d7\u05e8\u05d4 \u05d1-HebSync: \u05d9\u05d5\u05de\u05e0\u05d9 HebSync \u05d1\u05dc\u05d1\u05d3, \u05e6\u05e4\u05d9\u05d9\u05d4 \u05d1\u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05e7\u05d9\u05d9\u05de\u05d9\u05dd, \u05d0\u05d5 \u05e2\u05e8\u05d9\u05db\u05ea \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05db\u05d0\u05e9\u05e8 \u05e0\u05d3\u05e8\u05e9\u05ea \u05d4\u05e8\u05e9\u05d0\u05d4 \u05db\u05d6\u05d5.',
              '\u05de\u05d8\u05d0-\u05d3\u05d0\u05d8\u05d4 \u05e9\u05dc \u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05d5\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05e9\u05e0\u05d3\u05e8\u05e9 \u05db\u05d3\u05d9 \u05dc\u05d4\u05e6\u05d9\u05d2 \u05d9\u05d5\u05de\u05e0\u05d9\u05dd, \u05dc\u05e6\u05e4\u05d5\u05ea \u05d1\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd, \u05d5\u05dc\u05d9\u05e6\u05d5\u05e8 \u05d0\u05d5 \u05dc\u05e2\u05d3\u05db\u05df \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05dc\u05e4\u05d9 \u05d4\u05e4\u05e2\u05d5\u05dc\u05d5\u05ea \u05e9\u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05d1\u05d5\u05d7\u05e8.',
              'Cookies \u05d4\u05db\u05e8\u05d7\u05d9\u05d9\u05dd \u05dc-authentication \u05d5\u05dc\u05e9\u05de\u05d9\u05e8\u05d4 \u05e2\u05dc session \u05de\u05d0\u05d5\u05d1\u05d8\u05d7.',
              '\u05e0\u05ea\u05d5\u05e0\u05d9 \u05e6\u05d3-\u05dc\u05e7\u05d5\u05d7 \u05de\u05d9\u05e0\u05d9\u05de\u05dc\u05d9\u05d9\u05dd \u05d1-localStorage \u05dc\u05e6\u05d5\u05e8\u05da \u05e9\u05de\u05d9\u05e8\u05ea \u05de\u05e6\u05d1 \u05d4\u05d4\u05ea\u05d7\u05d1\u05e8\u05d5\u05ea \u05d4\u05d1\u05e1\u05d9\u05e1\u05d9, \u05e8\u05de\u05ea \u05d4\u05d4\u05e8\u05e9\u05d0\u05d4, \u05d5\u05e1\u05e0\u05db\u05e8\u05d5\u05df \u05d1\u05d9\u05df \u05d8\u05d0\u05d1\u05d9\u05dd. \u05de\u05d9\u05d3\u05e2 \u05d6\u05d4 \u05d0\u05d9\u05e0\u05d5 \u05db\u05d5\u05dc\u05dc \u05e4\u05e8\u05d5\u05e4\u05d9\u05dc \u05de\u05e9\u05ea\u05de\u05e9 \u05de\u05dc\u05d0 \u05d0\u05d5 CSRF token.',
            ],
          },
          {
            title: '\u05d0\u05d9\u05da \u05d0\u05e0\u05d7\u05e0\u05d5 \u05de\u05e9\u05ea\u05de\u05e9\u05d9\u05dd \u05d1\u05de\u05d9\u05d3\u05e2',
            list: [
              '\u05dc\u05d4\u05ea\u05d7\u05d1\u05e8 \u05dc\u05d7\u05e9\u05d1\u05d5\u05df Google \u05e9\u05d1\u05d7\u05e8\u05ea \u05d5\u05dc\u05d0\u05de\u05ea \u05e9\u05d1\u05e7\u05e9\u05ea \u05d4\u05d7\u05d9\u05d1\u05d5\u05e8 \u05d4\u05d2\u05d9\u05e2\u05d4 \u05de\u05de\u05da.',
              '\u05dc\u05d4\u05e6\u05d9\u05d2 \u05d0\u05ea \u05d4\u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05d5\u05d4\u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05e9\u05e8\u05dc\u05d5\u05d5\u05e0\u05d8\u05d9\u05d9\u05dd \u05dc\u05d4\u05e8\u05e9\u05d0\u05d5\u05ea \u05e9\u05d0\u05d9\u05e9\u05e8\u05ea.',
              '\u05dc\u05d9\u05e6\u05d5\u05e8, \u05dc\u05e2\u05d3\u05db\u05df \u05d0\u05d5 \u05dc\u05de\u05d7\u05d5\u05e7 \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05e8\u05e7 \u05db\u05d0\u05e9\u05e8 \u05d1\u05d7\u05e8\u05ea \u05d1\u05e4\u05e2\u05d5\u05dc\u05d4 \u05db\u05d6\u05d5 \u05d5\u05d4\u05e8\u05e9\u05d9\u05ea \u05dc\u05db\u05da.',
              '\u05dc\u05e9\u05de\u05d5\u05e8 \u05d0\u05ea \u05d4\u05de\u05e6\u05d1 \u05e9\u05e0\u05d1\u05d7\u05e8 \u05db\u05d3\u05d9 \u05e9\u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05ea\u05d5\u05db\u05dc \u05dc\u05d4\u05de\u05e9\u05d9\u05da \u05dc\u05e2\u05d1\u05d5\u05d3 \u05d2\u05dd \u05d1\u05d9\u05df \u05d8\u05e2\u05d9\u05e0\u05d5\u05ea \u05d3\u05e3 \u05d0\u05d5 \u05d8\u05d0\u05d1\u05d9\u05dd.',
              '\u05dc\u05d4\u05d2\u05df \u05e2\u05dc \u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05de\u05e4\u05e0\u05d9 \u05e9\u05d9\u05de\u05d5\u05e9 \u05dc\u05d0 \u05de\u05d5\u05e8\u05e9\u05d4 \u05d1\u05d0\u05de\u05e6\u05e2\u05d5\u05ea session, CSRF token \u05d5\u05d0\u05d9\u05de\u05d5\u05ea \u05e9\u05e8\u05ea.',
            ],
          },
          {
            title: '\u05d4\u05e8\u05e9\u05d0\u05d5\u05ea Google \u05e9\u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05de\u05d1\u05e7\u05e9\u05ea',
            body: ['HebSync \u05de\u05d1\u05e7\u05e9 \u05d4\u05e8\u05e9\u05d0\u05d5\u05ea \u05de\u05d3\u05d5\u05e8\u05d2\u05d5\u05ea \u05d5\u05dc\u05d0 \u05de\u05d1\u05e7\u05e9 \u05d2\u05d9\u05e9\u05ea \u05e2\u05e8\u05d9\u05db\u05d4 \u05de\u05dc\u05d0\u05d4 \u05de\u05e8\u05d0\u05e9.'],
            list: [
              'openid \u05d5-email \u05db\u05d3\u05d9 \u05dc\u05d6\u05d4\u05d5\u05ea \u05d0\u05ea \u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05d4\u05de\u05d7\u05d5\u05d1\u05e8.',
              'calendar.app.created \u05db\u05d3\u05d9 \u05dc\u05e2\u05d1\u05d5\u05d3 \u05e2\u05dd \u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05e9\u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05d9\u05d5\u05e6\u05e8\u05ea.',
              'calendar.calendarlist.readonly \u05db\u05d3\u05d9 \u05dc\u05d4\u05e6\u05d9\u05d2 \u05d0\u05ea \u05e8\u05e9\u05d9\u05de\u05ea \u05d4\u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05d4\u05d6\u05de\u05d9\u05e0\u05d9\u05dd.',
              'calendar.readonly \u05db\u05d0\u05e9\u05e8 \u05d1\u05d5\u05d7\u05e8\u05d9\u05dd \u05dc\u05e2\u05d1\u05d5\u05d3 \u05d2\u05dd \u05e2\u05dd \u05d9\u05d5\u05de\u05e0\u05d9\u05dd \u05e7\u05d9\u05d9\u05de\u05d9\u05dd \u05d1\u05de\u05e6\u05d1 \u05e6\u05e4\u05d9\u05d9\u05d4.',
              'calendar.events \u05e8\u05e7 \u05db\u05d0\u05e9\u05e8 \u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05d1\u05d5\u05d7\u05e8 \u05dc\u05d1\u05e6\u05e2 \u05e4\u05e2\u05d5\u05dc\u05ea \u05e2\u05e8\u05d9\u05db\u05d4 \u05d0\u05d5 \u05e0\u05d9\u05d4\u05d5\u05dc \u05d0\u05d9\u05e8\u05d5\u05e2\u05d9\u05dd \u05e9\u05d3\u05d5\u05e8\u05e9\u05ea \u05d6\u05d0\u05ea.',
            ],
          },
          {
            title: '\u05d0\u05d9\u05e4\u05d4 \u05d4\u05de\u05d9\u05d3\u05e2 \u05e0\u05e9\u05de\u05e8 \u05d5\u05dc\u05db\u05de\u05d4 \u05d6\u05de\u05df',
            body: [
              'Cookie \u05d4-session \u05e0\u05e9\u05de\u05e8 \u05e2\u05d3 30 \u05d9\u05d5\u05dd, \u05d0\u05dc\u05d0 \u05d0\u05dd \u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05de\u05ea\u05e0\u05ea\u05e7 \u05e7\u05d5\u05d3\u05dd.',
              'Cookie \u05d6\u05de\u05e0\u05d9 \u05e9\u05dc OAuth state \u05e0\u05e9\u05de\u05e8 \u05e2\u05d3 10 \u05d3\u05e7\u05d5\u05ea \u05dc\u05e6\u05d5\u05e8\u05da \u05d4\u05e9\u05dc\u05de\u05ea \u05ea\u05d4\u05dc\u05d9\u05da \u05d4\u05d7\u05d9\u05d1\u05d5\u05e8 \u05dc-Google.',
              'Access token \u05d5-refresh token \u05e0\u05e9\u05de\u05e8\u05d9\u05dd \u05d1\u05e6\u05d3 \u05d4\u05e9\u05e8\u05ea \u05db\u05d3\u05d9 \u05dc\u05d0\u05e4\u05e9\u05e8 \u05d2\u05d9\u05e9\u05d4 \u05de\u05d0\u05d5\u05d1\u05d8\u05d7\u05ea \u05dc-Google Calendar. \u05d1\u05e2\u05ea \u05e0\u05d9\u05ea\u05d5\u05e7, \u05d4\u05d8\u05d5\u05e7\u05e0\u05d9\u05dd \u05de\u05d1\u05d5\u05d8\u05dc\u05d9\u05dd \u05d5\u05d4-sessions \u05d4\u05e4\u05e2\u05d9\u05dc\u05d9\u05dd \u05e0\u05de\u05d7\u05e7\u05d9\u05dd.',
              '\u05e0\u05ea\u05d5\u05e0\u05d9 localStorage \u05e0\u05e9\u05de\u05e8\u05d9\u05dd \u05d1\u05d3\u05e4\u05d3\u05e4\u05df \u05e2\u05d3 \u05dc\u05e0\u05d9\u05ea\u05d5\u05e7, \u05e0\u05d9\u05e7\u05d5\u05d9 \u05d9\u05d3\u05e0\u05d9 \u05d0\u05d5 \u05de\u05d7\u05d9\u05e7\u05ea \u05e0\u05ea\u05d5\u05e0\u05d9 \u05d4\u05d0\u05ea\u05e8.',
              '\u05e0\u05d9\u05ea\u05d5\u05e7 \u05de\u05d1\u05d8\u05dc \u05d0\u05ea \u05d2\u05d9\u05e9\u05ea Google \u05d5\u05de\u05e1\u05d9\u05d9\u05dd sessions \u05e4\u05e2\u05d9\u05dc\u05d9\u05dd. \u05de\u05d7\u05d9\u05e7\u05d4 \u05de\u05dc\u05d0\u05d4 \u05de\u05ea\u05d5\u05da \u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05de\u05d5\u05d7\u05e7\u05ea \u05d2\u05dd \u05d0\u05ea \u05e8\u05e9\u05d5\u05de\u05ea \u05d4\u05d7\u05d9\u05d1\u05d5\u05e8 \u05d4\u05e9\u05de\u05d5\u05e8\u05d4 \u05de\u05de\u05e1\u05d3 \u05d4\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd.',
            ],
          },
          {
            title: '\u05e2\u05dd \u05de\u05d9 \u05d4\u05de\u05d9\u05d3\u05e2 \u05de\u05e9\u05d5\u05ea\u05e3',
            body: [
              '\u05d4\u05de\u05d9\u05d3\u05e2 \u05de\u05e9\u05d5\u05ea\u05e3 \u05e2\u05dd Google \u05dc\u05e6\u05d5\u05e8\u05da OAuth \u05d5\u05e7\u05e8\u05d9\u05d0\u05d5\u05ea \u05dc-Google Calendar API, \u05d5\u05e2\u05dd \u05e1\u05e4\u05e7\u05d9 \u05ea\u05e9\u05ea\u05d9\u05ea \u05e9\u05e0\u05d3\u05e8\u05e9\u05d9\u05dd \u05dc\u05d4\u05e4\u05e2\u05dc\u05ea \u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4, \u05db\u05de\u05d5 \u05d0\u05d9\u05e8\u05d5\u05d7 \u05d5\u05de\u05e1\u05d3 \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd.',
              '\u05dc\u05d0 \u05e0\u05e2\u05e9\u05d4 \u05e9\u05d9\u05de\u05d5\u05e9 \u05d1\u05de\u05d9\u05d3\u05e2 \u05dc\u05e6\u05d5\u05e8\u05db\u05d9 \u05e4\u05e8\u05e1\u05d5\u05dd, \u05de\u05db\u05d9\u05e8\u05d4 \u05d0\u05d5 tracking \u05e9\u05d9\u05d5\u05d5\u05e7\u05d9.',
            ],
          },
          {
            title: 'Cookies \u05d5\u05d0\u05d7\u05e1\u05d5\u05df \u05de\u05e7\u05d5\u05de\u05d9',
            body: [
              '\u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05de\u05e9\u05ea\u05de\u05e9\u05ea \u05d1-cookies \u05d4\u05db\u05e8\u05d7\u05d9\u05d9\u05dd \u05dc\u05e6\u05d5\u05e8\u05da \u05d4\u05ea\u05d7\u05d1\u05e8\u05d5\u05ea \u05de\u05d0\u05d5\u05d1\u05d8\u05d7\u05ea \u05d5\u05e9\u05de\u05d9\u05e8\u05ea session, \u05d5\u05d1-localStorage \u05de\u05d9\u05e0\u05d9\u05de\u05dc\u05d9 \u05dc\u05e6\u05d5\u05e8\u05da \u05de\u05e6\u05d1 \u05d4\u05d4\u05ea\u05d7\u05d1\u05e8\u05d5\u05ea \u05d4\u05d1\u05e1\u05d9\u05e1\u05d9 \u05d5\u05de\u05e6\u05d1 \u05d4\u05d4\u05e8\u05e9\u05d0\u05d5\u05ea.',
              '\u05d0\u05dd \u05d9\u05ea\u05d5\u05d5\u05e1\u05e4\u05d5 \u05d1\u05e2\u05ea\u05d9\u05d3 analytics, advertising cookies \u05d0\u05d5 \u05db\u05dc\u05d9 tracking \u05dc\u05d0 \u05d4\u05db\u05e8\u05d7\u05d9\u05d9\u05dd, \u05d9\u05d4\u05d9\u05d4 \u05e6\u05d5\u05e8\u05da \u05dc\u05e2\u05d3\u05db\u05df \u05d0\u05ea \u05d4\u05de\u05d3\u05d9\u05e0\u05d9\u05d5\u05ea \u05d5\u05dc\u05e9\u05e7\u05d5\u05dc \u05de\u05e0\u05d2\u05e0\u05d5\u05df consent \u05d1\u05d4\u05ea\u05d0\u05dd \u05dc\u05d3\u05d9\u05df \u05d4\u05d7\u05dc.',
            ],
          },
          {
            title: '\u05d6\u05db\u05d5\u05d9\u05d5\u05ea \u05e4\u05e8\u05d8\u05d9\u05d5\u05ea \u05d5\u05d1\u05e7\u05e9\u05d5\u05ea \u05de\u05d7\u05d9\u05e7\u05d4',
            body: [
              `\u05d0\u05dd GDPR \u05d7\u05dc \u05e2\u05dc\u05d9\u05da, \u05d9\u05d9\u05ea\u05db\u05df \u05e9\u05d9\u05e9 \u05dc\u05da \u05d6\u05db\u05d5\u05d9\u05d5\u05ea \u05db\u05de\u05d5 \u05d2\u05d9\u05e9\u05d4, \u05ea\u05d9\u05e7\u05d5\u05df, \u05de\u05d7\u05d9\u05e7\u05d4, \u05d4\u05d2\u05d1\u05dc\u05ea \u05e2\u05d9\u05d1\u05d5\u05d3 \u05d5\u05d4\u05ea\u05e0\u05d2\u05d3\u05d5\u05ea. \u05dc\u05d1\u05e7\u05e9\u05d5\u05ea \u05db\u05d0\u05dc\u05d4 \u05d0\u05e4\u05e9\u05e8 \u05dc\u05e4\u05e0\u05d5\u05ea \u05dc-${LEGAL_DETAILS.privacyEmail}.`,
              '\u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05db\u05d5\u05dc\u05dc\u05ea \u05d2\u05dd \u05de\u05e1\u05dc\u05d5\u05dc \u05de\u05d7\u05d9\u05e7\u05d4 \u05de\u05dc\u05d0 \u05e9\u05de\u05d1\u05d8\u05dc \u05d0\u05ea \u05d2\u05d9\u05e9\u05ea Google, \u05de\u05d5\u05d7\u05e7 sessions \u05e4\u05e2\u05d9\u05dc\u05d9\u05dd, \u05d5\u05de\u05d5\u05d7\u05e7 \u05d0\u05ea \u05e8\u05e9\u05d5\u05de\u05ea \u05d4\u05d7\u05d9\u05d1\u05d5\u05e8 \u05d4\u05e9\u05de\u05d5\u05e8\u05d4 \u05e9\u05dc HebSync \u05de\u05de\u05e1\u05d3 \u05d4\u05e0\u05ea\u05d5\u05e0\u05d9\u05dd.',
            ],
          },
          {
            title: '\u05d4\u05e2\u05d1\u05e8\u05d5\u05ea \u05d1\u05d9\u05e0\u05dc\u05d0\u05d5\u05de\u05d9\u05d5\u05ea \u05d5\u05d0\u05d1\u05d8\u05d7\u05d4',
            body: [
              '\u05d9\u05d9\u05ea\u05db\u05df \u05e9\u05d4\u05de\u05d9\u05d3\u05e2 \u05d9\u05e2\u05d5\u05d1\u05d3 \u05de\u05d7\u05d5\u05e5 \u05dc\u05de\u05d3\u05d9\u05e0\u05ea \u05d4\u05de\u05d2\u05d5\u05e8\u05d9\u05dd \u05e9\u05dc \u05d4\u05de\u05e9\u05ea\u05de\u05e9 \u05e2\u05dc \u05d9\u05d3\u05d9 Google \u05d5\u05e1\u05e4\u05e7\u05d9 \u05d4\u05ea\u05e9\u05ea\u05d9\u05ea \u05e9\u05dc \u05d4\u05e9\u05d9\u05e8\u05d5\u05ea.',
              'HebSync \u05de\u05e9\u05ea\u05de\u05e9 \u05d1-HTTP-only session cookies, CSRF protection, \u05d5\u05d0\u05d7\u05e1\u05d5\u05df \u05de\u05d5\u05e6\u05e4\u05df \u05e9\u05dc refresh token \u05db\u05d3\u05d9 \u05dc\u05e6\u05de\u05e6\u05dd \u05e1\u05d9\u05db\u05d5\u05e0\u05d9\u05dd \u05e1\u05d1\u05d9\u05e8\u05d9\u05dd.',
            ],
          },
          {
            title: '\u05ea\u05d5\u05e7\u05e3 \u05d5\u05e2\u05d3\u05db\u05d5\u05e0\u05d9\u05dd',
            body: [
              `\u05de\u05d3\u05d9\u05e0\u05d9\u05d5\u05ea \u05d6\u05d5 \u05d1\u05ea\u05d5\u05e7\u05e3 \u05de-${LEGAL_DETAILS.effectiveDate}. \u05d0\u05dd \u05e0\u05e9\u05e0\u05d4 \u05de\u05d4\u05d5\u05ea\u05d9\u05ea \u05d0\u05ea \u05d0\u05d5\u05e4\u05df \u05d4\u05e9\u05d9\u05de\u05d5\u05e9 \u05d1\u05de\u05d9\u05d3\u05e2 \u05d0\u05d5 \u05d0\u05ea \u05d4\u05d4\u05e8\u05e9\u05d0\u05d5\u05ea \u05d4\u05de\u05d1\u05d5\u05e7\u05e9\u05d5\u05ea, \u05e0\u05e2\u05d3\u05db\u05df \u05d0\u05ea \u05d4\u05e2\u05de\u05d5\u05d3 \u05d4\u05d6\u05d4.`,
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
              'Minimal client-side localStorage entries used to keep basic authentication state, permission mode, and cross-tab sync. This local storage does not include a full user profile or a CSRF token.',
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
              'Server-side access and refresh tokens are retained so the service can securely call Google Calendar. Refresh tokens are encrypted before storage. Access tokens are kept server-side only and refreshed or replaced as needed for Google Calendar requests.',
              'Client-side localStorage entries remain in the browser until logout, manual clearing, or site data removal.',
              'Disconnecting revokes Google access and ends active sessions. Full deletion from within the app also removes the saved HebSync connection record from the database.',
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
              'HebSync uses strictly necessary cookies for authentication and session management, and uses minimal localStorage to remember basic sign-in state and permission mode in the browser.',
              'If analytics, advertising cookies, or non-essential trackers are added later, this policy should be updated and a consent mechanism may become necessary depending on applicable law.',
            ],
          },
          {
            title: 'Privacy rights and deletion requests',
            body: [
              `If GDPR or similar privacy laws apply to you, you may have rights such as access, correction, deletion, restriction, and objection. Requests can be sent to ${LEGAL_DETAILS.privacyEmail}.`,
              'HebSync includes a full in-app deletion path that revokes Google access, clears active sessions, and deletes the saved HebSync connection record from the database.',
            ],
          },
          {
            title: 'International transfers and security',
            body: [
              'Your data may be processed outside your country by Google and the service infrastructure providers.',
              'HebSync uses HTTPS in production, HTTP-only and SameSite session cookies, CSRF protection, backend authorization checks, hashed server-side session records, and encrypted refresh-token storage.',
              'Sensitive Google Calendar data is processed only to provide the user-requested calendar features, is not sold, is not used for advertising, and can be removed by disconnecting the Google account or using the in-app deletion flow.',
            ],
          },
          {
            title: 'How sensitive Google data is protected',
            body: [
              'Google OAuth tokens are handled on the server side. Refresh tokens are encrypted before they are written to storage, and session identifiers are stored as hashes rather than in plain text.',
              'The browser stores only minimal sign-in state needed for the app experience. HebSync does not place Google refresh tokens or CSRF secrets in localStorage.',
              'When a user disconnects the service or deletes account data from within the app, HebSync revokes Google access when possible, clears stored tokens, removes active sessions, and deletes the saved connection record used by the service.',
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

  const handleDeleteAccountData = async () => {
    if (!window.confirm(t('deleteAccountDataConfirm'))) return;

    setIsDeletingAccountData(true);

    try {
      await deleteAccountData();
      navigate('/?about=1');
      window.alert(t('deleteAccountDataSuccess'));
    } catch (error) {
      console.error('Failed to delete account data:', error);
      window.alert(t('deleteAccountDataError'));
    } finally {
      setIsDeletingAccountData(false);
    }
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

      {isAuthenticated ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50/80 p-5 dark:border-rose-900/30 dark:bg-rose-900/10">
          <h3 className="text-xl font-black tracking-tight text-rose-900 dark:text-rose-100">
            {t('deleteAccountData')}
          </h3>
          <p className="mt-3 text-sm leading-7 text-rose-800/90 dark:text-rose-200/90 md:text-[15px]">
            {t('deleteAccountDataHint')}
          </p>
          <button
            type="button"
            onClick={handleDeleteAccountData}
            disabled={isDeletingAccountData}
            className="mt-4 inline-flex items-center rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-rose-700 disabled:cursor-wait disabled:opacity-70 dark:bg-rose-500 dark:hover:bg-rose-400"
          >
            {isDeletingAccountData ? (isHebrew ? '\u05de\u05d5\u05d7\u05e7 \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd...' : 'Deleting data...') : t('deleteAccountData')}
          </button>
        </section>
      ) : null}
    </LegalPageLayout>
  );
}
