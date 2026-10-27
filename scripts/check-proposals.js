#!/usr/bin/env node
/**
 * Checks how the proposals in ai-proposals/ are numbered, and says which number the next one gets.
 *
 * Every proposal is named NNN-name.md: three digits, a hyphen, then a lower-case name made of letters, digits and
 * hyphens. The numbers start at 001, follow the order the proposals were created in, and have no gaps and no duplicates.
 *
 *   node scripts/check-proposals.js          check the numbering, exit 1 and list the problems if it is wrong
 *   node scripts/check-proposals.js --next   print the number the next proposal should use, such as 008
 *
 * `--dir <path>` checks another directory. The npm scripts `proposals:check` and `proposals:next` run this file.
 * See AGENTS.md, "Planning documents".
 */
const fs = require('fs');
const path = require('path');

const PROPOSALS_DIR = path.join(__dirname, '..', 'ai-proposals');
const NAME_PATTERN = /^(\d{3})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
const MAX_NUMBER = 999;

const pad = number => String(number).padStart(3, '0');

/**
 * The proposal files in a directory: every `.md` file, not directories and not dot files.
 */
function listProposalFiles(dir = PROPOSALS_DIR) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.md') && !entry.name.startsWith('.'))
    .map(entry => entry.name)
    .sort();
}

/**
 * Returns a list of problems with the proposal file names. An empty list means the numbering is correct.
 */
function checkProposalNames(fileNames) {
  const errors = [];
  const byNumber = new Map();

  for (const name of fileNames) {
    const match = NAME_PATTERN.exec(name);
    if (!match) {
      errors.push(`"${name}" does not match NNN-name.md: three digits, a hyphen, then a lower-case name using letters, digits and hyphens.`);
      continue;
    }
    const number = Number(match[1]);
    if (number === 0) {
      errors.push(`"${name}" uses 000. Numbering starts at 001.`);
      continue;
    }
    byNumber.set(number, [...(byNumber.get(number) ?? []), name]);
  }

  for (const [number, names] of [...byNumber.entries()].sort((a, b) => a[0] - b[0])) {
    if (names.length > 1) {
      errors.push(`Number ${pad(number)} is used by ${names.length} proposals: ${names.join(', ')}.`);
    }
  }

  if (byNumber.size > 0) {
    const highest = Math.max(...byNumber.keys());
    const missing = [];
    for (let number = 1; number <= highest; number++) {
      if (!byNumber.has(number)) missing.push(pad(number));
    }
    if (missing.length > 0) {
      errors.push(`${missing.length === 1 ? `Number ${missing[0]} is` : `Numbers ${missing.join(', ')} are`} missing. Numbers run from 001 to ${pad(highest)} with no gaps.`);
    }
  }

  return errors;
}

/**
 * The number the next proposal takes, as three digits, such as "008". Throws if the numbering is already wrong,
 * because the next number is not meaningful then.
 */
function nextProposalNumber(fileNames) {
  const errors = checkProposalNames(fileNames);
  if (errors.length > 0) {
    throw new Error(`The proposal numbering is wrong, so there is no next number:\n${errors.map(error => `  ${error}`).join('\n')}`);
  }
  const next = fileNames.length + 1;
  if (next > MAX_NUMBER) {
    throw new Error(`There are already ${MAX_NUMBER} proposals, and the numbers have only three digits.`);
  }
  return pad(next);
}

const USAGE = `Usage: node scripts/check-proposals.js [--next] [--dir <path>]

  (no option)  check that every proposal is named NNN-name.md, numbered from 001, with no gaps and no duplicates
  --next       print the number the next proposal should use
  --dir <path> use another directory than ai-proposals/
  --help       show this message`;

/**
 * Runs the command line. Returns the output and the exit code, so tests can call it without a child process.
 */
function run(argv, defaultDir = PROPOSALS_DIR) {
  let wantsNext = false;
  let dir = defaultDir;

  for (let i = 0; i < argv.length; i++) {
    const option = argv[i];
    if (option === '--help' || option === '-h') return { code: 0, out: `${USAGE}\n`, err: '' };
    if (option === '--next') wantsNext = true;
    else if (option === '--dir' && argv[i + 1]) dir = path.resolve(argv[++i]);
    else return { code: 2, out: '', err: `Unknown option "${option}".\n${USAGE}\n` };
  }

  let fileNames;
  try {
    fileNames = listProposalFiles(dir);
  } catch (error) {
    return { code: 2, out: '', err: `Cannot read ${dir}: ${error.message}\n` };
  }

  try {
    if (wantsNext) return { code: 0, out: `${nextProposalNumber(fileNames)}\n`, err: '' };
  } catch (error) {
    return { code: 1, out: '', err: `${error.message}\n` };
  }

  const errors = checkProposalNames(fileNames);
  if (errors.length > 0) {
    return { code: 1, out: '', err: `${errors.length} problem${errors.length === 1 ? '' : 's'} with the proposal numbering in ${dir}:\n${errors.map(error => `  ${error}`).join('\n')}\n` };
  }
  const range = fileNames.length === 0 ? 'no proposals' : `${fileNames.length} proposal${fileNames.length === 1 ? '' : 's'}, numbered 001 to ${pad(fileNames.length)}`;
  return { code: 0, out: `Proposal numbering is correct: ${range}.\n`, err: '' };
}

if (require.main === module) {
  const { code, out, err } = run(process.argv.slice(2));
  if (out) process.stdout.write(out);
  if (err) process.stderr.write(err);
  process.exit(code);
}

module.exports = { checkProposalNames, listProposalFiles, nextProposalNumber, run, NAME_PATTERN };
