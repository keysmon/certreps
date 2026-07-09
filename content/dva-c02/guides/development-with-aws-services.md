# Development with AWS Services on AWS (DVA-C02 Domain 1)

*Verified Q3 2026 - covers ~32% of the DVA-C02 exam.*

## What this domain tests

Development with AWS Services is the largest DVA-C02 domain, and the one most exam questions come from.
It covers writing and running application code against the core AWS services a developer touches daily: AWS Lambda's execution model and event sources, Amazon API Gateway integration patterns, Amazon DynamoDB data modeling and performance, and the messaging and orchestration services - Amazon SQS, Amazon SNS, Amazon EventBridge, AWS Step Functions, and Amazon Kinesis Data Streams - that connect components together into a working application.

## AWS Lambda: concurrency and cold starts

Lambda has two distinct concurrency controls that are easy to confuse.
**Reserved concurrency** sets a hard ceiling (and, implicitly, a guaranteed floor) on how many concurrent executions a function may use, but it does nothing to reduce the latency of any individual invocation.
**Provisioned concurrency** keeps a specified number of execution environments initialized and warm ahead of time, which is the feature that actually removes cold-start latency for the invocations that land on those pre-warmed environments.
For Java or other JVM-based functions where initialization is expensive and provisioned concurrency's always-on cost is unwelcome, **AWS Lambda SnapStart** takes a different approach: it initializes the execution environment once, captures an encrypted snapshot of that initialized state, and resumes new environments from the snapshot instead of repeating class loading and framework startup, cutting cold starts without paying for idle capacity.

## Lambda code organization: layers, versions, and aliases

When multiple functions share the same dependency or internal library, package it once as a **Lambda layer** and attach that layer to every function that needs it, rather than duplicating the code in each function's deployment package.
For safe rollout of new code, publish a new **version** of the function and update an **alias** to route a percentage of traffic to it - weighted alias routing lets 10% of production traffic hit a new version for validation while the other 90% keeps using the version the alias already points at, all without clients ever changing which ARN they invoke.

## Lambda and asynchronous event processing

Two related but distinct mechanisms exist for handling failures in asynchronous invocation.
**Lambda destinations** natively route the outcome of an asynchronous invocation - including the original event and either the response or the error - to a target such as EventBridge, SQS, SNS, or another Lambda function, covering both the success and failure paths with no custom code.
A **dead-letter queue (DLQ)** only captures the original event after all retries on a failed invocation are exhausted, and it has no equivalent on-success path; destinations are the newer, more complete mechanism.
For Lambda functions triggered by an SQS event source mapping, a single message in a batch that throws an exception used to force a retry of the entire batch, including messages that had already succeeded.
**ReportBatchItemFailures** (partial batch response) fixes this: the function returns the identifiers of only the messages that failed, so the event source mapping deletes the successful ones from the queue and retries just the failures, instead of reprocessing an entire batch for one bad message.

## API Gateway: choosing an API type and understanding proxy integration

**HTTP APIs** are the lower-cost, lower-latency choice when all you need is Lambda proxy integration and JWT authorizers; **REST APIs** carry more features - usage plans, API keys, request/response mapping templates, and caching - at higher cost and latency, and are the right choice only when those specific features are needed.
With **Lambda proxy integration**, API Gateway forwards the entire request as a structured event object: headers, path parameters, and query string arrive as separate keys, and the client's JSON body arrives as a string under the event's `body` key that the function must parse itself, rather than the body's fields appearing as top-level keys in the event.
**Usage plans** paired with **API keys** let API Gateway identify each caller and enforce a distinct throttle rate, burst limit, and quota per key, without requiring a full OAuth flow - the right tool when different external partners need different rate limits.
**Stage-level response caching** stores a GET endpoint's response for a configurable TTL and serves repeated identical requests from the cache, cutting backend Lambda invocations with no change to the client or the backend code.

## DynamoDB: keys, indexes, and consistency patterns

