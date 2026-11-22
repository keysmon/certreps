# Vector store architecture

Reviewed: 2026-11-22. Optional AIP-C01 Task 1.4 lesson. The load-test examples below are invented and specify no AWS defaults or guaranteed capacity.

## Choose the application boundary

Start with what retrieval must combine. If a custom application needs vector matches joined with live relational product, entitlement, or inventory tables in the same SQL workflow, Aurora PostgreSQL with pgvector is a relevant option. An application already organized around document search, search aggregations, independent index scaling, and search operations may fit an OpenSearch architecture better. Neither choice follows from vector dimensionality alone. Aurora's supported Bedrock integration and PostgreSQL vector extension are documented, but arbitrary business-table joins require explicit application query design; choosing Aurora as a managed knowledge base backend does not automatically add those joins. [Aurora integration](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.VectorDB.html)

| Design concern | Evidence to collect | Consequence for architecture |
| --- | --- | --- |
| Relational joins | Which live business attributes must share the query boundary? | Consider colocated relational/vector queries where required |
| Search operations | Existing document search features, operational skills, and independent scaling needs | Consider a search-oriented vector index |
| Metadata eligibility | Supported operators, attribute types, field mappings, index engine | Validate the exact backend contract before selecting filters |
| Domain segmentation | Query scope, noisy-neighbor measurements, corpus growth | Compare shared and separate domain indexes using measured traffic |
| Maintenance | Update/delete frequency, source watermark, connector privilege | Design incremental reconciliation and controlled ingestion |

The vector-store setup must align the embedding field, text field, metadata mapping, and selected embedding configuration. Treat this as a versioned retrieval contract rather than a store URL. [Knowledge Base prerequisites](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-setup.html)

## Metadata belongs in the architecture

Metadata can encode source identity, approval status, department, document family, and effective dates. Choose types that match intended predicates. A date string sorted lexically under the wrong convention does not necessarily support the intended date comparison.

Backend support matters. For example, an S3 Vectors knowledge base does not support the startsWith and stringContains metadata filters. If the application needs classification-prefix scope, it can materialize a classification-family attribute and use a supported equality predicate instead. This is an application normalization choice, not an assertion that every backend supports every operator. [Metadata filter support](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html)

For Aurora-backed knowledge bases, configure a custom metadata JSONB column and its required index, or prepare individually typed attribute columns as documented. Supplying sidecar metadata without a compatible mapped table representation does not establish working filtering. Test both matching and nonmatching records, and test missing or malformed attributes. Authorization decisions should come from trusted application identity and approved policy, rather than a model choosing its own unrestricted scope.

## Capacity follows measured access patterns

Suppose engineering ingestion causes retrieval latency to miss its target in a mixed index. Legal queries meet the target alone, and every request already identifies one of those domains. Compare domain-separated indexes with trusted routing against the shared design. Separation may let teams tune capacity and maintenance independently, but it also adds index management and can complicate cross-domain requests. Measure those costs.

Shard count requires a similar tradeoff. OpenSearch documentation explains that oversized shards complicate recovery, while excessive small shards consume resources and can hurt performance. There is no architecture-independent rule that the largest shard count is fastest. Benchmark ingestion and queries together, using the expected filters, domain skew, growth, and recovery requirements. Select capacity based on the target workload, then repeat the test after material changes. [Shard planning](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/bp-sharding.html)

## Connector privilege and freshness

A connector integrates a source repository with ingestion, but its permissions define a second boundary. Ingestion runs with the service role bound to the knowledge base. A principal allowed to update data sources and start ingestion can direct that role toward source locations it can read, even when the principal cannot directly read S3. Scope the service role to approved locations and treat source-management actions as privileged. [Service-role scope](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-permissions.html)

Source changes need maintenance. Sync handles added, modified, and deleted documents. During a backend migration, a noon snapshot does not include the afternoon's edits or removals. Preserve the snapshot watermark, reconcile subsequent changes and deletions, validate target filter semantics and source attribution, and promote the target retrieval configuration coherently. Keep an operable old configuration for rollback. Matching vector counts or dimensions alone cannot prove a correct cutover. These migration steps are application recommendations inferred from freshness and compatibility requirements. [Source synchronization](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-data-source-sync-ingest.html)

## Try it

A fictional support service has two document domains. Queries always specify a trusted domain. Its current shared index misses the latency target only during engineering updates. The candidate backend also lacks a prefix filter used by the existing application. Documents continue changing during migration.

Write a release checklist covering index layout, metadata representation, load validation, source freshness, and rollback. Explain which observations would justify retaining the shared index instead of separating domains. No AWS resources are required for this exercise.

## Check your reasoning

A defensible checklist tests domain-separated routing against the shared baseline, benchmarks concurrent ingestion and retrieval, normalizes the prefix into an eligible explicit attribute, and verifies target mappings and exclusion cases. It reconciles updates and deletions after a recorded watermark and preserves the old configuration for recovery.

Retain the shared architecture if measured interference can be resolved more simply and it meets latency, growth, and recovery requirements with acceptable operations. Domain separation is a hypothesis to evaluate, not a guaranteed cure. A passing copy operation, matching vector dimensions, or successful ingestion start does not establish the complete release condition.

Storage field mappings are selected when creating the knowledge base. The [UpdateKnowledgeBase API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_UpdateKnowledgeBase.html) cannot change its storage configuration. Prepare the table and mapping before creation; a different storage configuration requires a new knowledge base and a planned migration.
