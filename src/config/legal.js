export const LEGAL_DETAILS = {
  operatorName:
    import.meta.env.VITE_LEGAL_ENTITY_NAME || 'Yehonatan Arad / יהונתן ארד',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || 'support@hebsync.org',
  privacyEmail: import.meta.env.VITE_PRIVACY_EMAIL || 'privacy@hebsync.org',
  effectiveDate: import.meta.env.VITE_LEGAL_EFFECTIVE_DATE || '2026-05-08',
};

export function hasPlaceholderLegalDetails() {
  return (
    LEGAL_DETAILS.supportEmail.endsWith('@example.com') ||
    LEGAL_DETAILS.privacyEmail.endsWith('@example.com')
  );
}
