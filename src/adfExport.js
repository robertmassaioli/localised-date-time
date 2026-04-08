import { requestConfluence, route } from '@forge/api';
import moment from 'moment-timezone';
import { validateConfig, parseTime } from './common';
import { displayText, FORMAT_DEFAULT_AND_ORIGINAL, FORMAT_DEFAULT_AND_UTC, formatRequiresLiveUpdates } from './displayOptions';
import { nextRepeatDate, repetitionToUnits } from './repetition';

/**
 * Attempts to resolve the viewer's timezone via the Confluence users-bulk API.
 * Falls back to the configured timezone if accountId is absent or the API call fails.
 */
async function getUserTimezone(accountId, configuredTimezone) {
  console.info('[adfExport] getUserTimezone: accountId =', accountId, 'configuredTimezone =', configuredTimezone);
  if (!accountId) {
    console.info('[adfExport] getUserTimezone: no accountId, using configuredTimezone =', configuredTimezone);
    return configuredTimezone;
  }
  try {
    const response = await requestConfluence(route`/wiki/rest/api/user?accountId=${accountId}&expand=personalSpace`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const data = await response.json();
    console.info('[adfExport] getUserTimezone: API response status =', response.status, 'data =', JSON.stringify(data));
    const resolved = data?.timeZone ?? configuredTimezone;
    console.info('[adfExport] getUserTimezone: resolved timezone =', resolved);
    return resolved;
  } catch (e) {
    console.warn('[adfExport] getUserTimezone: failed, falling back to configuredTimezone:', e);
    return configuredTimezone;
  }
}

/**
 * Builds an error ADF document with a message.
 */
function errorAdf(message) {
  return {
    version: 1,
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: message }]
      }
    ]
  };
}

/**
 * Builds an ADF paragraph node from an array of inline content nodes.
 */
function paragraph(inlineNodes) {
  return { type: 'paragraph', content: inlineNodes };
}

/**
 * Builds an ADF status node (renders like a Lozenge).
 * color: 'neutral' | 'purple' | 'blue' | 'red' | 'yellow' | 'green'
 */
function statusNode(text, color = 'neutral') {
  return {
    type: 'status',
    attrs: {
      localId: crypto.randomUUID(),
      text,
      color
    }
  };
}

function plainText(text) {
  return { type: 'text', text };
}

/**
 * Builds the ADF content for a given display option, mirroring the frontend lozenge output.
 * For countdown formats (which are inherently dynamic), falls back to the absolute date display
 * since exports are static snapshots.
 */
function buildAdfContent(displayOption, displayDate, originalDate) {
  console.info('[adfExport] buildAdfContent: displayOption =', displayOption,
    'displayDate =', displayDate.format(), 'displayDate.tz() =', displayDate.tz(),
    'originalDate =', originalDate.format(), 'originalDate.tz() =', originalDate.tz());

  // Countdown formats don't make sense in a static export — show absolute date with a note
  if (formatRequiresLiveUpdates(displayOption)) {
    console.info('[adfExport] buildAdfContent: countdown format, showing absolute date with note');
    return [
      paragraph([
        statusNode(displayText('default', displayDate)),
        plainText(' (countdown not available in export)')
      ])
    ];
  }

  if (displayOption === FORMAT_DEFAULT_AND_ORIGINAL) {
    console.info('[adfExport] buildAdfContent: FORMAT_DEFAULT_AND_ORIGINAL, always showing both timezones');
    return [
      paragraph([
        statusNode(displayText('default', displayDate)),
        plainText(' ('),
        statusNode(displayText('default', originalDate)),
        plainText(')')
      ])
    ];
  }

  if (displayOption === FORMAT_DEFAULT_AND_UTC) {
    const utcDate = originalDate.clone().tz('UTC');
    console.info('[adfExport] buildAdfContent: FORMAT_DEFAULT_AND_UTC, utcDate =', utcDate.format());
    return [
      paragraph([
        statusNode(displayText('default', utcDate)),
        plainText(' ('),
        statusNode(displayText('default', displayDate)),
        plainText(')')
      ])
    ];
  }

  // Default: just the formatted date as a status node
  console.info('[adfExport] buildAdfContent: default format');
  return [paragraph([statusNode(displayText(displayOption, displayDate))])];
}

