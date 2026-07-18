#!/usr/bin/env node
/**
 * @fileoverview CDK application entrypoint for Nexus AWS infrastructure.
 *
 * Synthesizes one shared GitHub OIDC stack plus isolated staging and production
 * stacks. Context values are declared in root `cdk.json` and may be overridden
 * with `cdk -c key=value`.
 *
 * @module infrastructure/bin/nexus
 */

import { App, Tags, Validations } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";
import {
  NexusEnvironmentStack,
  NexusGithubIdentityStack,
} from "../lib/nexus-deployment-stacks";

const app = new App();

/** Read a required non-empty CDK context value. */
function requiredContext(name: string): string {
  const value = app.node.tryGetContext(name);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required CDK context value "${name}".`);
  }
  return value.trim();
}

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION ?? requiredContext("awsRegion");
const githubRepository = requiredContext("githubRepository");
const githubSubjectPrefix = requiredContext("githubSubjectPrefix");
const instanceType = requiredContext("instanceType");
const stackEnvironment = account ? { account, region } : { region };

const identityStack = new NexusGithubIdentityStack(app, "NexusGithubIdentity", {
  env: stackEnvironment,
  githubRepository,
  description: "Shared passwordless GitHub Actions identity for Nexus deployments.",
});

for (const environmentName of ["staging", "production"] as const) {
  const stack = new NexusEnvironmentStack(
    app,
    `Nexus${environmentName === "staging" ? "Staging" : "Production"}`,
    {
      env: stackEnvironment,
      environmentName,
      githubProvider: identityStack.githubProvider,
      githubSubjectPrefix,
      instanceType,
      description: `Nexus ${environmentName} EC2, ECR, S3, SSM, and secret resources.`,
    },
  );
  stack.addDependency(identityStack);
}

Tags.of(app).add("Application", "Nexus");
Tags.of(app).add("ManagedBy", "AWS-CDK");

Validations.of(app).addPlugins(
  new AwsSolutionsChecks(app, {
    verbose: true,
  }),
);

app.synth();
