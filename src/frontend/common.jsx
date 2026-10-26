import React from 'react';
import { inZone } from "../dateTime";
import { displayText,FORMAT_DEFAULT_AND_ORIGINAL, FORMAT_DEFAULT_AND_UTC } from "../displayOptions";
import { Lozenge, Tooltip, Text } from '@forge/react';
export { validateConfig, parseTime } from '../configHelpers';

export function renderDateLozenge({
  originalDate,
  timeZone,
  config
}) {
  let date = originalDate;

  if (typeof timeZone === 'string') {
    date = inZone(originalDate, timeZone);

    const configuredTimezoneSameAsUserTimezone = config.timeZone === timeZone;
    if (config.displayOption === FORMAT_DEFAULT_AND_ORIGINAL) {
      if (!configuredTimezoneSameAsUserTimezone) {
        return (
          <>
            <Text>
              <Lozenge>{displayText('default', date)}</Lozenge>
              {' '}
              (<Lozenge>{displayText('default', originalDate)}</Lozenge>)
            </Text>
          </>
        );
      } else {
        return (
          <>
            <Tooltip content="Co-located: You are viewing this date-time from the same timezone it was configured for.">
              <Lozenge>{displayText(config.displayOption, date)}</Lozenge>
            </Tooltip>
          </>
        );
      }
    } else if (config.displayOption === FORMAT_DEFAULT_AND_UTC) {
      const utcDate = originalDate.setZone('UTC');
      return (
        <>
          <Text>
            <Lozenge>{displayText('default', utcDate)}</Lozenge>
            {' '}
            (<Lozenge>{displayText('default', date)}</Lozenge>)
          </Text>
        </>
      );
    }
  }

  return (
    <>
      <Lozenge>{displayText(config.displayOption, date)}</Lozenge>
    </>
  );
}

