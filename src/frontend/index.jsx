import React, { useState } from 'react';
import ForgeReconciler, { Text, Badge, Tooltip } from '@forge/react';
import { view } from '@forge/bridge';
import { useEffectAsync } from '../useEffectAsync';
import moment from 'moment-timezone';
import { isPresent } from 'ts-is-present';
import { FORMAT_DEFAULT_AND_ORIGINAL, FORMAT_DEFAULT_AND_UTC, displayText } from '../displayOptions';

/*
Details structure:

{
  userTimezone,
  config: {
    date,
    time,
    timeZone,
    displayOption
  }
}
*/

const App = () => {
  const [details, setDetails] = useState(undefined);

  useEffectAsync(async () => {
    const context = await view.getContext();
    setDetails({
      timeZone: context.timezone,
      config: context.extension.config
    });
  }, details);

  if (!isPresent(details)) {
    return (
      <>
        <Text>Macro not configured. Please configure it in the Macro Configuration.</Text>
      </>
    );
  }

  const { config, timeZone } = details;

  if (!isPresent(config)) {
    return (
      <>
        <Text>Macro not configured. Please configure it in the Macro Configuration.</Text>
      </>
    );
  }


  if (!isPresent(config.date)) {
    return (
      <>
        <Text>Date not configured. Please configure it in the Macro Configuration.</Text>
      </>
    );
  }

  if (!isPresent(config.time)) {
    return (
      <>
        <Text>Time not configured. Please configure it in the Macro Configuration.</Text>
      </>
    );
  }

  const rawTime = config.time;
  const timeMatch = /^(?<time>(1[012]|0?[1-9]):[0-5][0-9])\s?(?<meridiem>([aApP][mM]))$/;

  let matchResult;
  if ((matchResult = timeMatch.exec(rawTime)) === null) {
    return (
      <>
        <Text>Time "{rawTime}" not in the "XX:XX (am|pm)" format! Example, valid values are: "9:00 am" or "12:45 pm".</Text>
      </>
    );
  }

  const {time, meridiem} = matchResult.groups;
  let parsedTime = `${time} ${meridiem}`;

  if(!isPresent(config.timeZone)) {
    return (
      <>
        <Text>Time Zone not configured. Please configure it in the Macro Configuration.</Text>
      </>
    );
  }

  const configuredDate = `${config.date} ${parsedTime}`;
  moment.tz.setDefault(config.timeZone);
  // const configuredTimezone = config.timeZone;
  // console.log(`${configuredDate}, ${configuredTimezone}`);
  const originalDate = moment(configuredDate, 'YYYY-MM-DD h:mma');

  let date = originalDate;

  if (typeof timeZone === 'string') {
    date = originalDate.clone().tz(timeZone);
    // Tag element is not wide enough :( : https://developer.atlassian.com/platform/forge/ui-kit-components/tag/

    const configuredTimezoneSameAsUserTimezone = config.timeZone === timeZone;
    if (config.displayOption === FORMAT_DEFAULT_AND_ORIGINAL) {
      if (!configuredTimezoneSameAsUserTimezone) {
        return (
          <>
            <Text><Badge text={displayText('default', date)} /> (<Badge text={displayText('default', originalDate)} />)</Text>
          </>
        );
      } else {
        return (
          <>
             <Tooltip text="Co-located: You are viewing this date-time from the same timezone it was configured for.">
                <Badge text={displayText(config.displayOption, date)} />
             </Tooltip>
          </>
        );
      }
    } else if (config.displayOption === FORMAT_DEFAULT_AND_UTC) {
      const utcDate = originalDate.clone().tz('UTC');
      return (
        <>
          <Text><Badge text={displayText('default', utcDate)} /> (<Badge text={displayText('default', date)} />)</Text>
        </>
      )
    }
  }

  return (
    <>
      <Badge text={displayText(config.displayOption, date)} />
    </>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);