import { FORMAT_DEFAULT, FORMAT_DEFAULT_AND_ORIGINAL, FORMAT_DEFAULT_AND_UTC, FORMAT_HUMAN_COUNTDOWN, FORMAT_NASA_COUNTDOWN } from '../displayOptions';
import { CLOCK_12_HOUR, CLOCK_24_HOUR, CLOCK_AUTO } from '../clock';
import { REPEAT_ANNUALLY, REPEAT_DAILY, REPEAT_HOURLY, REPEAT_WEEKLY } from '../repetition';

/**
 * Select options for the display format, with labels translated by t.
 */
export function displayOptionChoices(t) {
  return [
    { label: t('config.displayOption.default'), value: FORMAT_DEFAULT },
    { label: t('config.displayOption.defaultAndOriginal'), value: FORMAT_DEFAULT_AND_ORIGINAL },
    { label: t('config.displayOption.defaultAndUtc'), value: FORMAT_DEFAULT_AND_UTC },
    { label: t('config.displayOption.humanCountdown'), value: FORMAT_HUMAN_COUNTDOWN },
    { label: t('config.displayOption.nasaCountdown'), value: FORMAT_NASA_COUNTDOWN }
  ];
}

/**
 * Select options for the repetition unit, with labels translated by t.
 */
export function repetitionUnitChoices(t) {
  return [
    { label: t('config.repetitionUnit.week'), value: REPEAT_WEEKLY },
    { label: t('config.repetitionUnit.day'), value: REPEAT_DAILY },
    { label: t('config.repetitionUnit.year'), value: REPEAT_ANNUALLY },
    { label: t('config.repetitionUnit.hour'), value: REPEAT_HOURLY }
  ];
}

/**
 * Select options for the clock, with labels translated by t. See clock.js for which viewers the setting applies to.
 */
export function clockChoices(t) {
  return [
    { label: t('config.clock.auto'), value: CLOCK_AUTO },
    { label: t('config.clock.h12'), value: CLOCK_12_HOUR },
    { label: t('config.clock.h24'), value: CLOCK_24_HOUR }
  ];
}
