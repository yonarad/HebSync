import { HDate } from '@hebcal/core';
const d = new HDate();
console.log('Current:', d.toString());
try {
  console.log('Next Month:', d.nextMonth().toString());
} catch(e) {
  console.log('nextMonth() failed:', e.message);
}
// Alternative manual navigation
let m = d.getMonth();
let y = d.getFullYear();
m++;
if (m > 12) { // Need to check leap year for 13
  m = 1;
  y++;
}
console.log('Manual Next:', new HDate(1, m, y).toString());
