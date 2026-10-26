/**
 * Picks the Timezone select option that matches the editing user's timezone.
 *
 * `contextTimeZone` is `context.timezone` from `useProductContext`, an IANA
 * name such as `Australia/Sydney`. `timeZones` is the list of option names.
 * The match is exact and case-sensitive, so a legacy alias that is in the list
 * (for example `Asia/Calcutta`) picks its own entry.
 *
 * Returns `{ label, value }`, or `undefined` when there is no matching option.
 * `undefined` leaves the Select empty, which is what the panel did before.
 */
export function defaultTimeZoneOption(contextTimeZone, timeZones) {
  if (typeof contextTimeZone !== 'string' || contextTimeZone === '') {
    return undefined;
  }
  if (!timeZones.includes(contextTimeZone)) {
    return undefined;
  }
  return { label: contextTimeZone, value: contextTimeZone };
}
