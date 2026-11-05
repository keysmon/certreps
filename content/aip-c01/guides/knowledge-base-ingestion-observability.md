# Diagnose Knowledge Base Ingestion

Reviewed 2026-11-05. Optional lesson: identify the failing document-processing stage before changing a model or vector database.

## Match the signal to the question

A healthy inference endpoint does not prove source documents were indexed. CloudTrail can provide an API audit trail; it is not a substitute for document-level ingestion status. Model invocation logging records a different part of the application. For supported Bedrock Knowledge Bases, ingestion APPLICATION_LOGS expose file-processing status through configured log delivery.

When logs are missing, first establish which knowledge-base variant and data source are in use, whether log delivery is supported and active, and whether the actor and destination permissions permit delivery. Adding a log group without configuring delivery does not establish that ingestion events reach it. Keep the delivery identity distinct from the role that reads source documents.

## Build a document-level investigation

Record the knowledge base, source, ingestion job and affected document identifier. Ask whether the source was discovered, processing was attempted and the final status indicates successful indexing or failure. Correlate the record to the job's time window. Inspect the specific reported reason before assuming that every failure is an embedding-model or vector-capacity problem.

A job-level completion signal is useful, but it does not establish that every intended document is retrievable. Check document outcomes, counts and a retrieval probe. If ingestion succeeded yet the expected passage is absent, continue through parsing, chunk boundaries, access filters and embedding compatibility. A retrieval failure and a generation failure require different fixes.

## Try it

Create a small offline evidence sheet for three fictional documents: one indexed, one processing failure and one absent from the source scan. For each, list the next source of evidence and a hypothesis that the current evidence rules out. Add a fourth row in which log delivery is inactive. Explain why changing the foundation model would not make that missing ingestion telemetry appear.

## Check your reasoning

- A successful model invocation proves indexing succeeded: false; those are different paths.
- CloudTrail alone supplies every file's ingestion outcome: false; use the relevant document-level logging capability.
- A changed chunk size is the first response to every ingestion failure: false; read the actual failure evidence first.

Sources: [Knowledge Base ingestion logging](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-bases-logging.html), [CloudTrail audit events](https://docs.aws.amazon.com/bedrock/latest/userguide/logging-using-cloudtrail.html).
