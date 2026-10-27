import React from 'react';
import { inZone } from "../dateTime";
import { clockFor } from "../clock";
import { formattingLocale } from "../i18n";
import { displayText,FORMAT_DEFAULT_AND_ORIGINAL, FORMAT_DEFAULT_AND_UTC } from "../displayOptions";
import { Lozenge, Tooltip, Text } from '@forge/react';
export { validateConfig, parseTime } from '../configHelpers';

export function renderDateLozenge({
  originalDate,
  timeZone,
  config,
  t,
  locale
}) {
  let date = originalDate;
  // The viewer's layout, names and clock. The author's clock setting only applies to English locales, see clock.js.
  const formatLocale = formattingLocale(locale);
  const formatOptions = { locale: formatLocale, hourCycle: clockFor(formatLocale, config.clock) };

  if (typeof timeZone === 'string') {
    date = inZone(originalDate, timeZone);

    const configuredTimezoneSameAsUserTimezone = config.timeZone === timeZone;
    if (config.displayOption === FORMAT_DEFAULT_AND_ORIGINAL) {
      if (!configuredTimezoneSameAsUserTimezone) {
        return (
          <>
            <Text>
              <Lozenge>{displayText('default', date, formatOptions)}</Lozenge>
              {' '}
              (<Lozenge>{displayText('default', originalDate, formatOptions)}</Lozenge>)
            </Text>
          </>
        );
      } else {
        return (
          <>
            <Tooltip content={t('tooltip.colocated')}>
              <Lozenge>{displayText(config.displayOption, date, formatOptions)}</Lozenge>
            </Tooltip>
          </>
        );
      }
    } else if (config.displayOption === FORMAT_DEFAULT_AND_UTC) {
      const utcDate = originalDate.setZone('UTC');
      return (
        <>
          <Text>
            <Lozenge>{displayText('default', utcDate, formatOptions)}</Lozenge>
            {' '}
            (<Lozenge>{displayText('default', date, formatOptions)}</Lozenge>)
          </Text>
        </>
      );
    }
  }

  return (
    <>
      <Lozenge>{displayText(config.displayOption, date, formatOptions)}</Lozenge>
    </>
  );
}

