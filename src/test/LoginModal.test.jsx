import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LoginModal, { SCOPE_MODES } from '../components/LoginModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

const renderModal = (props = {}) => {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
  };

  return render(<LoginModal {...defaults} {...props} />);
};

describe('LoginModal', () => {
  it('renders nothing when closed', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('permissionModalTitle')).toBeNull();
  });

  it('shows the two connect options', () => {
    renderModal();
    expect(screen.getByText('permissionHebsyncOnly')).toBeInTheDocument();
    expect(screen.getByText('permissionAllCalendars')).toBeInTheDocument();
  });

  it('defaults to HebSync-only mode', () => {
    const onSelect = vi.fn();
    renderModal({ onSelect });

    fireEvent.click(screen.getByText('continue'));
    expect(onSelect).toHaveBeenCalledWith(SCOPE_MODES.APP_CREATED);
  });

  it('maps the all-calendars option to the read-only scope for the first step', () => {
    const onSelect = vi.fn();
    renderModal({ onSelect });

    fireEvent.click(screen.getByText('permissionAllCalendars'));
    fireEvent.click(screen.getByText('continue'));

    expect(onSelect).toHaveBeenCalledWith(SCOPE_MODES.READ_ONLY);
  });

  it('can open with the requested option preselected', () => {
    const onSelect = vi.fn();
    renderModal({
      onSelect,
      initialSelectedMode: SCOPE_MODES.READ_ONLY,
    });

    fireEvent.click(screen.getByText('continue'));

    expect(onSelect).toHaveBeenCalledWith(SCOPE_MODES.READ_ONLY);
  });

  it('shows reconnect copy in reauthorize mode', () => {
    renderModal({ mode: 'reauthorize' });
    expect(screen.getByText('permissionReconnectTitle')).toBeInTheDocument();
    expect(screen.getByText('permissionReconnectCta')).toBeInTheDocument();
  });

  it('shows the editing upgrade flow', () => {
    const onSelect = vi.fn();
    renderModal({ mode: 'upgrade', onSelect });

    expect(screen.getByText('permissionUpgradeTitle')).toBeInTheDocument();
    fireEvent.click(screen.getByText('permissionUpgradeCta'));

    expect(onSelect).toHaveBeenCalledWith(SCOPE_MODES.ALL_EVENTS);
  });

  it('keeps the overlay and panel scrollable for small viewports', () => {
    renderModal();

    expect(screen.getByTestId('login-modal-overlay')).toHaveClass('overflow-y-auto');
    expect(screen.getByTestId('login-modal-panel')).toHaveClass('max-md:max-h-[calc(100dvh-1.5rem)]');
  });
});
