# Data Ingestion and Transformation on AWS (DEA-C01 Domain 1)

*Verified Q3 2026 - covers 34% of the DEA-C01 exam, its largest domain.*

## What this domain tests

Data Ingestion and Transformation is the heart of the AWS Certified Data Engineer - Associate exam.
It covers moving data into AWS from batch and streaming sources, transforming it at scale, and choosing the right service for a given latency, cost, and operational-overhead tradeoff.
Expect scenario questions that name a workload (a nightly file drop, a database migration, a clickstream) and ask which ingestion or transformation service fits best, and why the alternatives fall short.

## Cataloging and no-code preparation

**A Glue crawler classifies files, infers schema and Hive-style partitions from S3 key structure, and writes table definitions to the AWS Glue Data Catalog**, so Athena and other engines can query the data without hand-written DDL.
Crawlers support **exclude patterns and custom classifiers** so a staging subfolder or an unusual file format never becomes a spurious catalog table.
**AWS Glue DataBrew** is the no-code, visual data-preparation tool: a business analyst with limited coding experience profiles data, removes outliers, and applies 250-plus built-in transforms through a recipe, then runs that recipe on a schedule.
Neither a crawler nor DataBrew executes custom distributed code, that is what Glue ETL jobs and Amazon EMR are for.

## Choosing a Glue job type

Glue offers several job types, and picking the wrong one either wastes money or fails to scale:

- **A Glue Spark ETL job** runs on a managed Apache Spark environment and suits large, distributed transformations.
- **A Glue Python shell job** runs a plain Python script with no Spark cluster and bills at a much lower minimum capacity, the cheapest choice for a small, non-distributed task under roughly 1 GB.
- **A Glue streaming ETL job** stays running continuously against an unbounded source; it does not process one batch and stop.
- **A Glue Ray job** runs Python workloads across a Ray cluster, suited to large-scale parallel Python processing that does not fit Spark's programming model.

**Glue job bookmarks** track which S3 files (or, for JDBC sources, which rows) a job has already processed across runs, so a nightly job picks up only new data without the team building its own state-tracking logic.
When a Spark job repeatedly fails with out-of-memory errors on the largest partitions, the direct fix is to **increase the worker type or worker count** so each executor gets more memory, not to switch job types or disable bookmarks.

When a team already maintains tuned PySpark code with custom bootstrap actions, a specific Spark version, and direct HDFS access, **Amazon EMR** is the right target: it hands over full control of the cluster software stack, something Glue Studio's no-code canvas and AWS Lambda's 15-minute limit cannot offer.

## Streaming ingestion: Kinesis, Firehose, and MSK

**Amazon Data Firehose** buffers streaming records and delivers them to Amazon S3 (or other destinations) with optional Parquet or ORC conversion, fully managed, no servers to run.
**Dynamic partitioning** lets Firehose parse values out of each record (or use metadata) to route it into date/type-partitioned S3 prefixes automatically, without a separate Lambda transformation step.

**Amazon Kinesis Data Streams** is a different tool for a different job: it **retains records for a configurable period so multiple independent consumer applications can each read and replay the stream**, and it is a **self-managed consumption model** where the application uses the Kinesis Client Library (or a compatible consumer) and manages shards or relies on On-Demand capacity.
When several consumer applications compete for a shard's shared 2 MB/sec read throughput and see throttling, **enhanced fan-out** gives each registered consumer its own dedicated 2 MB/sec pipe per shard over HTTP/2, removing the contention.
For continuous, low-latency SQL transformations (filtering, aggregation, windowed joins) directly on a Kinesis stream without operating a Flink or Spark cluster, **Amazon Managed Service for Apache Flink** (formerly Kinesis Data Analytics) is the purpose-built option.

When existing applications are written against the native Apache Kafka producer/consumer APIs, including custom partition-assignment logic, and must keep working unchanged, **Amazon MSK** is the fit: it runs real Kafka brokers as a managed service, unlike Kinesis Data Streams, which uses a different API entirely.

## Database migration: DMS and the Schema Conversion Tool

**AWS DMS performs an initial full load of existing data and then ongoing change data capture (CDC) replication**, keeping source and target in sync until cutover with minimal source downtime.
That pattern works directly for a **homogeneous** migration (same engine on both ends).
For a **heterogeneous** migration between different database engines, run the **AWS Schema Conversion Tool (SCT) first**: it analyzes the source schema, flags SQL Server- or Oracle-specific objects such as stored procedures that cannot convert automatically, and generates the target-compatible schema before DMS moves a single row.
A Glue crawler only catalogs an existing schema for querying; it does not translate one engine's objects into another engine's equivalents.

