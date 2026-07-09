# SDLC Automation on AWS (DOP-C02 Domain 1)

*Verified Q3 2026 - covers ~22% of the DOP-C02 exam, the largest single domain.*

## What this domain tests

SDLC Automation is the biggest slice of the DOP-C02 exam, and it goes well beyond "know what CodePipeline does."
The exam expects you to design pipelines that span multiple AWS accounts and Regions, choose the right deployment strategy for EC2, ECS, and Lambda targets, wire in automatic validation and rollback, and manage build tooling (caching, private networking, package repositories) at an organizational scale.
Almost every scenario has a qualifier - "least custom code," "fewest manually maintained roles," "with no NAT gateway" - and the right answer is the one that satisfies that qualifier natively, without bolting on Lambda functions or cron jobs where a managed feature already does the job.

## Pipeline orchestration and governance

A CodePipeline pipeline is a sequence of stages, and stages hold actions.
**A Manual Approval action pauses a pipeline at a chosen stage and can publish to an SNS topic, so approvers are emailed automatically with no custom polling code.**
That single feature covers a huge share of "how do I get a human sign-off before production" questions: reach for Manual Approval plus SNS before you reach for a custom Lambda approval portal.

Cross-account pipelines are a recurring theme at the Professional level.
**A pipeline in a tooling account that deploys into a separate target account needs a trust relationship between the two accounts, and if the artifact bucket uses a customer managed KMS key, the target account's role must also be granted kms:Decrypt on that key** - a missing key grant, not a missing bucket policy, is the classic cause of a cross-account access-denied error on the artifact itself.
**Cross-Region actions work the same way: CodePipeline needs an artifact store (an S3 bucket, and its KMS key if used) configured for every Region a stage's actions touch, and it then replicates the artifact to each Region automatically** - you do not write your own replication job, but you do have to declare the per-Region stores.

Triggering matters too.
**A CodeStar (Developer Tools) connection to GitHub lets CodePipeline react to a push immediately, through a managed webhook subscription, instead of polling the repository on an interval.**
If a question describes noticeable delay before a pipeline starts and asks for a fully managed fix, a connection with event-driven detection is almost always the answer over "poll faster" or "run your own webhook receiver on EC2."

## Build: caching and private network access

CodeBuild environments are ephemeral by default, which is why the same dependencies get reinstalled on every run unless you tell CodeBuild to remember them.
**CodeBuild build caching - a local cache on the build host or an S3-backed cache - persists directories like node_modules across otherwise-stateless build executions**, and it is the direct fix for "the same npm install runs every single build," not a bigger compute type, which only makes the redundant work finish faster rather than removing it.

CodeBuild also needs to reach private resources sometimes, and the exam likes to test the "no NAT gateway, no public IP" version of this.
**Running a CodeBuild project inside a VPC's private subnets lets it reach resources like an RDS database directly, and VPC interface endpoints (PrivateLink) for services such as CodeArtifact, plus an S3 gateway endpoint for the underlying artifact storage, let it reach those services without any route to the internet.**
Watch for distractors that attach an internet gateway to a private subnet (that just makes it public) or that disable the VPC configuration entirely (that removes access to the private resource you needed to reach in the first place).

## Package management with CodeArtifact

Teams often want one registry endpoint that serves both their own packages and a cached copy of public packages, so builds are not one internet outage away from failing.
**A CodeArtifact repository can have an external connection to a public registry such as npm, and also take another internal repository as an upstream, so a single downstream repository resolves and caches both package sets through one URL.**
Two separate repositories that developers have to switch between manually is exactly the friction this feature exists to remove, and it is a reliable wrong answer whenever the stem asks for "a single registry URL."

## Deployment strategies: matching the tool to the target

This is the part of the domain that rewards memorizing which deployment mechanism goes with which compute target, because CodeDeploy behaves differently for EC2/on-premises, ECS, and Lambda.

For an **EC2 Auto Scaling group behind a load balancer, CodeDeploy blue/green deployments support attaching a CloudWatch alarm to the deployment group with automatic rollback on alarm enabled**, so a spike in 5xx errors on the replacement instances stops and reverses the deployment with nobody watching a dashboard.
This is a managed feature, not something you replicate with an EventBridge rule and a Lambda that calls StopDeployment - if the exam offers that custom path as an option, it is almost always the wrong (over-engineered) one.

For **ECS blue/green deployments, CodeDeploy offers linear, canary, and all-at-once configurations; a linear shift (for example 10 percent every minute) combined with a bound CloudWatch alarm catches a bad deployment early and rolls it back automatically, while still finishing on a predictable schedule** - this is usually the right balance of safety and speed for a routine production deployment.
All-at-once cuts over every request at once, so a bad build reaches 100 percent of traffic before an alarm can react; a canary with no alarm attached depends on a human noticing during the bake window, which is not automatic.
Native ECS rolling updates through UpdateService are a different mechanism entirely and do not carry CodeDeploy's target-group traffic shifting or alarm-based rollback.

For **Lambda, CodeDeploy traffic-shifting configurations (Canary and Linear) work through an alias, and the AppSpec can define PreTraffic and PostTraffic hook functions; the PreTraffic hook runs and can abort the deployment before any live traffic is shifted to the new version at all.**
That "before any traffic" property is the key discriminator: a CloudWatch alarm on Errors only reacts after real requests have already hit the new version, so it cannot prevent the very first customer from seeing a broken deployment the way a PreTraffic hook can.

## Cross-account, multi-stage pipelines with CDK

When application infrastructure is defined in CDK across dev, test, and production accounts, hand-built cross-account IAM and a manually triggered sequence of deployments do not scale and drift quickly.
**CDK Pipelines is built for exactly this: bootstrapping each target account and Region establishes the trust relationships CDK needs, the pipeline is defined in code next to the application, and a self-mutation stage updates the pipeline's own CodePipeline and CodeBuild resources automatically whenever the pipeline definition changes** - no hand-maintained cross-account roles, and no separate manual step to keep the pipeline itself in sync with its own source.
Long-term IAM access keys stored as CodeBuild environment variables show up as a distractor here too; CDK Pipelines uses assumed roles specifically so that pattern is unnecessary.

## The pattern behind the pattern

Across nearly every question in this domain, the wrong answers share a shape: they solve the stated problem with more custom code, more manual steps, or a slower feedback loop than a native AWS feature already provides.
When you see "least custom code," "fewest manually maintained roles," or "without anyone watching the console," start by asking whether CodePipeline, CodeDeploy, CodeBuild, CodeArtifact, or CDK Pipelines already has a built-in mechanism for it, because at the Professional level, that built-in mechanism is almost always the intended answer.

## Practice this domain

Take a [Domain 1 drill](/aws/dop-c02/practice?mode=drill&domain=SDLC%20Automation)
or the [full DOP-C02 mock exam](/aws/dop-c02/practice?mode=mock).
