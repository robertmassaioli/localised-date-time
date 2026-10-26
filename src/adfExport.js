import api, { route } from '@forge/api';
import { validateConfig, parseTime } from './configHelpers';
import { inZone, parseConfiguredDate } from './dateTime';
import { displayText, FORMAT_DEFAULT_AND_ORIGINAL, FORMAT_DEFAULT_AND_UTC, formatRequiresLiveUpdates } from './displayOptions';
import { nextRepeatDate, repetitionToUnits, REPEAT_WEEKLY } from './repetition';

/**
 * Attempts to resolve the viewer's timezone via the Confluence users-bulk API.
 * Falls back to the configured timezone if accountId is absent or the API call fails.
 * Failures are logged as warnings without the account ID, so a silent fallback to the
 * wrong timezone leaves a trace without putting user identifiers in the logs.
 */
async function getUserTimezone(accountId, configuredTimezone) {
  if (!accountId) {
    return configuredTimezone;
  }
  try {
    const response = await api.asApp().requestConfluence(route`/wiki/api/v2/users-bulk`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountIds: [accountId] })
    });
    if (!response.ok) {
      console.warn(`[adfExport] users-bulk request failed with status ${response.status}, using the configured timezone`);
      return configuredTimezone;
    }
    const data = await response.json();
    const user = data?.results?.[0];
    if (!user?.timeZone) {
      console.warn('[adfExport] users-bulk response had no timeZone for the viewer, using the configured timezone');
    }
    return user?.timeZone ?? configuredTimezone;
  } catch (e) {
    console.warn('[adfExport] users-bulk request threw, using the configured timezone:', e);
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
  // Countdown formats don't make sense in a static export, so show the absolute date with a note
  if (formatRequiresLiveUpdates(displayOption)) {
    return [
      paragraph([
        statusNode(displayText('default', displayDate)),
        plainText(' (countdown not available in export)')
      ])
    ];
  }

  if (displayOption === FORMAT_DEFAULT_AND_ORIGINAL) {
    const sameTimezone = displayDate.zoneName === originalDate.zoneName;
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
    const utcDate = originalDate.setZone('UTC');
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
  const displayDate = inZone(originalDate, viewerTimezone);
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
  const originalDate = parseConfiguredDate(config.date, parsedTime.time, parsedTime.meridiem, config.timeZone);

  return buildAdf(originalDate, viewerTimezone, config);
}

export async function handleRepeating(payload) {
  const config = payload?.extensionPayload?.config;
  const accountId = payload?.context?.accountId;

  const validationError = validateConfig(config, config, ['date', 'time', 'timeZone', 'repetitionPeriod']);
  if (validationError) {
    console.warn('[adfExport] handleRepeating: invalid config:', validationError);
    return errorAdf(validationError);
  }

  const parsedTime = parseTime(config.time);
  if (parsedTime.error) {
    console.warn('[adfExport] handleRepeating: invalid time:', parsedTime.error);
    return errorAdf(parsedTime.error);
  }

  const repetitionPeriod = parseInt(config.repetitionPeriod, 10);
  if (isNaN(repetitionPeriod) || repetitionPeriod < 1) {
    console.warn('[adfExport] handleRepeating: invalid repetitionPeriod:', config.repetitionPeriod);
    return errorAdf('Repetition period must be a whole number of 1 or higher.');
  }

  const viewerTimezone = await getUserTimezone(accountId, config.timeZone);
  const startDate = parseConfiguredDate(config.date, parsedTime.time, parsedTime.meridiem, config.timeZone);
  const unit = repetitionToUnits(config.repetitionUnit ?? REPEAT_WEEKLY);
  const originalDate = nextRepeatDate(startDate, repetitionPeriod, unit);

  return buildAdf(originalDate, viewerTimezone, config);
}
