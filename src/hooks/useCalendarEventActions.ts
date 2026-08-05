import { useState } from 'react';
import {
  deleteEvent,
  deleteRecurringEventScope,
  type RecurringEventActionScope,
  updateEvent,
  updateRecurringEventScope,
} from '../utils/googleApi';
import type { EventReminderSettings, GoogleCalendarEvent } from '../types/appTypes';
import {
  buildGoogleEventReminders,
  DEFAULT_REMINDER_SETTINGS,
  getReminderSettingsFromGoogleEvent,
} from '../utils/googleCalendarReminders';

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
  const [editReminderSettings, setEditReminderSettingsState] = useState<EventReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [isReminderUnsupported, setIsReminderUnsupported] = useState(false);
  const [hasReminderChanged, setHasReminderChanged] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleEventClick = (event: GoogleCalendarEvent): void => {
    const parsedReminders = getReminderSettingsFromGoogleEvent(event.reminders);
    setSelectedEvent(event);
    setEditTitle(event.summary || '');
    setEditDesc(event.description || '');
    setEditReminderSettingsState(parsedReminders.settings);
    setIsReminderUnsupported(parsedReminders.isUnsupported);
    setHasReminderChanged(false);
    setIsEditing(false);
  };

  const setEditReminderSettings = (settings: EventReminderSettings): void => {
    setEditReminderSettingsState(settings);
    setIsReminderUnsupported(false);
    setHasReminderChanged(true);
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
      const updates: Partial<GoogleCalendarEvent> = {
        summary: editTitle,
        description: editDesc,
      };
      if (hasReminderChanged) {
        updates.reminders = buildGoogleEventReminders(editReminderSettings);
      }
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
        reminders: updatedEvent.reminders ?? updates.reminders ?? eventBeforeUpdate.reminders,
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
    editReminderSettings,
    editTitle,
    handleDelete,
    handleEventClick,
    handleUpdate,
    isDeleting,
    isEditing,
    isReminderUnsupported,
    isUpdating,
    selectedEvent,
    setEditDesc,
    setEditReminderSettings,
    setEditTitle,
    setIsEditing,
    setSelectedEvent,
  };
}