## Orchestrating multi-step pipelines

**AWS Step Functions** models an ordered, cross-service workflow (crawler, then ETL job, then EMR step) as a state machine, with native **Retry** (interval and backoff rate, matched to specific error types) and **Catch** (routing a failure to a remediation branch) built in, plus visual execution tracking.
Neither Amazon EventBridge Scheduler (which only invokes a single target on a schedule) nor Glue triggers (which only chain Glue-native objects) offer that general cross-service retry and branching model.

When a team is already fluent in Apache Airflow and needs complex branching, backfills, and dozens of interdependent Python-DAG tasks, some calling non-AWS APIs, **Amazon Managed Workflows for Apache Airflow (MWAA)** lets them reuse that Airflow knowledge directly, unlike Step Functions' different Amazon States Language paradigm.

## Loading data into Amazon Redshift

To bulk-load a nightly batch of files into Redshift as fast as possible, **issue a single COPY command with a manifest file listing all the S3 objects**, so Redshift loads them in parallel across every cluster slice.
Row-by-row INSERT statements and sequential single-file COPY commands are dramatically slower and are the wrong answer whenever a question emphasizes speed or parallelism.

## S3 layout: partitioning and the small-files problem

Most Athena cost and latency questions in this domain come down to how data sits in S3.
**Partitioning data into Hive-style S3 prefixes by a commonly filtered column (such as order_date) lets Athena prune irrelevant partitions entirely**, scanning far less data than an unpartitioned layout.
Converting row-based formats like JSON or CSV to **Apache Parquet** helps for a different reason: Parquet is **columnar**, so a query reading only a few columns skips the rest, and its **per-column compression and encoding** shrink both storage size and bytes scanned.
When a streaming job produces millions of tiny Parquet files and query performance suffers from per-file overhead, the fix is not switching formats or adding workgroups, it is **compacting the small files into fewer, larger files**, for example with a scheduled Glue job or S3DistCp on Amazon EMR.

## Event-driven, low-volume ingestion

Not every ingestion problem needs a stream or a cluster.
For a modest, sporadic volume of events with no traffic overnight, invoking **AWS Lambda directly per event** (from an S3 event notification or the application flow itself) has no idle infrastructure and bills only per invocation, unlike a persistent EMR cluster, a Kinesis stream provisioned with fixed shards, or a Glue Python shell job scheduled to run on a fixed cadence regardless of whether new data exists.
The pattern to recognize across every ingestion question in this domain is the same: match the traffic shape (steady vs. bursty, high-volume vs. sporadic) and the operational appetite (managed vs. self-built) to the service, rather than reaching for the most powerful or most familiar tool by default.

## Validating data quality during transformation

Ingestion is also where bad data gets caught before it contaminates everything downstream.
**AWS Glue Data Quality evaluates a dataset against DQDL (Data Quality Definition Language) rules**, such as "column age has no nulls" or "column country values fall within an allowed set," and returns a pass/fail result and a numeric score that a pipeline can gate on.
It goes further than one-time validation: Glue Data Quality can **recommend rulesets and detect statistical anomalies** learned from historical runs, so the team is not stuck hand-writing every rule, and it can **publish scores and rule outcomes as CloudWatch metrics** that existing dashboards and alarms pick up automatically.
That combination, rule evaluation plus anomaly detection plus CloudWatch integration, is what separates Glue Data Quality from a one-off check: it runs on every configured job or crawler execution, not only at table creation.
For sensitive data, **Amazon Macie** discovers and classifies PII across S3 using machine learning and pattern matching, and **Amazon Comprehend** detects PII entities directly in text, so a pipeline can flag or route sensitive records before they reach broad audiences. Neither service performs encryption or replaces IAM access control; they inform the decisions those systems enforce.

## Redshift loads: manifests and idempotency

Beyond raw load speed, the COPY command accepts a manifest file precisely so the load step is explicit and repeatable: the manifest enumerates every S3 object that must land in the table, which avoids ambiguity about partial loads if a run is retried.
Contrast that with Redshift Spectrum, which queries external S3 objects in place through external tables and never loads them into native storage at all, useful for occasional joins against a large archive but not a substitute for COPY when the goal is bulk-loading a native table.

## Practice this domain

Take a [Domain 1 drill](/aws/dea-c01/practice?mode=drill&domain=Data%20Ingestion%20and%20Transformation)
or the [full DEA-C01 mock exam](/aws/dea-c01/practice?mode=mock).
