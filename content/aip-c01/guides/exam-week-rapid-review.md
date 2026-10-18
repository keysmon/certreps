# AIP-C01 Exam-Week Rapid Review

Sources reviewed 2026-10-18. This is optional recall practice after the domain lessons. It contains original teaching scenarios, not recalled exam questions. You can go directly to drills or the mock exam at any time.

## Confirm the exam and your study target

AWS lists 75 questions and 180 minutes. The guide specifies 65 scored questions and 10 unidentified unscored questions. The passing scaled score is 750 on a 100–1,000 scale. This is not a raw 75% requirement, and a practice percentage cannot be converted directly into an AWS scaled score. CertReps uses its practice percentage as a study signal, not a pass guarantee.

| Domain | Share of scored content | Recall focus |
|---|---|---|
| 1. Foundation Model Integration, Data Management, and Compliance | 31% | Requirements, models, data, retrieval, prompts |
| 2. Implementation and Integration | 26% | Tools, deployment, enterprise workflows, APIs |
| 3. AI Safety, Security, and Governance | 20% | Threat boundaries, privacy, policy, evidence |
| 4. Operational Efficiency and Optimization | 12% | Cost per success, latency, caching, monitoring |
| 5. Testing, Validation, and Troubleshooting | 11% | Evaluation design, diagnosis, release checks |

At an even pace, 180/75 is 2.4 minutes per question. Leave time for flagged questions. Multiple-response questions require the correct set; inspect how many selections are requested. AWS says unanswered questions count as incorrect and there is no penalty for guessing, so avoid leaving blanks.

