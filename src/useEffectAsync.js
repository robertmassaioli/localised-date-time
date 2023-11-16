import { useEffect } from 'react';
import { isPresent } from 'ts-is-present';

export function useEffectAsync(
  callback,//: () => Promise<void>,
  dep//: Readonly<A | undefined>
) {
  useEffect(() => {
    if (!isPresent(dep)) {
      callback();
    }
  }, [dep]);
}