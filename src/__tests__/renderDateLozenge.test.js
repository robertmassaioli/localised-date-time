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

function render(displayOption, timeZone = 'America/New_York', t = translateFor('en-GB'), { locale, clock } = {}) {
  const element = renderDateLozenge({
    originalDate,
    timeZone,
    config: { timeZone: 'Australia/Sydney', displayOption, ...(clock ? { clock } : {}) },
    t,
    locale
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

  // Intl puts U+202F before AM and PM in some locales
  const plain = texts => texts.map(text => text.replace(/[\u202f\u00a0]/g, ' '));

  describe('with a viewer locale', () => {
    const lozenges = (displayOption, locale, clock, timeZone) => plain(lozengeTexts(render(displayOption, timeZone, translateFor('en-GB'), { locale, clock })));

    test.each([
      ['en-US', 'Thu, Nov 14, 2024, 11:00 PM EST'],
      ['en-GB', 'Thu, 14 Nov 2024, 23:00 EST'],
      ['de-DE', 'Do., 14. Nov. 2024, 23:00 EST'],
      ['ja-JP', '2024年11月14日(木) 23:00 EST']
    ])('%s formats the viewer time in its own layout', (locale, expected) => {
      expect(lozenges(FORMAT_DEFAULT, locale)).toEqual([expected]);
    });

    test('the raw locale en-AU, which has no translation file, formats as en-AU', () => {
      expect(lozenges(FORMAT_DEFAULT, 'en-AU')).toEqual(['Thu, 14 Nov 2024, 11:00 pm EST']);
    });

    test('a locale Intl has no data for uses the nearest translation locale', () => {
      expect(lozenges(FORMAT_DEFAULT, 'not a locale!!')).toEqual(['Thu, 14 Nov 2024, 23:00 EST']);
    });

    test('no locale keeps the legacy English pattern', () => {
      expect(lozenges(FORMAT_DEFAULT, undefined)).toEqual([NEW_YORK_TEXT]);
    });

    test('the configured timezone format uses the locale for both dates', () => {
      expect(lozenges(FORMAT_DEFAULT_AND_ORIGINAL, 'de-DE')).toEqual([
        'Do., 14. Nov. 2024, 23:00 EST',
        'Fr., 15. Nov. 2024, 15:00 AEDT'
      ]);
    });

    test('the UTC format uses the locale for both dates', () => {
      expect(lozenges(FORMAT_DEFAULT_AND_UTC, 'de-DE')).toEqual([
        'Fr., 15. Nov. 2024, 04:00 UTC',
        'Do., 14. Nov. 2024, 23:00 EST'
      ]);
    });

    test('the same-timezone tooltip format uses the locale', () => {
      expect(lozenges(FORMAT_DEFAULT_AND_ORIGINAL, 'de-DE', undefined, 'Australia/Sydney')).toEqual(['Fr., 15. Nov. 2024, 15:00 AEDT']);
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

      test('the human countdown is worded in the viewer locale', () => {
        expect(lozenges(FORMAT_HUMAN_COUNTDOWN, 'de-DE')).toEqual(['morgen']);
        expect(lozenges(FORMAT_HUMAN_COUNTDOWN, 'en-GB')).toEqual(['tomorrow']);
        expect(lozenges(FORMAT_HUMAN_COUNTDOWN, undefined)).toEqual(['in a day']);
      });

      test('the NASA countdown is the same in every locale', () => {
        expect(lozenges(FORMAT_NASA_COUNTDOWN, 'de-DE')).toEqual(['T-1d4h']);
        expect(lozenges(FORMAT_NASA_COUNTDOWN, 'ja-JP')).toEqual(['T-1d4h']);
      });
    });

    describe('the author clock setting', () => {
      test('applies to English locales', () => {
        expect(lozenges(FORMAT_DEFAULT, 'en-GB', '12h')).toEqual(['Thu, 14 Nov 2024, 11:00 pm EST']);
        expect(lozenges(FORMAT_DEFAULT, 'en-US', '24h')).toEqual(['Thu, Nov 14, 2024, 23:00 EST']);
        expect(lozenges(FORMAT_DEFAULT, 'en-AU', '24h')).toEqual(['Thu, 14 Nov 2024, 23:00 EST']);
      });

      test('auto and a missing setting keep the locale default', () => {
        expect(lozenges(FORMAT_DEFAULT, 'en-GB', 'auto')).toEqual(['Thu, 14 Nov 2024, 23:00 EST']);
        expect(lozenges(FORMAT_DEFAULT, 'en-GB', undefined)).toEqual(['Thu, 14 Nov 2024, 23:00 EST']);
      });

      test('never changes a locale with its own clock: 12-hour still shows 24 hours in German', () => {
        expect(lozenges(FORMAT_DEFAULT, 'de-DE', '12h')).toEqual(['Do., 14. Nov. 2024, 23:00 EST']);
        expect(lozenges(FORMAT_DEFAULT, 'ko-KR', '24h')).toEqual(['2024년 11월 14일 (목) 오후 11:00 EST']);
      });
    });
  });
});
