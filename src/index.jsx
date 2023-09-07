import ForgeUI, { render, Fragment, Macro, Text, useState, useEffect, useProductContext, MacroConfig, TextField, DatePicker, useConfig, Select, Option, Badge, Toggle } from "@forge/ui";
import api, { route } from "@forge/api";
//import moment from 'moment';
import moment from 'moment-timezone';
import { TimeZones } from "./timezones";
import { isPresent } from 'ts-is-present';

const FORMAT_DEFAULT = 'default';
const FORMAT_DEFAULT_AND_ORIGINAL = 'localisedAndConfigured';
const FORMAT_HUMAN_COUNTDOWN = 'countdownUnbounded';
const FORMAT_NASA_COUNTDOWN = 'countdownTPlusMinus';

async function getUserTimezone(accountId) {
  const response = await api.asUser().requestConfluence(route`/wiki/rest/api/user?accountId=${accountId}`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  const data =  await response.json();

  return data.timeZone;
}

function displayText(displayOption, date) {
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

const App = () => {
  const context = useProductContext();
  const config = useConfig();
  // If the timezone is not set, use the original timezone, if it is set, use this
  const [timeZone, setUserTimezone] = useState<string | boolean>(false);

  useEffect(async () => {
    if (context.accountType !== 'anonymous' && context.accountId) {
      setUserTimezone(await getUserTimezone(context.accountId));
    }
  }, [timeZone]);

  if (!isPresent(config)) {
    return (
      <Fragment>
        <Text>Macro not configured. Please configure it in the Macro Configuration.</Text>
      </Fragment>
    );
  }

  if (!isPresent(config.date)) {
    return (
      <Fragment>
        <Text>Date not configured. Please configure it in the Macro Configuration.</Text>
      </Fragment>
    );
  }

  if (!isPresent(config.time)) {
    return (
      <Fragment>
        <Text>Time not configured. Please configure it in the Macro Configuration.</Text>
      </Fragment>
    );
  }

  const rawTime = config.time;
  const timeMatch = /^(?<time>\d{1,2}:\d{2})\s?(?<meridiem>am|pm)$/;

  let matchResult;
  if ((matchResult = timeMatch.exec(rawTime)) === null) {
    return (
      <Fragment>
        <Text>Time "{rawTime}" not in the "XX:XX (am|pm)" format! Example, valid values are: "9:00 am" or "12:45 pm".</Text>
      </Fragment>
    );
  }

  const {time, meridiem} = matchResult.groups;
  let parsedTime = `${time} ${meridiem}`;

  if(!isPresent(config.timeZone)) {
    return (
      <Fragment>
        <Text>Time Zone not configured. Please configure it in the Macro Configuration.</Text>
      </Fragment>
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

    if (config.displayOption === FORMAT_DEFAULT_AND_ORIGINAL) {
      return (
        <Fragment>
          <Text><Badge text={displayText('default', date)} /> (<Badge text={displayText('default', originalDate)} />)</Text>
        </Fragment>
      );
    }
  }

  return (
    <Fragment>
      {/* <Text>{date.format('ddd, MMM DD, YYYY h:mma z')}</Text> */}
      {/* <Tag
       text={date.format('ddd, MMM DD, YYYY h:mma z')} /> */}
      <Badge text={displayText(config.displayOption, date)} />
    </Fragment>
  );
};

export const run = render(
  <Macro
    app={<App />}
  />
);

// Should take all of the timezones from here: https://raw.githubusercontent.com/moment/moment-timezone/develop/data/unpacked/latest.json
// Turns out that Gilmore Davidson maintains this. Small world.
// DateTime Picker is not exported in UI Kit (for some reason?? :( )
const Config = () => {
  return (
    <MacroConfig>
      {/* Form components */}
      <DatePicker name="date" label="Date" description="The Date, in your local time." />
      <TextField
        name="time"
        label="Time"
        description="The Time, in your local time in the following format: hh:mm am/pm"
        placeholder="12:00am"
        />
      <Select
        name="timeZone"
        label="Timezone"
        isRequired
        description="The timezone that the Date Time above is configured for. If you have written the above in your local time then select your local timezone.">
        {TimeZones.map(tz => <Option label={tz} value={tz} />)}
      </Select>
      <Select
        name="displayOption"
        label="Display format"
        isRequired
        description="How your date will be displayed to the viewer.">
        <Option label="Localised Date/Time (Default)" value={FORMAT_DEFAULT} defaultSelected />
        <Option label="Localised Date/Time (With configured timezone)" value={FORMAT_DEFAULT_AND_ORIGINAL} />
        <Option label="Countdown / Time since" value={FORMAT_HUMAN_COUNTDOWN} />
        <Option label="Countdown T-(plus/minus)" value={FORMAT_NASA_COUNTDOWN} />
      </Select>
    </MacroConfig>
  );
};

export const config = render(<Config />);