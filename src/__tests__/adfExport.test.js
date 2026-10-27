import { handleNonRepeating, handleRepeating } from '../adfExport';
import { FORMAT_DEFAULT, FORMAT_DEFAULT_AND_ORIGINAL, FORMAT_DEFAULT_AND_UTC, FORMAT_HUMAN_COUNTDOWN } from '../displayOptions';
import { loadLocale } from './translate';

const mockRequestConfluence = jest.fn();
const mockGetTranslations = jest.fn();

jest.mock('@forge/api', () => ({
  __esModule: true,
  default: { asApp: () => ({ requestConfluence: (...args) => mockRequestConfluence(...args) }) },
  i18n: { getTranslations: (...args) => mockGetTranslations(...args) },
  route: (strings, ...values) => String.raw({ raw: strings.raw }, ...values)
}));

// 3:00 pm in Sydney (UTC+11 in November) is 11:00 pm the previous day in New York (UTC-5)
const baseConfig = {
  date: '2024-11-15',
  time: '3:00 pm',
  timeZone: 'Australia/Sydney',
  displayOption: FORMAT_DEFAULT
};

const SYDNEY_TEXT = 'Fri, Nov 15, 2024 3:00pm AEDT';
const NEW_YORK_TEXT = 'Thu, Nov 14, 2024 11:00pm EST';
const UTC_TEXT = 'Fri, Nov 15, 2024 4:00am UTC';

function payload(config, accountId = 'account-1', locale) {
  return { extensionPayload: { config }, context: { accountId, ...(locale ? { locale } : {}) } };
}

function usersBulkReturns(timeZone) {
  mockRequestConfluence.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ results: [{ timeZone }] })
  });
}

function textOf(adf) {
  return adf.content[0].content.map(node => node.text ?? node.attrs?.text);
}

