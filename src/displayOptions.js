import moment from 'moment-timezone';

export const FORMAT_DEFAULT = 'default';
export const FORMAT_DEFAULT_AND_ORIGINAL = 'localisedAndConfigured';
export const FORMAT_DEFAULT_AND_UTC = 'localisedAndUtc';
export const FORMAT_HUMAN_COUNTDOWN = 'countdownUnbounded';
export const FORMAT_NASA_COUNTDOWN = 'countdownTPlusMinus';

//export type RepeatType = REPEAT_NONE | REPEAT_HOURLY | REPEAT_DAILY | REPEAT_WEEKLY | REPEAT_ANNUALLY;

export function formatRequiresLiveUpdates(displayOption) {
  return displayOption === FORMAT_HUMAN_COUNTDOWN || displayOption === FORMAT_NASA_COUNTDOWN;
}

export function displayText(displayOption, date) {
  if (displayOption === FORMAT_HUMAN_COUNTDOWN) {
    return date.fromNow();
  }

  if (displayOption === FORMAT_NASA_COUNTDOWN) {
    const originalDiff = moment().diff(date);
    const d = moment.duration(Math.abs(originalDiff));

    let result = 'T';
    result = result + (originalDiff < 0 ? '-' : '+');

    const years = d.years();
    if(years > 0) {
      result = `${result}${years}y`;
      d.subtract(years, 'years');
    }

    const months = d.months();
    if(months > 0) {
      result = `${result}${months}m`;
      d.subtract(months, 'months');
    }

    const days = d.days();
    if(days > 0) {
      result = `${result}${days}d`;
      d.subtract(days, 'days');
    }

    const hours = d.hours();
    if(hours > 0) {
      result = `${result}${hours}h`;
      d.subtract(hours, 'h');
    }

    const minutes = d.minutes();
    if(minutes > 0) {
      result = `${result}${minutes}m`;
      d.subtract(minutes, 'minutes');
    }

    const seconds = d.seconds();
    if(seconds > 0) {
      result = `${result}${seconds}s`;
      d.subtract(seconds, 'seconds');
    }

    return result;
  }

  return date.format('ddd, MMM DD, YYYY h:mma z');
}