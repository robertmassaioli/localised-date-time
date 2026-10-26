import React from 'react';
import TestRenderer from 'react-test-renderer';
import { TimeZones } from '../timezones';

let mockContext;
let mockConfigElement;

// The real @forge/react needs the Forge bridge, which only exists in the browser.
// The config modules call ForgeReconciler.render and addConfig when they load,
// so the mock captures the Config element that addConfig receives.
jest.mock('@forge/react', () => ({
  __esModule: true,
  default: {
    render: () => {},
    addConfig: element => {
      mockConfigElement = element;
    }
  },
  DatePicker: 'DatePicker',
  Label: 'Label',
  Select: 'Select',
  Text: 'Text',
  Textfield: 'Textfield',
  Lozenge: 'Lozenge',
  Tooltip: 'Tooltip',
  useConfig: () => undefined,
  useProductContext: () => mockContext
}));

function loadConfig(modulePath) {
  jest.isolateModules(() => {
    require(modulePath);
  });
  return mockConfigElement.type;
}

function findSelect(node, name) {
  if (node === null || typeof node === 'string') return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const hit = findSelect(child, name);
      if (hit) return hit;
    }
    return undefined;
  }
  if (node.type === 'Select' && node.props.name === name) return node;
  return findSelect(node.children ?? [], name);
}

describe.each([
  ['non-repeating', '../frontend/non-repeating'],
  ['repeating', '../frontend/repeating']
])('%s config panel Timezone select', (_name, modulePath) => {
  function timeZoneSelect() {
    const Config = loadConfig(modulePath);
    return findSelect(TestRenderer.create(<Config />).toJSON(), 'timeZone');
  }

  it('defaults to the timezone from the product context', () => {
    mockContext = { timezone: 'Australia/Sydney' };
    expect(timeZoneSelect().props.defaultValue).toEqual({
      label: 'Australia/Sydney',
      value: 'Australia/Sydney'
    });
  });

  it('has no default while the context has not loaded', () => {
    mockContext = undefined;
    expect(timeZoneSelect().props.defaultValue).toBeUndefined();
  });

  it('has no default when the context timezone is not in the option list', () => {
    mockContext = { timezone: 'Mars/Olympus_Mons' };
    expect(timeZoneSelect().props.defaultValue).toBeUndefined();
  });

  it('has no default when the context has no timezone', () => {
    mockContext = {};
    expect(timeZoneSelect().props.defaultValue).toBeUndefined();
  });

  it('keeps every timezone as an option', () => {
    mockContext = { timezone: 'Australia/Sydney' };
    const select = timeZoneSelect();
    expect(select.props.options).toHaveLength(TimeZones.length);
    expect(select.props.options).toContainEqual({ label: 'Australia/Sydney', value: 'Australia/Sydney' });
  });
});
