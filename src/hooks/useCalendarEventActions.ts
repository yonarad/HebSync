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
  onDeleteSuccess?: (deletedEvent: GoogleCalendarEvent) => void;
  onUpdateSuccess?: (updatedEvent: GoogleCalendarEvent) => void;
}

export default function useCalendarEventActions({
  hasWriteAccess,
  promptForEditingUpgrade,
  t,
  loadCalendarData,
  loadEvents,
  onDeleteSuccess,
  onUpdateSuccess,
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
      const deletedEvent = selectedEvent;
      if (scope === 'single') {
        await deleteEvent(selectedEvent.calendarId, selectedEvent.id);
      } else {
        await deleteRecurringEventScope(selectedEvent, scope);
      }
      setSelectedEvent(null);
      onDeleteSuccess?.(deletedEvent);
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
      const eventBeforeUpdate = selectedEvent;
      const updates = {
        summary: editTitle,
        description: editDesc,
      };
      let updatedEvent: GoogleCalendarEvent;
      if (scope === 'single') {
        updatedEvent = await updateEvent(selectedEvent.calendarId, selectedEvent.id, updates);
      } else {
        updatedEvent = await updateRecurringEventScope(selectedEvent, updates, scope);
      }
      setIsEditing(false);
      setSelectedEvent(null);
      onUpdateSuccess?.({
        ...eventBeforeUpdate,
        ...updatedEvent,
        summary: updatedEvent.summary ?? updates.summary ?? eventBeforeUpdate.summary,
        description:
          updatedEvent.description ?? updates.description ?? eventBeforeUpdate.description,
      });
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
