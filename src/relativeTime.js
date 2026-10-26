import { DateTime } from 'luxon';

/*
 * Luxon has no equivalent of moment's `fromNow()` text ("in a day") or of `moment.duration`
 * bubbling. `Duration.toRelative` and `Duration.shiftTo` give different words and different
 * month lengths. The two functions below keep moment's thresholds and its fixed month length
 * (400 years is 146097 days and 4800 months) so the text on the page does not change.
 */

const MS_PER_DAY = 864e5;
const daysToMonths = days => (days * 4800) / 146097;
const monthsToDays = months => (months * 146097) / 4800;
const absFloor = n => (n < 0 ? Math.ceil(n) : Math.floor(n));
const absCeil = n => (n < 0 ? Math.floor(n) : Math.ceil(n));

// moment's default thresholds for relative time
const THRESHOLDS = { seconds: 44, secondsToMinute: 45, minutes: 45, hours: 22, days: 26, months: 11 };

/**
 * Port of moment's `fromNow()` for the English locale: "a few seconds ago", "in a day",
 * "3 months ago". The calendar month count is taken in the system timezone, like moment.
 */
export function relativeFromNow(date, now = DateTime.now()) {
  if (!date.isValid) {
    return 'Invalid date';
  }

  const isFuture = date.toMillis() > now.toMillis();
  const [earlier, later] = [date, now].sort((a, b) => a.toMillis() - b.toMillis()).map(d => d.toLocal());

  let wholeMonths = (later.year - earlier.year) * 12 + later.month - earlier.month;
  if (earlier.plus({ months: wholeMonths }) > later) {
    wholeMonths--;
  }
  const remainderMs = later.toMillis() - earlier.plus({ months: wholeMonths }).toMillis();

  const monthDays = Math.round(monthsToDays(wholeMonths));
  const seconds = Math.round(monthDays * 86400 + remainderMs / 1000);
  const minutes = Math.round(monthDays * 1440 + remainderMs / 6e4);
  const hours = Math.round(monthDays * 24 + remainderMs / 36e5);
  const days = Math.round(monthDays + remainderMs / MS_PER_DAY);
  const months = Math.round(wholeMonths + daysToMonths(remainderMs / MS_PER_DAY));
  const years = Math.round((wholeMonths + daysToMonths(remainderMs / MS_PER_DAY)) / 12);

  let text;
  if (seconds <= THRESHOLDS.seconds) text = 'a few seconds';
  else if (seconds < THRESHOLDS.secondsToMinute) text = `${seconds} seconds`;
  else if (minutes <= 1) text = 'a minute';
  else if (minutes < THRESHOLDS.minutes) text = `${minutes} minutes`;
  else if (hours <= 1) text = 'an hour';
  else if (hours < THRESHOLDS.hours) text = `${hours} hours`;
  else if (days <= 1) text = 'a day';
  else if (days < THRESHOLDS.days) text = `${days} days`;
  else if (months <= 1) text = 'a month';
  else if (months < THRESHOLDS.months) text = `${months} months`;
  else if (years <= 1) text = 'a year';
  else text = `${years} years`;

  return isFuture ? `in ${text}` : `${text} ago`;
}

/**
 * Splits a duration into years, months, days, hours, minutes and seconds the way
 * `moment.duration(ms)` did. The state mirrors moment's: milliseconds, days and months.
 */
function bubble({ milliseconds, days, months }) {
  // moment folds a mix of positive and negative parts into milliseconds first
  if (!((milliseconds >= 0 && days >= 0 && months >= 0) || (milliseconds <= 0 && days <= 0 && months <= 0))) {
    milliseconds += absCeil(monthsToDays(months) + days) * MS_PER_DAY;
    days = 0;
    months = 0;
  }

  const totalSeconds = absFloor(milliseconds / 1000);
  const totalMinutes = absFloor(totalSeconds / 60);
  const totalHours = absFloor(totalMinutes / 60);

  days += absFloor(totalHours / 24);
  const monthsFromDays = absFloor(daysToMonths(days));
  months += monthsFromDays;
  days -= absCeil(monthsToDays(monthsFromDays));

  return {
    seconds: totalSeconds % 60,
    minutes: totalMinutes % 60,
    hours: totalHours % 24,
    days,
    months: months % 12,
    years: absFloor(months / 12)
  };
}

/**
 * The NASA style countdown, "T-1d4h" before the date and "T+1h30m" after it.
 * `diffMs` is now minus the date in milliseconds, so a negative value means the date is ahead.
 */
export function nasaCountdown(diffMs) {
  const state = { milliseconds: Math.abs(diffMs), days: 0, months: 0 };
  let result = diffMs < 0 ? 'T-' : 'T+';

  // Each part is read from the current state, written out, then taken off the state
  const parts = [
    ['years', 'y', n => { state.months -= n * 12; }],
    ['months', 'm', n => { state.months -= n; }],
    ['days', 'd', n => { state.days -= n; }],
    ['hours', 'h', n => { state.milliseconds -= n * 36e5; }],
    ['minutes', 'm', n => { state.milliseconds -= n * 6e4; }],
    ['seconds', 's', n => { state.milliseconds -= n * 1000; }]
  ];

  for (const [name, suffix, subtract] of parts) {
    const value = bubble(state)[name];
    if (value > 0) {
      result = `${result}${value}${suffix}`;
      subtract(value);
    }
  }

  return result;
}
