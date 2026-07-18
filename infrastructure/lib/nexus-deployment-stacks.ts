/**
 * @fileoverview AWS CDK stacks for Nexus GitHub identity and EC2 environments.
 *
 * The shared stack creates the GitHub OIDC provider once. Each environment stack
 * owns isolated ECR repositories, public-read media and private deployment
 * buckets, runtime secret, EC2 host, SSM deployment document, and least-privilege
 * GitHub deployment role. Media is served directly from S3 (no CloudFront).
 *
 * Tests: `npm run test:run -- nexus-deployment-infrastructure`
 * Registry: `.ai/docs/testing.md`
 *
 * @module infrastructure/lib/nexus-deployment-stacks
 */

import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  Tags,
  Validations,
  type StackProps,
} from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import type { Construct } from "constructs";

/** Supported independently deployable Nexus cloud environments. */
export type NexusDeploymentEnvironment = "staging" | "production";

/** Properties required by the shared GitHub OIDC identity stack. */
export interface NexusGithubIdentityStackProps extends StackProps {
  /** GitHub repository in `owner/name` form. */
  githubRepository: string;
}

/** Shared GitHub OIDC identity resources consumed by environment stacks. */
export class NexusGithubIdentityStack extends Stack {
  /** GitHub Actions OIDC provider registered in this AWS account. */
  public readonly githubProvider: iam.OpenIdConnectProvider;

  /**
   * Create the one-per-account GitHub Actions OIDC provider.
   *
   * @param scope - CDK construct scope.
   * @param id - Stable stack identifier.
   * @param props - Repository and standard stack properties.
   */
  public constructor(
    scope: Construct,
    id: string,
    props: NexusGithubIdentityStackProps,
  ) {
    super(scope, id, props);

    this.githubProvider = new iam.OpenIdConnectProvider(this, "GithubActionsProvider", {
      url: "https://token.actions.githubusercontent.com",
      clientIds: ["sts.amazonaws.com"],
    });

    new CfnOutput(this, "GithubRepository", {
      value: props.githubRepository,
      description: "Repository allowed to use the Nexus GitHub deployment roles.",
    });
  }
}

/** Properties for one isolated Nexus runtime environment. */
export interface NexusEnvironmentStackProps extends StackProps {
  /** Environment represented by this stack. */
  environmentName: NexusDeploymentEnvironment;
  /** Shared GitHub Actions OIDC provider. */
  githubProvider: iam.IOpenIdConnectProvider;
  /** GitHub OIDC subject prefix, including immutable IDs when enabled. */
  githubSubjectPrefix: string;
  /** EC2 instance type, such as `t3.small`. */
  instanceType: string;
}

/**
 * Acknowledge exact cdk-nag IAM5 findings emitted by CDK grant helpers.
 *
 * @param construct - Generated IAM policy construct carrying the findings.
 * @param findingIds - Exact IAM5 finding suffixes reported by cdk-nag.
 * @param reason - Evidence explaining why each wildcard is unavoidable and bounded.
 */
function acknowledgeIam5Findings(
  construct: Construct,
  findingIds: readonly string[],
  reason: string,
): void {
  for (const findingId of findingIds) {
    Validations.of(construct).acknowledge({
      id: `AwsSolutions-IAM5[${findingId}]`,
      reason,
    });
  }
}

/**
 * Complete cost-conscious Nexus EC2 environment.
 *
 * The EC2 host is public only to provide direct HTTPS and outbound access without
 * a NAT Gateway. Its security group exposes ports 80/443, never SSH. Deployments
 * arrive through a custom SSM document, while runtime secrets remain readable
 * only by the instance role.
 */
