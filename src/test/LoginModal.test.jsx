import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LoginModal, { SCOPE_MODES } from '../components/LoginModal';

const renderModal = (props = {}) => {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
  };
  return render(<LoginModal {...defaults} {...props} />);
};

describe('LoginModal Component', () => {

  it('renders nothing when isOpen=false', () => {
    renderModal({ isOpen: false });
    expect(screen.queryByText('בחר רמת הרשאה')).toBeNull();
  });

  it('renders the modal when isOpen=true', () => {
    renderModal();
    expect(screen.getByText('בחר רמת הרשאה')).toBeInTheDocument();
  });

  it('shows all three permission options', () => {
    renderModal();
    expect(screen.getByText('פרטיות מקסימלית')).toBeInTheDocument();
    expect(screen.getByText('צפייה בלבד')).toBeInTheDocument();
    expect(screen.getByText('גישה מלאה')).toBeInTheDocument();
  });

  it('defaults to "app_created" (max privacy) mode', () => {
    const onSelect = vi.fn();
    renderModal({ onSelect });
    fireEvent.click(screen.getByText('המשך להתחברות'));
    expect(onSelect).toHaveBeenCalledWith(SCOPE_MODES.APP_CREATED);
  });

  it('calls onSelect with selected mode when confirmed', () => {
    const onSelect = vi.fn();
    renderModal({ onSelect });
    fireEvent.click(screen.getByText('צפייה בלבד'));
    fireEvent.click(screen.getByText('המשך להתחברות'));
    expect(onSelect).toHaveBeenCalledWith(SCOPE_MODES.READ_ONLY);
  });

  it('calls onSelect with all_events when full access is selected', () => {
    const onSelect = vi.fn();
    renderModal({ onSelect });
    fireEvent.click(screen.getByText('גישה מלאה'));
    fireEvent.click(screen.getByText('המשך להתחברות'));
    expect(onSelect).toHaveBeenCalledWith(SCOPE_MODES.ALL_EVENTS);
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText('ביטול'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    // The X icon button is the only button without visible text — use role query
    const closeButtons = screen.getAllByRole('button');
    // X is the first button (top right)
    const xButton = closeButtons.find(b => !b.textContent.trim());
    if (xButton) fireEvent.click(xButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onSelect without user clicking confirm', () => {
    const onSelect = vi.fn();
    renderModal({ onSelect });
    expect(onSelect).not.toHaveBeenCalled();
  });

});
