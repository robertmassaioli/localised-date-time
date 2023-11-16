import ForgeUI, { render, MacroConfig, TextField, DatePicker, Select, Option } from "@forge/ui";
import { TimeZones } from "./timezones";
import { FORMAT_DEFAULT, FORMAT_DEFAULT_AND_ORIGINAL, FORMAT_DEFAULT_AND_UTC, FORMAT_HUMAN_COUNTDOWN, FORMAT_NASA_COUNTDOWN } from "./displayOptions";

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
        <Option label="Localised Date/Time (With UTC)" value={FORMAT_DEFAULT_AND_UTC} />
        <Option label="Countdown / Time since" value={FORMAT_HUMAN_COUNTDOWN} />
        <Option label="Countdown T-(plus/minus)" value={FORMAT_NASA_COUNTDOWN} />
      </Select>
    </MacroConfig>
  );
};

export const config = render(<Config />);