import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { IntlProvider } from 'react-intl';
import { flattenMessages } from '../i18n';
import { loadLocale } from './translate';

let mockContext;
let mockConfig;
let mockRenderedElement;

// The real @forge/react and @forge/bridge need the Forge runtime, which only exists in the browser.
// The macro modules call ForgeReconciler.render when they load, so the mock captures what they render.
jest.mock('@forge/bridge', () => ({ i18n: { getTranslations: async () => ({ locale: 'en-GB', translations: {} }) } }));
jest.mock('@forge/react', () => ({
  __esModule: true,
  default: {
    render: element => { mockRenderedElement = element; },
    addConfig: () => {}
  },
  DatePicker: 'DatePicker',
  Label: 'Label',
  Select: 'Select',
  Text: 'Text',
  Textfield: 'Textfield',
  Lozenge: 'Lozenge',
  Tooltip: 'Tooltip',
  Spinner: 'Spinner',
  useConfig: () => mockConfig,
  useProductContext: () => mockContext
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const baseConfig = { date: '2024-11-15', time: '3:00 pm', timeZone: 'Australia/Sydney', displayOption: 'default' };
const repeatingConfig = { ...baseConfig, date: '2024-11-01', repetitionUnit: 'repeat-weekly', repetitionPeriod: '1' };

const loadedApps = {};

// Each module is loaded once, so the App shares this file's copy of React with the renderer.
function loadApp(modulePath) {
  if (!loadedApps[modulePath]) {
    require(modulePath);
    // render receives <React.StrictMode><MacroIntlProvider><App /></MacroIntlProvider></React.StrictMode>
    loadedApps[modulePath] = mockRenderedElement.props.children.props.children.type;
  }
  return loadedApps[modulePath];
}

function lozengeTexts(tree) {
  const found = [];
  const visit = node => {
    if (node === null || typeof node === 'string') return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (node.type === 'Lozenge') found.push(node.children.join('').replace(/[  ]/g, ' '));
    (node.children ?? []).forEach(visit);
  };
  visit(tree);
  return found;
}

function renderApp(modulePath) {
  const App = loadApp(modulePath);
  let renderer;
  act(() => {
    renderer = TestRenderer.create(
      <IntlProvider locale="en-GB" messages={flattenMessages(loadLocale('en-GB'))}><App /></IntlProvider>
    );
  });
  return lozengeTexts(renderer.toJSON());
}

describe.each([
  ['non-repeating', '../frontend/non-repeating', baseConfig],
  ['repeating', '../frontend/repeating', repeatingConfig]
])('%s macro', (_name, modulePath, config) => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-11-14T00:00:00Z'));
    mockConfig = config;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test.each([
    ['de-DE', 'Do., 14. Nov. 2024, 23:00 EST'],
    ['en-US', 'Thu, Nov 14, 2024, 11:00 PM EST'],
    ['en-AU', 'Thu, 14 Nov 2024, 11:00 pm EST']
  ])('formats for the viewer locale %s', (locale, expected) => {
    mockContext = { timezone: 'America/New_York', locale };
    expect(renderApp(modulePath)).toEqual([expected]);
  });

  test('applies the author clock setting to an English locale only', () => {
    mockConfig = { ...config, clock: '24h' };
    mockContext = { timezone: 'America/New_York', locale: 'en-US' };
    expect(renderApp(modulePath)).toEqual(['Thu, Nov 14, 2024, 23:00 EST']);
    mockContext = { timezone: 'America/New_York', locale: 'ko-KR' };
    expect(renderApp(modulePath)).toEqual(['2024년 11월 14일 (목) 오후 11:00 EST']);
  });
});
