# Implementation and Integration

AIP-C01 Domain 2 · 26% of scored content · Sources reviewed 2026-10-18

## What you will learn

Integrate model APIs, implement a controlled tool loop, distinguish agent infrastructure from orchestration, and design streaming and asynchronous workflows. This lesson spans agent tools, deployment, enterprise integration, APIs, and development patterns. Prerequisites: HTTP requests, JSON, authentication, and the difference between a synchronous response and a queued job. The exercise is a paper design with no paid resources.

## 1. Put a stable interface around inference

Bedrock Converse provides a common message interface for supported models. It reduces provider-specific request handling, but a model switch still requires checking modalities, supported parameters, tool behavior, quotas, and quality. InvokeModel uses a model-specific body and remains useful where a model feature requires that interface. Converse and ConverseStream use the bedrock-runtime endpoint.

Your application should own request validation, authorization, model selection, timeout budgets, and error handling. Keep model IDs and prompt versions in controlled configuration. Pass only necessary conversation history; a conversational API does not remove the application's responsibility for state, privacy, or context limits.

For self-hosted models on SageMaker AI, deployment also involves instance capacity, model loading, memory, scaling, and endpoint operation. Managed inference reduces those infrastructure decisions. Choose based on customization, operational capacity, latency, and supported deployment modes rather than assuming every custom model requires the same serving option.

## 2. Complete the tool loop safely

A tool definition describes an operation and its inputs. In client-side Converse tool use, the model requests a tool; application code executes it. The loop is:

1. Send messages and allowed tool definitions.
2. Inspect the assistant response for tool-use content and the stop reason.
3. Validate the tool name and arguments; authenticate and authorize the operation.
4. Execute the tool, or return a controlled error.
5. Append the assistant tool-use message and a tool result associated with the same tool-use ID.
6. Ask the model to continue, enforcing turn, time, and cost limits.

A request to refund an order is not permission to refund any order. The backend must check ownership, amount, approval, and duplicate execution. Use an idempotency key for consequential writes so retries do not repeat the business action. Represent timeouts accurately: “unknown whether completed” is different from “failed before execution.” Reconcile ambiguous outcomes before retrying.

MCP standardizes how an agent discovers and calls tools; it does not establish that every discovered tool is safe for every caller. Tool results, including text returned from a database or website, remain untrusted input to the model.

## 3. Separate output shape from business correctness

Prompting “return JSON” and supplying an ordinary tool schema do not by themselves provide the strict structured-output guarantee. On supported Bedrock models, use Converse `outputConfig.textFormat` for JSON-schema output, or `strict: true` in tool definitions for strict tool inputs. Other APIs have different fields. Check model, API, Region, inference-profile, and schema-subset support. Unsupported schema features can be rejected, and first-use schema compilation can add latency.

Schema conformance does not prove an invoice amount is correct or that a tool action is authorized. Continue enforcing business rules, ownership, limits, refusal handling, and complete-response handling. Assistant prefilling is model-specific and is not a universal JSON enforcement technique. A supported structured-output feature is preferable when the requirement is machine-readable shape.

## 4. Choose agent components by responsibility

| Need | Component or pattern |
|---|---|
| Run an agent or tool with session isolation | AgentCore Runtime |
| Expose APIs and services as MCP tools | AgentCore Gateway |
| Retain conversation events and selected cross-session facts | AgentCore Memory |
| Manage agent and external-service authentication | AgentCore Identity |
| Inspect agent execution and bottlenecks | AgentCore Observability |
| Explicit business branches, retries, waiting, and approvals | Step Functions workflow |

AgentCore services are modular. A framework such as Strands supplies agent behavior; hosting, tool exposure, and memory are separate design choices. A multi-agent design adds coordination overhead and should have a reason, such as distinct capabilities or trust boundaries.

Current documentation calls the earlier service Bedrock Agents Classic and says it is closed to new customers while existing customers can continue. Classic scenarios still require understanding action groups, knowledge bases, versions, aliases, and traces. A newer product does not automatically change the answer to a scenario using an existing architecture. The blueprint, rather than a product launch date, defines the study scope.

## 5. Make streaming work across the whole path

ConverseStream emits incremental model events. Your server, proxy, and browser must also forward and consume them incrementally. Measure time to first visible output as well as time to completion.

API Gateway REST APIs default to buffering, but supported proxy integrations can use response transfer mode `STREAM`. Therefore, “API Gateway REST always buffers” is outdated. Verify integration type and settings. A Lambda function URL with response streaming is another option; WebSocket APIs or AppSync subscriptions fit persistent push delivery. The best choice depends on existing infrastructure, authentication, connection behavior, and client requirements.

Handle disconnects, partial responses, errors after streaming begins, and safety checks. Showing early text improves perceived responsiveness without necessarily shortening total generation time.

## 6. Handle asynchronous work and failures

For a document-processing workflow, EventBridge can trigger work when a business event occurs, SQS can absorb bursts, and Step Functions can coordinate processing states. A queue changes the user contract from immediate completion to accepted work; expose job status and a failure path.

Retry transient errors with capped exponential backoff and jitter. Reject invalid requests rather than retrying them unchanged. Limit concurrency, inspect token and request quotas, and use tested fallback behavior. A circuit breaker stops repeatedly calling an unhealthy dependency while allowing controlled recovery. Cross-Region inference must satisfy residency and permissions; it is not an unrestricted escape from capacity planning.

## Worked scenario: a service-desk agent

Assume an agent can read a ticket and propose a replacement device, but shipping requires employee approval. Expose a read-only ticket tool and a proposal tool. Store the proposal with an idempotency key, request approval through a durable workflow, then let an authorized backend execute shipment. Return the actual shipment result to the model. A natural-language instruction saying “never ship without approval” supplements the design; the backend approval check enforces it.

## Guided exercise

Draw the six-step tool loop for `lookup_order(order_id)`. Mark where the caller's identity is checked. Now add `cancel_order` and simulate a timeout after cancellation succeeded. Write the record needed to prevent a duplicate cancellation, the response shown while outcome is uncertain, and the maximum loop count. Finally mark every hop that must stream for the user to see an early token.

## Checkpoint

1. A schema-valid refund request names another customer's order. Should it execute?
2. Does replacing Converse with InvokeModel automatically resolve throttling?
3. Where does a tool result's matching ID matter?

### Answers and reasoning

1. No. Structural validity does not replace ownership and action authorization.
2. No. Identify the applicable model, endpoint, and quota; changing the request format alone does not establish new capacity.
3. It associates the result with the requested operation so the conversation can continue coherently.

## Common traps

Do not confuse a tool request with execution, agent memory with document retrieval, streaming with shorter total generation, or a queue with synchronous availability. Avoid unbounded tool loops and retries of non-idempotent actions.

## Official references

- [Domain 2 tasks and skills](https://docs.aws.amazon.com/aws-certification/latest/ai-professional-01/ai-professional-01-domain2.html)
- [Converse API](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)
- [Tool-use modes](https://docs.aws.amazon.com/bedrock/latest/userguide/tool-use.html)
- [Structured outputs and strict tool use](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html)
- [AgentCore overview](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html)
- [Bedrock Agents Classic](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html)
- [API Gateway response streaming](https://docs.aws.amazon.com/apigateway/latest/developerguide/response-transfer-mode.html)

Continue when useful with a [Domain 2 drill](/aws/aip-c01/practice?mode=drill&domain=Implementation%20%26%20Integration) or the [mock exam](/aws/aip-c01/practice?mode=mock). Reading is optional; practice remains available directly.
