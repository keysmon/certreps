# Operational Efficiency & Optimization for GenAI on AWS (AIP-C01 Domain 4)

*Verified Q3 2026 - covers ~12% of the AIP-C01 exam.*

## What this domain tests

Cost and latency engineering for generative-AI workloads on Amazon Bedrock: choosing the right
inference mode, right-sizing models, caching, and monitoring spend.

## Prompt caching

When many requests share a large static prefix (system prompt, style guide, policy text),
enable prompt caching and place a cache checkpoint after the static portion. Cached input
tokens are billed at a large discount and time-to-first-token drops. This is the go-to answer
when the scenario says "same instructions on every request."

## On-demand vs Provisioned Throughput vs batch

- **On-demand**: default pay-per-token; right for variable or unpredictable traffic.
- **Provisioned Throughput**: reserved model units at an hourly/term rate. Cheaper than
  on-demand only when utilization is high, steady, and predictable. It is also **required to
  serve custom (fine-tuned) models** - a favorite exam fact.
- **Batch inference**: asynchronous bulk jobs at discounted pricing; never the answer for an
  interactive chat experience.

## Latency levers

Response streaming improves *perceived* latency; latency-optimized inference serves supported
models on faster infrastructure for lower *actual* latency; smaller models (e.g., Amazon Nova
Micro for lightweight classification) cut both latency and cost. Cross-Region inference
profiles raise effective throughput and resilience during spikes without re-architecture.

## Cost monitoring and control

Use CloudWatch Bedrock metrics (`InputTokenCount`, `OutputTokenCount`, `Invocations`,
`InvocationLatency`) for usage alarms and AWS Budgets for proactive spend alerts. For RAG
workloads dominated by input tokens, reranking plus tighter top-k retrieval shrinks prompts
without hurting answer quality.

## Model distillation

For a narrow, high-volume task where a frontier model meets accuracy but costs too much,
distill the teacher's behavior into a smaller student model and serve that (via Provisioned
Throughput, since it is a custom model).

## Practice this domain

Take a [Domain 4 drill](/aws/aip-c01/practice?mode=drill&domain=Operational%20Efficiency%20%26%20Optimization)
or the [full AIP-C01 mock exam](/aws/aip-c01/practice?mode=mock).
