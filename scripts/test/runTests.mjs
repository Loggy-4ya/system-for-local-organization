#!/usr/bin/env node
/**
 * @fileoverview Run registered unit or browser test suites from `scripts/test/testRegistry.json`.
 *
 * Usage:
 *   node scripts/test/runTests.mjs --all
 *   node scripts/test/runTests.mjs --group puck
 *   node scripts/test/runTests.mjs carousel-pagination
 *   node scripts/test/runTests.mjs --list
 *
 * @module scripts/test/runTests
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findRepoRoot } from "../lib/repoRoot.mjs";

const root = findRepoRoot(import.meta.url);
const registryPath = resolve(dirname(fileURLToPath(import.meta.url)), "testRegistry.json");

/** @typedef {{ id: string, files: string[], env?: Record<string, string> }} UnitSuite */
/** @typedef {{ id: string, install?: boolean, file?: string, project?: string, workers?: number }} BrowserSuite */

/**
 * Load the test registry JSON.
 *
 * @returns {{ unit: UnitSuite[], browser: BrowserSuite[], groups: Record<string, { description?: string, suites: string[] }> }}
 */
function loadRegistry() {
  return JSON.parse(readFileSync(registryPath, "utf8"));
}

/**
 * Resolve a suite id to a registry entry.
 *
 * @param {string} id - Suite id without `test:` prefix.
 * @returns {UnitSuite | BrowserSuite | undefined}
 */
function findSuite(id) {
  const registry = loadRegistry();
  return registry.unit.find((s) => s.id === id) ?? registry.browser.find((s) => s.id === id);
}

/**
 * Print registered suite ids.
 */
function listSuites() {
  const registry = loadRegistry();
  console.log("Unit suites:");
  for (const suite of registry.unit) {
    console.log(`  ${suite.id}`);
  }
  console.log("\nBrowser suites:");
  for (const suite of registry.browser) {
    console.log(`  ${suite.id}`);
  }
  console.log("\nGroups:");
  for (const [name, group] of Object.entries(registry.groups ?? {})) {
    console.log(`  ${name} (${group.suites.length} suites)`);
  }
}

/**
 * Run a unit suite via tsx + Node test runner.
 *
 * @param {UnitSuite} suite - Registry entry.
 * @returns {number} Exit code.
 */
function runUnitSuite(suite) {
  const env = { ...process.env, ...suite.env };
  const args = ["tsx", "--test", ...suite.files];
  const result = spawnSync("npx", args, { cwd: root, env, stdio: "inherit", shell: false });
  return result.status ?? 1;
}

/**
 * Run a browser suite via Playwright.
 *
 * @param {BrowserSuite} suite - Registry entry.
 * @returns {number} Exit code.
 */
function runBrowserSuite(suite) {
  if (suite.install) {
    const result = spawnSync("npx", ["playwright", "install", "chromium"], {
      cwd: root,
      stdio: "inherit",
      shell: false,
    });
    return result.status ?? 1;
  }

  const args = ["playwright", "test", suite.file];
  if (suite.project) args.push(`--project=${suite.project}`);
  if (suite.workers) args.push(`--workers=${suite.workers}`);

  const result = spawnSync("npx", args, { cwd: root, stdio: "inherit", shell: false });
  return result.status ?? 1;
}

/**
 * Run one suite by id.
 *
 * @param {string} id - Suite id.
 * @returns {number} Exit code.
 */
function runSuite(id) {
  const registry = loadRegistry();
  const unit = registry.unit.find((s) => s.id === id);
  if (unit) {
    console.log(`\n▶ test:${id}`);
    return runUnitSuite(unit);
  }

  const browser = registry.browser.find((s) => s.id === id);
  if (browser) {
    console.log(`\n▶ test:${id}`);
    return runBrowserSuite(browser);
  }

  console.error(`Unknown test suite "${id}". Run: npm run test:list`);
  return 1;
}

/**
 * Run every unit suite sequentially.
 *
 * @returns {number} Exit code.
 */
function runAllUnit() {
  const registry = loadRegistry();
  let code = 0;
  for (const suite of registry.unit) {
    const result = runSuite(suite.id);
    if (result !== 0) code = result;
  }
  return code;
}

/**
 * Run a named group of suites.
 *
 * @param {string} groupName - Group key from registry.
 * @returns {number} Exit code.
 */
function runGroup(groupName) {
  const registry = loadRegistry();
  const group = registry.groups?.[groupName];
  if (!group) {
    console.error(`Unknown test group "${groupName}".`);
    return 1;
  }

  let code = 0;
  for (const id of group.suites) {
    const result = runSuite(id);
    if (result !== 0) code = result;
  }
  return code;
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(`Usage:
  npm run test:run -- <suite-id>
  npm run test:run -- --all
  npm run test:run -- --group puck
  npm run test:list`);
  process.exit(0);
}

if (args.includes("--list")) {
  listSuites();
  process.exit(0);
}

if (args.includes("--all")) {
  process.exit(runAllUnit());
}

const groupIdx = args.indexOf("--group");
if (groupIdx !== -1) {
  const groupName = args[groupIdx + 1];
  if (!groupName) {
    console.error("Missing group name after --group");
    process.exit(1);
  }
  process.exit(runGroup(groupName));
}

process.exit(runSuite(args[0]));
