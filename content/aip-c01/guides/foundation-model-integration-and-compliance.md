# Foundation Model Integration, Data Management, and Compliance for GenAI on AWS (AIP-C01 Domain 1)

*Verified Q3 2026 - covers ~31% of the AIP-C01 exam.*

## What this domain tests

Choosing and integrating the right Amazon Bedrock foundation model for a workload, grounding it
with Knowledge Bases and vector search, moving up the customization ladder when prompting is not
enough, and keeping data private, encrypted, and in-Region. It is the largest domain, so most of
the exam's model-selection and compliance scenarios live here.

## Choosing a foundation model

Match the model to the workload's context length, modality, cost, and licensing.

- **Anthropic Claude has a large context window (200K tokens, and more on the newest Claude models)** and strong reasoning, so it is the answer
  for ingesting a very long document (a 250-page contract) in one pass and reasoning across
  distant sections.
- **Amazon Nova Micro is text-only with the lowest latency and very low cost**, the pick for
  high-volume, lightweight work such as short-message intent classification. It does not accept
  image or video input.
- **Amazon Nova Lite and Nova Pro are multimodal and accept text, image, and video inputs.**
- **Amazon Nova Canvas generates images from text** prompts; do not confuse it with the
  text-understanding Nova models.
- For image *inputs* alongside text, both **Claude vision models and Amazon Nova multimodal
  models** are valid candidates. Claude accepts images but outputs text, not images.
- **Meta Llama models are open-weight and openly licensed**, so the same base model can be
  self-hosted (for example on Amazon SageMaker) to avoid vendor lock-in. Claude and Nova are
  proprietary, API-only.

## Amazon Bedrock Knowledge Bases and chunking

Knowledge Bases handle ingestion, embedding, and retrieval for RAG. Chunking strategy is the
most-tested lever.

- **Hierarchical chunking** creates parent and child chunks: retrieval matches the small child
  chunk for precision, then returns the larger parent chunk for context. Best for structured
  documents with nested sections.
- **Semantic chunking** splits text at natural meaning boundaries using embedding similarity, so
  related sentences stay together. Best for long narrative content where topic boundaries do not
  align with fixed token counts.
- **No chunking** treats each record or document as a single chunk. Best when content is already
  pre-segmented, such as spreadsheet rows that are each a self-contained FAQ answer.
- **Fixed-size chunking** ignores document structure and can split ideas mid-thought.
- After source updates, run an **incremental data source sync** that re-embeds only added,
  modified, and deleted objects, rather than recreating the Knowledge Base and reprocessing
  everything.

## Vector stores and embeddings

Pick the store by latency, existing footprint, and scale; pick the embeddings model by modality
and language.

- **Amazon OpenSearch Serverless** is the **quick-create default** that Bedrock provisions and
  manages for you with no manual vector-store setup.
- **Aurora PostgreSQL with the pgvector extension** adds vector search inside a database a team
  already runs, avoiding a new service for a moderate corpus.
- **Redis Enterprise** keeps vectors in memory for **single-digit millisecond** similarity
  lookups, the choice for real-time features. **S3 Vectors** optimizes cost for large,
  latency-tolerant corpora.
- **Amazon Neptune Analytics** backs **GraphRAG**, which builds a knowledge graph to traverse
  explicit entity relationships and answer multi-hop questions that pure vector similarity
  cannot. DynamoDB and Athena are not vector stores.
- **Cohere Embed Multilingual** maps many languages into one shared vector space for cross-lingual
  search from a single model. **Amazon Titan Multimodal Embeddings** map images and text into a
  shared space for text-to-image and image-to-image search.
- **Amazon Titan Text Embeddings V2 supports output dimensions of 1024 (default), 512, and 256.**
  Choosing 256 shrinks vectors to cut storage cost and query latency at a small accuracy cost.

## Retrieval quality and access control

When a RAG app returns loosely relevant chunks, fix retrieval before touching the generation model.

- **Metadata filtering** attaches attributes such as department to documents and filters at query
  time, giving document-level isolation from a single index. It is the multi-tenant answer, better
  than one index per unit or post-filtering that still pulls other tenants' data into the app.
- **A reranker model (Amazon Rerank or Cohere Rerank)** scores each retrieved chunk against the
  query and reorders results so the best passages reach the model first, and it lets you pass
  fewer, higher-quality chunks to cut cost and latency.
- To improve retrieval relevance without changing the foundation model, the two highest-leverage
  changes are **adding metadata filtering** and **matching the chunking strategy to the document
  structure**. Temperature, max output tokens, and swapping the generation model affect only
  generation, not what is retrieved.

## The customization ladder

Climb only as far as the requirement forces you: **prompt engineering, then RAG, then
fine-tuning, then continued pre-training.**

- **RAG** fits changing or current facts, answers that need source citations, and adding knowledge
  without retraining.
- **Fine-tuning** is for reliably enforcing a proprietary output format or tone that prompting
  cannot, using labeled examples, when the underlying knowledge is stable. Training data is a
  **JSONL file where each line is a JSON object with prompt and completion fields.**
- **Continued pre-training** consumes a large *unlabeled* corpus to teach domain vocabulary and
  style; use it when there are no labeled prompt-and-completion pairs.
- Serving custom models (2025 update): **custom Amazon Nova models (Nova Micro, Nova Lite,
  Nova 2 Lite, Nova Pro) and Meta Llama 3.3 70B can be deployed for on-demand inference** (in
  US East N. Virginia or US West Oregon), while **an Anthropic Claude fine-tune still requires
  Provisioned Throughput.**

## Data protection and compliance

Bedrock's default posture is strong, and the exam rewards knowing the exact controls.

- **Amazon does not use your prompts or completions to train the base foundation models, and your
  content is not shared with third-party model providers.**
- **Bedrock is HIPAA-eligible under an AWS Business Associate Addendum (BAA)**, supporting PHI
  workloads with proper controls.
- **A customer managed AWS KMS key** encrypts Knowledge Base data and custom-model artifacts at
  rest with keys you control, rotate, audit via CloudTrail, and can revoke.
- **An interface VPC endpoint using AWS PrivateLink** exposes Bedrock as a private ENI so API
  traffic stays on the AWS network. A NAT gateway still uses the public path.
- **Scope Bedrock usage to chosen Regions for data residency.** Cross-Region inference may route
  requests to other Regions, so use a geography-scoped inference profile (for example EU-scoped)
  or disable cross-Region routing to keep data in-Region.
- **Model invocation logging** captures the full request and response payloads and delivers them
  to Amazon S3 and CloudWatch Logs for audit. **CloudTrail records management events (who called
  what), not the prompt and response content.**
- **Amazon Bedrock Guardrails sensitive information filters** detect PII in inputs and outputs and
  block or mask it, replacing values with the entity type such as {NAME} or {PHONE}.

## Practice this domain

Take a [Domain 1 drill](/aws/aip-c01/practice?mode=drill&domain=Foundation%20Model%20Integration%20%26%20Compliance)
or the [full AIP-C01 mock exam](/aws/aip-c01/practice?mode=mock).
