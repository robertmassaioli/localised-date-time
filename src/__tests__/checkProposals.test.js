import fs from 'fs';
import os from 'os';
import path from 'path';
import { checkProposalNames, listProposalFiles, nextProposalNumber, run } from '../../scripts/check-proposals';

const REPOSITORY_PROPOSALS = path.join(__dirname, '..', '..', 'ai-proposals');

describe('checkProposalNames', () => {
  test('accepts numbers from 001 with no gaps', () => {
    expect(checkProposalNames(['001-a.md', '002-b.md', '003-c.md'])).toEqual([]);
  });

  test('accepts an empty directory', () => {
    expect(checkProposalNames([])).toEqual([]);
  });

  test('accepts names with digits and hyphens', () => {
    expect(checkProposalNames(['001-codebase-review-2026-10.md', '002-i18n-all-locales.md'])).toEqual([]);
  });

  test('does not depend on the order of the list', () => {
    expect(checkProposalNames(['003-c.md', '001-a.md', '002-b.md'])).toEqual([]);
  });

  describe('gaps', () => {
    test('reports a number missing from the middle', () => {
      expect(checkProposalNames(['001-a.md', '003-c.md'])).toEqual(['Number 002 is missing. Numbers run from 001 to 003 with no gaps.']);
    });

    test('reports several missing numbers together', () => {
      const [error] = checkProposalNames(['001-a.md', '005-e.md']);
      expect(error).toBe('Numbers 002, 003, 004 are missing. Numbers run from 001 to 005 with no gaps.');
    });

    test('reports 001 missing when numbering starts later', () => {
      const [error] = checkProposalNames(['002-b.md', '003-c.md']);
      expect(error).toMatch(/^Number 001 is missing/);
    });
  });

  describe('duplicates', () => {
    test('reports two proposals with the same number', () => {
      expect(checkProposalNames(['001-a.md', '002-b.md', '002-c.md'])).toEqual([
        'Number 002 is used by 2 proposals: 002-b.md, 002-c.md.'
      ]);
    });

    test('reports a duplicate and a gap together', () => {
      const errors = checkProposalNames(['001-a.md', '003-c.md', '003-d.md']);
      expect(errors).toHaveLength(2);
      expect(errors[0]).toMatch(/Number 003 is used by 2 proposals/);
      expect(errors[1]).toMatch(/Number 002 is missing/);
    });
  });

  describe('file names', () => {
    test.each([
      ['no number', 'adf-export.md'],
      ['two digits', '01-a.md'],
      ['four digits', '0001-a.md'],
      ['an underscore', '001_a.md'],
      ['a missing name', '001-.md'],
      ['upper case', '001-Adf.md'],
      ['a space', '001-a b.md'],
      ['a double hyphen', '001-a--b.md'],
      ['a trailing hyphen', '001-a-.md'],
      ['a dot in the name', '001-a.b.md'],
      ['no hyphen after the number', '001a.md']
    ])('rejects %s: %s', (_label, name) => {
      const [error] = checkProposalNames([name]);
      expect(error).toContain(`"${name}" does not match NNN-name.md`);
    });

    test('rejects 000, because numbering starts at 001', () => {
      expect(checkProposalNames(['000-a.md', '001-b.md'])).toEqual(['"000-a.md" uses 000. Numbering starts at 001.']);
    });

    test('a badly named file does not hide a gap among the good ones', () => {
      const errors = checkProposalNames(['001-a.md', 'bad.md', '003-c.md']);
      expect(errors).toHaveLength(2);
      expect(errors[1]).toMatch(/Number 002 is missing/);
    });
  });
});

describe('nextProposalNumber', () => {
  test('is the highest number plus one, with three digits', () => {
    expect(nextProposalNumber(['001-a.md', '002-b.md'])).toBe('003');
    expect(nextProposalNumber(Array.from({ length: 9 }, (_, i) => `00${i + 1}-x.md`))).toBe('010');
    expect(nextProposalNumber(Array.from({ length: 99 }, (_, i) => `${String(i + 1).padStart(3, '0')}-x.md`))).toBe('100');
  });

  test('is 001 for an empty directory', () => {
    expect(nextProposalNumber([])).toBe('001');
  });

  test('refuses to answer when the numbering is wrong', () => {
    expect(() => nextProposalNumber(['001-a.md', '003-c.md'])).toThrow(/no next number[\s\S]*missing/);
    expect(() => nextProposalNumber(['001-a.md', '001-b.md'])).toThrow(/used by 2 proposals/);
  });

  test('refuses to go past 999, which three digits cannot hold', () => {
    const names = Array.from({ length: 999 }, (_, i) => `${String(i + 1).padStart(3, '0')}-x.md`);
    expect(checkProposalNames(names)).toEqual([]);
    expect(() => nextProposalNumber(names)).toThrow(/only three digits/);
  });
});

