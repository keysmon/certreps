# Design for New Solutions on AWS (SAP-C02 Domain 2)

*Verified Q3 2026 - covers ~29% of the SAP-C02 exam, the largest single domain.*

## What this domain tests

Design for New Solutions is the biggest domain on the SAP-C02 exam, and it is where the exam does the most head-to-head comparisons between plausible-sounding services.
Every scenario describes a greenfield workload with specific, often numeric constraints - a latency target, an RTO and RPO pair, a traffic shape, a consistency requirement - and asks which architecture actually satisfies every constraint at once, not just the one that sounds modern.
The domain spans compute selection, purpose-built databases, event-driven integration, disaster recovery strategy, and global network performance, and the professional-level discriminator is almost always a subtle mismatch between what a service is built for and what the scenario actually needs.

## Choosing compute for a new, unpredictable workload

When a new workload has spiky, unpredictable traffic and a small team that does not want to manage servers or plan capacity, **Amazon API Gateway in front of AWS Lambda, backed by DynamoDB, scales automatically at every layer and bills only for actual usage**, which is why it beats a fixed-size EC2 or ECS fleet sized for a peak that may rarely occur.
For containers, the decision usually comes down to what the team already has: **Amazon EKS runs a conformant Kubernetes control plane, so existing Helm charts, operators, and kubectl tooling carry over directly**, while **ECS with the Fargate launch type removes server management entirely for teams that do not need the Kubernetes API itself**.
Fargate paired with **Amazon EventBridge Scheduler** is the standard pattern for a scheduled batch job that should incur zero EC2 or AMI management.
For interruptible, checkpoint-resumable batch work such as rendering, **an Auto Scaling group with a mixed instances policy across several Spot Instance types and Availability Zones is the most cost-effective choice**, since Spot pricing beats On-Demand for workloads that can tolerate interruption, and spreading across instance types and AZs limits how much capacity any single interruption event can take away.

## Purpose-built databases for new solutions

The exam repeatedly tests which managed database matches a specific consistency and latency profile, not just which one is popular.
**Amazon Aurora Global Database replicates at the storage layer with typically sub-second cross-region lag and can promote a secondary Region to full read/write in under a minute**, which fits a relational workload that needs near-real-time global reads and a fast, managed cross-region failover.
**Amazon DynamoDB Global Tables in active-active mode let every Region accept writes locally with single-digit-millisecond latency**, at the cost of eventual, sometimes out-of-order consistency between Regions - the right trade for a workload, like a mobile game backend, that needs local writes everywhere and can tolerate eventual convergence rather than strict cross-region ordering.
Within a single Region, **Aurora's writer-plus-multiple-reader cluster model delivers both fast automatic failover and read-traffic scaling from one engine**, which is why a new relational workload rarely needs to hand-assemble separate Multi-AZ and read-replica configurations the way plain RDS does: an RDS Multi-AZ standby exists purely for failover and cannot serve reads, so read scaling still needs replicas added on top.
For a read-heavy DynamoDB workload that needs microsecond cached responses without any change to the application's DynamoDB API calls or data model, **Amazon DynamoDB Accelerator (DAX) is the purpose-built answer**, since ElastiCache for Redis or Memcached would instead require the application to build and maintain its own cache-aside or write-through logic.

## Storage for new solutions

Storage choice usually comes down to protocol and integration requirements rather than raw performance alone.
A company retiring an on-premises Windows file server, and needing SMB, AWS Managed Microsoft AD integration for Windows-native permissions, and data deduplication, should land on **Amazon FSx for Windows File Server**, a fully managed native Windows file system - not Amazon EFS, which is a Linux-native NFS system with no native SMB or Windows ACL support, and not a self-managed file server on EC2 and EBS, which reintroduces exactly the patching and single-instance risk the migration is meant to remove.
The same "match the protocol and ecosystem, not just the workload type" logic applies across the domain: the right answer is usually the service built for the specific interface, consistency model, or client compatibility the scenario names, and the wrong answers are services that solve an adjacent but different problem.

## Event-driven integration and streaming

New solutions are usually decoupled, not synchronously chained, and the exam tests which decoupling primitive fits which fan-out or filtering need.
For simple, independent notification to multiple consumers of the same event, **S3 Event Notifications published to an SNS topic, with each consumer subscribing its own SQS queue, gives every subscriber a durable, independent copy so one team's backlog or failure never blocks another's**.
When routing needs to be content-aware, matching on event source, detail type, or payload attributes across many producers, including third-party SaaS integrations, **Amazon EventBridge is purpose-built for that rule-based routing**, letting new consumers subscribe without ever touching the producer.
When multiple independent applications must each read every event from the same stream, in order, with the ability to replay a recent window if one falls behind, **Amazon Kinesis Data Streams supports that pattern natively**, since each consumer tracks its own position and a configurable retention window supports replay; plain SQS deletes a message once processed and has no replay story.
For a company moving an existing on-premises Apache Kafka deployment into AWS with minimal code change, **Amazon MSK runs genuine, wire-compatible Kafka brokers**, so producers and consumers built against the open-source Kafka client libraries need little to no rewrite - unlike a move to Kinesis, which would require adopting the Kinesis Producer and Consumer Libraries instead.
For multi-step application workflows that call Lambda and ECS, wait on a human approval step, and need built-in retry, error handling, and a visual execution view, **AWS Step Functions models the whole sequence as a state machine**, which is far less to hand-build than chaining SQS queues or hand-rolling retry logic inside one long-running Lambda function.

## Disaster recovery strategy selection

DR questions on this exam almost always give explicit RTO and RPO numbers, and the correct strategy is whichever one actually hits both numbers at the lowest cost, not the most resilient-sounding option in the abstract.
**Backup and restore is the cheapest strategy but typically has an RTO measured in hours**, since infrastructure must be provisioned and data restored after a disaster is declared.
**Pilot light keeps only data continuously replicating in the DR Region while compute stays fully stopped**, so compute still has to be launched and configured during the outage, which can put a tight RTO at risk for a full stack.
**Warm standby runs a smaller but fully functional copy of every tier continuously, with active database replication, so failover is mainly a scale-up operation** - this is the usual answer when the numbers require an RTO in minutes and an RPO of about a minute, while still costing meaningfully less than full duplicate capacity.
**Multi-site active-active runs full production capacity in every Region at all times**, comfortably beating almost any RTO or RPO target, but at the highest ongoing cost, so the exam only wants it chosen when the business explicitly says cost is secondary to always-on capacity.
Once warm standby (or any multi-region failover design) is chosen, **Amazon Route 53 failover routing, with the primary record marked PRIMARY and the DR record marked SECONDARY, combined with a health check on the primary, is the mechanism that actually redirects traffic automatically** when the primary becomes unhealthy - weighted, latency-based, and geolocation routing policies do not implement this all-or-nothing, health-driven failover behavior.

## Global performance and content delivery

For cacheable HTTP and HTTPS content, **Amazon CloudFront caches at edge locations close to users**.
But for real-time, non-HTTP traffic such as UDP game-state updates, or for any workload that needs the lowest possible, most consistent latency across countries with fast failover that does not depend on DNS cache expiry, **AWS Global Accelerator's static anycast IP addresses route traffic onto the AWS global network backbone as early as possible and can shift away from an unhealthy Region within seconds** - a fundamentally different tool from a content cache, since it accelerates and health-checks a network path rather than caching responses.

## Practice this domain

Take a [Domain 2 drill](/aws/sap-c02/practice?mode=drill&domain=Design%20for%20New%20Solutions)
or the [full SAP-C02 mock exam](/aws/sap-c02/practice?mode=mock).
