import { DateTime } from 'luxon';

export const REPEAT_NONE = 'repeat-none';
export const REPEAT_HOURLY = 'repeat-hourly';
export const REPEAT_DAILY = 'repeat-daily';
export const REPEAT_WEEKLY = 'repeat-weekly';
export const REPEAT_ANNUALLY = 'repeat-annually';

export function repetitionToUnits(repetition) {
  switch (repetition) {
    case REPEAT_DAILY:
      return "days";
    case REPEAT_WEEKLY:
      return "weeks";
    case REPEAT_ANNUALLY:
      return "years";
    case REPEAT_HOURLY:
      return "hours";
  }

  return undefined;
}

const MS_PER_HOUR = 36e5;
const MS_PER_DAY = 864e5;
const MS_PER_WEEK = 6048e5;

// Fractional months from `b` to `a`, ported from moment's `diff(..., 'months', true)`.
// A whole number means the same day and time of the month.
function monthDiff(a, b) {
  if (a.day < b.day) {
    // end-of-month calculations work correctly when the start month has more days than the end month
    return -monthDiff(b, a);
  }
  const wholeMonthDiff = (b.year - a.year) * 12 + (b.month - a.month);
  const anchor = a.plus({ months: wholeMonthDiff });
  let adjust;
  if (b < anchor) {
    const anchor2 = a.plus({ months: wholeMonthDiff - 1 });
    adjust = (b - anchor) / (anchor - anchor2);
  } else {
    const anchor2 = a.plus({ months: wholeMonthDiff + 1 });
    adjust = (b - anchor) / (anchor2 - anchor);
  }
  return -(wholeMonthDiff + adjust) || 0;
}

// Fractional units from `start` to `now`, with the same rules as moment's `now.diff(start, unit, true)`.
// Days and weeks ignore daylight saving changes in the system timezone, months and years follow the calendar.
function elapsedUnits(now, start, unit) {
  const localNow = now.toLocal();
  const localStart = start.toLocal();
  const zoneDelta = (localStart.offset - localNow.offset) * 6e4;
  switch (unit) {
    case 'hours':
      return (now - start) / MS_PER_HOUR;
    case 'days':
      return (now - start - zoneDelta) / MS_PER_DAY;
    case 'weeks':
      return (now - start - zoneDelta) / MS_PER_WEEK;
    case 'years':
      return monthDiff(localNow, localStart) / 12;
    default:
      return undefined;
  }
}

// Whether `other` falls in the same hour, day, week or year as `date`, counted in the timezone of `date`.
// Luxon's `hasSame` compares calendar fields instead, which gives a different answer when the two
// dates are in different timezones. Weeks start on Sunday, as they did in moment's default locale.
function isInSameUnit(date, other, unit) {
  let start;
  let end;
  if (unit === 'weeks') {
    start = date.startOf('day').minus({ days: date.weekday % 7 });
    end = start.plus({ weeks: 1 }).minus({ milliseconds: 1 });
  } else {
    start = date.startOf(unit);
    end = date.endOf(unit);
  }
  return start <= other && other <= end;
}

// Example: next repeating event after the start date, every N units (e.g., every 2 weeks)
export function nextRepeatDate(startDate, period, unit) {
  // Luxon dates are immutable, so the start date can be used as it is
  const start = startDate;
  if (!start.isValid) {
    return start;
  }
  // Get the current date
  const now = DateTime.now();
  // If the start date is in the future, just return it
  if (start > now) {
    return start;
  }
  // Calculate the difference in the chosen unit
  const diff = elapsedUnits(now, start, unit);
  if (diff === undefined) {
    // An unknown unit cannot be repeated, so keep the start date rather than throwing
    return start;
  }
  // Calculate how many periods have passed since the start
  const periodsPassed = Math.ceil(diff / period);
  // Calculate the next occurrence. Days, weeks and years follow the calendar in the start
  // date's timezone and hours are exact elapsed time, which is how Luxon's plus works too.
  let next = start.plus({ [unit]: periodsPassed * period });
  // If the next date is today, move to the next period
  if (isInSameUnit(next, now, unit) && !(next > now)) {
    next = next.plus({ [unit]: period });
  }
  return next;
}
