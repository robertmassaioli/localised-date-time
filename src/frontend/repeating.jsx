import React, { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import ForgeReconciler, { DatePicker, Label, Select, Text, Textfield } from '@forge/react';
import moment from 'moment-timezone';
import { isPresent } from 'ts-is-present';
import { FORMAT_DEFAULT, FORMAT_DEFAULT_AND_ORIGINAL, FORMAT_DEFAULT_AND_UTC, FORMAT_HUMAN_COUNTDOWN, FORMAT_NASA_COUNTDOWN, formatRequiresLiveUpdates } from "../displayOptions";
import { TimeZones } from "../timezones";
import { useEffectAsync } from '../useEffectAsync';
import { nextRepeatDate, REPEAT_ANNUALLY, REPEAT_DAILY, REPEAT_HOURLY, REPEAT_WEEKLY, repetitionToUnits } from '../repetition';
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
  if (error) return <Text>{error}</Text>;

  // Shared time parsing
  const parsed = parseTime(config.time);
  if (parsed.error) return <Text>{parsed.error}</Text>;

  const {time, meridiem} = parsed;
  let parsedTime = `${time} ${meridiem}`;

  if(!isPresent(config.timeZone)) {
    return (
      <Text>Time Zone not configured. Please configure it in the Macro Configuration.</Text>
    );
  }

  const { repetitionUnit } = config;
  const repetitionPeriodRaw = config.repetitionPeriod;
  if (!isPresent(repetitionUnit) || !isPresent(repetitionPeriodRaw)) {
    return (
      <Text>Repetition period not configured. Please configure it in the Macro Configuration.</Text>
    );
  }

  let repetitionPeriod = undefined;
  try {
    repetitionPeriod = parseInt(repetitionPeriodRaw);
  } catch (e) {

  }
  if (!isPresent(repetitionPeriod) || repetitionPeriod < 1) {
    return (
      <>
        <Text>Repetition period must be one or higher. Please configure it in the Macro Configuration.</Text>
      </>
    );
  }

  const configuredDate = `${config.date} ${parsedTime}`;
  moment.tz.setDefault(config.timeZone);
  // const configuredTimezone = config.timeZone;
  // console.log(`${configuredDate}, ${configuredTimezone}`);
  const originalDate = nextRepeatDate(moment(configuredDate, 'YYYY-MM-DD h:mma'), repetitionPeriod, repetitionToUnits(repetitionUnit));

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
      <Label labelFor="date">Start Date</Label>
      <DatePicker name="date" description="The start Date, in your local time for repeating events." />
      <Label labelFor='timeZone'>Timezone</Label>
      <Select
        name="timeZone"
        isRequired
        description="The timezone that the Date Time above is configured for. If you have written the above in your local time then select your local timezone."
        options={TimeZones.map(tz => ({ label: tz, value: tz }))}
        />
      <Label labelFor='repetitionUnit'>Repetition Unit</Label>
      <Select
        name="repetitionUnit"
        isRequired
        description="What unit of time to use for the repetitions."
        options={[
          { label: 'Week (Default)', value: REPEAT_WEEKLY },
          { label: 'Day', value: REPEAT_DAILY },
          { label: 'Year', value: REPEAT_ANNUALLY },
          { label: 'Hour', value: REPEAT_HOURLY }
        ]}
        />
      <Label labelFor='repetitionPeriod'>Period</Label>
      <Textfield
        isRequired
        name="repetitionPeriod"
        description="The number of units (weeks, days etc) before this event repeats. Must be 1 or higher."
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