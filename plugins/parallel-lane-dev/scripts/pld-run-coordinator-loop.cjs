#!/usr/bin/env node

const {
  hasExecutorDb,
  buildCoordinatorLoopFromExecutor,
} = require('./pld-tool-lib.cjs');
const {
  resolveProjectRoot,
  summarizeExecutionInsights: summarizeLegacyExecutionInsights,
} = require('./pld-lib.cjs');
const {launchActiveSet} = require('./pld-launch-active-set.cjs');
const {driveReviewLoop} = require('./pld-drive-review-loop.cjs');
const {intakeReadyToCommitWithContext} = require('./pld-intake-ready-to-commit.cjs');
const {summarizeTelemetry} = require('./pld-summarize-telemetry.cjs');
const {renderTelemetryReviewFile} = require('./pld-render-telemetry-review.cjs');

function parseArgs(argv) {
  const args = {maxActive: 4};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--execution') {
      args.execution = argv[index + 1];
      index += 1;
    } else if (value === '--all-executions') {
      args.allExecutions = true;
    } else if (value === '--project-root') {
      args.projectRoot = argv[index + 1];
      index += 1;
    } else if (value === '--max-active') {
      args.maxActive = Number(argv[index + 1]);
      index += 1;
    } else if (value === '--json') {
      args.json = true;
    } else if (value === '--dry-run') {
      args['dry-run'] = true;
    }
  }
  return args;
}

function runCoordinatorLoop(projectRoot, execution, maxActive = 4, dryRun = false) {
  if (hasExecutorDb(projectRoot)) {
    return buildCoordinatorLoopFromExecutor(projectRoot, execution, maxActive, dryRun);
  }
  const launch = launchActiveSet(projectRoot, execution, maxActive, dryRun);
  const reviewResult = driveReviewLoop(projectRoot, execution);
  const reviewActions = reviewResult.actions;
  const intakeResult = intakeReadyToCommitWithContext(projectRoot, execution);
  const commitIntake = intakeResult.entries;
  const insightSummary =
    reviewResult.insightSummary || summarizeLegacyExecutionInsights(projectRoot, execution);
  const telemetrySummary = summarizeTelemetry(projectRoot, execution);
  const telemetryReview = renderTelemetryReviewFile(projectRoot, execution);
  const degradedSurfaces = [];
  const launchScoreboardLoad =
    launch.observedDegradedScoreboardLoad || launch.finalSchedule?.scoreboardLoad || null;
  if (launchScoreboardLoad?.degraded) {
    degradedSurfaces.push({
      surface: 'scoreboard',
      source: launchScoreboardLoad.source,
      path: launchScoreboardLoad.path,
      errors: launchScoreboardLoad.errors || [],
    });
  }
  for (const surface of intakeResult.degradedSurfaces || []) {
    degradedSurfaces.push(surface);
  }
  return {
    execution,
    maxActiveThreads: maxActive,
    dryRun,
    launch,
    reviewActions,
    commitIntake,
    insightSummary,
    idleSlots: launch.idleSlots,
    completedLanes: launch.completedLanes,
    promotedLanes: launch.promoted.map((entry) => entry.lane),
    reviewLaneCount: reviewActions.length,
    commitLaneCount: commitIntake.length,
    noDispatchReason: launch.noDispatchReason,
    degradedSurfaces,
    telemetrySummary,
    telemetryReviewPath: telemetryReview.outputPath,
  };
}

/**
 * Run the coordinator loop for multiple executions with a shared global cap.
 * Distributes maxActive slots equally (floor division, minimum 1 per execution).
 *
 * @param {string} projectRoot
 * @param {string[]} executions  - execution IDs to process
 * @param {number} maxActive     - global active subagent cap
 * @param {boolean} dryRun
 */
function runMultiExecutionCoordinatorLoop(
  projectRoot,
  executions,
  maxActive = 4,
  dryRun = false,
) {
  if (!executions || executions.length === 0) {
    return {
      globalMaxActive: maxActive,
      dryRun,
      executions: [],
      totalIdleSlots: maxActive,
      totalPromotedLanes: 0,
      totalReviewActions: 0,
      totalCommitIntakes: 0,
    };
  }

  // Divide slots equally; give at least 1 per execution; cap at maxActive total
  const perExecution = Math.max(1, Math.floor(maxActive / executions.length));

  const results = executions.map((execution) =>
    runCoordinatorLoop(projectRoot, execution, perExecution, dryRun),
  );

  return {
    globalMaxActive: maxActive,
    dryRun,
    executions: results,
    totalIdleSlots: results.reduce((sum, r) => sum + r.idleSlots, 0),
    totalPromotedLanes: results.reduce((sum, r) => sum + r.promotedLanes.length, 0),
    totalReviewActions: results.reduce((sum, r) => sum + r.reviewLaneCount, 0),
    totalCommitIntakes: results.reduce((sum, r) => sum + r.commitLaneCount, 0),
  };
}

