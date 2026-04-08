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
  if (!accountId) return configuredTimezone;
  try {
    const response = await requestConfluence(route`/wiki/api/v2/users-bulk`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountIds: [accountId] })
    });
    const data = await response.json();
    const user = data?.results?.[0];
    return user?.timeZone ?? configuredTimezone;
  } catch (e) {
    console.warn('[adfExport] Failed to get user timezone, falling back to configured timezone:', e);
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
      text,
      color,
      localId: '',
      style: ''
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
  // Countdown formats don't make sense in a static export — show absolute date with a note
  if (formatRequiresLiveUpdates(displayOption)) {
    return [
      paragraph([
        statusNode(displayText('default', displayDate)),
        plainText(' (countdown not available in export)')
      ])
    ];
  }

  if (displayOption === FORMAT_DEFAULT_AND_ORIGINAL) {
    const sameTimezone = displayDate.tz() === originalDate.tz();
    if (sameTimezone) {
      return [paragraph([statusNode(displayText('default', displayDate))])];
    }
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
  return [paragraph([statusNode(displayText(displayOption, displayDate))])];
}

/**
 * Shared logic for computing the ADF output given a config and viewer timezone.
 */
function buildAdf(originalDate, viewerTimezone, config) {
  const displayDate = originalDate.clone().tz(viewerTimezone);
  const content = buildAdfContent(config.displayOption, displayDate, originalDate);
  return { version: 1, type: 'doc', content };
}

export async function handleNonRepeating(payload) {
  const config = payload?.extensionPayload?.config;
  const accountId = payload?.context?.accountId;

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

  const viewerTimezone = await getUserTimezone(accountId, config.timeZone);
  const originalDate = moment.tz(`${config.date} ${parsedTime.time} ${parsedTime.meridiem}`, 'YYYY-MM-DD h:mm a', config.timeZone);

  return buildAdf(originalDate, viewerTimezone, config);
}

export async function handleRepeating(payload) {
  const config = payload?.extensionPayload?.config;
  const accountId = payload?.context?.accountId;

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

  const viewerTimezone = await getUserTimezone(accountId, config.timeZone);
  const startDate = moment.tz(`${config.date} ${parsedTime.time} ${parsedTime.meridiem}`, 'YYYY-MM-DD h:mm a', config.timeZone);
  const unit = repetitionToUnits(config.repetitionUnit);
  const originalDate = nextRepeatDate(startDate, config.repetitionPeriod, unit);

  return buildAdf(originalDate, viewerTimezone, config);
}