/**
 * Shared logic for computing the ADF output given a config and viewer timezone.
 */
function buildAdf(originalDate, viewerTimezone, config) {
  console.info('[adfExport] buildAdf: originalDate =', originalDate.format(), 'originalDate.tz() =', originalDate.tz(),
    'viewerTimezone =', viewerTimezone, 'displayOption =', config.displayOption);
  const displayDate = originalDate.clone().tz(viewerTimezone);
  console.info('[adfExport] buildAdf: displayDate =', displayDate.format(), 'displayDate.tz() =', displayDate.tz());
  const content = buildAdfContent(config.displayOption, displayDate, originalDate);
  return { version: 1, type: 'doc', content };
}

export async function handleNonRepeating(payload) {
  const config = payload?.extensionPayload?.config;
  const accountId = payload?.context?.accountId;
  console.info('[adfExport] handleNonRepeating: config =', JSON.stringify(config), 'accountId =', accountId);

  const validationError = validateConfig(config, config, ['date', 'time', 'timeZone']);
  if (validationError) {
    console.warn('[adfExport] handleNonRepeating: invalid config:', validationError);
    return errorAdf(validationError);
  }

  const parsedTime = parseTime(config.time);
  if (parsedTime.error) {
    console.warn('[adfExport] handleNonRepeating: invalid time:', parsedTime.error);
    return errorAdf(parsedTime.error);
  }
  console.info('[adfExport] handleNonRepeating: parsedTime =', JSON.stringify(parsedTime));

  const viewerTimezone = await getUserTimezone(accountId, config.timeZone);
  const originalDate = moment.tz(`${config.date} ${parsedTime.time} ${parsedTime.meridiem}`, 'YYYY-MM-DD h:mm a', config.timeZone);
  console.info('[adfExport] handleNonRepeating: viewerTimezone =', viewerTimezone, 'originalDate =', originalDate.format(), 'originalDate.tz() =', originalDate.tz());

  return buildAdf(originalDate, viewerTimezone, config);
}

export async function handleRepeating(payload) {
  const config = payload?.extensionPayload?.config;
  const accountId = payload?.context?.accountId;
  console.info('[adfExport] handleRepeating: config =', JSON.stringify(config), 'accountId =', accountId);

  const validationError = validateConfig(config, config, ['date', 'time', 'timeZone', 'repetitionUnit', 'repetitionPeriod']);
  if (validationError) {
    console.warn('[adfExport] handleRepeating: invalid config:', validationError);
    return errorAdf(validationError);
  }

  const parsedTime = parseTime(config.time);
  if (parsedTime.error) {
    console.warn('[adfExport] handleRepeating: invalid time:', parsedTime.error);
    return errorAdf(parsedTime.error);
  }
  console.info('[adfExport] handleRepeating: parsedTime =', JSON.stringify(parsedTime));

  const viewerTimezone = await getUserTimezone(accountId, config.timeZone);
  const startDate = moment.tz(`${config.date} ${parsedTime.time} ${parsedTime.meridiem}`, 'YYYY-MM-DD h:mm a', config.timeZone);
  const unit = repetitionToUnits(config.repetitionUnit);
  const originalDate = nextRepeatDate(startDate, config.repetitionPeriod, unit);
  console.info('[adfExport] handleRepeating: viewerTimezone =', viewerTimezone, 'startDate =', startDate.format(), 'unit =', unit, 'originalDate =', originalDate.format(), 'originalDate.tz() =', originalDate.tz());

  return buildAdf(originalDate, viewerTimezone, config);
}