Official exam facts: [AWS exam overview](https://aws.amazon.com/certification/certified-generative-ai-developer-professional/) and [AWS exam guide](https://docs.aws.amazon.com/aws-certification/latest/ai-professional-01/ai-professional-01.html).

## Read the requirement before selecting a service

Identify the required outcome, hard constraints, and qualifier: lowest cost, least operational work, lowest latency, or strongest control. Eliminate options that violate a hard constraint before comparing convenience. Avoid importing assumptions the question did not supply.

A new product name does not prove it is the intended answer. Current service documentation determines capability; the exam blueprint determines scope. Where a scenario names an existing architecture, reason within that architecture.

## Domain 1: retrieve the right evidence

| If the problem is... | Investigate... | Avoid this shortcut |
|---|---|---|
| Changing company facts | Source freshness and RAG | Training as a live database |
| Inconsistent task behavior | Prompt examples, evaluation, supported customization | Assuming one technique fits every failure |
| Exact product codes plus paraphrases | Supported hybrid retrieval | Pure semantic similarity for every query |
| Missing exception clauses | Parsing, chunk boundaries, retrieved context | Increasing model size before inspecting evidence |
| Wrong tenant's document | Authorization and metadata/ACL filtering | Relying on a final-answer filter |
| New embedding model | Compatible query/document vectors and reindexing | Matching dimensions as proof of compatibility |

Keep prompt, model configuration, data version, and source provenance identifiable. A citation must support the claim. Managed and customer-managed Knowledge Bases have different operational and permission features; verify the variant.

## Domain 2: integrate controlled actions

For client-side Converse tool use: receive the tool request, validate and authorize it, execute it, return a matching tool result, and let the model continue. Bound iterations and time. Use idempotency for writes. A timeout can leave the outcome unknown, so reconcile before repeating a consequential action.

For strict output shape, supported Bedrock models offer Converse `outputConfig.textFormat` or tool definitions with `strict: true`. Ordinary schemas, a “return JSON” instruction, or a prefilling trick do not provide the same universal guarantee. Model/API/Region support and schema limitations matter. Valid structure does not authorize an action or verify the facts.

AgentCore Runtime hosts agents/tools; Gateway exposes tools; Memory stores conversation-related state; Identity handles authentication needs; Observability helps trace execution. Step Functions fits explicit branches, waiting, approvals, and retries. Bedrock Agents Classic remains relevant to existing action-group and alias scenarios; current documentation says new customers cannot onboard.

For streaming, inspect the entire model-to-browser path. API Gateway REST defaults to buffering but supports `STREAM` for eligible proxy integrations. Increasing a timeout does not enable streaming. Choose queues for accepted asynchronous jobs, and communicate status instead of pretending the result is immediate.

## Domain 3: enforce the right boundary

A Guardrails policy addresses selected content risks. IAM controls permitted service actions. Retrieval permissions determine which evidence a caller can access. Backend authorization determines which business action may execute. Encryption protects data at rest or in transit. Logs provide evidence. None substitutes for all the others.

| Threat or requirement | Key response |
|---|---|
| Harmful content or denied subject | Appropriate guardrail policy plus measured testing |
| Sensitive identifier in a response | Appropriate masking/blocking and data minimization |
| Poisoned source instructions | Untrusted-data handling, restricted tools, authorization |
| Generated HTML or SQL | Destination-specific safe handling and validation |
| Private service connectivity | Supported VPC endpoint and network configuration |
| Auditable execution | Correlated identity, configuration, approval, and outcome records |
| Zero retention | Verify effective service/model policy and every application store |

Do not memorize “Bedrock never retains prompts” as a universal rule. Current retention behavior depends on configuration and model requirements. Disabling customer invocation logging alone is insufficient. Also verify endpoint coverage before relying on invocation logs. A filter reduces risk; it does not prove all attacks are blocked.

## Domain 4: measure before optimizing

Separate time to first visible output from total completion. Separate average latency from p95/p99. Separate request count from token demand. A cache or smaller model is useful only if quality and access requirements hold.

Prompt caching reuses processing of eligible prefixes; response caching reuses answers. Semantic response caching additionally assumes sufficiently similar questions can share an answer. Include authorization, source versions, expiry, and invalidation in the design. Bedrock supports implicit and explicit prompt caching on supported model/API combinations; inspect actual usage rather than assuming a hit.

Match on-demand, batch, and provisioned options to workload requirements and supported models. Cross-Region routing must respect permitted destinations. Model and endpoint quotas matter; retries cannot create unlimited capacity. Use backoff with jitter, bounded concurrency, and measured fallback behavior.

## Domain 5: find the earliest failure

Inspect ingestion, retrieval, assembled context, generation, tool execution, and presentation separately. If the correct passage is absent, test retrieval and data. If it is present but the answer is wrong, inspect context assembly and generation. If output is cut off, check stop reason, token limits, and delivery errors.

Use deterministic checks for contracts, reference-based measures for labeled tasks, judge models for rubric-based language assessment, and humans for domain judgment. Calibrate judges. Keep held-out examples, track important user groups, and test both refusal errors and unsafe compliance. A final agent sentence is not execution evidence.

A regression set supports offline comparison. A canary limits real exposure with rollback criteria. An A/B test compares controlled groups. None is a substitute for the others.

## Five-minute recall exercise

Answer before reading the explanations:

1. A weekly policy update is missing from answers. What evidence comes first?
2. A schema-valid cancellation names someone else's order. Can it run?
3. Streaming starts sooner but takes the same total time. Has the result contradicted the design?
4. Invocation logging is disabled. Is zero retention established?
5. The retriever returns three relevant results out of five; four relevant passages exist. What are precision and recall?

### Answers

1. Check ingestion, version metadata, synchronization, and retrieved passages. A model change cannot supply evidence that never arrived.
2. No. Validate ownership and permission before execution.
3. No. Earlier visible output and total completion are different measurements.
4. No. Check model/service retention, configuration, endpoint, and independent storage.
5. Precision is 3/5 = 60%; recall is 3/4 = 75%. Neither establishes final-answer correctness.

## Choose the next review by the gap

- Data or retrieval uncertainty: [Domain 1 lesson](/guides/aip-c01/foundation-model-integration-and-compliance).
- API or agent uncertainty: [Domain 2 lesson](/guides/aip-c01/implementation-and-integration).
- Safety or privacy uncertainty: [Domain 3 lesson](/guides/aip-c01/ai-safety-security-and-governance).
- Cost or latency uncertainty: [Domain 4 lesson](/guides/aip-c01/operational-efficiency-and-optimization).
- Evaluation or debugging uncertainty: [Domain 5 lesson](/guides/aip-c01/testing-validation-and-troubleshooting).

Use a [mock exam](/aws/aip-c01/practice?mode=mock) to identify gaps, then review the reasoning behind missed questions. No reading or completion requirement blocks practice.

## Official references for capability-sensitive reminders

- [Structured outputs](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html)
- [Knowledge Bases variants](https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html)
- [AgentCore overview](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html)
- [Agents Classic status](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [API Gateway response streaming](https://docs.aws.amazon.com/apigateway/latest/developerguide/response-transfer-mode.html)
- [Data retention](https://docs.aws.amazon.com/bedrock/latest/userguide/data-retention.html)
- [Invocation logging coverage](https://docs.aws.amazon.com/bedrock/latest/userguide/model-invocation-logging.html)
- [Prompt caching](https://docs.aws.amazon.com/bedrock/latest/userguide/prompt-caching.html)
- [Inference quotas](https://docs.aws.amazon.com/bedrock/latest/userguide/quotas.html)
- [Evaluation methods](https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation.html)
