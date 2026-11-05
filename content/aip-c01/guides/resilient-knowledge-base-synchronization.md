# Resilient Knowledge Base Synchronization

Reviewed 2026-11-05. Optional implementation exercise: keep source documents and retrieval results consistent under retries, bursts and deletion.

## Treat an event as a trigger, not proof of completion

An S3 notification can initiate processing, but receiving it does not prove a document was indexed. A practical workflow separates acceptance, durable buffering, ingestion scheduling, completion checks and failed-item handling. Assume events can be duplicated and arrive out of order. An idempotency key must represent the intended source change, not just the Lambda invocation handling it.

For an S3-backed Knowledge Base, synchronize the supported data source through ingestion jobs. Coalesce bursts rather than blindly starting a new job for every object event. Respect service concurrency and job-state constraints, retry eligible failures with bounded backoff, and keep failed work observable and recoverable. A successful API request that starts processing is not a successful completed ingestion job.

## Make deletion a first-class path

A design that handles only object creation accumulates stale retrieval results. Include updates, removals and reconciliation. Confirm deletion propagation rather than assuming deleting a source object immediately removes indexed chunks. If access must stop immediately, enforce authorization at query time while the asynchronous index catches up.

Direct document APIs apply only to supported source types and workflows. Read their source-management requirements before combining them with source synchronization. In particular, changing indexed content independently of an authoritative source can be overwritten or recreated by later synchronization. Select one clear source of truth.

## Try it

Draw states for accepted, pending, running, complete, retryable failure and terminal failure. Walk through two events for one document, a delayed older event and a removal while an ingestion job is running. Explain what is durably recorded and how a worker decides the next required state. Add a periodic reconciliation step that can discover a missed notification. No cloud deployment is needed for this paper exercise.

## Check your reasoning

- Does retrying every S3 event until StartIngestionJob returns success establish indexing success? No; track completion and document outcomes.
- Is an S3 object removal necessarily an immediate retrieval-access revocation? No; use authorization boundaries and verify synchronization.
- Can dead-lettered work be ignored once the queue is empty? No; it remains unprocessed work requiring a visible recovery path.

Sources: [Synchronize a data source](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-data-source-sync-ingest.html), [S3 notification semantics](https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-event-types-and-destinations.html).
