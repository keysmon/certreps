# Foundation Model Integration, Data Management, and Compliance

AIP-C01 Domain 1 · 31% of scored content · Sources reviewed 2026-10-18

## What you will learn

Turn a business requirement into a model and data architecture; distinguish prompting, retrieval, and customization; design a maintainable retrieval pipeline; explain how permissions and provenance affect answer quality. This lesson covers the six Domain 1 task areas. You should already understand an API request, an IAM role, and basic S3 storage. No AWS account or paid resources are needed for the exercise.

## 1. Start with the acceptance criteria

A foundation model produces plausible continuations from its input. It does not automatically know today's company policy, possess access to your database, or verify every claim. Before choosing a model, define the task and the evidence of success: who asks, what data they may use, what an acceptable answer contains, latency, cost, residency, and failure behavior.

For a support assistant, “helpful answers” is too vague. “Answer from the currently approved manual, cite the section, and abstain when evidence is missing” can be evaluated. A proof of concept should test those requirements on representative examples before expanding infrastructure.

Choose models by measured capability: input modalities, context size, tool support, language performance, output constraints, availability, and cost. A long context window means a request can fit; it does not prove the model will find a small exception buried in a long document. Keep model selection behind configuration and a common application interface so a model update does not require rewriting business logic.

## 2. Choose the intervention that fixes the failure

| Observed problem | Candidate intervention | What it changes |
|---|---|---|
| Instructions are ambiguous | Better prompt and examples | Information supplied with each request |
| Company facts change frequently | Retrieval augmented generation (RAG) | Evidence fetched at request time |
| Repeated task behavior remains poor despite good prompts | Supported model customization | Learned model behavior |
| Large model is too costly for a narrow task | Smaller model, routing, or distillation | Capacity and cost of the serving path |

These are alternatives and combinations, not a compulsory sequence. RAG retrieves external evidence without updating model weights. Supervised fine-tuning uses labeled examples to change behavior. Distillation transfers task behavior from a teacher to a smaller student. Customization support and serving requirements vary by model; do not assume every family supports every method. Strict JSON formatting alone is a reason to investigate supported structured outputs before funding training.

## 3. Build the retrieval pipeline in two halves

At ingestion, acquire documents, validate them, parse their contents, split into chunks, attach metadata, generate embeddings, and index them. At query time, authenticate the caller, establish allowed sources, retrieve candidates, optionally rerank, assemble context, generate, and return evidence.

An embedding is a numeric representation used for similarity comparison. Document and query vectors must use compatible embedding models and configurations. Matching vector length alone does not make vectors from unrelated models comparable. Changing the embedding model normally requires rebuilding the indexed representations and testing retrieval again.

Chunking controls what a search result can carry. Tiny chunks may lose the condition attached to a rule; huge chunks dilute relevance and consume context. Preserve headings, table meaning, and document relationships where useful. Overlap can protect boundary information, but also duplicates content. Choose settings through retrieval tests rather than a universal token count.

Metadata should include source identity, version or effective date, classification, and the attributes needed for access filtering. Validate dates, empty documents, extraction failures, duplicates, and unsupported formats before indexing. A successful upload does not establish a successful parse. Define update and deletion behavior so superseded policies and revoked documents disappear from retrieval.

## 4. Compare search and storage choices

Semantic search helps when a question paraphrases the source. Lexical search helps with exact identifiers such as error codes or product numbers. Hybrid retrieval combines these signals when the backend and integration support it. Reranking reorders candidates using another relevance assessment; it cannot recover a document excluded before candidate retrieval.

| Choice | Useful reason to choose it | Question to verify |
|---|---|---|
| OpenSearch vector search | Search features and vector/keyword combinations | Index design, filtering, supported search mode |
| Aurora PostgreSQL with pgvector | Existing relational operations and SQL needs | Index behavior, capacity, query latency |
| A managed knowledge-base experience | Reduced ingestion and retrieval infrastructure work | Connectors, permission behavior, regional support |
| Customer-managed retrieval components | Detailed control over parsing, storage, and ranking | Who maintains synchronization and authorization? |

The current Bedrock overview distinguishes Managed Knowledge Bases from customer-managed Knowledge Bases. Their connector, permission, and infrastructure responsibilities differ. Treat the exact product variant in a scenario as meaningful; never assume every knowledge base automatically honors every enterprise ACL.

## 5. Govern prompts and evidence

A useful prompt states the task, separates reference material from instructions, defines the output, and explains what to do without sufficient evidence. Delimiters make structure clearer but do not enforce security against hostile source text. Authorization belongs in the retrieval and tool layers.

Version the prompt, model configuration, embedding configuration, and data snapshot used in an evaluation. Preserve source identifiers in answers so a reviewer can check the actual supporting passage. A citation is a pointer; it still needs to support the specific claim. Restrict and retain source data according to the application's requirements, including copies in logs and indexes.

## Worked scenario: an equipment manual assistant

Assume a manufacturer updates manuals weekly, requires exact part-number lookup, and restricts manuals by customer contract. The assistant currently answers from an older manual.

Start by checking which version was ingested and retrieved. Fine-tuning would not repair a stale source pipeline. Record effective dates, synchronize updates, filter by authenticated customer entitlement, and test hybrid retrieval for exact part numbers plus natural-language symptoms. Add a prompt to cite the approved section and abstain without evidence. Compare candidate models on these same cases. The architecture follows the freshness, access, and retrieval requirements; “use the largest model” does not resolve them.

## Guided exercise: design on paper

Create three short policy passages: an old return period, its replacement, and an exception for damaged items. Write two customer identities with different access. Draw ingestion and query paths, then answer: which metadata selects the current policy, where is access enforced, and which chunk preserves the exception? Write a query containing an exact policy code and another that paraphrases it. Predict which retrieval method each benefits from. No cloud deployment is required.

## Checkpoint

1. Retrieval returns the correct policy, but the answer invents an extra exception. Which layer should you inspect next?
2. Two embedding models both emit 1,024 dimensions. Can their vectors be mixed safely?
3. A document is deleted from S3. What must your architecture verify?

### Answers and reasoning

1. Inspect assembled context, prompt, and generation behavior; the needed evidence already reached retrieval. Add grounding evaluation and an abstention policy rather than changing storage blindly.
2. No. Equal dimensions do not establish a shared embedding space.
3. Verify synchronization removes its searchable content and that cached answers respect deletion or invalidation requirements.

## Common traps

Do not treat RAG as a truth guarantee, a reranker as a substitute for permissions, a larger context as better retrieval, or fine-tuning as a live company database. Watch for “least operational overhead”: unnecessary custom services can make a technically valid design the wrong answer.

## Official references

- [Domain 1 tasks and skills](https://docs.aws.amazon.com/aws-certification/latest/ai-professional-01/ai-professional-01-domain1.html)
- [Bedrock Knowledge Bases and product variants](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html)
- [Knowledge-base data prerequisites](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base-ds.html)
- [Model customization methods](https://docs.aws.amazon.com/bedrock/latest/userguide/custom-models.html)

Continue when useful with a [Domain 1 drill](/aws/aip-c01/practice?mode=drill&domain=Foundation%20Model%20Integration%20%26%20Compliance) or the [mock exam](/aws/aip-c01/practice?mode=mock). Reading is optional; practice remains available directly.
