import { HDate, HebrewCalendar, Location } from '@hebcal/core';

// Mapping user-facing Hebrew month names to HebCal month names
export const HEBREW_MONTHS = [
  { id: 'Tishrei', label: 'תשרי' },
  { id: 'Cheshvan', label: 'חשוון' },
  { id: 'Kislev', label: 'כסלו' },
  { id: 'Tevet', label: 'טבת' },
  { id: 'Sh\'vat', label: 'שבט' },
  { id: 'Adar I', label: 'אדר א׳' },
  { id: 'Adar II', label: 'אדר ב׳' },
  { id: 'Adar', label: 'אדר' },
  { id: 'Nisan', label: 'ניסן' },
  { id: 'Iyyar', label: 'אייר' },
  { id: 'Sivan', label: 'סיוון' },
  { id: 'Tamuz', label: 'תמוז' },
  { id: 'Av', label: 'אב' },
  { id: 'Elul', label: 'אלול' },
];

/**
 * Returns the relevant months for a specific Hebrew year.
 * Handles leap years (Adar I, Adar II) vs non-leap years (Adar).
 */
export function getMonthsForYear(year) {
  const isLeap = HDate.isLeapYear(parseInt(year, 10));
  
  const baseMonths = [
    { id: 'Tishrei', label: 'תשרי' },
    { id: 'Cheshvan', label: 'חשוון' },
    { id: 'Kislev', label: 'כסלו' },
    { id: 'Tevet', label: 'טבת' },
    { id: 'Sh\'vat', label: 'שבט' }
  ];
  
  const leapMonths = isLeap 
    ? [{ id: 'Adar I', label: 'אדר א׳' }, { id: 'Adar II', label: 'אדר ב׳' }]
    : [{ id: 'Adar', label: 'אדר' }];
    
  const endMonths = [
    { id: 'Nisan', label: 'ניסן' },
    { id: 'Iyyar', label: 'אייר' },
    { id: 'Sivan', label: 'סיוון' },
    { id: 'Tamuz', label: 'תמוז' },
    { id: 'Av', label: 'אב' },
    { id: 'Elul', label: 'אלול' }
  ];
  
  return [...baseMonths, ...leapMonths, ...endMonths];
}

/**
 * Converts a Gregorian Date to a Hebrew Date object.
 * @param {Date} date - The Gregorian date.
 * @param {boolean} afterSunset - Whether the event occurred after sunset.
 * @returns {HDate} The resulting Hebrew Date.
 */
export function gregorianToHebrew(date, afterSunset = false) {
  const hdate = new HDate(date);
  if (afterSunset) {
    return hdate.next(); // After sunset means it's the next Hebrew day
  }
  return hdate;
}

/**
 * Generates an RDATE string for a given Hebrew date over a specified span of years.
 * @param {number} startHebrewYear - The original Hebrew year (e.g. 5752).
 * @param {string} monthName - The HebCal month name.
 * @param {number} day - The day of the month.
 * @param {number} spanYears - How many years ahead to generate (default 120).
 * @param {string} fallback30th - Logic for 30th of month if it doesn't exist: '29th', '1st', or 'skip'.
 * @returns {string} The RDATE string format for Google Calendar.
 */