Partition key design determines throughput distribution: a table with a hot partition key (for example, a small number of high-traffic IoT device IDs) can throttle even when the table's aggregate provisioned capacity has plenty of room, because DynamoDB divides capacity across partitions rather than pooling it.
**Write sharding** - adding a random or calculated suffix to a hot key to spread its writes across more physical partitions - and **on-demand capacity mode**, which scales partition-level throughput automatically for unpredictable spiky traffic, both address this; simply raising the table's overall provisioned write capacity does not, because a single partition's ceiling is what throttles.
A **global secondary index (GSI)** can define an entirely different partition key and sort key from the base table and can be added at any time after the table exists, covering every existing item; a **local secondary index (LSI)** must share the base table's partition key and can only be created when the table itself is created, so it cannot introduce a new access pattern later the way a GSI can.
To prevent one writer from silently overwriting another writer's concurrent update, use **optimistic locking**: maintain a numeric version attribute and update with a `ConditionExpression` requiring the version to match what was last read, incrementing it on success, so a stale write fails instead of clobbering the newer one.
**DynamoDB Accelerator (DAX)** is a write-through, in-memory cache purpose-built for DynamoDB that supports the same API calls with minimal code changes and drops read latency to microseconds for frequently read items, whereas a generic cache like ElastiCache would require building a separate cache-aside layer.
**DynamoDB Streams**, configured for `NEW_AND_OLD_IMAGES`, delivers both the previous and new state of every changed item to a Lambda trigger in near real time, which is how a table's changes get synchronized to a downstream index such as Amazon OpenSearch Service.
**Time to Live (TTL)** tags an item with an expiration timestamp attribute and lets DynamoDB delete expired items automatically in the background, at no extra write-capacity cost and with no application cleanup job required.

## Messaging: SQS, SNS, and EventBridge

When a consumer's processing time exceeds an SQS queue's **visibility timeout**, the message becomes visible again while the first consumer is still working on it, so a second consumer can pick it up and process it a second time; size the visibility timeout comfortably above expected processing time, or extend it dynamically with `ChangeMessageVisibility`, to prevent this.
In an **SQS FIFO queue**, messages sharing the same `MessageGroupId` are delivered in send order while different groups can be processed in parallel, and **deduplication** (content-based or an explicit `MessageDeduplicationId`) discards duplicate sends within a 5-minute window - but ordering is only guaranteed within a message group, not across the whole queue, and a consumer that fails to delete a message before its visibility timeout expires can still receive it again.
The SNS **fan-out** pattern - publishing one message to a topic that delivers a copy to several independently subscribed SQS queues - lets each downstream workflow retry and scale on its own, and lets consumers be added or removed without ever touching the producer.
**EventBridge** rules use **event patterns** to match on fields like `detail-type` or nested values in `detail`, so a custom event bus can route the same stream of events differently to each interested team's own target, fully decoupling the producer from consumer-specific logic - something a shared SQS queue or an unfiltered SNS subscription cannot do.

## Orchestration and streaming: Step Functions and Kinesis

**Standard** Step Functions workflows support executions up to a year and keep a full, auditable execution history, making them the right choice for long-running, multi-day processes; **Express** workflows are priced and optimized for high-volume, short-duration (up to 5 minutes) event processing instead.
When several independent consumer applications each need to read the *same* stream of events in order and replay history if they fall behind, **Amazon Kinesis Data Streams** is the fit: each shard preserves order, any number of consumers can read the same records independently through separate shard iterators, and retention is configurable up to 365 days - a single SQS queue (standard or FIFO) only ever delivers a given message to one consumer, so it cannot serve multiple independent full-stream readers the way Kinesis can.

## Practice this domain

Take a [Domain 1 drill](/aws/dva-c02/practice?mode=drill&domain=Development%20with%20AWS%20Services)
or the [full DVA-C02 mock exam](/aws/dva-c02/practice?mode=mock).
