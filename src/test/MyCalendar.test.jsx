import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import MyCalendar from '../pages/MyCalendar';

// Mock the API utilities
vi.mock('../utils/googleApi', () => ({
  getAccessToken: vi.fn(() => 'mock-token'),
  fetchAllCalendars: vi.fn(() => Promise.resolve([
    { id: 'cal1', summary: 'Personal', accessRole: 'owner' }
  ])),
  fetchMyAppEvents: vi.fn(() => Promise.resolve([])),
  fetchEventsInRange: vi.fn(() => Promise.resolve([])),
  authenticateWithGoogle: vi.fn(),
  revokeAccess: vi.fn()
}));

// Mock the Logo component
vi.mock('../components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'he', changeLanguage: vi.fn() }
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() }
}));

// Mock LanguageSwitcher
vi.mock('../components/LanguageSwitcher', () => ({
  default: () => <div data-testid="language-switcher">Lang</div>
}));

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <MyCalendar />
    </BrowserRouter>
  );
};

describe('My Calendar Component', () => {
  it('should render the dashboard header and logo', () => {
    renderDashboard();
    // Using a more specific selector or getting the first one
    expect(screen.getAllByText(/Heb/)[0]).toBeInTheDocument();
    expect(screen.getByTestId('logo')).toBeInTheDocument();
  });

  it('should have Select All and Clear All buttons in the sidebar', async () => {
    renderDashboard();
    // In our mock, t('selectAll') returns 'selectAll'
    const selectAllBtn = await screen.findByText('selectAll');
    const clearAllBtn = await screen.findByText('clearAll');
    expect(selectAllBtn).toBeInTheDocument();
    expect(clearAllBtn).toBeInTheDocument();
  });

  it('should have external events toggle', () => {
    renderDashboard();
    const externalToggle = screen.getAllByText('externalEvents');
    expect(externalToggle.length).toBeGreaterThan(0);
  });
});
