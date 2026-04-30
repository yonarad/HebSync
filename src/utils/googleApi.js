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

  let scope = '';
  if (scopeMode === 'all_events') {
    scope = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
  } else if (scopeMode === 'read_only') {
    scope = 'https://www.googleapis.com/auth/calendar.readonly';
  } else if (scopeMode === 'app_created') {
    // We add calendar.calendarlist.readonly to be able to list calendars in a stateless way
    scope = 'https://www.googleapis.com/auth/calendar.app.created https://www.googleapis.com/auth/calendar.calendarlist.readonly';
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
 * Logout - clears local session only
 */
export function logout() {
  sessionStorage.removeItem('gcal_token');
  sessionStorage.removeItem('gcal_scope_mode');
  sessionStorage.removeItem('gcal_app_calendar_id');
}

/**
 * Revoke Access - tells Google to invalidate the token and remove app permissions
 */
export async function revokeAccess() {
  const token = getAccessToken();
  if (!token) return;

  try {
    // Google's revoke endpoint
    await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
  } catch (e) {
    console.error("Failed to revoke token:", e);
  } finally {
    // Always clear local data
    logout();
  }
}

export async function fetchAllCalendars() {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error("Failed to fetch calendars");
  const data = await response.json();
  const items = data.items || [];

  const mode = sessionStorage.getItem('gcal_scope_mode');
  if (mode === 'app_created') {
    // Filter to show only calendars created by this app (using our signature in description)
    return items.filter(cal => cal.description && cal.description.includes('ID:hebcal-sync-app'));
  }

  return items;
}

export async function createNewCalendar(summary) {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({ 
      summary: summary, 
      description: 'יומן זה נוצר על ידי אפליקציית HebCal-Sync. [ID:hebcal-sync-app]' 
    })
  });
  
  if (!response.ok) throw new Error("Failed to create calendar");
  return await response.json();
}

/**
 * Fetch events created by this app.
 * We use the privateExtendedProperty filter to only get our events.
 */
export async function fetchMyAppEvents(calendarIds = []) {
  if (calendarIds.length === 0) return [];
  
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const promises = calendarIds.map(async (calendarId) => {
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

    if (!response.ok) return [];
    const data = await response.json();
    return (data.items || []).map(event => ({ ...event, calendarId }));
  });

  const results = await Promise.all(promises);
  return results.flat();
}

/**
 * Fetch all events for a specific time range.
 */
export async function fetchEventsInRange(timeMin, timeMax, calendarIds = []) {
  if (calendarIds.length === 0) return [];

  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const promises = calendarIds.map(async (calendarId) => {
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
      return [];
    }
    const data = await response.json();
    return (data.items || []).map(event => ({ ...event, calendarId }));
  });

  const results = await Promise.all(promises);
  return results.flat();
}

/**
 * Creates a recurring event using RDATE strings.
 */
export async function createHebcalEvent(title, category, originalHebrewYear, rdateString, calendarId) {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  if (!calendarId) throw new Error("No calendar selected");

  // Generate a unique ID to group these if needed, 
  // but RDATE is a single event anyway.
  const eventId = crypto.randomUUID();

  // Create the event payload
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
export async function deleteEvent(calendarId, googleEventId) {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

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
