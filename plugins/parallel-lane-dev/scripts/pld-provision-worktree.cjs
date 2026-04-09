#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {resolveProjectRoot, resolveWorktreePoolRoot} = require('./pld-lib.cjs');
const {listLanes, hasExecutorDb} = require('./pld-tool-lib.cjs');

/**
 * Run a git command in `cwd`, return trimmed stdout. Throws on non-zero exit.
 */
function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

/**
 * Try to run a command; return stdout trimmed, or null on failure.
 */
function tryRun(command, args, cwd) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Return true if `dir` (relative or absolute) is already git-ignored in `projectRoot`.
 */
function isGitIgnored(projectRoot, dir) {
  try {
    execFileSync('git', ['check-ignore', '-q', dir], {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the worktree pool dir (e.g. `.worktrees`) that should be git-ignored.
 * Returns the first path segment of `worktreePath` relative to `projectRoot`.
 */
function resolvePoolDir(projectRoot, worktreePath) {
  const rel = path.relative(projectRoot, worktreePath);
  return rel.split(path.sep)[0];
}

/**
 * Detect and run project setup in `worktreePath`. Returns the command run, or null.
 */
function runProjectSetup(worktreePath) {
  if (fs.existsSync(path.join(worktreePath, 'package.json'))) {
    tryRun('npm', ['install', '--prefer-offline'], worktreePath);
    return 'npm install';
  }
  if (fs.existsSync(path.join(worktreePath, 'Cargo.toml'))) {
    tryRun('cargo', ['build', '--quiet'], worktreePath);
    return 'cargo build';
  }
  if (fs.existsSync(path.join(worktreePath, 'go.mod'))) {
    tryRun('go', ['mod', 'download'], worktreePath);
    return 'go mod download';
  }
  if (fs.existsSync(path.join(worktreePath, 'requirements.txt'))) {
    tryRun('pip', ['install', '-r', 'requirements.txt', '-q'], worktreePath);
    return 'pip install -r requirements.txt';
  }
  return null;
}

/**
 * Provision the git worktree for one PLD lane.
 *
 * Steps:
 *   1. Load lane metadata from executor DB.
 *   2. Check/stage .gitignore for the worktree pool dir.
 *   3. Create git worktree if missing (idempotent).
 *   4. Run project setup.
 *   5. Run baseline verification command.
 *
 * @param {string} projectRoot
 * @param {string} execution
 * @param {string} laneArg  e.g. "Lane 1" or "1"
 * @param {{skipTests?: boolean}} [opts]
 */
function provisionWorktree(projectRoot, execution, laneArg, opts = {}) {
  if (!hasExecutorDb(projectRoot)) {
    throw new Error('Executor DB not found. Run pld-tool import-plans first.');
  }

  const normalizedLane = laneArg.startsWith('Lane ') ? laneArg : `Lane ${laneArg}`;
  const lanes = listLanes(projectRoot, execution);
  const lane = lanes.find((entry) => entry.laneName === normalizedLane);
  if (!lane) {
    throw new Error(
      `Lane "${normalizedLane}" not found in execution "${execution}". ` +
      `Available lanes: ${lanes.map((l) => l.laneName).join(', ') || 'none'}.`,
    );
  }

  const {worktreePath, laneBranch, baseBranch} = lane;
  if (!worktreePath) {
    throw new Error(
      `Lane "${normalizedLane}" has no worktree_path in executor DB. ` +
      'Check that the lane plan contains a "PLD worktree:" line.',
    );
  }

  // 1. Ensure worktree pool dir is git-ignored
  const poolDir = resolvePoolDir(projectRoot, worktreePath);
  let gitignoreStaged = false;
  if (poolDir && !isGitIgnored(projectRoot, poolDir)) {
    const gitignorePath = path.join(projectRoot, '.gitignore');
    const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
    const entry = `${poolDir}/\n`;
    if (!existing.includes(entry.trim())) {
      fs.appendFileSync(gitignorePath, `\n# PLD lane worktrees\n${entry}`);
      git(['add', '.gitignore'], projectRoot);
      gitignoreStaged = true;
    }
  }

  // 2. Create worktree if missing
  let worktreeCreated = false;
  if (!fs.existsSync(worktreePath)) {
    const branchToCreate = laneBranch || `pld-lane-${normalizedLane.replace(/\s+/g, '-').toLowerCase()}`;
    const base = baseBranch || 'main';
    git(['worktree', 'add', worktreePath, '-b', branchToCreate, base], projectRoot);
    worktreeCreated = true;
  }

  // 3. Project setup
  const setupCommand = runProjectSetup(worktreePath);

  // 4. Baseline verification
  let baselinePassed = null;
  let baselineOutput = null;
  if (!opts.skipTests && lane.verification && lane.verification.length > 0) {
    const verifyCmd = lane.verification[0];
    // Split simple "cmd arg1 arg2" — shell split is not needed for known verification patterns
    const parts = verifyCmd.trim().split(/\s+/);
    baselineOutput = tryRun(parts[0], parts.slice(1), projectRoot);
    baselinePassed = baselineOutput !== null;
  }

  return {
    worktreePath,
    laneBranch: laneBranch || null,
    worktreeCreated,
    gitignoreStaged,
    setupCommand,
    baselinePassed,
    baselineOutput,
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--execution') {
      args.execution = argv[index + 1];
      index += 1;
    } else if (value === '--lane') {
      args.lane = argv[index + 1];
      index += 1;
    } else if (value === '--project-root') {
      args.projectRoot = argv[index + 1];
      index += 1;
    } else if (value === '--skip-tests') {
      args.skipTests = true;
    } else if (value === '--json') {
      args.json = true;
    }
  }
  return args;
}

function renderResult(result) {
  const lines = [
    `Worktree: ${result.worktreePath}`,
    `Branch: ${result.laneBranch || 'n/a'}`,
    `Worktree created: ${result.worktreeCreated ? 'yes' : 'no (already existed)'}`,
    `Gitignore staged: ${result.gitignoreStaged ? 'yes — commit .gitignore before dispatching coder' : 'no'}`,
    `Setup command: ${result.setupCommand || 'none detected'}`,
    `Baseline passed: ${result.baselinePassed === null ? 'skipped' : result.baselinePassed ? 'yes' : 'FAILED'}`,
  ];
  if (result.baselinePassed === false) {
    lines.push('Baseline output:');
    lines.push(result.baselineOutput || '(no output)');
    lines.push('WARNING: baseline tests failed. Investigate before dispatching pld-coder.');
  }
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.execution || !args.lane) {
    throw new Error(
      'Usage: node plugins/parallel-lane-dev/scripts/pld-provision-worktree.cjs ' +
      '--execution <id> --lane <Lane N> [--project-root <path>] [--skip-tests] [--json]',
    );
  }
  const projectRoot = args.projectRoot || resolveProjectRoot();
  const result = provisionWorktree(projectRoot, args.execution, args.lane, {
    skipTests: Boolean(args.skipTests),
  });
  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${renderResult(result)}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  provisionWorktree,
  parseArgs,
  renderResult,
};
