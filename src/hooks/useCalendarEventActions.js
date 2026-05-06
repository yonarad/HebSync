import { useState } from 'react';
import { deleteEvent, updateEvent } from '../utils/googleApi';

export default function useCalendarEventActions({
  hasWriteAccess,
  promptForEditingUpgrade,
  t,
  loadCalendarData,
  loadEvents,
}) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setEditTitle(event.summary);
    setEditDesc(event.description || '');
    setIsEditing(false);
  };

  const handleDelete = async (calendarId, googleEventId) => {
    if (!hasWriteAccess) {
      promptForEditingUpgrade();
      return;
    }
    if (!window.confirm(t('deleteEventConfirm'))) return;
    try {
      await deleteEvent(calendarId, googleEventId);
      setSelectedEvent(null);
      loadCalendarData();
      loadEvents();
    } catch (error) {
      alert(t('deleteEventError'));
    }
  };

  const handleUpdate = async () => {
    if (!hasWriteAccess || !selectedEvent) {
      if (!hasWriteAccess) {
        promptForEditingUpgrade();
      }
      return;
    }
    try {
      await updateEvent(selectedEvent.calendarId, selectedEvent.id, {
        summary: editTitle,
        description: editDesc,
      });
      setIsEditing(false);
      setSelectedEvent(null);
      loadCalendarData();
    } catch (error) {
      alert(t('updateEventError'));
    }
  };

  return {
    editDesc,
    editTitle,
    handleDelete,
    handleEventClick,
    handleUpdate,
    isEditing,
    selectedEvent,
    setEditDesc,
    setEditTitle,
    setIsEditing,
    setSelectedEvent,
  };
}
