# Monitoring, Logging, Analysis, Remediation, and Performance Optimization on AWS (SOA-C03 Domain 1)

*Verified Q3 2026 - covers 22% of the SOA-C03 exam, tied for the largest domain.*

## What this domain tests

Domain 1 is the operational heartbeat of the AWS Certified CloudOps Engineer - Associate exam.
It covers building visibility into running AWS workloads with Amazon CloudWatch and CloudWatch Logs, tracing request-level performance problems, and closing the loop with automated remediation so an operations team reacts to an incident in seconds instead of waiting for a human to notice a page.
The scenarios lean heavily on picking the right CloudWatch or Systems Manager feature for a specific operational symptom, not on memorizing API syntax.

## Alarms that page the right person at the right time

A single CloudWatch alarm on one noisy metric pages an on-call engineer for every transient blip.
**A composite alarm combines other alarms with an alarm rule expression built from AND, OR, and NOT over each underlying alarm's ALARM() state**, so a team can require, for example, an ALB error-rate alarm together with at least two of three per-instance CPU alarms before paging anyone.
**The underlying alarms keep evaluating and keep their own state history** after being referenced by a composite alarm, which matters for diagnostics: nothing about creating a composite alarm deletes or modifies the alarms it points at.
A composite alarm can reference many underlying alarms, not just two, which is exactly what makes an at-least-two-of-three expression possible in the first place.

Static thresholds break down for metrics with a predictable daily or weekly shape, like request latency that is naturally higher at lunch and lower overnight.
**CloudWatch anomaly detection models a metric's historical pattern, including time-of-day and day-of-week seasonality, and builds a dynamic expected-value band**, so an alarm on that band reacts to a genuine deviation instead of the same fixed number at 3 AM and 3 PM.
Widening the evaluation period or switching to a higher-resolution metric does not solve this problem; only a model of expected behavior does.

## Logs: turning raw text into metrics, rankings, and root causes

When an application already writes a distinctive string, such as OutOfMemoryError, to its CloudWatch Logs log group, **a CloudWatch Logs metric filter turns a matching pattern into a custom metric with no code change**, and a normal CloudWatch alarm on that metric delivers a threshold-based SNS notification.
This is different from an ad hoc question like "which five endpoints returned the most HTTP 500s in the last hour," which is better answered with **CloudWatch Logs Insights**, a purpose-built query language (fields, filter, stats, sort, limit) that runs directly against a log group with no extra pipeline.
Building a full S3-plus-Athena-plus-Glue export for a one-time ranking query is a heavier solution than the ad hoc problem calls for.

Ranking is a related but distinct need from querying.
**CloudWatch Contributor Insights runs a rule against a log group's structured fields, such as a tenant_id, and produces a time-series ranking of the top contributors to a spike**, without the team writing a Logs Insights query by hand.
That report **can be graphed on a CloudWatch dashboard and also retrieved programmatically through the GetInsightRuleReport API**.
Contributor Insights ranks contributors to a metric or field; it does not trace an individual request through a call chain.
That's the job of **AWS X-Ray**, which traces a single request end to end across multiple services and renders a service map with per-segment latency, so a slow checkout flow's exact bottleneck, whether it's the cart, pricing, inventory, or payment service, becomes visible instead of guessed at.

## Publishing metrics without adding a call in the hot path

An application that already writes structured JSON log lines can also emit a custom metric from inside that same log line using the **CloudWatch embedded metric format (EMF)**; the CloudWatch agent or the Lambda extension parses the EMF block and creates a real CloudWatch metric with no separate PutMetricData call in the request path.
Calling PutMetricData directly still works, but it is exactly the extra call in the hot path that EMF is designed to avoid.

Availability and latency also need to be checked from the outside, especially during low-traffic windows when real user requests are too sparse to produce a meaningful signal.
**CloudWatch Synthetics canaries run a scripted flow, like a login page, on a fixed schedule from outside the account**, producing a steady proactive signal regardless of real traffic, which a metric filter on application logs cannot do since it still depends on real requests happening.

## Remediation: closing the loop without a human in it

Detecting a problem is only half the job; CloudOps scenarios routinely ask how to react automatically.
When EC2 publishes an **instance state-change event** the moment an instance reaches the running state, **an EventBridge rule can target a Lambda function directly**, so a check for a missing required tag and a stop action both happen within seconds, with no polling job and no person reviewing anything.
A daily AWS Config evaluation would leave a noncompliant instance running for up to a day; that's polling, not an automated real-time control.

A related but distinct pattern is triggering a **Systems Manager Automation runbook** from a CloudWatch alarm's state change, for example restarting a stalled Windows service.
**EventBridge can target an Automation runbook directly as a rule target**, with no Lambda function needed just to call the SSM StartAutomationExecution API.
It's worth being precise here: CloudWatch alarms only support a fixed set of native alarm actions (SNS, Auto Scaling, EC2 instance actions, and SSM OpsItem or Incident Manager); an alarm action cannot be granted a role to call an arbitrary API like StartAutomationExecution directly, which is why the EventBridge-to-Automation path, not a custom alarm action, is the correct mechanism.

## Performance and cost visibility across the fleet

Two AWS services turn utilization data into direct action without an engineer building custom dashboards.
**Amazon RDS Performance Insights visualizes database load and lets a team drill into top SQL statements and wait events**, with no agent installed on the database, which is the fastest path from "CPU is high" to "these specific queries are the reason."
**AWS Compute Optimizer analyzes CloudWatch utilization history and recommends specific instance types, EBS volume configurations, and Auto Scaling group sizes**, replacing the alternative of manually building and maintaining a dashboard and threshold for every resource in the fleet.

## Operating across many accounts

Two capabilities matter once an organization outgrows a single account.
**CloudWatch cross-account observability** designates a central monitoring account and one or more source accounts, letting engineers query metrics, logs, and traces from every linked account directly, in place, from a single console, with no data copied or duplicated into the central account.
Streaming every account's logs into the central account's own log groups through a subscription filter is exactly the kind of duplication cross-account observability is designed to avoid.
Separately, **AWS Health publishes scheduled maintenance and service-issue events to EventBridge**, so a rule matching those events can route account- and resource-specific notifications straight into an existing incident-management pipeline, instead of relying on someone to check the Personal Health Dashboard by hand.
The public Service Health Dashboard RSS feed, by contrast, only covers general service status, not account-specific, resource-level events.

## How this domain shows up on the exam

Expect scenario stems that name a specific symptom (a noisy alarm, a slow checkout, an untagged instance that should never have launched) and ask for the single AWS feature that resolves it, with distractors that are real AWS services doing an adjacent but wrong job.
The recurring trap is picking a service that is close but scoped differently: Contributor Insights instead of X-Ray for per-request tracing, a daily Config evaluation instead of an EventBridge rule for near-real-time reaction, or a custom Lambda function where EventBridge can target Systems Manager Automation directly.
Reading for the specific noun in the stem, latency versus load versus ranking versus fleet-wide visibility, is usually enough to separate the correct answer from its neighbors.

## Practice this domain

Take a [Domain 1 drill](/aws/soa-c03/practice?mode=drill&domain=Monitoring%2C%20Logging%2C%20Analysis%2C%20Remediation%2C%20and%20Performance%20Optimization)
or the [full SOA-C03 mock exam](/aws/soa-c03/practice?mode=mock).
