import { HDate } from '@hebcal/core';
const m = HDate.monthFromName("Cheshvan");
console.log('Cheshvan number:', m);
console.log('Cheshvan 5784 days:', HDate.daysInMonth(m, 5784));
console.log('Cheshvan 5785 days:', HDate.daysInMonth(m, 5785));
console.log('Kislev 5784 days:', HDate.daysInMonth(HDate.monthFromName("Kislev"), 5784));
