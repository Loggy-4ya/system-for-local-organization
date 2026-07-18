#!/usr/bin/env node
/**
 * @fileoverview Configure Nexus GitHub deployment environments from CDK outputs.
 *
 * The script writes only non-secret GitHub Environment variables, restricts each
 * environment to its release branch, and applies branch protection when the
 * branch already exists. AWS authentication remains OIDC-based; no AWS access
 * key or runtime application secret is uploaded to GitHub.
 *
 * Usage:
 *   npm run deploy:configure-github -- staging https://staging.example.com [bot_username]
 *   npm run deploy:configure-github -- production https://nexus.example.com [bot_username]
 *
 * Registry: `.ai/docs/features/hosting_and_deployment.md`
 */

import { spawnSync } from "node:child_process";

const [environmentName, deployUrl, telegramBotUsername = ""] = process.argv.slice(2);
const supportedEnvironments = new Set(["staging", "production"]);

if (!supportedEnvironments.has(environmentName) || !deployUrl) {
  console.error(
    "Usage: npm run deploy:configure-github -- <staging|production> <https-url> [telegram-bot-username]",
  );
  process.exit(2);
}

let normalizedDeployUrl;
try {
  const parsed = new URL(deployUrl);
  if (parsed.protocol !== "https:" || parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error("URL must be an HTTPS origin without path, query, or fragment.");
  }
  normalizedDeployUrl = parsed.origin;
} catch (error) {
  console.error(`Invalid deploy URL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}

/**
 * Run a command while preserving stderr and returning trimmed stdout.
 *
 * @param {string} command - Executable name.
 * @param {string[]} args - Command arguments.
 * @param {string | undefined} input - Optional stdin payload.
 * @returns {string} Trimmed stdout.
 */
function run(command, args, input) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    input,
    stdio: input === undefined ? ["inherit", "pipe", "inherit"] : ["pipe", "pipe", "inherit"],
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}

/** Ensure required external CLIs are installed and authenticated. */
function verifyPrerequisites() {
  run("gh", ["auth", "status"]);
  run("aws", ["sts", "get-caller-identity", "--output", "json"]);
}

/**
 * Invoke a GitHub API endpoint with JSON supplied over stdin.
 *
 * @param {string} method - HTTP method.
 * @param {string} endpoint - Repository-relative API endpoint.
 * @param {unknown} body - JSON request body.
 */
function githubJson(method, endpoint, body) {
  run(
    "gh",
    ["api", "--method", method, endpoint, "--input", "-"],
    `${JSON.stringify(body)}\n`,
  );
}

verifyPrerequisites();

const repository = run("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
const region = process.env.AWS_REGION?.trim() || "eu-central-1";
const stackName = environmentName === "production" ? "NexusProduction" : "NexusStaging";
const branchName = environmentName === "production" ? "main" : "dev";
const stackOutputs = JSON.parse(
  run("aws", [
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    stackName,
    "--region",
    region,
    "--query",
    "Stacks[0].Outputs",
    "--output",
    "json",
  ]),
);

const outputs = Object.fromEntries(
  stackOutputs.map(({ OutputKey, OutputValue }) => [OutputKey, OutputValue]),
);

const requiredOutputs = {
  AWS_ROLE_ARN: "GithubDeployRoleArn",
  WEB_REPOSITORY_URI: "WebRepositoryUri",
  WORKER_REPOSITORY_URI: "WorkerRepositoryUri",
  DEPLOYMENT_BUCKET: "DeploymentBucketName",
  DEPLOYMENT_DOCUMENT: "DeploymentDocumentName",
  INSTANCE_ID: "InstanceId",
};

for (const outputKey of Object.values(requiredOutputs)) {
  if (!outputs[outputKey]) {
    console.error(`CloudFormation stack ${stackName} is missing output ${outputKey}.`);
    process.exit(1);
  }
}

githubJson("PUT", `repos/${repository}/environments/${environmentName}`, {
  wait_timer: 0,
  prevent_self_review: environmentName === "production",
  deployment_branch_policy: {
    protected_branches: false,
    custom_branch_policies: true,
  },
});

const existingPolicies = JSON.parse(
  run("gh", [
    "api",
    `repos/${repository}/environments/${environmentName}/deployment-branch-policies`,
  ]),
).branch_policies;

if (!existingPolicies.some((policy) => policy.name === branchName && policy.type === "branch")) {
  githubJson(
    "POST",
    `repos/${repository}/environments/${environmentName}/deployment-branch-policies`,
    { name: branchName, type: "branch" },
  );
}

const variables = {
  AWS_REGION: region,
  DEPLOY_URL: normalizedDeployUrl,
  NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: telegramBotUsername,
  ...Object.fromEntries(
    Object.entries(requiredOutputs).map(([variableName, outputKey]) => [
      variableName,
      outputs[outputKey],
    ]),
  ),
};

for (const [name, value] of Object.entries(variables)) {
  run("gh", [
    "variable",
    "set",
    name,
    "--env",
    environmentName,
    "--body",
    value,
    "--repo",
    repository,
  ]);
}

const branchExists =
  spawnSync("gh", ["api", `repos/${repository}/branches/${branchName}`], {
    stdio: "ignore",
  }).status === 0;

if (branchExists) {
  githubJson("PUT", `repos/${repository}/branches/${branchName}/protection`, {
    required_status_checks: {
      strict: true,
      contexts: ["Quality gates", "Secret scan"],
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      dismiss_stale_reviews: true,
      require_code_owner_reviews: false,
      required_approving_review_count: environmentName === "production" ? 1 : 0,
      require_last_push_approval: environmentName === "production",
    },
    restrictions: null,
    required_linear_history: true,
    allow_force_pushes: false,
    allow_deletions: false,
    block_creations: false,
    required_conversation_resolution: true,
    lock_branch: false,
    allow_fork_syncing: false,
  });
  console.log(`Protected ${branchName} and configured ${environmentName}.`);
} else {
  console.log(
    `Configured ${environmentName}; branch ${branchName} does not exist yet, so branch protection was skipped.`,
  );
}

if (environmentName === "production") {
  console.log(
    "Add at least one production Required reviewer in GitHub Settings → Environments → production before enabling releases.",
  );
}
