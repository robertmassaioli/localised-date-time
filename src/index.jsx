import ForgeUI, { render, Fragment, Macro, Text, useState, useEffect, useProductContext, MacroConfig, TextField, DatePicker, useConfig, Select, Option, Tag, Badge } from "@forge/ui";
import api, { route } from "@forge/api";
//import moment from 'moment';
import moment from 'moment-timezone';
import { TimeZones } from "./timezones";

async function getUserTimezone(accountId) {
  const response = await api.asUser().requestConfluence(route`/wiki/rest/api/user?accountId=${accountId}`, {
    headers: {
      'Accept': 'application/json'
    }
  });

  const data =  await response.json();

  console.log(JSON.stringify(data, null, 2));

  return data.timeZone;
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

  if(config.timeZone === undefined || config.timeZone === null) {
    return (
      <Fragment>
        <Text>Time Zone not configured. Please configure it in the Macro Configuration.</Text>
      </Fragment>
    );
  }

  if (typeof timeZone === 'string') {
    const configuredDate = `${config.date} ${config.time}`;
    moment.tz.setDefault(config.timeZone);
    const configuredTimezone = config.timeZone;
    console.log(`${configuredDate}, ${configuredTimezone}`);
    const originalDate = moment(configuredDate, 'YYYY-MM-DD h:mma');
    const date = originalDate.tz(timeZone);
    // Tag element is not wide enough :( : https://developer.atlassian.com/platform/forge/ui-kit-components/tag/
    return (
      <Fragment>
        {/* <Text>{date.format('ddd, MMM DD, YYYY h:mma z')}</Text> */}
        {/* <Tag text={date.format('ddd, MMM DD, YYYY h:mma z')} /> */}
        <Badge text={date.format('ddd, MMM DD, YYYY h:mma z')} />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Text>User timezone not found.</Text>
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
        placeholder="9:00am"
        />
      <Select name="timeZone" label="Time Zone" isRequired>
        {TimeZones.map(tz => <Option label={tz} value={tz} />)}
      </Select>
    </MacroConfig>
  );
};

export const config = render(<Config />);