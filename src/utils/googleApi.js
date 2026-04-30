// The Client ID will need to be provided by the user in production.
// For now, we use a placeholder or empty string to be filled later.
export const GOOGLE_CLIENT_ID = '199697397572-lhi5p3n99ttiak8jver8a9trblb0n4f7.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

/**
 * Initialize Google Identity Services for OAuth token.
 */
export function authenticateWithGoogle(scopeMode, onSuccess, onError) {
  if (!window.google) {
    onError(new Error("Google Identity Services not loaded"));
    return;
  }

  let scope = 'https://www.googleapis.com/auth/calendar.events';
  if (scopeMode === 'app_created') {
    scope = 'https://www.googleapis.com/auth/calendar.app.created';
  } else if (scopeMode === 'read_only') {
    scope = 'https://www.googleapis.com/auth/calendar.readonly';
  }

  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: scope,
    callback: (response) => {
      if (response.error) {
        onError(response);
      } else {
        // Save the access token to session storage
        sessionStorage.setItem('gcal_token', response.access_token);
        sessionStorage.setItem('gcal_scope_mode', scopeMode);
        onSuccess(response.access_token);
      }
    },
  });

  client.requestAccessToken();
}

/**
 * Gets the stored access token.
 */
export function getAccessToken() {
  return sessionStorage.getItem('gcal_token');
}

/**
 * Logout
 */
export function logout() {
  sessionStorage.removeItem('gcal_token');
  sessionStorage.removeItem('gcal_scope_mode');
  sessionStorage.removeItem('gcal_app_calendar_id');
}

/**
 * Get active calendar ID based on scope mode
 */
export async function getCalendarId() {
  const mode = sessionStorage.getItem('gcal_scope_mode');
  if (mode === 'all_events' || mode === 'read_only' || !mode) {
    return 'primary';
  }

  // mode === 'app_created'
  const cachedId = sessionStorage.getItem('gcal_app_calendar_id');
  if (cachedId) return cachedId;

  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  // Fetch calendars list
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error("Failed to fetch calendars");
  const data = await response.json();

  const myCal = data.items?.find(c => c.summary === 'היומן העברי שלי (HebCal-Sync)');
  if (myCal) {
    sessionStorage.setItem('gcal_app_calendar_id', myCal.id);
    return myCal.id;
  }

  // Create it if not found
  const createRes = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ 
      summary: 'היומן העברי שלי (HebCal-Sync)', 
      description: 'יומן זה נוצר על ידי אפליקציית HebCal-Sync' 
    })
  });
  
  if (!createRes.ok) throw new Error("Failed to create app calendar");
  const createData = await createRes.json();
  sessionStorage.setItem('gcal_app_calendar_id', createData.id);
  return createData.id;
}

/**
 * Fetch events created by this app.
 * We use the privateExtendedProperty filter to only get our events.
 */
export async function fetchMyAppEvents() {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const calendarId = await getCalendarId();

  // Fetch events from the calendar that have our appIdentifier
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.append('privateExtendedProperty', 'appIdentifier=MyHebrewCalendar');
  url.searchParams.append('maxResults', '100');
  url.searchParams.append('showDeleted', 'false');

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch events: " + response.statusText);
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Fetch all events for a specific time range.
 */
export async function fetchEventsInRange(timeMin, timeMax) {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const calendarId = await getCalendarId();

  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.append('timeMin', timeMin);
  url.searchParams.append('timeMax', timeMax);
  url.searchParams.append('singleEvents', 'true'); // Expand recurrences
  url.searchParams.append('orderBy', 'startTime');

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch events in range");
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Creates a recurring event using RDATE strings.
 */
export async function createHebcalEvent(title, category, originalHebrewYear, rdateString) {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  // Generate a unique ID to group these if needed, 
  // but RDATE is a single event anyway.
  const eventId = crypto.randomUUID();

  // Create the event payload
  // RDATE requires the start and end dates to be the first occurrence usually,
  // or just use recurrence array.
  // Actually, for Google Calendar, to use RDATE, we put it in the `recurrence` array.
  // The event's `start` and `end` should be the very first date in the RDATE list, or a dummy initial date.

  // Let's extract the first date from the RDATE string (VALUE=DATE:YYYYMMDD) to set as start.
  const rdates = rdateString.split(',');
  let firstDateStr = rdates[0].replace('VALUE=DATE:', ''); // "YYYYMMDD"

  const startY = firstDateStr.substring(0, 4);
  const startM = firstDateStr.substring(4, 6);
  const startD = firstDateStr.substring(6, 8);
  const startDateFormatted = `${startY}-${startM}-${startD}`; // "YYYY-MM-DD"

  const eventPayload = {
    summary: title,
    description: `שנת מקור: ${originalHebrewYear}\n\nנוצר באמצעות My Hebrew Calendar`,
    start: {
      date: startDateFormatted, // All day event
    },
    end: {
      date: startDateFormatted, // All day event
    },
    recurrence: chunkRdates(rdates),
    extendedProperties: {
      private: {
        appIdentifier: 'MyHebrewCalendar',
        originalHebrewYear: String(originalHebrewYear),
        eventID: eventId,
        category: category
      }
    }
  };

  const calendarId = await getCalendarId();

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(eventPayload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("API Error Detail:", JSON.stringify(errorData, null, 2));
    const errorMsg = errorData.error?.message || response.statusText;
    throw new Error(`שגיאת גוגל: ${errorMsg}`);
  }

  return await response.json();
}

/**
 * Deletes an event by Google Calendar ID
 */
export async function deleteEvent(googleEventId) {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const calendarId = await getCalendarId();

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${googleEventId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to delete event");
  }
  return true;
}

/**
 * Helper to chunk RDATE strings to stay within Google's length limits.
 */
function chunkRdates(rdates) {
  const CHUNK_SIZE = 80; // Number of dates per line
  const recurrenceLines = [];
  
  for (let i = 0; i < rdates.length; i += CHUNK_SIZE) {
    const chunk = rdates.slice(i, i + CHUNK_SIZE);
    const cleanChunk = chunk.map(r => r.replace('VALUE=DATE:', ''));
    recurrenceLines.push(`RDATE;VALUE=DATE:${cleanChunk.join(',')}`);
  }
  
  return recurrenceLines;
}
