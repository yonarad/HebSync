import { useState } from 'react';
import {
  deleteEvent,
  deleteRecurringEventScope,
  type RecurringEventActionScope,
  updateEvent,
  updateRecurringEventScope,
} from '../utils/googleApi';
import type { GoogleCalendarEvent } from '../types/appTypes';

interface UseCalendarEventActionsParams {
  hasWriteAccess: boolean;
  promptForEditingUpgrade: () => void;
  t: (key: string) => string;
  loadCalendarData: () => Promise<void> | void;
  loadEvents: () => Promise<void> | void;
}

export default function useCalendarEventActions({
  hasWriteAccess,
  promptForEditingUpgrade,
  t,
  loadCalendarData,
  loadEvents,
}: UseCalendarEventActionsParams) {
  const [selectedEvent, setSelectedEvent] = useState<GoogleCalendarEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEventClick = (event: GoogleCalendarEvent): void => {
    setSelectedEvent(event);
    setEditTitle(event.summary || '');
    setEditDesc(event.description || '');
    setIsEditing(false);
  };

  const handleDelete = async (
    scope: RecurringEventActionScope = 'single',
    options: { skipConfirm?: boolean } = {},
  ): Promise<void> => {
    if (!hasWriteAccess) {
      promptForEditingUpgrade();
      return;
    }
    if (!selectedEvent?.calendarId || !selectedEvent?.id) return;
    if (!options.skipConfirm && !window.confirm(t('deleteEventConfirm'))) return;
    setIsDeleting(true);
    try {
      if (scope === 'single') {
        await deleteEvent(selectedEvent.calendarId, selectedEvent.id);
      } else {
        await deleteRecurringEventScope(selectedEvent, scope);
      }
      setSelectedEvent(null);
      await loadCalendarData();
      await loadEvents();
    } catch {
      alert(t('deleteEventError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (
    scope: RecurringEventActionScope = 'single',
  ): Promise<void> => {
    if (!hasWriteAccess || !selectedEvent) {
      if (!hasWriteAccess) {
        promptForEditingUpgrade();
      }
      return;
    }
    if (!selectedEvent.calendarId || !selectedEvent.id) return;

    setIsUpdating(true);
    try {
      const updates = {
        summary: editTitle,
        description: editDesc,
      };
      if (scope === 'single') {
        await updateEvent(selectedEvent.calendarId, selectedEvent.id, updates);
      } else {
        await updateRecurringEventScope(selectedEvent, updates, scope);
      }
      setIsEditing(false);
      setSelectedEvent(null);
      await loadCalendarData();
    } catch {
      alert(t('updateEventError'));
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    editDesc,
    editTitle,
    handleDelete,
    handleEventClick,
    handleUpdate,
    isDeleting,
    isEditing,
    isUpdating,
    selectedEvent,
    setEditDesc,
    setEditTitle,
    setIsEditing,
    setSelectedEvent,
  };
}