describe('adfExport', () => {
  let warnSpy;

  beforeEach(() => {
    mockRequestConfluence.mockReset();
    mockGetTranslations.mockReset();
    // Only the locale files exist in this fake, as in a deployed app. Unknown locales throw.
    mockGetTranslations.mockImplementation(async locale => ({ locale, translations: loadLocale(locale) }));
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('handleNonRepeating', () => {
    test('shows the date in the viewer timezone', async () => {
      usersBulkReturns('America/New_York');
      const adf = await handleNonRepeating(payload(baseConfig));
      expect(adf).toMatchObject({ version: 1, type: 'doc' });
      expect(textOf(adf)).toEqual([NEW_YORK_TEXT]);
      expect(adf.content[0].content[0]).toMatchObject({
        type: 'status',
        attrs: { localId: expect.any(String), color: 'neutral' }
      });
    });

    test('asks users-bulk for the viewer account', async () => {
      usersBulkReturns('America/New_York');
      await handleNonRepeating(payload(baseConfig, 'account-42'));
      expect(mockRequestConfluence).toHaveBeenCalledTimes(1);
      const [url, options] = mockRequestConfluence.mock.calls[0];
      expect(url).toBe('/wiki/api/v2/users-bulk');
      expect(JSON.parse(options.body)).toEqual({ accountIds: ['account-42'] });
    });

    test('uses the configured timezone and makes no request when there is no account', async () => {
      const adf = await handleNonRepeating(payload(baseConfig, null));
      expect(textOf(adf)).toEqual([SYDNEY_TEXT]);
      expect(mockRequestConfluence).not.toHaveBeenCalled();
    });

    test('falls back to the configured timezone and warns when the API returns an error status', async () => {
      mockRequestConfluence.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
      const adf = await handleNonRepeating(payload(baseConfig));
      expect(textOf(adf)).toEqual([SYDNEY_TEXT]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('status 403'));
    });

    test('falls back to the configured timezone when the API throws', async () => {
      mockRequestConfluence.mockRejectedValue(new Error('network down'));
      const adf = await handleNonRepeating(payload(baseConfig));
      expect(textOf(adf)).toEqual([SYDNEY_TEXT]);
      expect(warnSpy).toHaveBeenCalled();
    });

    test('falls back to the configured timezone and warns when the user has no timezone', async () => {
      mockRequestConfluence.mockResolvedValue({ ok: true, status: 200, json: async () => ({ results: [{}] }) });
      const adf = await handleNonRepeating(payload(baseConfig));
      expect(textOf(adf)).toEqual([SYDNEY_TEXT]);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('no timeZone'));
    });

    test('never logs the account id', async () => {
      mockRequestConfluence.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
      const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
      await handleNonRepeating(payload(baseConfig, 'secret-account-id'));
      const logged = JSON.stringify([...warnSpy.mock.calls, ...infoSpy.mock.calls]);
      expect(logged).not.toContain('secret-account-id');
      infoSpy.mockRestore();
    });

    test('returns an error document for a missing field', async () => {
      const { date, ...withoutDate } = baseConfig;
      const adf = await handleNonRepeating(payload(withoutDate));
      expect(textOf(adf)).toEqual(['Date not configured. Please configure it in the Macro Configuration.']);
      expect(mockRequestConfluence).not.toHaveBeenCalled();
    });

    test('returns an error document when there is no config at all', async () => {
      const adf = await handleNonRepeating({ context: { accountId: 'a' } });
      expect(textOf(adf)[0]).toMatch(/not configured/);
    });

    test('returns an error document for an invalid time', async () => {
      const adf = await handleNonRepeating(payload({ ...baseConfig, time: '25:99' }));
      expect(textOf(adf)[0]).toMatch(/not in the "XX:XX \(am\|pm\)" format/);
    });

    describe('display options', () => {
      test('configured timezone display shows both when the viewer is elsewhere', async () => {
        usersBulkReturns('America/New_York');
        const adf = await handleNonRepeating(payload({ ...baseConfig, displayOption: FORMAT_DEFAULT_AND_ORIGINAL }));
        expect(textOf(adf)).toEqual([NEW_YORK_TEXT, ' (', SYDNEY_TEXT, ')']);
      });

      test('configured timezone display shows one date when the viewer is in the configured timezone', async () => {
        usersBulkReturns('Australia/Sydney');
        const adf = await handleNonRepeating(payload({ ...baseConfig, displayOption: FORMAT_DEFAULT_AND_ORIGINAL }));
        expect(textOf(adf)).toEqual([SYDNEY_TEXT]);
      });

      test('UTC display shows UTC first and the viewer time in brackets', async () => {
        usersBulkReturns('America/New_York');
        const adf = await handleNonRepeating(payload({ ...baseConfig, displayOption: FORMAT_DEFAULT_AND_UTC }));
        expect(textOf(adf)).toEqual([UTC_TEXT, ' (', NEW_YORK_TEXT, ')']);
      });

      test('countdown formats fall back to the absolute date with a note', async () => {
        usersBulkReturns('America/New_York');
        const adf = await handleNonRepeating(payload({ ...baseConfig, displayOption: FORMAT_HUMAN_COUNTDOWN }));
        expect(textOf(adf)).toEqual([NEW_YORK_TEXT, ' (countdown not available in export)']);
      });
    });
  });

  describe('handleRepeating', () => {
    const repeatingConfig = { ...baseConfig, repetitionUnit: 'repeat-weekly', repetitionPeriod: '1' };

    beforeEach(() => {
      jest.useFakeTimers();
      // Thursday 14 Nov 2024, 00:00 UTC: the next Friday 3:00 pm Sydney occurrence is 2024-11-15
      jest.setSystemTime(new Date('2024-11-14T00:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('shows the next occurrence in the viewer timezone', async () => {
      usersBulkReturns('America/New_York');
      const adf = await handleRepeating(payload({ ...repeatingConfig, date: '2024-11-01' }));
      expect(textOf(adf)).toEqual([NEW_YORK_TEXT]);
    });

    test('treats a missing repetition unit as weekly', async () => {
      usersBulkReturns('America/New_York');
      const { repetitionUnit, ...withoutUnit } = repeatingConfig;
      const adf = await handleRepeating(payload({ ...withoutUnit, date: '2024-11-01' }));
      expect(textOf(adf)).toEqual([NEW_YORK_TEXT]);
    });

    test.each(['0', '-3', 'abc', ''])('rejects the repetition period %p', async (period) => {
      const adf = await handleRepeating(payload({ ...repeatingConfig, repetitionPeriod: period }));
      expect(textOf(adf)[0]).toMatch(/Repetition period|not configured/);
      expect(mockRequestConfluence).not.toHaveBeenCalled();
    });

    test('says the repetition period is invalid in the viewer locale', async () => {
      const adf = await handleRepeating(payload({ ...repeatingConfig, repetitionPeriod: '0' }, 'account-1', 'de-DE'));
      expect(textOf(adf)).toEqual(['Der Wiederholungszeitraum muss eine ganze Zahl ab 1 sein.']);
    });

    test('returns an error document when the period is missing', async () => {
      const { repetitionPeriod, ...withoutPeriod } = repeatingConfig;
      const adf = await handleRepeating(payload(withoutPeriod));
      expect(textOf(adf)).toEqual(['Repetition period not configured. Please configure it in the Macro Configuration.']);
    });
  });

  describe('locale', () => {
    const noDate = () => { const { date, ...rest } = baseConfig; return rest; };

    test('uses the locale from the payload context', async () => {
      const adf = await handleNonRepeating(payload(noDate(), 'account-1', 'fr-FR'));
      expect(textOf(adf)).toEqual(['La date n’est pas configurée. Configurez cet élément dans la configuration de la macro.']);
      expect(mockGetTranslations).toHaveBeenCalledWith('fr-FR');
    });

    test('translates the countdown note', async () => {
      usersBulkReturns('America/New_York');
      const config = { ...baseConfig, displayOption: FORMAT_HUMAN_COUNTDOWN };
      const adf = await handleNonRepeating(payload(config, 'account-1', 'de-DE'));
      expect(textOf(adf)).toEqual([NEW_YORK_TEXT, ' (Countdown im Export nicht verfügbar)']);
    });

    test('uses the default locale en-GB when the payload has no locale', async () => {
      const adf = await handleNonRepeating(payload(noDate()));
      expect(textOf(adf)[0]).toMatch(/^Date not configured/);
      expect(mockGetTranslations).toHaveBeenCalledWith('en-GB');
    });

    test('falls back to the default locale and warns when the locale cannot be loaded', async () => {
      mockGetTranslations.mockImplementation(async locale => {
        if (locale === 'fr-FR') throw new Error('no file');
        return { locale, translations: loadLocale(locale) };
      });
      const adf = await handleNonRepeating(payload(noDate(), 'account-1', 'fr-FR'));
      expect(textOf(adf)[0]).toMatch(/^Date not configured/);
      expect(mockGetTranslations).toHaveBeenNthCalledWith(1, 'fr-FR');
      expect(mockGetTranslations).toHaveBeenNthCalledWith(2, 'en-GB');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('fr-FR'), expect.anything());
    });

    // The platform can send locales outside the 26 that have translation files, and Forge would give those English.
    test.each([
      ['en-AU', 'en-GB'],
      ['de-AT', 'de-DE'],
      ['fr-CA', 'fr-FR'],
      ['zh-HK', 'zh-TW'],
      ['xx-XX', 'en-GB']
    ])('asks for %s as %s and loads it once', async (raw, expected) => {
      await handleNonRepeating(payload(noDate(), 'account-1', raw));
      expect(mockGetTranslations).toHaveBeenCalledTimes(1);
      expect(mockGetTranslations).toHaveBeenCalledWith(expected);
    });

    test('translates for a regional variant using its language', async () => {
      const adf = await handleNonRepeating(payload(noDate(), 'account-1', 'de-AT'));
      expect(textOf(adf)[0]).toMatch(/^Das Datum|^Datum/);
    });

    test('still returns a document when no translations load at all', async () => {
      mockGetTranslations.mockRejectedValue(new Error('no bundle'));
      const adf = await handleNonRepeating(payload(noDate(), 'account-1', 'fr-FR'));
      expect(adf).toMatchObject({ version: 1, type: 'doc' });
      expect(textOf(adf)).toEqual(['error.notConfigured.date']);
    });
  });
});
