import React from 'react';
import TestRenderer from 'react-test-renderer';
import { DateTime } from 'luxon';
import { renderDateLozenge } from '../frontend/common';
import { translateFor } from './translate';
import {
  FORMAT_DEFAULT,
  FORMAT_DEFAULT_AND_ORIGINAL,
  FORMAT_DEFAULT_AND_UTC,
  FORMAT_HUMAN_COUNTDOWN,
  FORMAT_NASA_COUNTDOWN
} from '../displayOptions';

// The real @forge/react needs the Forge bridge, which only exists in the browser.
jest.mock('@forge/react', () => ({ Lozenge: 'Lozenge', Tooltip: 'Tooltip', Text: 'Text' }));

// 3:00 pm in Sydney (UTC+11 in November) is 11:00 pm the previous day in New York (UTC-5)
const originalDate = DateTime.fromISO('2024-11-15T15:00', { zone: 'Australia/Sydney' });
const SYDNEY_TEXT = 'Fri, Nov 15, 2024 3:00pm AEDT';
const NEW_YORK_TEXT = 'Thu, Nov 14, 2024 11:00pm EST';
const UTC_TEXT = 'Fri, Nov 15, 2024 4:00am UTC';

function render(displayOption, timeZone = 'America/New_York', t = translateFor('en-GB')) {
  const element = renderDateLozenge({
    originalDate,
    timeZone,
    config: { timeZone: 'Australia/Sydney', displayOption },
    t
  });
  return TestRenderer.create(element).toJSON();
}

// Finds every host node of the given type anywhere in the rendered tree
function findAll(tree, type) {
  const found = [];
  const visit = node => {
    if (node === null || typeof node === 'string') return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (node.type === type) found.push(node);
    (node.children ?? []).forEach(visit);
  };
  visit(tree);
  return found;
}

const lozengeTexts = tree => findAll(tree, 'Lozenge').map(node => node.children.join(''));

describe('renderDateLozenge', () => {
  test('default format shows one lozenge in the viewer timezone', () => {
    const tree = render(FORMAT_DEFAULT);
    expect(lozengeTexts(tree)).toEqual([NEW_YORK_TEXT]);
  });

  test('an unset display option shows the default format', () => {
    expect(lozengeTexts(render(undefined))).toEqual([NEW_YORK_TEXT]);
  });

  test('shows the configured timezone when the viewer timezone is unknown', () => {
    expect(lozengeTexts(render(FORMAT_DEFAULT, null))).toEqual([SYDNEY_TEXT]);
  });

  describe('configured timezone format', () => {
    test('shows the viewer time and the configured time when the viewer is elsewhere', () => {
      const tree = render(FORMAT_DEFAULT_AND_ORIGINAL);
      expect(lozengeTexts(tree)).toEqual([NEW_YORK_TEXT, SYDNEY_TEXT]);
      expect(findAll(tree, 'Tooltip')).toHaveLength(0);
    });

    test('shows one lozenge with a co-located tooltip when the viewer is in the configured timezone', () => {
      const tree = render(FORMAT_DEFAULT_AND_ORIGINAL, 'Australia/Sydney');
      expect(lozengeTexts(tree)).toEqual([SYDNEY_TEXT]);
      const tooltips = findAll(tree, 'Tooltip');
      expect(tooltips).toHaveLength(1);
      expect(tooltips[0].props.content).toBe('Co-located: You are viewing this date-time from the same timezone it was configured for.');
    });

    test('translates the co-located tooltip', () => {
      const tree = render(FORMAT_DEFAULT_AND_ORIGINAL, 'Australia/Sydney', translateFor('fr-FR'));
      expect(findAll(tree, 'Tooltip')[0].props.content).toMatch(/^Même lieu/);
    });
  });

  test('UTC format shows UTC first and the viewer time second', () => {
    expect(lozengeTexts(render(FORMAT_DEFAULT_AND_UTC))).toEqual([UTC_TEXT, NEW_YORK_TEXT]);
  });

  describe('countdown formats', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // 28 hours before the event, which starts at 2024-11-15T04:00:00Z
      jest.setSystemTime(new Date('2024-11-14T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('human countdown shows a relative time', () => {
      expect(lozengeTexts(render(FORMAT_HUMAN_COUNTDOWN))).toEqual(['in a day']);
    });

    test('NASA countdown shows T-minus the remaining time', () => {
      expect(lozengeTexts(render(FORMAT_NASA_COUNTDOWN))).toEqual(['T-1d4h']);
    });

    test('NASA countdown switches to T-plus after the event', () => {
      jest.setSystemTime(new Date('2024-11-15T05:30:00Z'));
      expect(lozengeTexts(render(FORMAT_NASA_COUNTDOWN))).toEqual(['T+1h30m']);
    });
  });
});