describe('listProposalFiles', () => {
  let dir;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proposals-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('lists markdown files only, sorted, and skips folders and dot files', () => {
    for (const name of ['002-b.md', '001-a.md', 'notes.txt', '.hidden.md']) fs.writeFileSync(path.join(dir, name), '');
    fs.mkdirSync(path.join(dir, 'folder.md'));
    expect(listProposalFiles(dir)).toEqual(['001-a.md', '002-b.md']);
  });
});

describe('command line', () => {
  let dir;
  const add = (...names) => names.forEach(name => fs.writeFileSync(path.join(dir, name), ''));
  const cli = (...argv) => run(argv, dir);

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'proposals-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  test('a correct directory exits 0 and says how many proposals there are', () => {
    add('001-a.md', '002-b.md');
    expect(cli()).toEqual({ code: 0, out: 'Proposal numbering is correct: 2 proposals, numbered 001 to 002.\n', err: '' });
  });

  test('says "1 proposal" in the singular and handles an empty directory', () => {
    add('001-a.md');
    expect(cli().out).toContain('1 proposal, numbered 001 to 001');
    fs.rmSync(path.join(dir, '001-a.md'));
    expect(cli().out).toContain('no proposals');
  });

  test('a wrong directory exits 1 and lists every problem on stderr', () => {
    add('001-a.md', '003-c.md', '003-d.md', 'bad.md');
    const { code, out, err } = cli();
    expect(code).toBe(1);
    expect(out).toBe('');
    expect(err).toMatch(/^3 problems with the proposal numbering/);
    expect(err).toContain('bad.md');
    expect(err).toContain('Number 003 is used by 2 proposals');
    expect(err).toContain('Number 002 is missing');
  });

  test('--next prints just the next number', () => {
    add('001-a.md', '002-b.md');
    expect(cli('--next')).toEqual({ code: 0, out: '003\n', err: '' });
  });

  test('--next exits 1 and prints the problems when the numbering is wrong', () => {
    add('001-a.md', '003-c.md');
    const { code, out, err } = cli('--next');
    expect(code).toBe(1);
    expect(out).toBe('');
    expect(err).toContain('no next number');
  });

  test('--dir checks another directory', () => {
    add('001-a.md');
    expect(run(['--dir', dir], '/nonexistent').code).toBe(0);
    expect(run(['--next', '--dir', dir], '/nonexistent').out).toBe('002\n');
  });

  test('a directory that cannot be read exits 2', () => {
    const { code, err } = run(['--dir', path.join(dir, 'missing')]);
    expect(code).toBe(2);
    expect(err).toContain('Cannot read');
  });

  test('--help shows the usage and exits 0', () => {
    const { code, out } = cli('--help');
    expect(code).toBe(0);
    expect(out).toContain('Usage: node scripts/check-proposals.js');
  });

  test('an unknown option exits 2 and shows the usage', () => {
    const { code, err } = cli('--bogus');
    expect(code).toBe(2);
    expect(err).toContain('Unknown option "--bogus"');
    expect(err).toContain('Usage:');
  });

  test('--dir without a path is an unknown option', () => {
    expect(cli('--dir').code).toBe(2);
  });
});

// This is what stops a proposal landing without a number, or with a clashing one, because CI runs the tests.
describe('the proposals in this repository', () => {
  test('are numbered correctly', () => {
    expect(checkProposalNames(listProposalFiles(REPOSITORY_PROPOSALS))).toEqual([]);
  });

  test('start at 001 and have a next number', () => {
    const files = listProposalFiles(REPOSITORY_PROPOSALS);
    expect(files[0]).toMatch(/^001-/);
    expect(nextProposalNumber(files)).toBe(String(files.length + 1).padStart(3, '0'));
  });
});
