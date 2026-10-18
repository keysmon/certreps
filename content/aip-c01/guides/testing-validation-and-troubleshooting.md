# Testing, Validation, and Troubleshooting

AIP-C01 Domain 5 · 11% of scored content · Sources reviewed 2026-10-18

## What you will learn

Design an evaluation that measures real task performance, distinguish retrieval failures from generation failures, test agent actions, and diagnose regressions with controlled evidence. This lesson covers evaluation systems and troubleshooting. Prerequisites: a RAG request path, basic metrics, and an API error response. You can complete the exercise with a spreadsheet or paper; no paid model calls are required.

## 1. Define success before comparing models

A fluent answer can be wrong, unsupported, unsafe, or irrelevant. Evaluate separate dimensions so one strength does not hide another weakness. For a policy assistant, distinguish correctness, evidence support, completeness, appropriate refusal, safety, latency, and cost. For an agent, also measure whether the requested business task completed and whether unauthorized actions were prevented.

Build a representative evaluation dataset with normal requests, difficult examples, ambiguous questions, unsupported requests, adversarial inputs, and important user or language groups. Record expected evidence and acceptable behavior. Do not require one exact wording when several paraphrases are valid.

Keep development examples separate from a held-out test set. If you repeatedly edit the prompt to improve the same examples, you may be optimizing for those examples rather than the real workload. Freeze dataset versions, source snapshots, prompt versions, model identifiers, inference parameters, and evaluation rubrics so comparisons have a clear meaning.

## 2. Choose evaluation methods by the question

| Method | Useful for | Main limitation |
|---|---|---|
| Deterministic checks | Required fields, numeric calculations, tool contracts, forbidden actions | Limited coverage of nuanced language quality |
| Reference-based metrics | Comparing output with labeled answers or expected entities | Surface overlap can miss meaning or reward the wrong detail |
| LLM-as-a-judge | Rubric-based assessment of open-ended answers at scale | Judge mistakes, bias, and rubric sensitivity |
| Human review | Domain judgment, subjective quality, high-impact cases | Time, cost, and reviewer disagreement |

Use multiple methods where they address different risks. A valid JSON object may contain the wrong total. A semantically similar answer may reverse an exception. A high judge score is evidence from an evaluator, not proof of truth.

Bedrock offers programmatic, human, and judge-model evaluations. RAG evaluation can inspect retrieval alone or retrieval plus generation. Supported models, required dataset fields, metrics, and Regions vary with the job type. Check the specific evaluation path rather than assuming every metric needs the same inputs.

Calibrate a judge against expert-reviewed examples. Define concrete score anchors and examples of partial failure; require the evaluator to identify supporting evidence. Review disagreements and score stability. Keep the evaluator and rubric stable when comparing candidates, and protect sensitive evaluation data as you would production content.

## 3. Evaluate retrieval and generation separately

Retrieval asks whether relevant, authorized evidence reaches the context. Generation asks whether the answer uses that evidence correctly.

Suppose a query has four labeled relevant passages. A retriever returns five passages, three of which are labeled relevant. Recall at five is 3/4, or 75%; precision at five is 3/5, or 60%. These numbers describe this labeled case, not answer correctness. Ranking-sensitive measures can additionally reveal whether useful passages appear near the top.

Test exact identifiers, paraphrases, document boundaries, updated versions, multilingual queries, tables, and access filters. Inspect retrieved text rather than document titles alone. An extraction failure can produce a relevant-looking file with unusable content.

Then test generation with known-good context. Does the response use the correct exception, cite supporting evidence, abstain when the context is insufficient, and avoid unsupported additions? A response can be faithful to a stale source yet wrong about the current policy. Track freshness and source validity alongside groundedness.

## 4. Evaluate actions, not just agent prose

An agent saying “your request is complete” is not evidence that the tool succeeded. Capture tool requests, validated arguments, authorization outcomes, execution results, and final state. Test missing parameters, tool errors, duplicate delivery, timeouts, approval requirements, and loop limits.

Measure task completion, correct tool selection, valid arguments, unauthorized-action prevention, tool latency, and total calls. Use simulated or read-only tools for early evaluation. For a consequential operation, verify backend state and idempotency behavior. Natural-language explanations can look convincing even when the agent executed the wrong operation.

## 5. Diagnose the earliest failing stage