export class NexusEnvironmentStack extends Stack {
  /**
   * Create isolated compute, storage, identity, artifact, and deployment resources.
   *
   * @param scope - CDK construct scope.
   * @param id - Stable stack identifier.
   * @param props - Environment-specific deployment properties.
   */
  public constructor(
    scope: Construct,
    id: string,
    props: NexusEnvironmentStackProps,
  ) {
    super(scope, id, props);

    const environmentName = props.environmentName;
    const isProduction = environmentName === "production";
    const resourcePrefix = `nexus-${environmentName}`;

    const vpc = new ec2.Vpc(this, "Vpc", {
      vpcName: `${resourcePrefix}-vpc`,
      maxAzs: 2,
      natGateways: 0,
      restrictDefaultSecurityGroup: true,
      subnetConfiguration: [
        {
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });
    vpc.addFlowLog("FlowLog", {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(),
      trafficType: ec2.FlowLogTrafficType.REJECT,
    });

    const accessLogBucket = new s3.Bucket(this, "AccessLogBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [{ expiration: Duration.days(isProduction ? 180 : 30) }],
      removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
    });
    Validations.of(accessLogBucket).acknowledge({
      id: "AwsSolutions-S1",
      reason:
        "This dedicated bucket is the terminal destination for S3 server access logs and cannot log to itself.",
    });

    /**
     * Institutional media bucket: objects are publicly readable over HTTPS so
     * browsers can load uploads without CloudFront. Writes remain EC2-role only.
     * ACLs stay blocked; access is granted solely via the bucket policy below.
     */
    const mediaBucket = new s3.Bucket(this, "MediaBucket", {
      bucketName: undefined,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: true,
        ignorePublicAcls: true,
        blockPublicPolicy: false,
        restrictPublicBuckets: false,
      }),
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      serverAccessLogsBucket: accessLogBucket,
      serverAccessLogsPrefix: "media/",
      versioned: isProduction,
      lifecycleRules: [
        {
          id: "abort-incomplete-uploads",
          abortIncompleteMultipartUploadAfter: Duration.days(7),
        },
        ...(isProduction
          ? [
              {
                id: "expire-old-object-versions",
                noncurrentVersionExpiration: Duration.days(30),
              },
            ]
          : []),
      ],
      removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
    });
    mediaBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: "PublicReadGetObject",
        actions: ["s3:GetObject"],
        resources: [mediaBucket.arnForObjects("*")],
        principals: [new iam.AnyPrincipal()],
      }),
    );
    Validations.of(mediaBucket).acknowledge({
      id: "AwsSolutions-S2",
      reason:
        "Nexus serves institutional page media and avatars directly from S3 for a local audience without CloudFront; public GetObject is intentional while Put/Delete remain EC2-role only and ACLs stay blocked.",
    });
    Validations.of(mediaBucket).acknowledge({
      id: "AwsSolutions-S10",
      reason:
        "enforceSSL is enabled on the bucket; public GetObject is limited to HTTPS clients by the bucket's HTTPS-only transport policy.",
    });

    const deploymentBucket = new s3.Bucket(this, "DeploymentBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      serverAccessLogsBucket: accessLogBucket,
      serverAccessLogsPrefix: "deployments/",
      versioned: true,
      lifecycleRules: [
        {
          id: "retain-recent-release-bundles",
          expiration: Duration.days(isProduction ? 90 : 30),
          noncurrentVersionExpiration: Duration.days(7),
        },
        {
          id: "abort-incomplete-uploads",
          abortIncompleteMultipartUploadAfter: Duration.days(7),
        },
      ],
      removalPolicy: isProduction ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
    });

    const runtimeSecret = new secretsmanager.Secret(this, "RuntimeEnvironmentSecret", {
      secretName: `nexus/${environmentName}/runtime-env`,
      description:
        "Complete dotenv payload materialized as /opt/nexus/.env.local by the EC2 deployment script.",
    });
    Validations.of(runtimeSecret).acknowledge({
      id: "AwsSolutions-SMG4",
      reason:
        "The secret is a composite dotenv payload containing third-party credentials that cannot share one automatic rotation Lambda; rotation is an audited operator procedure.",
    });

    const webRepository = this.createRepository("WebRepository", `${resourcePrefix}-web`);
    const workerRepository = this.createRepository(
      "WorkerRepository",
      `${resourcePrefix}-worker`,
    );

    const instanceRole = new iam.Role(this, "InstanceRole", {
      roleName: `${resourcePrefix}-instance`,
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      description: `Nexus ${environmentName} EC2 runtime role.`,
    });
    instanceRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "ssm:UpdateInstanceInformation",
          "ssmmessages:CreateControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:OpenDataChannel",
          "ec2messages:AcknowledgeMessage",
          "ec2messages:DeleteMessage",
          "ec2messages:FailMessage",
          "ec2messages:GetEndpoint",
          "ec2messages:GetMessages",
          "ec2messages:SendReply",
        ],
        resources: ["*"],
      }),
    );
    webRepository.grantPull(instanceRole);
    workerRepository.grantPull(instanceRole);
    instanceRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ecr:DescribeImages"],
        resources: [webRepository.repositoryArn, workerRepository.repositoryArn],
      }),
    );
    runtimeSecret.grantRead(instanceRole);
    mediaBucket.grantReadWrite(instanceRole);
    deploymentBucket.grantRead(instanceRole);
    const instanceDefaultPolicy = instanceRole.node.tryFindChild("DefaultPolicy");
    if (instanceDefaultPolicy) {
      acknowledgeIam5Findings(
        instanceDefaultPolicy,
        [
          "Resource::*",
          "Action::s3:GetObject*",
          "Action::s3:GetBucket*",
          "Action::s3:List*",
          "Action::s3:DeleteObject*",
          "Action::s3:Abort*",
          "Resource::<MediaBucketBCBB02BA.Arn>/*",
          "Resource::<DeploymentBucketC91A09DA.Arn>/*",
        ],
        "SSM messaging and ECR authorization do not support resource scoping; CDK S3 grant wildcards are bounded to this environment's media and deployment bucket ARNs.",
      );
    }

    const securityGroup = new ec2.SecurityGroup(this, "InstanceSecurityGroup", {
      vpc,
      securityGroupName: `${resourcePrefix}-web`,
      description: "Public HTTP/HTTPS only; administration is exclusively through SSM.",
      allowAllOutbound: true,
    });
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), "Caddy HTTP");
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), "Caddy HTTPS");
    securityGroup.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(80), "Caddy HTTP IPv6");
    securityGroup.addIngressRule(ec2.Peer.anyIpv6(), ec2.Port.tcp(443), "Caddy HTTPS IPv6");
    Validations.of(securityGroup).acknowledge({
      id: "AwsSolutions-EC23",
      reason:
        "This is the public web edge and exposes only HTTP/HTTPS; SSH and the application port remain closed.",
    });

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      "set -euo pipefail",
      "dnf update -y",
      "dnf install -y docker docker-compose-plugin",
      "systemctl enable --now docker",
      "install -d -m 0750 -o root -g docker /opt/nexus /opt/nexus/releases",
      `cat > /opt/nexus/deployment.env <<'EOF'\nNEXUS_ENVIRONMENT=${environmentName}\nAWS_REGION=${this.region}\nWEB_REPOSITORY_URI=${webRepository.repositoryUri}\nWORKER_REPOSITORY_URI=${workerRepository.repositoryUri}\nRUNTIME_SECRET_ID=${runtimeSecret.secretArn}\nDEPLOYMENT_BUCKET=${deploymentBucket.bucketName}\nEOF`,
      "chmod 0640 /opt/nexus/deployment.env",
    );

    const instance = new ec2.Instance(this, "Instance", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: new ec2.InstanceType(props.instanceType),
      machineImage: ec2.MachineImage.resolveSsmParameterAtLaunch(
        "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64",
      ),
      role: instanceRole,
      securityGroup,
      userData,
      requireImdsv2: true,
      detailedMonitoring: true,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(24, {
            encrypted: true,
            deleteOnTermination: !isProduction,
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
    });
    const cfnInstance = instance.node.defaultChild as ec2.CfnInstance;
    cfnInstance.disableApiTermination = true;
    Tags.of(instance).add("Name", `${resourcePrefix}-host`);
    Tags.of(instance).add("NexusEnvironment", environmentName);

    const elasticIp = new ec2.CfnEIP(this, "ElasticIp", {
      domain: "vpc",
      tags: [{ key: "Name", value: `${resourcePrefix}-eip` }],
    });
    new ec2.CfnEIPAssociation(this, "ElasticIpAssociation", {
      allocationId: elasticIp.attrAllocationId,
      instanceId: instance.instanceId,
    });

    const deploymentDocument = new ssm.CfnDocument(this, "DeploymentDocument", {
      name: `${resourcePrefix}-deploy-release`,
      documentType: "Command",
      documentFormat: "YAML",
      targetType: "/AWS::EC2::Instance",
      content: {
        schemaVersion: "2.2",
        description: `Deploy one immutable Nexus ${environmentName} release.`,
        parameters: {
          ReleaseSha: {
            type: "String",
            description: "Full lowercase Git commit SHA.",
            allowedPattern: "^[0-9a-f]{40}$",
          },
        },
        mainSteps: [
          {
            action: "aws:runShellScript",
            name: "deployRelease",
            inputs: {
              timeoutSeconds: "1800",
              runCommand: [
                "set -euo pipefail",
                "source /opt/nexus/deployment.env",
                'RELEASE_SHA="{{ ReleaseSha }}"',
                'RELEASE_DIR="/opt/nexus/releases/${RELEASE_SHA}"',
                'install -d -m 0750 "${RELEASE_DIR}"',
                'aws s3 cp "s3://${DEPLOYMENT_BUCKET}/releases/${RELEASE_SHA}/deployFromEcr.sh" "${RELEASE_DIR}/deployFromEcr.sh" --only-show-errors',
                'aws s3 cp "s3://${DEPLOYMENT_BUCKET}/releases/${RELEASE_SHA}/docker-compose.deploy.yml" "${RELEASE_DIR}/docker-compose.deploy.yml" --only-show-errors',
                'aws s3 cp "s3://${DEPLOYMENT_BUCKET}/releases/${RELEASE_SHA}/Caddyfile" "${RELEASE_DIR}/Caddyfile" --only-show-errors',
                'chmod 0750 "${RELEASE_DIR}/deployFromEcr.sh"',
                'exec "${RELEASE_DIR}/deployFromEcr.sh" "${RELEASE_SHA}"',
              ],
            },
          },
        ],
      },
    });

    const githubSubject = `${props.githubSubjectPrefix}:environment:${environmentName}`;
    const deploymentDocumentArn = this.formatArn({
      service: "ssm",
      resource: "document",
      resourceName: deploymentDocument.ref,
    });
    const instanceArn = this.formatArn({
      service: "ec2",
      resource: "instance",
      resourceName: instance.instanceId,
    });
    const githubDeployRole = new iam.Role(this, "GithubDeployRole", {
      roleName: `${resourcePrefix}-github-deploy`,
      description: `OIDC role used only by the GitHub ${environmentName} environment.`,
      assumedBy: new iam.WebIdentityPrincipal(
        props.githubProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
            "token.actions.githubusercontent.com:sub": githubSubject,
          },
        },
      ),
      maxSessionDuration: Duration.hours(1),
    });

    webRepository.grantPush(githubDeployRole);
    workerRepository.grantPush(githubDeployRole);
    deploymentBucket.grantPut(githubDeployRole, "releases/*");
    githubDeployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:SendCommand"],
        resources: [
          deploymentDocumentArn,
          instanceArn,
        ],
      }),
    );
    githubDeployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"],
        resources: ["*"],
      }),
    );
    const githubDefaultPolicy = githubDeployRole.node.tryFindChild("DefaultPolicy");
    if (githubDefaultPolicy) {
      acknowledgeIam5Findings(
        githubDefaultPolicy,
        [
          "Resource::*",
          "Action::s3:Abort*",
          "Resource::<DeploymentBucketC91A09DA.Arn>/releases/*",
        ],
        "ECR authorization and SSM command-status APIs require wildcard resources; the S3 object wildcard is constrained to the immutable release prefix.",
      );
    }

    new CfnOutput(this, "EnvironmentName", { value: environmentName });
    new CfnOutput(this, "GithubDeployRoleArn", {
      value: githubDeployRole.roleArn,
    });
    new CfnOutput(this, "GithubOidcSubject", { value: githubSubject });
    new CfnOutput(this, "WebRepositoryUri", { value: webRepository.repositoryUri });
    new CfnOutput(this, "WorkerRepositoryUri", {
      value: workerRepository.repositoryUri,
    });
    new CfnOutput(this, "DeploymentBucketName", {
      value: deploymentBucket.bucketName,
    });
    new CfnOutput(this, "RuntimeSecretArn", { value: runtimeSecret.secretArn });
    new CfnOutput(this, "MediaBucketName", { value: mediaBucket.bucketName });
    new CfnOutput(this, "MediaPublicBaseUrl", {
      value: `https://${mediaBucket.bucketName}.s3.${this.region}.amazonaws.com`,
      description:
        "Virtual-hosted S3 origin for public-read media objects (optional S3_MEDIA_PUBLIC_BASE_URL)",
    });
    new CfnOutput(this, "InstanceId", { value: instance.instanceId });
    new CfnOutput(this, "DeploymentDocumentName", {
      value: deploymentDocument.ref,
    });
    new CfnOutput(this, "ElasticIpAddress", { value: elasticIp.ref });
  }

  /**
   * Create a scan-on-push ECR repository with bounded image retention.
   *
   * @param id - Construct identifier.
   * @param repositoryName - Physical repository name.
   * @returns Configured repository.
   */
  private createRepository(id: string, repositoryName: string): ecr.Repository {
    const repository = new ecr.Repository(this, id, {
      repositoryName,
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.IMMUTABLE,
      encryption: ecr.RepositoryEncryption.AES_256,
      emptyOnDelete: false,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    repository.addLifecycleRule({
      description: "Retain the most recent immutable release images.",
      maxImageCount: 30,
      rulePriority: 2,
    });
    repository.addLifecycleRule({
      description: "Remove untagged interrupted-build images.",
      tagStatus: ecr.TagStatus.UNTAGGED,
      maxImageAge: Duration.days(7),
      rulePriority: 1,
    });
    return repository;
  }
}
