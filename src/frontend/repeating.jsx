import React from 'react';
import ForgeReconciler, { DatePicker, I18nProvider, Label, Select, Text, Textfield } from '@forge/react';
import { isPresent } from 'ts-is-present';
import { FORMAT_DEFAULT } from "../displayOptions";
import { parseConfiguredDate } from '../dateTime';
import { TimeZones } from "../timezones";
import { nextRepeatDate, REPEAT_WEEKLY, repetitionToUnits } from '../repetition';
import { parseTime, renderDateLozenge, validateConfig } from './common';
import { displayOptionChoices, repetitionUnitChoices } from './displayOptionChoices';
import { useDateMacroContext } from './useDateMacroContext';
import { useTranslate } from './useTranslate';

const App = () => {
  const { details, config, timeZone } = useDateMacroContext();
  const { ready, t } = useTranslate();
  if (!ready) return null;

  // Shared validation
  const error = validateConfig(details, config, t);
  if (error) return <Text>{error}</Text>;

  // Shared time parsing
  const parsed = parseTime(config.time, t);
  if (parsed.error) return <Text>{parsed.error}</Text>;

  const {time, meridiem} = parsed;

  if(!isPresent(config.timeZone)) {
    return (
      <Text>{t('error.notConfigured.timeZone')}</Text>
    );
  }

  const repetitionUnit = config.repetitionUnit ?? REPEAT_WEEKLY;
  const repetitionPeriodRaw = config.repetitionPeriod;
  if (!isPresent(repetitionPeriodRaw)) {
    return (
      <Text>{t('error.notConfigured.repetitionPeriod')}</Text>
    );
  }

  const repetitionPeriod = parseInt(repetitionPeriodRaw, 10);
  if (isNaN(repetitionPeriod) || repetitionPeriod < 1) {
    return (
      <Text>{t('error.repetitionPeriodInvalidWithHint')}</Text>
    );
  }

  const startDate = parseConfiguredDate(config.date, time, meridiem, config.timeZone);
  const originalDate = nextRepeatDate(startDate, repetitionPeriod, repetitionToUnits(repetitionUnit));

  return renderDateLozenge({ originalDate, timeZone, config, t });
};

ForgeReconciler.render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>
);

const Config = () => {
  const { ready, t } = useTranslate();
  if (!ready) return null;

  return (
    <>
      <Label labelFor='time'>{t('config.time.label')}</Label>
      <Textfield
              name="time"
              description={t('config.time.description')}
              placeholder={t('config.time.placeholder')}
              />
      <Label labelFor="date">{t('config.startDate.label')}</Label>
      <DatePicker name="date" description={t('config.startDate.description')} />
      <Label labelFor='timeZone'>{t('config.timeZone.label')}</Label>
      <Select
        name="timeZone"
        isRequired
        description={t('config.timeZone.description')}
        options={TimeZones.map(tz => ({ label: tz, value: tz }))}
        />
      <Label labelFor='repetitionUnit'>{t('config.repetitionUnit.label')}</Label>
      <Select
        name="repetitionUnit"
        isRequired
        defaultValue={{ label: t('config.repetitionUnit.week'), value: REPEAT_WEEKLY }}
        description={t('config.repetitionUnit.description')}
        options={repetitionUnitChoices(t)}
        />
      <Label labelFor='repetitionPeriod'>{t('config.repetitionPeriod.label')}</Label>
      <Textfield
        isRequired
        name="repetitionPeriod"
        description={t('config.repetitionPeriod.description')}
        />
      <Label labelFor='displayOption'>{t('config.displayOption.label')}</Label>
      <Select
        name="displayOption"
        isRequired
        defaultValue={{ label: t('config.displayOption.default'), value: FORMAT_DEFAULT }}
        description={t('config.displayOption.description')}
        options={displayOptionChoices(t)}
        />
    </>
  );
};

ForgeReconciler.addConfig(
  <I18nProvider>
    <Config />
  </I18nProvider>
);