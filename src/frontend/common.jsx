import React from 'react';
import moment from 'moment-timezone';
import { displayText, FORMAT_DEFAULT_AND_ORIGINAL, FORMAT_DEFAULT_AND_UTC } from "../displayOptions";
import { Lozenge, Tooltip, Text } from '@forge/react';
import { DEBUG, debugLog } from './debug';
export { validateConfig, parseTime } from '../configHelpers';

/**
 * Renders a config validation error. While DEBUG is on, also logs and shows the raw state
 * that failed validation so it is visible without opening the browser console.
 */
export function renderValidationError(error, state) {
  const snapshot = JSON.stringify(state);
  debugLog('validation failed:', error, '| state =', snapshot);
  if (!DEBUG) return <Text>{error}</Text>;
  return (
    <>
      <Text>{error}</Text>
      <Text>{`[debug] ${snapshot ?? 'state is undefined'}`}</Text>
    </>
  );
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

