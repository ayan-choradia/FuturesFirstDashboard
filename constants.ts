import { Meeting, Holiday } from './types';

export const FED_MEETINGS_2026: string[] = [
  '2026-01-28',
  '2026-03-18',
  '2026-04-29',
  '2026-06-17',
  '2026-07-29',
  '2026-09-16',
  '2026-10-28',
  '2026-12-09',
];

export const FALLBACK_HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-01', localName: "New Year's Day", name: "New Year's Day" },
  { date: '2026-01-19', localName: "MLK Day", name: "Martin Luther King, Jr. Day" },
  { date: '2026-02-16', localName: "Presidents' Day", name: "Washington's Birthday" },
  { date: '2026-04-03', localName: "Good Friday", name: "Good Friday" }, // Approx
  { date: '2026-05-25', localName: "Memorial Day", name: "Memorial Day" },
  { date: '2026-06-19', localName: "Juneteenth", name: "Juneteenth National Independence Day" },
  { date: '2026-07-04', localName: "Independence Day", name: "Independence Day" }, // Sat, obs Fri 3rd usually
  { date: '2026-07-03', localName: "Independence Day (Observed)", name: "Independence Day" },
  { date: '2026-09-07', localName: "Labor Day", name: "Labor Day" },
  { date: '2026-10-12', localName: "Columbus Day", name: "Columbus Day" },
  { date: '2026-11-11', localName: "Veterans Day", name: "Veterans Day" },
  { date: '2026-11-26', localName: "Thanksgiving Day", name: "Thanksgiving Day" },
  { date: '2026-12-25', localName: "Christmas Day", name: "Christmas Day" },
];

export const DEFAULT_MEETINGS: Meeting[] = FED_MEETINGS_2026.map(d => ({
  date: d,
  hikeBps: 0
}));

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];
