import { HDate, HebrewCalendar, Location, gematriya as hGematriya } from '@hebcal/core';

export const gematriya = hGematriya;

export function formatHebrewYear(year) {
  const yearNumber = Number(year);
  if (!Number.isFinite(yearNumber) || yearNumber <= 0) {
    return String(year);
  }

  const thousands = Math.floor(yearNumber / 1000);
  const remainder = yearNumber % 1000;

  if (thousands === 0) {
    return hGematriya(yearNumber);
  }

  const thousandsPart = hGematriya(thousands);
  const remainderPart = remainder > 0 ? hGematriya(remainder) : '';
  return `${thousandsPart}${remainderPart}`;
}

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

export const FLEXIBLE_30TH_MONTHS = ['Cheshvan', 'Kislev', 'Adar I'];

export function requires30thFallbackDecision(monthName, day) {
  const dayNumber = parseInt(day, 10);
  return dayNumber === 30 && FLEXIBLE_30TH_MONTHS.includes(monthName);
}

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

export function doesHebrewMonthExistInYear(year, monthName) {
  const yearNumber = parseInt(year, 10);
  if (!Number.isFinite(yearNumber)) {
    return false;
  }

  return getMonthsForYear(yearNumber).some((month) => month.id === monthName);
}

export function validateHebrewDateForYear(year, monthName, day) {
  const yearNumber = parseInt(year, 10);
  const dayNumber = parseInt(day, 10);

  if (!Number.isFinite(yearNumber) || yearNumber <= 0) {
    return { isValid: false, reason: 'invalid_year' };
  }

  if (!Number.isFinite(dayNumber) || dayNumber <= 0) {
    return { isValid: false, reason: 'invalid_day' };
  }

  if (!doesHebrewMonthExistInYear(yearNumber, monthName)) {
    return {
      isValid: false,
      reason: 'month_not_in_year',
      isLeapYear: HDate.isLeapYear(yearNumber),
    };
  }

  const maxDay = getDaysInHebrewMonth(yearNumber, monthName);
  const isFlexible30th = requires30thFallbackDecision(monthName, dayNumber);

  if (dayNumber > maxDay) {
    return {
      isValid: false,
      reason: isFlexible30th ? 'missing_flexible_30th' : 'day_out_of_range',
      isLeapYear: HDate.isLeapYear(yearNumber),
      maxDay,
      isFlexible30th,
    };
  }

  return {
    isValid: true,
    reason: 'ok',
    isLeapYear: HDate.isLeapYear(yearNumber),
    maxDay,
    isFlexible30th,
  };
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
export function generateRdates(startHebrewYear, monthName, day, maxOccurrences = 121, fallback30th = 'skip') {
  const rdates = [];
  const currentHebrewYear = new HDate().getFullYear();
  
  let year = Math.min(startHebrewYear, currentHebrewYear);
  const maxSearchYear = currentHebrewYear + maxOccurrences + 20; 

  while (rdates.length < maxOccurrences && year <= maxSearchYear) {
    let targetMonth = monthName;
    let targetDay = day;
    
    // 1. Leap year Adar logic
    const isLeapYear = HDate.isLeapYear(year);
    if (isLeapYear && monthName === 'Adar') {
      targetMonth = 'Adar II';
    } else if (!isLeapYear && (monthName === 'Adar I' || monthName === 'Adar II')) {
      targetMonth = 'Adar';
    }

    // 2. The 30th Day logic
    const monthNum = HDate.monthFromName(targetMonth);
    const daysInMonth = HDate.daysInMonth(monthNum, year);
    
    let createdThisYear = false;
    if (targetDay === 30 && daysInMonth === 29) {
      if (fallback30th === '29th') {
        targetDay = 29;
        try {
          const eventHDate = new HDate(targetDay, targetMonth, year);
          const formatted = formatToRdateUTC(eventHDate.greg());
          if (!rdates.includes(formatted)) {
            rdates.push(formatted);
            createdThisYear = true;
          }
        } catch (e) {}
      } else if (fallback30th === '1st') {
        const tempDate = new HDate(29, targetMonth, year);
        const nextDay = tempDate.next();
        try {
          const eventHDate = new HDate(nextDay.getDate(), nextDay.getMonthName(), nextDay.getFullYear());
          const formatted = formatToRdateUTC(eventHDate.greg());
          if (!rdates.includes(formatted)) {
            rdates.push(formatted);
            createdThisYear = true;
          }
        } catch (e) {}
      }
      // if 'skip', createdThisYear remains false
    } else {
      try {
        const eventHDate = new HDate(targetDay, targetMonth, year);
        const formatted = formatToRdateUTC(eventHDate.greg());
        if (!rdates.includes(formatted)) {
          rdates.push(formatted);
          createdThisYear = true;
        }
      } catch (e) {}
    }
    year++;
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
export function getPreviewDates(startHebrewYear, monthName, day, maxOccurrences = 10, fallback30th = 'skip') {
  const occurrences = [];
  const currentHebrewYear = new HDate().getFullYear();
  
  let year = startHebrewYear;
  const maxSearchYear = year + maxOccurrences + 20;

  while (occurrences.length < maxOccurrences && year <= maxSearchYear) {
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
    
    let hDateToRender = null;
    if (targetDay === 30 && daysInMonth === 29) {
      if (fallback30th === '29th') {
        targetDay = 29;
        note = "הוקדם ל-כ״ט (חודש חסר)";
        hDateToRender = new HDate(targetDay, targetMonth, year);
      } else if (fallback30th === '1st') {
        const tempDate = new HDate(29, targetMonth, year);
        const nextDay = tempDate.next();
        note = "נדחה ל-א׳ (חודש חסר)";
        hDateToRender = new HDate(nextDay.getDate(), nextDay.getMonthName(), nextDay.getFullYear());
      }
    } else {
      try {
        hDateToRender = new HDate(targetDay, targetMonth, year);
      } catch (e) {}
    }

    if (hDateToRender) {
      const monthLabel = HEBREW_MONTHS.find(m => m.id === hDateToRender.getMonthName())?.label || hDateToRender.getMonthName();
      occurrences.push({
        hebrewYear: hDateToRender.getFullYear(),
        hebrewDate: `${gematriya(hDateToRender.getDate())} ב${monthLabel} ${formatHebrewYear(hDateToRender.getFullYear())}`,
        gregorianDate: hDateToRender.greg().toLocaleDateString('he-IL'),
        note: note
      });
    }
    year++;
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
