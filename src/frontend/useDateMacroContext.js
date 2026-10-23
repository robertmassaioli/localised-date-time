import { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import { formatRequiresLiveUpdates } from '../displayOptions';
import { debugError, debugLog } from './debug';

// How often to re-read the context while the macro is open in the editor.
const EDITING_POLL_MS = 1000;

/**
 * Shared hook for both date macro App components.
 * Loads the Forge view context (user timezone + macro config) and manages
 * the live-update interval for countdown display formats.
 *
 * view.getContext() is a one-shot read and the bridge has no change event, so while the
 * macro is being edited (extension.isEditing) the context is re-read periodically. Without
 * that, config autosaved from the config panel never reaches the rendered macro.
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

  debugLog('render: details loaded =', details !== undefined, '| config =', JSON.stringify(config), '| timeZone =', timeZone);

  useEffect(() => {
    let cancelled = false;
    let timer;

    const load = async () => {
      try {
        const context = await view.getContext();
        if (cancelled) return;

        const next = {
          timeZone: context.timezone,
          config: context.extension.config
        };
        const isEditing = Boolean(context.extension.isEditing);
        debugLog('view.getContext(): extension.isEditing =', isEditing,
          '| extension.config =', JSON.stringify(next.config), '| context.timezone =', next.timeZone);

        // Keep the previous object when nothing changed so polling does not cause re-renders.
        setDetails(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));

        if (isEditing) {
          timer = setTimeout(load, EDITING_POLL_MS);
        }
      } catch (e) {
        debugError('view.getContext() failed:', e);
      }
    };

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    debugLog('details changed: config =', JSON.stringify(config), '| live updates =', config ? formatRequiresLiveUpdates(config.displayOption) : 'n/a');
    if (config && formatRequiresLiveUpdates(config.displayOption)) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [details]);

  return { details, config, timeZone, now };
}
