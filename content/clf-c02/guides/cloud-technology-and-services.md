# Cloud Technology and Services on AWS (CLF-C02 Domain 3)

*Verified Q3 2026 - covers ~34% of the CLF-C02 exam, the largest domain on the Cloud Practitioner test.*

## What this domain tests

Cloud Technology and Services is a service-identification domain: given a scenario, pick the AWS service built for it.
It spans compute, storage, databases, networking, and the deployment and management tools that tie them together.
The exam rewards knowing each service's one-sentence purpose and how it differs from its closest neighbors, not deep configuration detail.

## Compute: EC2 and its purchasing options

**Amazon EC2 provides resizable virtual servers, called instances, where you choose the CPU, memory, storage, and networking configuration and pay only for what you use.**
EC2 offers several purchasing models, and the exam tests matching a workload pattern to the right one.
**On-Demand pricing** charges by the hour or second with no commitment, best for short-term, spiky, or unpredictable workloads.
**Reserved Instances and Savings Plans** trade a one- or three-year commitment for a steep discount on steady, predictable baseline usage.
**Compute Savings Plans discount a committed amount of hourly spend regardless of instance family, size, OS, or Region, which makes them more flexible than a Standard Reserved Instance tied to one configuration.**
**Spot Instances offer the deepest discount on spare EC2 capacity, but AWS can reclaim that capacity with short notice, so Spot fits only fault-tolerant, interruptible workloads like batch rendering or stateless web tiers behind an Auto Scaling group.**
**Dedicated Hosts reserve an entire physical server, mainly for licensing rules that require it or strict compliance needs, and cost more than any other option.**

## Serverless and container compute

**AWS Lambda runs code in response to events, such as an S3 upload or an API call, with AWS fully managing the underlying servers and billing based only on requests and execution time.**
Because there is no server to patch and no capacity to provision ahead of demand, Lambda is the answer whenever a question describes "no server management" plus "pay only when code runs."
For containerized workloads, **Amazon ECS and Amazon EKS orchestrate containers, while AWS Fargate removes the need to provision or manage the underlying EC2 instances those containers run on.**
**Amazon Lightsail bundles compute, storage, and networking into simple, predictable-price virtual private servers**, aimed at simple websites and small applications rather than complex, highly scaled architectures.

## Scaling and traffic distribution

**Amazon EC2 Auto Scaling automatically adds or removes instances in a group based on demand or a defined metric like CPU utilization**, keeping capacity aligned with traffic and avoiding both over-provisioning and outages from under-provisioning.
**Elastic Load Balancing distributes incoming traffic across multiple targets in one or more Availability Zones and performs health checks to route around unhealthy instances**, which is what makes a fault-tolerant, horizontally scaled architecture possible. Auto Scaling and a load balancer are almost always paired together in exam scenarios: the load balancer spreads traffic, and Auto Scaling keeps enough healthy targets behind it.

## Storage: S3 storage classes, EBS, EFS, and Snowball

Amazon S3 is durable object storage, and its storage classes trade access latency and retrieval cost for storage price.
**S3 Standard suits frequently accessed data, S3 Standard-Infrequent Access suits data accessed less often but needed instantly, and S3 Glacier Deep Archive is the lowest-cost class, built for data retained for years and retrieved only rarely, with retrieval times measured in hours.**
**S3 Intelligent-Tiering automatically moves objects between access tiers as usage patterns change, with no retrieval fees**, which fits data whose access pattern is unpredictable rather than known in advance.
For EC2-attached storage, **Amazon EBS provides persistent, network-attached block storage that survives an instance being stopped and restarted, while instance store volumes are physically attached to the host and lose their data on stop.**
**Amazon EFS is a managed, elastic file system that many EC2 instances across multiple Availability Zones can mount and write to concurrently**, which EBS cannot do on its own.
When a data transfer is too large for the available network link, **AWS Snowball ships a physical, ruggedized device to load data offline and return it to AWS for import into S3**, avoiding what would otherwise be a multi-week upload.

## Databases: matching the engine to the access pattern

