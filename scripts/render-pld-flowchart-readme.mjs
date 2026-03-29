#!/usr/bin/env node
/**
 * Renders the first Mermaid diagram (sequence or flowchart) from PLD SKILL.md into README.md as ASCII
 * (beautiful-mermaid renderMermaidASCII). Regenerate: npm run render:pld-flowchart
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderMermaidASCII } from "beautiful-mermaid";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SKILL = join(ROOT, "plugins/parallel-lane-dev/skills/parallel-lane-dev/SKILL.md");
const README = join(ROOT, "plugins/parallel-lane-dev/README.md");

const MARK_START = "<!-- pld-flowchart-ascii:start -->";
const MARK_END = "<!-- pld-flowchart-ascii:end -->";

function extractFirstMermaidBlock(md) {
  const re = /```mermaid\n([\s\S]*?)\n```/;
  const m = md.match(re);
  if (!m) throw new Error("No ```mermaid fenced block found in SKILL.md");
  return m[1].trimEnd();
}

function buildRegion(ascii) {
  const body = ascii
    .split("\n")
    .map((line) => line.replace(/\s+$/u, ""))
    .join("\n")
    .trimEnd();
  return [
    MARK_START,
    "",
    "```text",
    body,
    "```",
    "",
    MARK_END,
    "",
  ].join("\n");
}

const skillText = readFileSync(SKILL, "utf8");
const mermaid = extractFirstMermaidBlock(skillText);
let ascii;
try {
  ascii = renderMermaidASCII(mermaid, { useAscii: true });
} catch (err) {
  console.error(err);
  process.exit(1);
}

const region = buildRegion(ascii);
let readmeText = readFileSync(README, "utf8");
const marked = new RegExp(
  `${MARK_START}[\\s\\S]*?${MARK_END}\\s*`,
  "u",
);

if (marked.test(readmeText)) {
  readmeText = readmeText.replace(marked, region);
} else {
  const needle = "\n## Installation (Open Plugins)\n";
  const idx = readmeText.indexOf(needle);
  if (idx === -1) {
    throw new Error("Could not find insertion point before ## Installation in README.md");
  }
  const insert = `\n## Workflow (ASCII)\n\nDerived from the Mermaid diagram in \`skills/parallel-lane-dev/SKILL.md\`. Regenerate: \`npm run render:pld-flowchart\`.\n\n${region}`;
  readmeText = readmeText.slice(0, idx) + insert + readmeText.slice(idx);
}

writeFileSync(README, readmeText, "utf8");
console.log("Updated", README);
