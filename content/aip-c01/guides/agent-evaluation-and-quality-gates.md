# Agent Evaluation and Quality Gates

Reviewed 2026-11-22. Optional AIP-C01 lesson covering evaluation systems and responsible AI experiments. The exercise uses invented results and requires no AWS resources or paid calls.

## Choose the evaluation target

Amazon Bedrock evaluations assess models and RAG sources, including human and judge-model assessment paths. AgentCore Evaluations assesses instrumented agent interactions. A model response benchmark and an agent workflow benchmark answer different questions. Good prose alone cannot establish a completed action.

| Evaluation path | Appropriate use | Important boundary |
|---|---|---|
| Bedrock model evaluation | Compare responses on a defined prompt dataset | Does not establish that a backend workflow completed |
| Bedrock RAG evaluation | Assess retrieved evidence and generated answers | Retrieval and generation need separate interpretation |
| AgentCore on-demand | Investigate selected interactions or run a CI benchmark | Low-level Evaluate consumes supplied session spans |
| AgentCore online | Continuously assess sampled live traffic | Requires a persistent evaluation configuration and appropriate telemetry |
| AgentCore batch | Have the service discover and score many existing sessions | Can select CloudWatch sessions by time range without reinvoking the agent |

Current AWS documentation describes all three AgentCore modes. Do not infer current capabilities from an older announcement listing only two.

## Match the metric to its boundary

A session contains conversation activity. A trace represents an interaction, and spans represent operations within that interaction. Preserve these relationships when preparing evaluation input.

Tool selection, parameter faithfulness, and task completion are separate dimensions. An agent can choose a sensible lookup tool and fill its arguments correctly, yet stop before completing the purchase. Conversely, a tool can fail for infrastructure reasons even when the chosen action and arguments are appropriate. Examine both behavior and execution evidence.

Use built-in evaluators for their documented scope. For business-specific requirements, define assertions or a custom rubric. For consequential actions, validate the resulting application state in a controlled test environment. Exposed telemetry supports assessment of observed actions and messages; it does not promise access to a model's private internal chain of thought.

## Use the API contract accurately

For low-level on-demand evaluation, collect one session's telemetry and supply evaluationInput.sessionSpans. Select a trace-level target with evaluationTarget.traceIds or a tool target with evaluationTarget.spanIds. These target fields are alternatives. Passing identifiers alone does not make the low-level API retrieve logs; CLI and toolkit helpers can perform that collection.

Allow a bounded wait for telemetry ingestion. Missing required spans should create an evaluation-input failure, with a retry or investigation path, rather than an invented task-failure label. Inspect result errors and coverage as well as scores: an overall batch job can succeed while individual sessions or evaluators fail.

An online configuration controls continuing execution. Its documented enableOnCreate=false setting creates it disabled. Enabling it later is a lifecycle action, rather than another one-shot Evaluate request.

## Build a benchmark that can reject the wrong release

Write expected outcomes before tuning. Keep development cases apart from a final holdout. Record the prompt, model, tool definitions, dataset version, evaluator configuration, and relevant evidence snapshot. Use the same protocol for baseline and candidate; changing the judge halfway through a comparison makes the score change ambiguous.

Define business-critical slices such as cancellations, language groups, and exception cases. Include case counts. An aggregate can improve while a small but important group deteriorates. Calibrate automated judgments against qualified reviewers, including examples of the errors and language varieties that matter. Review disagreements before treating the judge as a release authority.

Connect user feedback to the affected response and configuration. A thumbs-down is a useful lead, not a ground truth error label or an instruction to retrain automatically. Review repeated complaints and turn confirmed failures into benchmark cases.

## Try it: a release decision

An appointment agent must create exactly one booking, request approval when policy requires it, and accurately report the outcome. Its text can vary. The release policy sets an overall success floor of 90%, a cancellation floor of 85%, and zero duplicate bookings in the controlled benchmark. These are example application thresholds, not AWS defaults.

| Version | Overall success | Cancellation success | Duplicate bookings | Model spend | Verified resolved tasks |
|---|---:|---:|---:|---:|---:|
| Baseline | 91% | 88% | 0 | $160 | 800 |
| Candidate | 94% | 72% | 2 | $132 | 880 |

The candidate fails the stated release policy despite its better aggregate. Investigate cancellation and duplicate-action cases before promotion. Check that both versions had equivalent datasets and complete telemetry before attributing the difference to behavior.

Model spend per verified resolution is $160/800 = $0.20 for the baseline and $132/880 = $0.15 for the candidate. This is a useful economic improvement, but it does not override the independent quality gates. A complete business report also accounts for human follow-up, infrastructure, and incident costs rather than presenting model spend as total cost.

For a repaired candidate, run synthetic workflows against safe tools and realistic dependencies. Combine semantic checks for accurate confirmation text with deterministic assertions on booking count and approval state. Use staged exposure, monitored quality thresholds, and a tested recovery path. Scale human review to the consequence of the change, especially new autonomy or policy-sensitive tools.

## Check your reasoning

1. Both tool-level metrics pass. Is the purchase complete? **Answer:** Not established. Verify the session goal and purchase outcome.
2. A batch job succeeds, but a required evaluator could not score 20% of cases. Can its average pass the gate? **Answer:** The stated coverage requirement remains unmet; recover the missing evaluations.
3. The candidate is cheaper per resolution but fails a critical-language slice. Promote it? **Answer:** Resolve the slice failure and verify the evaluator before promotion.
4. Does renaming patient-trace files remove identifiers inside them? **Answer:** No. Minimize unnecessary sensitive fields and protect the retained contents and results.
5. Should valid paraphrases fail exact-string tests? **Answer:** Use semantic assessment for meaning, while retaining deterministic checks for exact contractual fields and side effects.

## Failure checklist

- Did a fluent answer substitute for verified task completion?
- Were tool choice, parameter faithfulness, and session outcome confused?
- Were missing telemetry and scoring errors counted as behavioral failures or ignored?
- Did tuning leak into the holdout or change the scoring protocol?
- Did an aggregate conceal a critical subgroup regression?
- Were judge disagreements, feedback patterns, and required human reviews addressed?
- Were synthetic tool effects safe, and were promotion and recovery criteria explicit?
- Were unnecessary identifiers or secrets captured, or access and retention left unrestricted?

## Sources

- [Bedrock evaluations](https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation.html)
- [AgentCore evaluation types](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations-types.html)
- [Evaluate API contract](https://docs.aws.amazon.com/cli/latest/reference/bedrock-agentcore/evaluate.html)
- [Create online evaluation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/create-online-evaluations.html)
- [Built-in evaluator scope and prompts](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/prompt-templates-builtin.html)
- [Ground truth evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/ground-truth-evaluations.html)
- [Batch results and failures](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/batch-evaluations-results.html)
- [Quality and judge validation](https://docs.aws.amazon.com/prescriptive-guidance/latest/gen-ai-lifecycle-operational-excellence/dev-experimenting-quality.html)
- [Periodic evaluation and stratified samples](https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/genops01-bp01.html)
- [User feedback](https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/genops01-bp02.html)
- [Multi-layer testing](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06-bp01.html)
- [Risk-tiered validation](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops06-bp03.html)
- [Business and operational KPIs](https://docs.aws.amazon.com/wellarchitected/latest/agentic-ai-lens/agentops05-bp04.html)
- [AgentCore data protection](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/data-protection.html)
