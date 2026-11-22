# Developer Tooling, MCP and Safe GenAI Delivery

Reviewed 2026-11-22. This optional lesson supports Tasks 1.1, 2.1, 2.3, 2.4 and 2.5. Read any section or go straight to practice. The examples are fictional engineering exercises, not AWS exam questions.

## 1. Use coding assistance as a source of candidates

Amazon Q Developer can assist with code, explanation, refactoring and review. Its output is a proposed change that still needs to satisfy the application's contracts. A successful generated unit test is weak evidence if it mocks the very implementation being changed or asserts only that a function returned something.

For a Bedrock streaming parser, useful checks include partial content blocks, a tool-input JSON value split across deltas, a response that ends unexpectedly, an API error and an ordinary complete response. Test the actual parser using sanitized fixtures. Preserve canonical tool identifiers and only execute a complete validated tool request once. A mock that always returns the expected completed object does not exercise stream assembly.

Review scope matters. The current Q Developer IDE review documentation describes active-file changes as the default input, with filtering that excludes unsupported languages and test code. An empty findings list is neither a full-repository audit nor proof of model answer quality. Verify what was included, review the actual diff and run the required behavior and integration checks.

**Availability note:** AWS currently announces the end of support for Amazon Q Developer IDE plugins on April 30, 2027, and points users toward Kiro for similar capabilities. The AIP-C01 guide still names Q Developer. Learn the development workflow and verify current tooling documentation rather than memorizing a transient IDE menu or assuming the CLI and IDE are the same product.

## 2. Separate tool discovery, validation and permission

MCP is an interaction protocol, not an authorization policy. A discoverable tool can still be unauthorized for a user. A schema-valid request can still target the wrong customer's record. Returned text from a tool can contain untrusted instructions even when the network connection is authenticated.

AgentCore Gateway can expose supported Lambda and API backends through managed tool interfaces. Define input contracts and descriptions, configure authentication and backend access, and enforce business authorization at the execution boundary. Do not let retrieved documents or tool output expand the caller's authority.

| Requirement | Design to evaluate | Evidence to collect |
|---|---|---|
| Short stateless lookup within Lambda limits | Lambda-backed tool or compatible stateless MCP service | Validated input, actual principal and correlated backend result |
| Persistent compute or connection state beyond Lambda limits | A service such as ECS with explicit state and scaling design | Connection lifecycle, access enforcement and recovery tests |
| Central delegation and result aggregation | A coordinator with specialist interfaces | Handoff decisions, specialist outputs and final task outcome |
| Repeated agent-to-agent reconsideration | Request-wide budgets, completion criteria and loop detection | Steps, elapsed time, token use and repeated state transitions |

The exam guide names Strands Agents, AWS Agent Squad, MCP and AWS-native orchestration patterns. Choose by control flow, state, execution and recovery requirements. A shared conversation buffer alone is not a supervisor; successful tool calls alone are not successful task completion.

## 3. Treat configuration changes as releases

A model provider name can be dynamic configuration, but each supported provider still needs a tested adapter and compatible request, response and safety behavior. Changing a provider string does not make provider-native JSON schemas interchangeable.

AWS AppConfig can deploy versioned configuration gradually. For free-form configuration, JSON Schema can check structure and a Lambda validator can check application-specific constraints, such as approved provider/model combinations. A valid document still needs runtime quality and permission checks.

Configure the environment's alarm monitoring and role permissions deliberately. Current documentation notes that disabled actions on an associated CloudWatch alarm prevent automatic rollback. A schema check cannot restore those actions. Evaluate the deployment window and bake period, monitor the intended quality and operational signals, and verify recovery rather than assuming every alarm always changes the application state.

## 4. Bind tests and approval to immutable artifacts

A useful release manifest identifies the code revision, container digest, prompt version, model or inference target, tool-schema versions, safety configuration, query encoder and compatible index snapshot. Record relevant datasets and evaluation results as evidence for that manifest. Credentials belong in the appropriate secret mechanism, not in the manifest.

Use CodeBuild or equivalent automated steps for builds, contract checks, security checks and quality gates. CodePipeline coordinates stage progression. A manual approval action can stop before production until a permitted reviewer makes the release decision. That decision must refer to the tested artifact, not mutable labels resolved after approval.

For infrastructure changes, inspect the synthesized CDK/CloudFormation result. A generated IAM policy has real effects. Separate build and production-release roles, restrict actions and resources, and validate the intended service path with non-destructive integration checks. A passing test that mocks the AWS client does not prove the deployed role can invoke the backend.

## Try it

A returns assistant has approved manifest A. Candidate B changes the tool adapter, prompt and provider route. An offline quality report passed, but its test fixtures mock the adapter. Deployment resolves `latest` after approval. The provider has a different error envelope.

Write a repair plan covering:

1. The immutable identifiers the approver must review.
2. Real adapter fixtures, including provider errors and partial streams.
3. The role/action/resource boundaries to verify.
4. The canary checks and previous compatible rollback target.
5. What a successful user workflow must prove beyond an HTTP 200.

No AWS account or paid resources are required for this written exercise.

## Check your reasoning

**Why is a clean automated review insufficient?** Its scope and exclusions are limited, and source checks do not establish live permissions or factual output quality.

**Why keep provider adapters if routing is configurable?** Routing chooses an implementation. It does not normalize all provider contracts or capabilities automatically.

**What makes an approval reproducible?** It names the exact tested manifest that deployment consumes. Re-resolving mutable labels breaks that relationship.

**What should stop an agent loop?** Request-wide resource limits and explicit progress/completion rules, with a defined fallback or escalation. Per-tool success is not enough.

## Sources and scope

- [AWS Domain 1: architecture and provider selection](https://docs.aws.amazon.com/aws-certification/latest/ai-professional-01/ai-professional-01-domain1.html)
- [AWS Domain 2: developer tools, orchestration and delivery](https://docs.aws.amazon.com/aws-certification/latest/ai-professional-01/ai-professional-01-domain2.html)
- [Q Developer code-review scope and current support notice](https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/code-reviews.html)
- [AgentCore Gateway capabilities](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/gateway.html)
- [AppConfig validators](https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile-validators.html)
- [AppConfig deployment rollback](https://docs.aws.amazon.com/appconfig/latest/userguide/monitoring-deployments.html)
- [CodePipeline manual approvals](https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals.html)

The architecture exercises apply those mechanisms to stated constraints. They do not claim that a coding assistant, test result or practice score guarantees production safety or an AWS exam pass.
