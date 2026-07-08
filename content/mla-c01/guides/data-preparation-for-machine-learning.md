# Data Preparation for Machine Learning on AWS (MLA-C01 Domain 1)

*Verified Q3 2026 - covers ~28% of the MLA-C01 exam.*

## What this domain tests

Data Preparation is the largest MLA-C01 domain.
It covers ingesting and transforming data for machine learning on AWS: choosing storage formats and input modes, selecting the right preparation service, engineering features, and preventing the data problems - leakage, imbalance, missing values, and unhandled PII - that quietly wreck model quality.

## Storage formats and SageMaker input modes

Apache Parquet is a binary columnar format, and CSV is the row-based text format.
**A columnar layout lets a training job or an Athena query read only the columns it needs, scanning far less data than row-based CSV.**
**Parquet also applies per-column compression and encoding, which shrinks S3 storage and I/O.**
That combination makes Parquet the go-to answer for large tabular training data that is also queried in Amazon Athena.

When training data is millions of small files, per-object listing and download dominate job startup.
**Pack many small files into a few RecordIO (protobuf) files and stream them with Pipe mode to remove per-object overhead and raise throughput.**
For input modes overall, **File mode downloads the whole dataset to the training volume before the job starts**, **Pipe mode streams records so training begins without waiting for a full download**, and **FastFile mode streams large S3 objects on demand through a POSIX-like interface, giving Pipe-like startup with File-like random access**.

## Streaming ingestion, cataloging, and PII discovery

**Amazon Data Firehose (formerly Kinesis Data Firehose) buffers streaming records and delivers them to Amazon S3 with the least operational overhead**, and **it can convert records to Parquet on the way**.
A custom SQS-plus-EC2 consumer adds code and servers, so it is never the low-overhead choice.

**A Glue crawler infers schema and partitions from raw S3 files and writes table definitions to the AWS Glue Data Catalog.**
**Amazon Athena then queries those cataloged tables directly with SQL and no servers to manage.**

Before training on customer data, scan it for PII.
**Amazon Macie discovers and classifies sensitive data, including PII, in Amazon S3.**
**Amazon Comprehend detects PII entities in text, and AWS Glue can invoke Comprehend-based PII detection during ETL.**
KMS only encrypts data and Rekognition only analyzes images, so neither identifies PII in record text.

## Choosing a data-preparation service

**AWS Glue DataBrew is the no-code visual tool with 250+ built-in transforms, data profiling, and schedulable recipe jobs, which fits a low-code analyst exactly.**
**Amazon EMR with PySpark suits large-scale preparation only when the team will write and maintain Spark code.**
Amazon Athena runs SQL over S3 but is not a point-and-click cleaning tool, and invoking Lambda per row does not scale for large batch preparation.
**AWS Glue Data Quality evaluates DQDL rulesets, such as no-nulls or allowed-value checks, returns a data quality score, and can stop a pipeline when the rules fail.**
Use Glue Data Quality for business-rule validation and Macie for PII, because they solve different problems.

## SageMaker Data Wrangler and ML lineage

Data Wrangler is the visual flow tool for exploring and transforming tabular data inside SageMaker.
**The Quick Model analysis trains a random forest on a sample and returns a model score with per-feature importance, giving a fast predictive signal with no code.**
**Export a finished flow as a SageMaker Processing job or a Pipelines step to run the full transformation set at scale on a schedule.**
The synchronous Export data option handles only small samples, and a real-time endpoint serves inference rather than batch prep.
**SageMaker ML Lineage Tracking records the relationships among datasets, processing jobs, training jobs, and models, so any past run can be reproduced for an audit.**

## SageMaker Feature Store

A feature group can be enabled for the online store, the offline store, or both.
**The online store keeps only the latest value per record identifier and serves it with low latency for real-time inference.**
**The offline store retains all historical records in Amazon S3 and is used to build training datasets.**
**Write records into a feature group with the PutRecord API, or the SDK batch-ingest helper for a pandas DataFrame.**
A Glue crawler only catalogs schema, so it does not ingest feature records.

## Labeling data with SageMaker Ground Truth

**Ground Truth automated data labeling uses active learning to cut human labeling volume.**
**A model trained on human-labeled samples auto-labels objects it predicts above a confidence threshold and routes only low-confidence objects to human workers.**
Mechanical Turk is one workforce option, not the volume-reduction mechanism.

## Feature engineering, splits, and class imbalance

**One-hot encoding represents each unordered category as its own binary indicator, so a linear model infers no false ranking among values such as 50 US states**, whereas ordinal or label encoding assigns integers that imply a false order.
**Distance-based models such as k-nearest-neighbors need scaled features, using standardization or min-max normalization, so no large-magnitude feature dominates the distance calculation.**
**Impute missing values with statistics computed only on the training split, and add a binary missing-value indicator to preserve the signal that missingness itself carries**, because computing the mean over the whole dataset leaks test information into training.
**Split the data before any resampling, then apply SMOTE to the training split only, so synthetic minority points never leak into the test set**, and **use class weights such as scale_pos_weight in XGBoost to raise the minority class contribution to the loss without resampling**.
**Target leakage happens when a feature is known only after the label, such as account_closed_date for churn, and a random split lets that future information bleed into training; remove the leaking feature and use a time-based split so training data precedes the validation period.**

## Practice this domain

Take a [Domain 1 drill](/aws/mla-c01/practice?mode=drill&domain=Data%20Preparation%20for%20Machine%20Learning)
or the [full MLA-C01 mock exam](/aws/mla-c01/practice?mode=mock).
