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

  it('defaults to app_created mode', () => {
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
    const xButton = screen.getAllByRole('button').find((button) => !button.textContent.trim());
    if (xButton) fireEvent.click(xButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onSelect without confirm click', () => {
    const onSelect = vi.fn();
    renderModal({ onSelect });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('shows reauthorization copy when mode=reauthorize', () => {
    renderModal({ mode: 'reauthorize' });
    expect(screen.getByText('נדרש חיבור מחדש לגוגל')).toBeInTheDocument();
    expect(screen.getByText(/תוקף ההתחברות או ההרשאות שלך פג/)).toBeInTheDocument();
    expect(screen.getByText('המשך לחיבור מחדש')).toBeInTheDocument();
  });

  it('resets the selected mode when reopened', () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <LoginModal isOpen={true} onClose={onClose} onSelect={onSelect} />
    );

    fireEvent.click(screen.getByText('צפייה בלבד'));
    fireEvent.click(screen.getByText('המשך להתחברות'));
    expect(onSelect).toHaveBeenLastCalledWith(SCOPE_MODES.READ_ONLY);

    rerender(<LoginModal isOpen={false} onClose={onClose} onSelect={onSelect} />);
    rerender(<LoginModal isOpen={true} onClose={onClose} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('המשך להתחברות'));
    expect(onSelect).toHaveBeenLastCalledWith(SCOPE_MODES.APP_CREATED);
  });
});