function renderCoordinatorLoop(result) {
  const lines = [
    `Execution: ${result.execution}`,
    `Max active threads: ${result.maxActiveThreads}`,
    `Dry run: ${result.dryRun ? 'yes' : 'no'}`,
    `Completed lanes: ${result.completedLanes.length > 0 ? result.completedLanes.join(', ') : 'none'}`,
    `Promoted lanes: ${result.promotedLanes.length > 0 ? result.promotedLanes.join(', ') : 'none'}`,
    `Idle slots: ${result.idleSlots}`,
    `Review actions: ${result.reviewLaneCount}`,
    `Commit intakes: ${result.commitLaneCount}`,
    `Actionable insights: ${result.insightSummary.actionableCount}`,
    `Durable global learnings: ${result.insightSummary.durableLearningCount}`,
  ];

  if (result.telemetrySummary) {
    lines.push(
      `Telemetry summary: ${result.telemetrySummary.minuteBuckets.length} minute bucket(s), ${result.telemetrySummary.dropSegments.length} drop segment(s)`,
    );
  }
  if (result.telemetryReviewPath) {
    lines.push(`Telemetry review: ${result.telemetryReviewPath}`);
  }
  if (result.degradedSurfaces.length > 0) {
    lines.push(`Degraded surfaces: ${result.degradedSurfaces.length}`);
  }

  if (result.noDispatchReason) {
    lines.push(`No dispatch reason: ${result.noDispatchReason}`);
  }

  if (result.launch.assignments.length > 0) {
    lines.push('Assignments:');
    for (const assignment of result.launch.assignments) {
      lines.push(`- ${assignment.lane}: ${assignment.nextItem}`);
    }
  }

  if (result.reviewActions.length > 0) {
    lines.push('Review lanes:');
    for (const action of result.reviewActions) {
      lines.push(`- ${action.lane}: ${action.action}`);
    }
  }

  if (result.commitIntake.length > 0) {
    lines.push('Commit-ready lanes:');
    for (const entry of result.commitIntake) {
      lines.push(`- ${entry.lane}: ${entry.proposedCommitTitle || 'n/a'}`);
    }
  }

  if (result.insightSummary.actionable.length > 0) {
    lines.push('Execution insights:');
    for (const entry of result.insightSummary.actionable) {
      lines.push(`- [${entry.status}] ${entry.lane}: ${entry.summary}`);
    }
  }

  if (result.insightSummary.durableLearnings.length > 0) {
    lines.push('Durable global learnings:');
    for (const entry of result.insightSummary.durableLearnings) {
      lines.push(`- [${entry.status}] ${entry.lane}: ${entry.summary}`);
    }
  }

  return lines.join('\n');
}

function renderMultiExecutionLoop(result) {
  const lines = [
    `Global max active: ${result.globalMaxActive}`,
    `Dry run: ${result.dryRun ? 'yes' : 'no'}`,
    `Executions: ${result.executions.length}`,
    `Total idle slots: ${result.totalIdleSlots}`,
    `Total promoted lanes: ${result.totalPromotedLanes}`,
    `Total review actions: ${result.totalReviewActions}`,
    `Total commit intakes: ${result.totalCommitIntakes}`,
  ];
  for (const entry of result.executions) {
    lines.push(`--- ${entry.execution} ---`);
    lines.push(renderCoordinatorLoop(entry));
  }
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = args.projectRoot || resolveProjectRoot();

  if (args.allExecutions) {
    const {listExecutionNames} = require('./pld-tool-lib.cjs');
    const executions = listExecutionNames(projectRoot);
    const result = runMultiExecutionCoordinatorLoop(
      projectRoot,
      executions,
      args.maxActive,
      args['dry-run'],
    );
    if (args.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return;
    }
    process.stdout.write(`${renderMultiExecutionLoop(result)}\n`);
    return;
  }

  if (!args.execution) {
    throw new Error(
      'Usage: node plugins/parallel-lane-dev/scripts/pld-run-coordinator-loop.cjs ' +
      '--execution <id> | --all-executions [--project-root <path>] [--max-active <n>] [--dry-run] [--json]',
    );
  }

  const result = runCoordinatorLoop(
    projectRoot,
    args.execution,
    args.maxActive,
    args['dry-run'],
  );
  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${renderCoordinatorLoop(result)}\n`);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseArgs,
  runCoordinatorLoop,
  runMultiExecutionCoordinatorLoop,
  renderCoordinatorLoop,
  renderMultiExecutionLoop,
};
