import React from 'react';
import moment from 'moment-timezone';
import { isPresent } from 'ts-is-present';
import { displayText, FORMAT_DEFAULT_AND_ORIGINAL, FORMAT_DEFAULT_AND_UTC } from "../displayOptions";
import { Lozenge, Tooltip, Text } from '@forge/react';

/**
 * Validates the config object and returns error message if missing.
 */
export function validateConfig(details, config, requiredFields = ['date', 'time', 'timeZone']) {
  if (!isPresent(details)) return "Macro not configured. Please configure it in the Macro Configuration.";
  if (!isPresent(config)) return "Macro not configured. Please configure it in the Macro Configuration.";
  for (const field of requiredFields) {
    if (!isPresent(config[field])) return `${field.charAt(0).toUpperCase() + field.slice(1)} not configured. Please configure it in the Macro Configuration.`;
  }
  return null;
}

/**
 * Parses and validates time string. Returns { time, meridiem } or error message.
 */
export function parseTime(rawTime) {
  const timeMatch = /^(?<time>(1[012]|0?[1-9]):[0-5][0-9])\s?(?<meridiem>[aApP][mM])$/;
  const matchResult = timeMatch.exec(rawTime);
  if (!matchResult) {
    return { error: `Time "${rawTime}" not in the "XX:XX (am|pm)" format! Example, valid values are: "9:00 am" or "12:45 pm".` };
  }
  return matchResult.groups;
}

export function renderDateLozenge({
  originalDate,
  timeZone,
  config
}) {
  let date = originalDate;
  const now = moment();

  if (typeof timeZone === 'string') {
    date = originalDate.clone().tz(timeZone);

    const configuredTimezoneSameAsUserTimezone = config.timeZone === timeZone;
    if (config.displayOption === FORMAT_DEFAULT_AND_ORIGINAL) {
      if (!configuredTimezoneSameAsUserTimezone) {
        return (
          <>
            <Text>
              <Lozenge key={`badge-${now}`}>{displayText('default', date)}</Lozenge>
              {' '}
              (<Lozenge>{displayText('default', originalDate)}</Lozenge>)
            </Text>
          </>
        );
      } else {
        return (
          <>
            <Tooltip content="Co-located: You are viewing this date-time from the same timezone it was configured for.">
              <Lozenge key={`badge-${now}`}>{displayText(config.displayOption, date)}</Lozenge>
            </Tooltip>
          </>
        );
      }
    } else if (config.displayOption === FORMAT_DEFAULT_AND_UTC) {
      const utcDate = originalDate.clone().tz('UTC');
      return (
        <>
          <Text>
            <Lozenge key={`badge-${now}`}>{displayText('default', utcDate)}</Lozenge>
            {' '}
            (<Lozenge>{displayText('default', date)}</Lozenge>)
          </Text>
        </>
      );
    }
  }

  return (
    <>
      <Lozenge key={`badge-${now}`}>{displayText(config.displayOption, date)}</Lozenge>
    </>
  );
}

