import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useCalendarEventActions from '../hooks/useCalendarEventActions';
import { deleteEvent, updateEvent } from '../utils/googleApi';

vi.mock('../utils/googleApi', () => ({
  deleteEvent: vi.fn(),
  updateEvent: vi.fn(),
}));

describe('useCalendarEventActions', () => {
  const promptForEditingUpgrade = vi.fn();
  const loadCalendarData = vi.fn(async () => {});
  const loadEvents = vi.fn(async () => {});
  const t = (key: string) => key;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prompts for an editing upgrade before deleting without write access', async () => {
    const { result } = renderHook(() =>
      useCalendarEventActions({
        hasWriteAccess: false,
        promptForEditingUpgrade,
        t,
        loadCalendarData,
        loadEvents,
      }),
    );

    await act(async () => {
      await result.current.handleDelete('cal1', 'evt1');
    });

    expect(promptForEditingUpgrade).toHaveBeenCalledTimes(1);
    expect(deleteEvent).not.toHaveBeenCalled();
  });

  it('deletes an event and refreshes data when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(deleteEvent).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useCalendarEventActions({
        hasWriteAccess: true,
        promptForEditingUpgrade,
        t,
        loadCalendarData,
        loadEvents,
      }),
    );

    act(() => {
      result.current.handleEventClick({
        id: 'evt1',
        calendarId: 'cal1',
        summary: 'Original title',
        description: 'Original description',
      });
    });

    await act(async () => {
      await result.current.handleDelete('cal1', 'evt1');
    });

    expect(deleteEvent).toHaveBeenCalledWith('cal1', 'evt1');
    expect(loadCalendarData).toHaveBeenCalledTimes(1);
    expect(loadEvents).toHaveBeenCalledTimes(1);
    expect(result.current.selectedEvent).toBeNull();
    expect(result.current.isDeleting).toBe(false);
  });

  it('updates the selected event with edited values', async () => {
    vi.mocked(updateEvent).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() =>
      useCalendarEventActions({
        hasWriteAccess: true,
        promptForEditingUpgrade,
        t,
        loadCalendarData,
        loadEvents,
      }),
    );

    act(() => {
      result.current.handleEventClick({
        id: 'evt1',
        calendarId: 'cal1',
        summary: 'Original title',
        description: 'Original description',
      });
      result.current.setIsEditing(true);
      result.current.setEditTitle('Updated title');
      result.current.setEditDesc('Updated description');
    });

    await act(async () => {
      await result.current.handleUpdate();
    });

    expect(updateEvent).toHaveBeenCalledWith('cal1', 'evt1', {
      summary: 'Updated title',
      description: 'Updated description',
    });
    expect(loadCalendarData).toHaveBeenCalledTimes(1);
    expect(result.current.selectedEvent).toBeNull();
    expect(result.current.isEditing).toBe(false);
  });

  it('shows an alert when update fails', async () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.mocked(updateEvent).mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() =>
      useCalendarEventActions({
        hasWriteAccess: true,
        promptForEditingUpgrade,
        t,
        loadCalendarData,
        loadEvents,
      }),
    );

    act(() => {
      result.current.handleEventClick({
        id: 'evt1',
        calendarId: 'cal1',
        summary: 'Title',
      });
    });

    await act(async () => {
      await result.current.handleUpdate();
    });

    expect(window.alert).toHaveBeenCalledWith('updateEventError');
  });
});
