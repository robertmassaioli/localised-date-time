import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useDateMacroContext } from '../frontend/useDateMacroContext';
import { FORMAT_DEFAULT, FORMAT_HUMAN_COUNTDOWN } from '../displayOptions';

let mockConfig;
let mockContext;

// The real hooks call the Forge bridge, which only exists in the browser.
jest.mock('@forge/react', () => ({
  useConfig: () => mockConfig,
  useProductContext: () => mockContext
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('useDateMacroContext', () => {
  let latest;
  let renderer;

  function Probe() {
    latest = useDateMacroContext();
    return null;
  }

  function mount() {
    act(() => {
      renderer = TestRenderer.create(<Probe />);
    });
  }

  function rerender() {
    act(() => {
      renderer.update(<Probe />);
    });
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-01T00:00:00Z'));
    mockConfig = undefined;
    mockContext = undefined;
    latest = undefined;
  });

  afterEach(() => {
    act(() => renderer.unmount());
    jest.useRealTimers();
  });

  test('has no details, config or timezone until the context loads', () => {
    mount();
    expect(latest.details).toBeUndefined();
    expect(latest.config).toBeUndefined();
    expect(latest.timeZone).toBeUndefined();
  });

  test('returns the viewer locale exactly as the platform reports it', () => {
    mockContext = { timezone: 'Australia/Sydney', locale: 'en-AU' };
    mount();
    expect(latest.locale).toBe('en-AU');
  });

  test('has no locale until the context loads', () => {
    mount();
    expect(latest.locale).toBeUndefined();
  });

  test('has details but no config for an unconfigured macro', () => {
    mockContext = { timezone: 'Australia/Sydney' };
    mount();
    expect(latest.details).toEqual({ timeZone: 'Australia/Sydney', config: undefined });
    expect(latest.config).toBeUndefined();
    expect(latest.timeZone).toBe('Australia/Sydney');
  });

  test('passes the config from useConfig through', () => {
    mockContext = { timezone: 'Australia/Sydney' };
    mockConfig = { date: '2026-10-29', displayOption: FORMAT_DEFAULT };
    mount();
    expect(latest.config).toEqual(mockConfig);
    expect(latest.details).toEqual({ timeZone: 'Australia/Sydney', config: mockConfig });
  });

  test('picks up config that arrives after the first render', () => {
    mockContext = { timezone: 'Australia/Sydney' };
    mount();
    expect(latest.config).toBeUndefined();
    mockConfig = { time: '5:00 pm' };
    rerender();
    expect(latest.config).toEqual({ time: '5:00 pm' });
  });

  test('keeps the same details object while nothing changes', () => {
    mockContext = { timezone: 'Australia/Sydney' };
    mockConfig = { date: '2026-10-29' };
    mount();
    const first = latest.details;
    rerender();
    expect(latest.details).toBe(first);
  });

  test('does not start a timer for formats without live updates', () => {
    mockContext = { timezone: 'Australia/Sydney' };
    mockConfig = { displayOption: FORMAT_DEFAULT };
    mount();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('updates now every second for countdown formats', () => {
    mockContext = { timezone: 'Australia/Sydney' };
    mockConfig = { displayOption: FORMAT_HUMAN_COUNTDOWN };
    mount();
    const start = latest.now;
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(latest.now - start).toBe(3000);
  });

  test('stops the timer on unmount', () => {
    mockContext = { timezone: 'Australia/Sydney' };
    mockConfig = { displayOption: FORMAT_HUMAN_COUNTDOWN };
    mount();
    expect(jest.getTimerCount()).toBe(1);
    act(() => renderer.unmount());
    expect(jest.getTimerCount()).toBe(0);
  });
});