**Amazon RDS is a managed relational database service that automates backups, patching, and provisioning** for engines like MySQL, PostgreSQL, and SQL Server, so a team can focus on schema and queries instead of administration.
**Amazon Aurora is AWS's own MySQL- and PostgreSQL-compatible engine, built for higher throughput and availability than standard RDS, with storage that auto-scales and replicates across Availability Zones while staying wire-compatible with existing drivers.**
**Amazon DynamoDB is a fully managed, serverless NoSQL key-value and document database delivering consistent single-digit-millisecond performance at any scale**, which is the answer whenever a scenario needs fast key-based lookups with no server or engine to manage.
**Amazon Redshift is a managed data warehouse using columnar storage, purpose-built for complex analytical queries across very large historical datasets**, distinct from the transactional, low-latency access patterns RDS, Aurora, and DynamoDB are built for.
**Amazon ElastiCache is an in-memory data store used to cache frequently accessed data and reduce load on a backend database**, a caching layer rather than a database of record.
The exam frequently asks you to eliminate wrong-fit pairings: Redshift is not a cache, RDS is not schema-less, and DynamoDB has no analytical-warehouse mode.

## Networking: VPC, connectivity, and DNS

**Amazon VPC is a logically isolated virtual network within AWS where the customer defines the IP address range, creates subnets, configures route tables, and attaches gateways**, closely resembling a traditional on-premises network but running inside AWS.
**An internet gateway attached to a VPC, referenced as a target in the route table, is what lets resources in a subnet communicate with the public internet.**
For hybrid connectivity, **AWS Direct Connect establishes a dedicated, private network connection between an on-premises location and AWS that bypasses the public internet**, giving more consistent performance and often lower cost for a high, steady volume of data, while **AWS Site-to-Site VPN creates an encrypted tunnel over the public internet**, faster to set up but subject to internet variability.
As the number of VPCs grows, connecting every pair directly does not scale. **AWS Transit Gateway acts as a central hub that VPCs and on-premises VPN or Direct Connect attachments connect to once, and it routes traffic between all of them**, replacing what would otherwise be a growing mesh of point-to-point connections.
**Amazon Route 53 is AWS's DNS and domain registration service, supporting routing policies such as weighted, latency-based, and geolocation routing** to send end users to the right resource.
**Amazon CloudFront is AWS's content delivery network, caching content at globally distributed edge locations** so requests are served from a location near the end user instead of always traveling back to the origin Region, cutting latency for static assets and video.

## Messaging: decoupling application components

**Amazon SQS is a fully managed message queue that lets application components send, store, and receive messages without those components running at the same time or depending on each other being available**, which is the standard way to decouple a producer from a slower or less reliable downstream consumer.
**Amazon SNS is a fully managed pub/sub messaging service that pushes a single published message out to many subscribers at once**, such as email addresses, SQS queues, or Lambda functions, whereas SQS holds messages for one or more consumers to pull at their own pace.
**Amazon EventBridge routes events from AWS services, SaaS applications, and custom applications to targets based on rules**, making it the answer when a scenario describes reacting to an event from many different sources rather than a simple queue between two components.
The distinction the exam tests most often is push versus pull: SNS pushes to subscribers immediately, SQS waits for a consumer to poll.

## Management, monitoring, and infrastructure as code

**Amazon CloudWatch collects metrics, logs, and alarms across AWS resources**, so it is the default answer whenever a scenario needs visibility into CPU utilization, application logs, or an alarm that triggers an action like an Auto Scaling policy.
**AWS CloudFormation provisions and manages AWS resources from a declarative template**, letting a team stand up the same infrastructure repeatedly and consistently instead of clicking through the console by hand, which is the core idea behind infrastructure as code.
**AWS Systems Manager gives operational visibility and control over EC2 instances and on-premises servers**, including running commands at scale and managing patching, without needing to open inbound SSH or RDP access to every instance.
**AWS Trusted Advisor inspects an account against best practices across cost optimization, performance, security, and fault tolerance**, surfacing findings like idle instances or unattached EBS volumes automatically, rather than requiring a manual account review.
Together, CloudWatch tells you what is happening, CloudFormation defines what should exist, and Systems Manager and Trusted Advisor help you operate and improve what is already running.

## How the pieces fit together

A typical CLF-C02 scenario describes a goal, such as "reduce latency for global users," "survive an Availability Zone failure," or "cut cost for an interruptible batch job," and expects you to name the one service built for it.
Reading each option's role rather than memorizing a flat service list is what separates a fast, confident answer from a guess: EC2 is compute you configure, Lambda is compute you don't; RDS and Aurora are relational, DynamoDB is not; EBS follows one instance, EFS follows many; a VPN is quick but public-internet-based, Direct Connect is dedicated but slower to provision; and CloudFront moves content closer to users while Auto Scaling and ELB together keep an application available under changing load.

## Practice this domain

Take a [Domain 3 drill](/aws/clf-c02/practice?mode=drill&domain=Cloud%20Technology%20and%20Services)
or the [full CLF-C02 mock exam](/aws/clf-c02/practice?mode=mock).
