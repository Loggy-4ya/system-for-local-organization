/**
 * @fileoverview CDK assertions for the passwordless Nexus deployment boundary.
 *
 * Run: `npm run test:run -- nexus-deployment-infrastructure`
 * Registry: `.ai/docs/testing.md`
 *
 * @module tests/infrastructure/nexusDeploymentStacks.test
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import {
  NexusEnvironmentStack,
  NexusGithubIdentityStack,
} from "../../infrastructure/lib/nexus-deployment-stacks";

/**
 * Synthesize a production template without contacting AWS.
 *
 * @returns CloudFormation assertion template.
 */
function createProductionTemplate(): Template {
  const app = new App();
  const identity = new NexusGithubIdentityStack(app, "Identity", {
    githubRepository: "example/nexus",
    env: { region: "eu-central-1" },
  });
  const environment = new NexusEnvironmentStack(app, "Production", {
    environmentName: "production",
    githubProvider: identity.githubProvider,
    githubSubjectPrefix: "repo:example/nexus",
    instanceType: "t3.small",
    env: { region: "eu-central-1" },
  });
  return Template.fromStack(environment);
}

describe("NexusEnvironmentStack", () => {
  it("creates immutable scan-on-push web and worker repositories", () => {
    const template = createProductionTemplate();
    template.resourceCountIs("AWS::ECR::Repository", 2);
    template.allResourcesProperties("AWS::ECR::Repository", {
      ImageScanningConfiguration: { ScanOnPush: true },
      ImageTagMutability: "IMMUTABLE",
    });
  });

  it("does not expose SSH and only publishes web ports", () => {
    const template = createProductionTemplate();
    const securityGroups = template.findResources("AWS::EC2::SecurityGroup");
    const ingress = Object.values(securityGroups).flatMap((resource) => {
      const properties = resource.Properties as {
        SecurityGroupIngress?: Array<{ FromPort?: number; ToPort?: number }>;
      };
      return properties.SecurityGroupIngress ?? [];
    });

    assert.equal(ingress.some((rule) => rule.FromPort === 22), false);
    assert.deepEqual(
      [...new Set(ingress.map((rule) => rule.FromPort))].sort((a, b) => (a ?? 0) - (b ?? 0)),
      [80, 443],
    );
  });

  it("requires IMDSv2 and protects the EC2 instance from API termination", () => {
    const template = createProductionTemplate();
    template.hasResourceProperties("AWS::EC2::Instance", {
      DisableApiTermination: true,
      Monitoring: true,
    });
    template.hasResourceProperties("AWS::EC2::LaunchTemplate", {
      LaunchTemplateData: Match.objectLike({
        MetadataOptions: Match.objectLike({
          HttpTokens: "required",
        }),
      }),
    });
  });

  it("trusts only the production GitHub Environment subject", () => {
    const template = createProductionTemplate();
    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "sts:AssumeRoleWithWebIdentity",
            Condition: {
              StringEquals: Match.objectLike({
                "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                "token.actions.githubusercontent.com:sub":
                  "repo:example/nexus:environment:production",
              }),
            },
          }),
        ]),
      },
    });
  });

  it("uses a constrained SSM document parameter for release selection", () => {
    const template = createProductionTemplate();
    template.hasResourceProperties("AWS::SSM::Document", {
      DocumentType: "Command",
      Content: Match.objectLike({
        parameters: {
          ReleaseSha: Match.objectLike({
            allowedPattern: "^[0-9a-f]{40}$",
          }),
        },
      }),
    });
  });

  it("serves institutional media with public GetObject and private writes", () => {
    const template = createProductionTemplate();
    template.resourceCountIs("AWS::CloudFront::Distribution", 0);
    template.resourceCountIs("AWS::CloudFront::OriginAccessControl", 0);
    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: Match.objectLike({
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: false,
        RestrictPublicBuckets: false,
      }),
    });
    template.hasResourceProperties("AWS::S3::BucketPolicy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "s3:GetObject",
            Effect: "Allow",
            Principal: {
              AWS: "*",
            },
          }),
        ]),
      },
    });
  });
});
