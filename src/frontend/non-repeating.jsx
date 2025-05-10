import React, { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import ForgeReconciler, { DatePicker, Label, Lozenge, Select, Text, Textfield, Tooltip } from '@forge/react';
import moment from 'moment-timezone';
import { isPresent } from 'ts-is-present';
import { FORMAT_DEFAULT, FORMAT_DEFAULT_AND_ORIGINAL, FORMAT_DEFAULT_AND_UTC, FORMAT_HUMAN_COUNTDOWN, FORMAT_NASA_COUNTDOWN, REPEAT_ANNUALLY, REPEAT_DAILY, REPEAT_HOURLY, REPEAT_NONE, REPEAT_WEEKLY, displayText, formatRequiresLiveUpdates } from "../displayOptions";
import { TimeZones } from "../timezones";
import { useEffectAsync } from '../useEffectAsync';
import { parseTime, renderDateLozenge, validateConfig } from './common';
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
  const [now, setNow] = useState(new Date());

  const config = details?.config;
  const timeZone = details?.timeZone;

  useEffectAsync(async () => {
    const context = await view.getContext();
    setDetails({
      timeZone: context.timezone,
      config: context.extension.config
    });
  }, details);

  useEffect(() => {
    if (config && formatRequiresLiveUpdates(config.displayOption)) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => {
        clearInterval(interval);
      };
    }

    return undefined;
  }, [details]);

  // Shared validation
  const error = validateConfig(details, config);
  if (error) return <>{error}</>;

  // Shared time parsing
  const parsed = parseTime(config.time);
  if (parsed.error) return <>{parsed.error}</>;

  const {time, meridiem} = parsed;
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

  return renderDateLozenge({ originalDate, timeZone, config });
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const Config = () => {
  return (
    <>
      <Label labelFor='time'>Time</Label>
      <Textfield
              name="time"
              description="The Time, in your local time in the following format: hh:mm am/pm"
              placeholder="12:00am"
              />
      <Label labelFor="date">Date</Label>
      <DatePicker name="date" description="The Date, in your local time. Or starting date for repeating events." />
      <Label labelFor='timeZone'>Timezone</Label>
      <Select
        name="timeZone"
        isRequired
        description="The timezone that the Date Time above is configured for. If you have written the above in your local time then select your local timezone."
        options={TimeZones.map(tz => ({ label: tz, value: tz }))}
        />
      <Label labelFor='displayOption'>Display format</Label>
      <Select
        name="displayOption"
        isRequired
        description="How your date will be displayed to the viewer."
        options={[
          { label: 'Localised Date/Time (Default)', value: FORMAT_DEFAULT },
          { label: 'Localised Date/Time (With configured timezone)', value: FORMAT_DEFAULT_AND_ORIGINAL },
          { label: 'UTC (With Localised Date/Time)', value: FORMAT_DEFAULT_AND_UTC },
          { label: 'Countdown / Time since', value: FORMAT_HUMAN_COUNTDOWN },
          { label: 'Countdown T-(plus/minus)', value: FORMAT_NASA_COUNTDOWN }
        ]}
        />
    </>
  );
};

ForgeReconciler.addConfig(<Config />);