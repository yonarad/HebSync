import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AddEvent from '../pages/AddEvent';

vi.mock('../utils/googleApi', () => ({
  getAccessToken: vi.fn(() => 'mock-token'),
  fetchAllCalendars: vi.fn(() => Promise.resolve([
    { id: 'cal1', summary: 'Personal', accessRole: 'owner' }
  ])),
  authenticateWithGoogle: vi.fn(),
  revokeAccess: vi.fn(),
  createHebcalEvent: vi.fn()
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

// Mock Logo
vi.mock('../components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>
}));

const renderAddEvent = () => {
  return render(
    <BrowserRouter>
      <AddEvent />
    </BrowserRouter>
  );
};

describe('AddEvent Component', () => {
  it('should render the form headers', () => {
    renderAddEvent();
    expect(screen.getByText('addEventTitle')).toBeInTheDocument();
    expect(screen.getByText('eventName')).toBeInTheDocument();
  });

  it('should not have any calendar selected by default', async () => {
    renderAddEvent();
    const selectAllBtn = await screen.findByText('selectAll');
    expect(selectAllBtn).toBeInTheDocument();
    // Check that no checkbox is checked
    const checkboxes = screen.getAllByRole('checkbox');
    const calendarCheckboxes = checkboxes.filter(cb => !cb.name || cb.name === 'calendar-selection'); // filters out the gregorian toggle
    calendarCheckboxes.forEach(cb => {
      if (cb.id !== 'gregorian-toggle') { // simple check to avoid the toggle
        expect(cb.checked).toBe(false);
      }
    });
  });

  it('should show Hebrew/Gregorian toggle option', () => {
    renderAddEvent();
    expect(screen.getByText('enterGregorian')).toBeInTheDocument();
  });
});