| Symptom | First evidence to inspect | Candidate causes to test |
|---|---|---|
| Important policy never appears in answers | Ingestion status and retrieved passages | Stale sync, parsing, filters, chunking, embedding mismatch |
| Correct passage retrieved, wrong conclusion | Final assembled prompt and answer | Lost context, conflicting instructions, unsupported inference |
| Output stops halfway through | Stop reason and token budget | Output cap, stop sequence, stream interruption |
| API validation error | Actual serialized request and model support | Unsupported parameter, schema feature, modality, missing field |
| Throttling under bursts | Applicable quotas, token use, concurrency, retries | Token spikes, retry amplification, insufficient headroom |
| Tool request succeeds but outcome is duplicated | Execution records and idempotency keys | Retried non-idempotent writes, ambiguous timeout handling |

Change one major factor at a time and keep a reproducible failing case. If indexing failed, repeatedly rewriting the answer prompt hides the cause. If the response was truncated, lowering temperature does not restore missing tokens. If a model upgrade rejects a parameter, retries of the same invalid body will continue to fail.

Context overflow requires accounting for instructions, history, retrieved passages, tool descriptions, and allowed output. Summarization or pruning can help, but preserve decisions and facts needed for the task. Test the revised context assembly against the original failing case and a broader regression set.

## 6. Make evaluation part of deployment

Define quality gates before release: task accuracy, critical safety cases, retrieval behavior, and acceptable cost and latency. Thresholds belong to the application and risk level; fictional practice targets are not AWS requirements.

An offline comparison tests controlled examples. A canary exposes a limited amount of real traffic with rollback criteria. An A/B test compares outcomes across controlled traffic groups. Shadow evaluation can observe a candidate without letting it take live actions, provided duplicated calls and data handling are acceptable. Each answers a different question.

Log configuration identifiers and stage timings with correlation IDs. Review production feedback, but recognize sampling bias: silent users and thumbs-up ratings do not establish full correctness. Feed reviewed failures into future regression sets while retaining a held-out assessment.

## Worked scenario: regression after a prompt update

Assume answer correctness falls from 90% to 82% on the same fictional test set. Retrieval recall is unchanged. Inspect the assembled prompt and find that a new output template pushes the exception passage outside the retained context. Restore necessary evidence, reduce redundant instructions, and rerun the failing examples plus the full regression set. This is a context-assembly hypothesis supported by evidence; retraining the model would be an unjustified first step.

## Guided exercise

Write six test cases for a returns assistant: ordinary return, damaged item, expired policy, unauthorized order, missing evidence, and a poisoned document. Define the expected source, acceptable answer, prohibited action, and one measurable check for each. Label which checks are deterministic and which need judgment. Now imagine retrieval is correct but one answer invents a deadline. State the next observation you need before changing anything.

## Checkpoint

1. Can a grounded answer still be incorrect?
2. Why keep a held-out dataset after prompt tuning?
3. What confirms that a cancellation agent actually completed the task?

### Answers and reasoning

1. Yes. Its source may be stale or false, or it may omit a relevant exception.
2. It tests generalization beyond the examples used to choose the prompt.
3. Authorized backend state and tool execution evidence, including correct duplicate handling, rather than the final sentence alone. For the exercise, inspect the assembled context and generation output to locate the unsupported deadline.

## Common traps

Do not compare candidates on different datasets, trust aggregate averages alone, equate schema validity with correctness, or deploy on one successful demo. Trace evidence before choosing a fix.

## Official references

- [Domain 5 tasks and skills](https://docs.aws.amazon.com/aws-certification/latest/ai-professional-01/ai-professional-01-domain5.html)
- [Bedrock evaluation methods](https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation.html)
- [Retrieval-only and retrieve-and-generate evaluation](https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation-kb.html)
- [Evaluation dataset and rubric guidance](https://docs.aws.amazon.com/bedrock/latest/userguide/advanced-prompt-optimization-evaluation.html)
- [Client-side tool-use lifecycle](https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use-client-side.html)
- [Runtime monitoring and diagnostic options](https://docs.aws.amazon.com/bedrock/latest/userguide/monitoring.html)

Continue when useful with a [Domain 5 drill](/aws/aip-c01/practice?mode=drill&domain=Testing%2C%20Validation%20%26%20Troubleshooting) or the [mock exam](/aws/aip-c01/practice?mode=mock). Reading is optional; practice remains available directly.