export function generateRdates(startHebrewYear, monthName, day, spanYears = 120, fallback30th = 'skip') {
  const rdates = [];
  const currentHebrewYear = new HDate().getFullYear();
  
  // We want to generate from the current year to current + spanYears
  // But also include the original date if it's in the future or for completeness
  const startGeneratingYear = Math.min(startHebrewYear, currentHebrewYear);
  const endYear = currentHebrewYear + spanYears;

  for (let year = startGeneratingYear; year <= endYear; year++) {
    let targetMonth = monthName;
    let targetDay = day;
    
    // 1. Leap year Adar logic
    const isLeapYear = HDate.isLeapYear(year);
    if (isLeapYear && monthName === 'Adar') {
      // Event happened in Adar (non-leap), in leap year it goes to Adar II
      targetMonth = 'Adar II';
    } else if (!isLeapYear && (monthName === 'Adar I' || monthName === 'Adar II')) {
      // Event happened in Adar I/II (leap), in normal year it goes to Adar
      targetMonth = 'Adar';
    }

    // 2. The 30th Day logic
    // Some months can have 29 or 30 days depending on the year (Cheshvan, Kislev).
    // Adar I always has 30, Adar II always 29. Regular Adar has 29.
    // If user selected 30th but the month only has 29 days this year:
    let isValidDay = true;
    const monthNum = HDate.monthFromName(targetMonth);
    try {
      const daysInMonth = HDate.daysInMonth(monthNum, year);
      if (targetDay === 30 && daysInMonth === 29) {
        if (fallback30th === 'skip') {
          continue; // Skip this year entirely
        } else if (fallback30th === '29th') {
          targetDay = 29;
        } else if (fallback30th === '1st') {
          // Move to 1st of the next month
          // We create a temp HDate of 29th, and do next()
          const tempDate = new HDate(29, targetMonth, year);
          const nextDay = tempDate.next();
          targetDay = nextDay.getDate();
          targetMonth = nextDay.getMonthName();
          year = nextDay.getFullYear(); // In case the next month is in the next year (e.g. Elul -> Tishrei)
        }
      }
    } catch (e) {
      console.warn("Invalid date configuration", year, targetMonth);
      continue;
    }

    try {
      const eventHDate = new HDate(targetDay, targetMonth, year);
      const gregorianDate = eventHDate.greg();
      
      // Format to YYYYMMDDThhmmssZ (e.g., 20261109T000000Z)
      const formatted = formatToRdateUTC(gregorianDate);
      // Ensure no duplicates
      if (!rdates.includes(formatted)) {
        rdates.push(formatted);
      }
    } catch (e) {
      console.warn("Could not generate date for", targetDay, targetMonth, year, e);
    }
  }

  return rdates.join(',');
}

/**
 * Formats a Date object to the RDATE UTC string expected by iCalendar/Google.
 */
function formatToRdateUTC(date) {
  // We want the event to be an all-day event or have a specific time?
  // Usually RDATE for all-day events requires DATE format: YYYYMMDD
  // But Google Calendar might require DATE-TIME or just DATE.
  // Standard DATE format for all day: YYYYMMDD
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `VALUE=DATE:${yyyy}${mm}${dd}`; 
  // Note: Using VALUE=DATE allows all-day recurring events.
}

/**
 * Generates preview occurrences for a given Hebrew date.
 */
export function getPreviewDates(startHebrewYear, monthName, day, spanYears = 10, fallback30th = 'skip') {
  const occurrences = [];
  const currentHebrewYear = new HDate().getFullYear();
  
  // For preview, we show from current year onwards
  const startYear = Math.max(startHebrewYear, currentHebrewYear);
  const endYear = startYear + spanYears;

  for (let year = startYear; year <= endYear; year++) {
    let targetMonth = monthName;
    let targetDay = day;
    let note = "";
    
    // 1. Leap year Adar logic
    const isLeapYear = HDate.isLeapYear(year);
    if (isLeapYear && monthName === 'Adar') {
      targetMonth = 'Adar II';
      note = "שנה מעוברת - הועבר לאדר ב׳";
    } else if (!isLeapYear && (monthName === 'Adar I' || monthName === 'Adar II')) {
      targetMonth = 'Adar';
      note = "שנה פשוטה - הועבר לאדר";
    }

    // 2. The 30th Day logic
    const monthNum = HDate.monthFromName(targetMonth);
    const daysInMonth = HDate.daysInMonth(monthNum, year);
    if (targetDay === 30 && daysInMonth === 29) {
      if (fallback30th === 'skip') {
        continue; 
      } else if (fallback30th === '29th') {
        targetDay = 29;
        note = "הוקדם ל-כ״ט (חודש חסר)";
      } else if (fallback30th === '1st') {
        const tempDate = new HDate(29, targetMonth, year);
        const nextDay = tempDate.next();
        targetDay = nextDay.getDate();
        targetMonth = nextDay.getMonthName();
        note = "נדחה ל-א׳ (חודש חסר)";
      }
    }

    try {
      const eventHDate = new HDate(targetDay, targetMonth, year);
      occurrences.push({
        hebrewYear: year,
        hebrewDate: eventHDate.renderGematriya(),
        gregorianDate: eventHDate.greg().toLocaleDateString('he-IL'),
        note: note
      });
    } catch (e) {}
  }
  return occurrences;
}

/**
 * Get days in a specific Hebrew month and year
 */
export function getDaysInHebrewMonth(year, monthName) {
  try {
    const monthNum = HDate.monthFromName(monthName);
    return HDate.daysInMonth(monthNum, year);
  } catch (e) {
    return 30; // default safe fallback for UI before year is selected
  }
}
