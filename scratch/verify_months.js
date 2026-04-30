import { HDate } from '@hebcal/core';

const adar = new HDate(29, 12, 5784); // Adar I in 5784
console.log('Adar I:', adar.toString(), 'Month:', adar.getMonth(), 'Year:', adar.getFullYear());
const nextDay = adar.next();
console.log('Next Day:', nextDay.toString(), 'Month:', nextDay.getMonth(), 'Year:', nextDay.getFullYear());

const adar2 = new HDate(29, 13, 5784); // Adar II in 5784
console.log('Adar II:', adar2.toString(), 'Month:', adar2.getMonth(), 'Year:', adar2.getFullYear());
const nextDay2 = adar2.next();
console.log('Next Day (after Adar II):', nextDay2.toString(), 'Month:', nextDay2.getMonth(), 'Year:', nextDay2.getFullYear());
