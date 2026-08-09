import { describe, expect, it } from 'vitest';
import {
  buildHebrewGreeting,
  buildMailGreetingUrl,
  buildWhatsAppGreetingUrl,
  getGreetingCategory,
  getGreetingName,
  getGreetingYears,
} from '../utils/eventGreeting';

describe('eventGreeting', () => {
  it('recognizes supported HebSync celebration and memorial events', () => {
    expect(getGreetingCategory({ extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', category: 'birthday' } } })).toBe('birthday');
    expect(getGreetingCategory({ extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', category: 'anniversary' } } })).toBe('anniversary');
    expect(getGreetingCategory({ extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', category: 'memorial' } } })).toBe('memorial');
    expect(getGreetingCategory({ extendedProperties: { private: { appIdentifier: 'MyHebrewCalendar', category: 'other' } } })).toBeNull();
    expect(getGreetingCategory({ extendedProperties: { private: { category: 'birthday' } } })).toBeNull();
  });

  it('extracts a Hebrew name from the agreed title format', () => {
    expect(getGreetingName('יום הולדת נעמה מילר', 'birthday')).toBe('נעמה מילר');
    expect(getGreetingName('יום נישואין - נעמה ודן', 'anniversary')).toBe('נעמה ודן');
    expect(getGreetingName('יום הולדת', 'birthday')).toBeNull();
    expect(getGreetingName('נעמה מילר', 'birthday')).toBeNull();
  });

  it('builds all birthday greeting variants', () => {
    expect(buildHebrewGreeting('birthday', 'נעמה מילר', 34, { includeName: false, includeYears: false })).toBe('🎂 מזל טוב ליום הולדתך');
    expect(buildHebrewGreeting('birthday', 'נעמה מילר', 34, { includeName: false, includeYears: true })).toBe('🎂 מזל טוב ליום הולדתך ה-34');
    expect(buildHebrewGreeting('birthday', 'נעמה מילר', 34, { includeName: true, includeYears: false })).toBe('🎂 מזל טוב לנעמה מילר ליום ההולדת');
    expect(buildHebrewGreeting('birthday', 'נעמה מילר', 34, { includeName: true, includeYears: true })).toBe('🎂 מזל טוב לנעמה מילר ליום הולדת 34');
  });

  it('builds anniversary greetings and safely omits unavailable values', () => {
    expect(buildHebrewGreeting('anniversary', 'נעמה ודן', 5, { includeName: false, includeYears: false })).toBe('🎂 מזל טוב ליום נישואיכם');
    expect(buildHebrewGreeting('anniversary', 'נעמה ודן', 5, { includeName: true, includeYears: true })).toBe('🎂 מזל טוב לנעמה ודן ליום נישואין 5');
    expect(buildHebrewGreeting('anniversary', null, null, { includeName: true, includeYears: true })).toBe('🎂 מזל טוב ליום נישואיכם');
    expect(buildHebrewGreeting('memorial', null, null, { includeName: true, includeYears: true })).toBe('🕯️ נר זיכרון');
  });

  it('calculates years and creates recipient-free sharing links', () => {
    expect(getGreetingYears({ extendedProperties: { private: { originalHebrewYear: '5750' } } }, 5784)).toBe(34);
    expect(getGreetingYears({ extendedProperties: { private: { originalHebrewYear: 'not-a-year' } } }, 5784)).toBeNull();

    expect(buildWhatsAppGreetingUrl('מזל טוב!')).toBe(`https://wa.me/?text=${encodeURIComponent('מזל טוב!')}`);
    expect(buildMailGreetingUrl('מזל טוב!')).toBe(`mailto:?subject=${encodeURIComponent('מזל טוב!')}`);
  });
});
