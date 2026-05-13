import { useState } from 'react';
import { deleteEvent, updateEvent } from '../utils/googleApi';
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

  const handleEventClick = (event: GoogleCalendarEvent): void => {
    setSelectedEvent(event);
    setEditTitle(event.summary || '');
    setEditDesc(event.description || '');
    setIsEditing(false);
  };

  const handleDelete = async (
    calendarId?: string,
    googleEventId?: string,
  ): Promise<void> => {
    if (!hasWriteAccess) {
      promptForEditingUpgrade();
      return;
    }
    if (!calendarId || !googleEventId) return;
    if (!window.confirm(t('deleteEventConfirm'))) return;
    setIsDeleting(true);
    try {
      await deleteEvent(calendarId, googleEventId);
      setSelectedEvent(null);
      await loadCalendarData();
      await loadEvents();
    } catch {
      alert(t('deleteEventError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (): Promise<void> => {
    if (!hasWriteAccess || !selectedEvent) {
      if (!hasWriteAccess) {
        promptForEditingUpgrade();
      }
      return;
    }
    if (!selectedEvent.calendarId || !selectedEvent.id) return;

    try {
      await updateEvent(selectedEvent.calendarId, selectedEvent.id, {
        summary: editTitle,
        description: editDesc,
      });
      setIsEditing(false);
      setSelectedEvent(null);
      await loadCalendarData();
    } catch {
      alert(t('updateEventError'));
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
    selectedEvent,
    setEditDesc,
    setEditTitle,
    setIsEditing,
    setSelectedEvent,
  };
}
