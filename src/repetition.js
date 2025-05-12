import moment from 'moment-timezone';

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

// Example: next repeating event after the start date, every N units (e.g., every 2 weeks)
export function nextRepeatDate(startDate, period, unit) {
  // Parse the start date as a moment object
  var start = moment(startDate);
  // Get the current date
  var now = moment();
  // If the start date is in the future, just return it
  if (start.isAfter(now)) {
    //console.log("after now");
    return start;
  }
  // Calculate the difference in the chosen unit
  var diff = now.diff(start, unit, true);
  //console.log('diff', diff);
  // Calculate how many periods have passed since the start
  var periodsPassed = Math.ceil(diff / period);
  // Calculate the next occurrence
  var next = start.clone().add(periodsPassed * period, unit);
  // If the next date is today, move to the next period
  if (next.isSame(now, unit) && !next.isAfter(now)) {
    next.add(period, unit);
  }
  return next;
}

// Example usage:
// nextRepeatDate("2024-05-01", 2, "weeks") // Every 2 weeks
// nextRepeatDate("2023-01-01", 1, "years")  // Every year
