import { useEffect, useMemo, useState } from 'react';
import { useConfig, useProductContext } from '@forge/react';
import { formatRequiresLiveUpdates } from '../displayOptions';

/**
 * Shared hook for both date macro App components.
 * Loads the macro config and the viewer's timezone, and manages the live-update
 * interval for countdown display formats.
 *
 * useConfig subscribes to macro config changes, so config autosaved from the
 * config panel reaches the rendered macro while it is open in the editor.
 *
 * Returns { details, config, timeZone, now } where:
 *  - details: the raw context object ({ timeZone, config }), undefined until the context has loaded
 *  - config:  the macro config, undefined until it has loaded or while the macro is unconfigured
 *  - timeZone: the viewer's timezone
 *  - now:     a timestamp (ms) that updates every second when in countdown mode,
 *             triggering re-renders to keep the countdown current
 */
export function useDateMacroContext() {
  const [now, setNow] = useState(Date.now());

  const config = useConfig();
  const context = useProductContext();
  const timeZone = context?.timezone;

  const details = useMemo(
    () => (context ? { timeZone, config } : undefined),
    [context, timeZone, config]
  );

  useEffect(() => {
    if (config && formatRequiresLiveUpdates(config.displayOption)) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [details]);

  return { details, config, timeZone, now };
}
