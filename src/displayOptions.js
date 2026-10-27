import { DateTime } from 'luxon';
import { formatDateTime } from './dateTime';
import { nasaCountdown, relativeFromNow } from './relativeTime';

export const FORMAT_DEFAULT = 'default';
export const FORMAT_DEFAULT_AND_ORIGINAL = 'localisedAndConfigured';
export const FORMAT_DEFAULT_AND_UTC = 'localisedAndUtc';
export const FORMAT_HUMAN_COUNTDOWN = 'countdownUnbounded';
export const FORMAT_NASA_COUNTDOWN = 'countdownTPlusMinus';

export function formatRequiresLiveUpdates(displayOption) {
  return displayOption === FORMAT_HUMAN_COUNTDOWN || displayOption === FORMAT_NASA_COUNTDOWN;
}

/**
 * `options` is `{ locale, hourCycle }` for the viewer. Without a locale the text is the legacy English pattern.
 */
export function displayText(displayOption, date, options = {}) {
  if (displayOption === FORMAT_HUMAN_COUNTDOWN) {
    return relativeFromNow(date, undefined, options.locale);
  }

  if (displayOption === FORMAT_NASA_COUNTDOWN) {
    return nasaCountdown(DateTime.now().diff(date).toMillis());
  }

  return formatDateTime(date, options);
}
