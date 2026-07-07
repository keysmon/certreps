# AI Safety, Security & Governance for GenAI on AWS (AIP-C01 Domain 3)

*Verified Q3 2026 - covers ~20% of the AIP-C01 exam.*

## What this domain tests

Applying safety, security, and governance controls to generative-AI workloads on Amazon Bedrock: shaping model
behavior with Guardrails, locking down access with IAM, capturing an audit trail, and mapping OWASP LLM risks to
concrete AWS mitigations. Most questions hand you a scenario and ask for the single control whose shape fits.

## Bedrock Guardrails: the policy toolbox

A guardrail bundles several independent policies; the exam tests whether you pick the one that matches the requirement.

- **Content filters** block harmful categories (violence, hate, and more) on both prompts and responses. They also
  support **image content filtering**, so the same managed service moderates uploaded and generated images, not just text.
- **Denied topics** describe a subject in natural language plus a few sample phrases, so the guardrail generalizes across
  wordings. This is the answer when a class of requests (personalized investment or tax advice) must be refused no matter
  how it is phrased.
- **Word filters** block an exact, known list of strings (profanity, unreleased code names) deterministically, and a
  managed profanity list is included. Use these when terms are precise and enumerable, not for a broad concept.
- **Contextual grounding checks** score each response 0 to 1 for how well the retrieved source supports it and block
  answers below a threshold. Raising the **grounding threshold** makes the check stricter - the fix for a RAG assistant
  that emits ungrounded (hallucinated) answers.
- **Sensitive-information policy** masks or blocks PII. Built-in entity types miss bespoke formats, so add a **custom
  regular-expression pattern** with a mask action to catch a proprietary account-number layout at the lowest overhead.
- **Prompt-attack filter** detects jailbreak and prompt-injection patterns in the input.

## Guardrails at scale: reuse, tiers, versions, streaming

**The `ApplyGuardrail` API evaluates arbitrary text against an existing guardrail without invoking a Bedrock model**, so
one policy can wrap a self-hosted SageMaker model or a third-party API. By contrast `InvokeModel` runs only Bedrock-hosted
models. Choose the **Standard tier** over Classic for higher detection accuracy and broad multilingual coverage on a
many-language workload. Manage change through the **working draft plus immutable numbered versions**: iterate on the
draft, publish and test a version, point production at a specific version number, and roll back instantly by repointing.
For streamed responses, the **default synchronous mode buffers and scans chunks before the user sees them**, so no unsafe
token is ever displayed (at the cost of some latency); asynchronous mode can leak content until the scan catches up.

## IAM and account-level governance

- **`bedrock:GuardrailIdentifier` condition key**: deny `InvokeModel` and `InvokeModelWithResponseStream` unless the
  request carries the approved guardrail, so a developer cannot silently omit it. This is a preventive, request-time
  control that CloudTrail (detective) and WAF (HTTP-layer) cannot provide.
- **Cross-account access**: create an IAM role in the model-owning account that trusts the caller, grant it
  `bedrock:InvokeModel` and `bedrock:ApplyGuardrail`, and assume it with AWS STS for short-lived credentials. Bedrock base
  foundation models do not support resource-based policies, so role assumption is the answer, not a resource policy.
- **Fleet-wide restriction**: an AWS Organizations **service control policy (SCP)** that denies `InvokeModel` for every
  model ARN except approved ones enforces an allowed-model list across hundreds of accounts from one place.
- **Least-privilege action groups**: scope an agent's tools and IAM permissions so a successful injection cannot trigger
  high-impact actions.

## Logging, auditing, and data protection

Two requirements pull in opposite directions here, so read the scenario before choosing.

When the goal is an **audit trail**: enable **Bedrock model invocation logging** to capture full prompt and response
content, and rely on **AWS CloudTrail** for the API-level who/what/when of each `InvokeModel` call - together they cover
content plus identity. Logging can deliver to **both Amazon S3** (durable, low-cost archival) **and Amazon CloudWatch
Logs** (metric filters and alarms for near-real-time monitoring) at the same time. Encrypt the destination bucket with
**SSE-KMS using a customer-managed key** when the mandate calls for customer-controlled, auditable, rotatable, revocable keys.

When the goal is **zero data retention**: keep model invocation logging **disabled**, and lean on Bedrock's default
posture - your prompts and completions are not used to train base models, not shared with providers, and not retained.
For customer-controlled encryption plus private networking, pair a **KMS customer-managed key** (data at rest) with an
**interface VPC endpoint (PrivateLink)** so traffic never crosses the public internet. To discover PII/PHI across a
multi-terabyte S3 corpus before fine-tuning, use **Amazon Macie**, not the inference-time Guardrails policy.

## OWASP LLM risks and agent safety

Several answers look similar; the exam rewards keeping the distinct threats and their distinct fixes straight.

- **Direct prompt injection**: block it with the Guardrails prompt-attack filter on the input.
- **Indirect prompt injection**: treat retrieved documents (especially user-contributed ones) as untrusted and screen
  both the retrieved content and the response with Guardrails.
- **Insecure output handling**: encode and sanitize model output before rendering it as HTML so returned markup or script
  cannot execute in the browser.
- **Excessive functionality**: remove unneeded operations - redefine an action group to expose only the required
  read-only calls instead of delete and refund functions.
- **Excessive agency**: require user confirmation (return of control) before the agent runs high-impact actions.
- **Confused deputy**: add `aws:SourceArn` and `aws:SourceAccount` conditions to a Lambda's resource-based policy so only
  the intended agent in the intended account can invoke it.
- **Session isolation**: pass a unique `sessionId` per user or conversation so multi-tenant agent state does not bleed
  across users.

## Provenance, bias, and compliance evidence

To confirm an image came from **Amazon Titan Image Generator**, use **Bedrock watermark detection** (console or API) for
the invisible watermark it embeds, backed by **C2PA Content Credentials** - robust where hashing (breaks on re-encode)
and visible logos (croppable) fail. To quantify and document bias, toxicity, and stereotyping for governance, use
**Amazon SageMaker Clarify**, which produces explainability and bias reports; Guardrails blocks unsafe content at runtime
but does not measure it. To hand auditors AWS's own **SOC, ISO 27001, and PCI DSS** attestation reports, pull them on
demand from **AWS Artifact**.

## Practice this domain

Take a [Domain 3 drill](/aws/aip-c01/practice?mode=drill&domain=AI%20Safety%2C%20Security%20%26%20Governance)
or the [full AIP-C01 mock exam](/aws/aip-c01/practice?mode=mock).
