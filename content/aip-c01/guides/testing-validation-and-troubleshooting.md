# Testing, Validation & Troubleshooting for GenAI on AWS (AIP-C01 Domain 5)

*Verified Q3 2026 - covers ~11% of the AIP-C01 exam.*

## What this domain tests

How to prove a generative-AI workload on Amazon Bedrock is good enough to ship and how to
find the fault when it is not: picking the right evaluation method, reading RAG quality
metrics, gating prompt changes in CI, decoding Bedrock exceptions, and debugging agents,
retrieval, and latency in production.

## Choosing an evaluation job type

Amazon Bedrock model evaluation offers three approaches, and the exam wants you to match the
method to the requirement:

- **Automatic (reference-based) metrics** like BERTScore and F1 need gold reference outputs
  and measure surface overlap. They poorly capture faithfulness, coherence, or tone, so they
  are wrong whenever quality is nuanced or no references exist.
- **LLM-as-a-judge** brings your own prompt dataset and scores nuanced dimensions (coherence,
  faithfulness, conciseness) at scale. The go-to answer when scoring must run **automatically
  on every release** across thousands of items.
- **Human evaluation** routes responses to your subject-matter experts. Reserve it for
  **subjective, high-stakes sign-off** (brand voice, cultural sensitivity, legal tone) where
  a judge model is not authoritative enough and mistakes carry regulatory weight. Most
  accurate, but too slow and costly to repeat every release.

## Reading RAG evaluation metrics

A Knowledge Bases RAG evaluation job reports separate scores, each isolating a different
failure:

- **Context relevance** measures whether the retrieved passages are on topic. Low context
  relevance is a **retrieval** problem.
- **Groundedness** measures whether the generated answer is actually supported by those
  retrieved passages. **High context relevance but low groundedness** means retrieval worked
  and the model is adding unsupported content, which is hallucination during **generation**,
  not retrieval. Replacing embeddings or ingesting more documents would not help here.
- **Answer relevance** measures whether the answer addresses the question.

Because low groundedness is a generation fault, the fixes are a grounding-focused prompt,
lower temperature, or a guardrail. To enforce it at inference time, attach an Amazon Bedrock
guardrail with the **contextual grounding check** enabled and set grounding and relevance
thresholds so ungrounded answers are blocked before they reach users.

## Prompt regression discipline

Prompt edits look harmless and quietly break quality, so treat prompts like code:

- **Golden dataset plus CI gate.** Maintain a versioned golden dataset of representative
  inputs with expected outputs, run an automated evaluation on **every pull request**, and
  fail the build when the aggregate quality score drops below a defined threshold. This is a
  deterministic, repeatable regression gate. Bedrock Prompt management versions and stores
  prompts but does not evaluate quality or block a regression on its own.
- **Canary or A-B rollout.** After a change passes offline evaluation, route a **small
  percentage** of live traffic to the new prompt and compare quality and business metrics
  against the current version before ramping up. This limits the blast radius a full cutover
  cannot. Error-rate metrics do not measure answer quality.

## The Bedrock exception taxonomy

Reading the exception is half the answer. Each maps to one root cause and one fix:

- **ThrottlingException** - requests exceed the account's per-model rate. Intermittent, worse
  at peak. Fix with client-side **exponential backoff plus jitter**, and for sustained demand
  request a service quota increase or buy Provisioned Throughput.
- **AccessDeniedException** - a permission or access gate. If IAM already allows
  `bedrock:InvokeModel` and other models work but one new model fails **every** call
  immediately, the cause is almost always that **model access was never granted** for that
  model in the account and Region (a Bedrock setting separate from IAM).
- **ValidationException** - the request violates a fixed input constraint, such as a prompt
  that **exceeds the model's context window**. It is not transient, so retries keep failing.
  Fix by reducing input size through chunking or staged, hierarchical summarization.

The trap is treating one exception with another's remedy: match the exception name to its own
fix.

## Debugging agents, retrieval, and latency

- **Agent misbehavior.** When an AgentCore agent returns an unhelpful answer, enable and inspect
  **AgentCore Observability**. Its OpenTelemetry traces expose the model's step-by-step reasoning,
  which tools it invoked, and each step's inputs and outputs, so you can pinpoint where
  orchestration went wrong. CloudTrail records API activity, not intermediate reasoning.
- **Retrieval misses.** When the correct passage exists but never appears in **Retrieve**
  results, the fault is retrieval, not generation. The two usual culprits: a **metadata
  filter** whose expression does not match the document's attributes silently drops it from
  the candidate set, and a **chunking** strategy that splits the answer's facts from the
  query's key terms leaves no chunk whose embedding is close enough to be retrieved.
- **Latency.** Before optimizing, localize the bottleneck. Compare the Bedrock
  **InvocationLatency** metric (the model call) against your own timers around retrieval and
  orchestration to see which stage dominates. Provisioned Throughput only helps if the model
  call is the bottleneck; a larger model is usually slower, not faster.

## Reproducibility and production monitoring

Flaky evaluation runs, where the same input produces different outputs across runs, come from
sampling. Make decoding deterministic: set **temperature to 0** for greedy decoding and
constrain **top-p and top-k** so the same input returns the same output. Retrying until a test
passes only hides the nondeterminism.

For ongoing observability, two features do distinct jobs. **Model invocation logging** is the
only one that captures the full prompt and completion payloads, delivering them to Amazon S3
and CloudWatch Logs for offline quality and compliance review (CloudTrail records API metadata
but not the bodies). **CloudWatch alarms** on the InvocationLatency and InvocationServerErrors
metrics provide automated threshold alerting. Track latency by **percentiles (p90, p99), not
averages**, since a healthy mean hides the slow tail users actually feel.

## Practice this domain

Take a [Domain 5 drill](/aws/aip-c01/practice?mode=drill&domain=Testing%2C%20Validation%20%26%20Troubleshooting)
or the [full AIP-C01 mock exam](/aws/aip-c01/practice?mode=mock).
