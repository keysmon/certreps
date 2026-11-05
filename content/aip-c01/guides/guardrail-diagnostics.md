# Diagnose Guardrail Decisions

Reviewed 2026-11-05. Optional lesson: explain an intervention before changing a safety policy.

## Start with the actual evaluation

Record the guardrail identifier and version, API path, input/output source, request identifier and policy evidence. A counter showing that an intervention happened cannot by itself explain which text triggered which rule. Use the applicable trace or assessment response to inspect the policy-level outcome. Protect diagnostic data because it may contain the sensitive content that prompted the intervention.

Converse and InvokeModel do not put every control in the same place. Converse uses its guardrailConfig structure; native invocation has its documented request/header parameters. ApplyGuardrail evaluates supplied content independently of model generation and returns assessments. Check the exact API reference before moving a trace option from one operation into another.

## Separate a source dimension from a policy dimension

Knowing an intervention concerned the input rather than the output answers where it occurred. Knowing a topic policy rather than sensitive-information policy intervened answers which control acted. Neither an aggregate model-invocation count nor successful HTTP delivery establishes that a particular policy rule behaved correctly.

When investigating a suspected false positive, preserve a redacted reproduction and compare the current published version with a candidate working draft on a labelled set of allowed and disallowed requests. Evaluate both false positives and false negatives. A harmless request that contains an ambiguous phrase should not lead directly to disabling every guardrail for all users.

## Try it

Build an offline diagnostic table with columns for request ID, guardrail version, content source, observed policy, intended outcome and proposed next check. Include a legitimate request blocked unexpectedly and a prohibited request that passed. Design a small regression set for a proposed topic-policy edit and state what must remain blocked before release. Specify the approved version used in production after review.

## Check your reasoning

- Does an input/output breakdown identify the exact policy responsible? No; it identifies content source, not every rule.
- Does editing DRAFT automatically change an application pinned to a published version? No; production must explicitly use the intended version.
- Should detailed traces be logged without access controls? No; restrict access and retention for sensitive diagnostic material.

Sources: [Guardrail testing and traces](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-test.html), [Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html), [ApplyGuardrail API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_ApplyGuardrail.html).
