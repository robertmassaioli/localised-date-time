import { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import { formatRequiresLiveUpdates } from '../displayOptions';
import { useEffectAsync } from '../useEffectAsync';

/**
 * Shared hook for both date macro App components.
 * Loads the Forge view context (user timezone + macro config) and manages
 * the live-update interval for countdown display formats.
 *
 * Returns { details, config, timeZone, now } where:
 *  - details: the raw context object ({ timeZone, config }), undefined until loaded
 *  - config:  details?.config shorthand
 *  - timeZone: details?.timeZone shorthand (the viewer's timezone)
 *  - now:     a timestamp (ms) that updates every second when in countdown mode,
 *             triggering re-renders to keep the countdown current
 */
export function useDateMacroContext() {
  const [details, setDetails] = useState(undefined);
  const [now, setNow] = useState(Date.now());

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
      return () => clearInterval(interval);
    }
    return undefined;
  }, [details]);

  return { details, config, timeZone, now };
}
