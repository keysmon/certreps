# Implementation & Integration for GenAI on AWS (AIP-C01 Domain 2)

*Verified Q3 2026 - covers ~26% of the AIP-C01 exam.*

## What this domain tests

Wiring generative-AI models into working applications on Amazon Bedrock: calling models through a
portable API, building agents that take actions and cite sources, streaming tokens to clients,
orchestrating multi-step pipelines, keeping workloads resilient under throttling, and standing up
embeddings-based semantic search.

## The Converse API, tool use, and structured output

The **Converse API** exposes one consistent request and response shape (messages, system prompt,
inference parameters) across Bedrock model families, so you can A/B test Claude against Amazon Nova
and Meta Llama by swapping the model ID with no per-model request-building or response-parsing code.
Prefer it over model-specific **InvokeModel** JSON bodies whenever the scenario wants to switch or
compare models cheaply.

For output that conforms to a strict schema, declare the target structure as a **tool** in the
Converse tool configuration and use tool use: the model returns arguments matching your defined field
names and types, which a downstream parser consumes directly. This beats asking for JSON in plain
English (no structural guarantee) and beats raising temperature (which makes output less consistent).
Harden it further by **prefilling the assistant turn** with the opening brace so the model continues
valid JSON.

The tool-use loop has a required shape. When Converse returns a stopReason of **tool_use** with a
toolUse block, the application executes the requested function, then sends a follow-up Converse
request that appends the assistant toolUse message plus a user message carrying a matching
**toolResult** block with the same **toolUseId**. Only then can the model produce its final answer.
Ignoring the block, returning it raw, or switching APIs does not complete the loop.

When several business units share one model and spend must be attributed per unit, invoke through a
tagged **application inference profile** so Bedrock usage is tracked by tag in Cost Explorer with no
custom accounting.

## Prompt caching, prompt structure, and guardrails

When a request sends a large static prefix (system prompt, style guide, policy text) followed by a
short, always-different question, enable **prompt caching** and place the cache checkpoint **after**
the static prefix and **before** the variable question. Content before the checkpoint is cached, so
that placement makes the large prefix reusable and cuts both input-token cost and time-to-first-token
while leaving the prompt text intact; a checkpoint inside or after the changing question yields almost
no reuse.

When a prompt mixes reviewer instructions with a source document and the model follows sentences
buried in the document, wrap the source in **XML tags** such as `<document>...</document>` and keep
the instructions outside the tags so the model treats the document as data, not commands.

To block denied topics and filter harmful content with the least code, create a Bedrock **guardrail**
and reference it in the **guardrailConfig** of each Converse request. For a custom RAG app that calls
Converse directly and does not use Agents, screen both directions with one guardrail: call the
**ApplyGuardrail** API on the raw user input before retrieval, and pass the same guardrail in
guardrailConfig so the model output is evaluated too.

## Amazon Bedrock AgentCore

The original Amazon Bedrock Agents is now **Bedrock Agents Classic** and is closed to new customers as
of July 30, 2026; **Amazon Bedrock AgentCore** is the current path for building and running agents. It
is a set of modular services that work with any framework (Strands, LangGraph, CrewAI) and any model,
so the exam frames agent scenarios in AgentCore terms.

**AgentCore Runtime** is a secure, serverless host for agents and tools. Each user conversation runs as
a separate **runtime session in its own isolated microVM** (isolated CPU, memory, and filesystem), which
is the fix for a multi-tenant assistant whose context bleeds across users - give every user or
conversation a distinct session rather than sharing one. Runtime is framework- and model-agnostic,
supports runs up to 8 hours, and lets agents talk to other agents and tools over **Model Context
Protocol (MCP)** or **agent-to-agent (A2A)**; a multi-agent design (an orchestrator routing to billing,
returns, and shipping specialists) is built on Runtime plus A2A, not a single named feature.

**AgentCore Gateway** turns your existing REST APIs, Lambda functions, and services into **MCP tools**
for agents with little code, and can front other agents and MCP servers behind one secure, authenticated
endpoint. Expose only the tools an agent actually needs: least functionality means not wrapping
high-impact operations (delete, refund) as tools at all. **Policy in AgentCore** enforces this
deterministically - it intercepts every tool call at the Gateway boundary and evaluates it against rules
written in **Cedar** (or natural language), so only the required read-only tools are allowed regardless
of how the agent is prompted.

**AgentCore Memory** removes the need to hand-manage conversation state. **Short-term memory** keeps
turn-by-turn context within a session, so a user need not repeat the device model or symptoms already
given; **long-term memory** extracts and persists key facts and preferences across separate sessions for
personalization days later. A larger context window does not carry data between sessions.

**AgentCore Identity** gives each agent its own identity and integrates with your existing IdP (Amazon
Cognito, Okta, Microsoft Entra ID), so end users reach only the agents they are authorized for and
agents authenticate outbound to third-party services (Slack, GitHub) on a user's behalf or autonomously.
The built-in **Code Interpreter** and **Browser** tools give agents a sandbox to run code or drive a
real browser.

**AgentCore Observability** is how you debug a misbehaving agent: it emits **OpenTelemetry** traces to
Amazon CloudWatch and visualizes each step of the execution path - the model's reasoning, the tools it
invoked, and each step's inputs and outputs - so you can pinpoint where orchestration went wrong.
CloudTrail records API management activity, not this intermediate detail.

## Streaming responses to clients

**ConverseStream** produces tokens incrementally, but the delivery path decides whether the browser
sees them early. A REST API through API Gateway buffers the full response, so users wait for the whole
answer and raising the timeout does not help. To stream from a Lambda backend with the least added
infrastructure, invoke it through a **Lambda function URL configured with response streaming** and
forward the ConverseStream chunks.

When web and mobile clients need a persistent managed connection for push delivery, two managed
options fit: publish each chunk through an **AWS AppSync** GraphQL subscription so subscribed clients
receive tokens over the managed WebSocket, or send each chunk through an **Amazon API Gateway
WebSocket API** using the connection callback URL. S3 polling and email are not push-based and are
never the streaming answer.

## Orchestration and event-driven pipelines

For a pipeline with sequential and conditional steps (classify, branch to one of several summarization
prompts, call an external API, write to S3) plus built-in retries and failure visibility, use **AWS
Step Functions**: it models branching, retries, and error handling declaratively and gives a visual
execution history for pinpointing failures, minimizing custom orchestration code. One giant Lambda
hand-codes all control flow and risks timeouts.

To call Bedrock from a state machine without a wrapper Lambda, use the Step Functions **optimized
integration** for Amazon Bedrock, which invokes InvokeModel directly from a task state. To start a
pipeline the moment an object lands in S3 with no server polling, create an **Amazon EventBridge**
rule on the S3 object-created event that targets the state machine.

## Resilience under throttling and failure

For intermittent **ThrottlingException** from Bedrock, the client-side baseline is retry with
**exponential backoff and jitter**, capping attempts: backoff spreads retries over time and jitter
de-synchronizes concurrent callers so they do not retry in lockstep and recreate the storm. A tight
loop or a fixed one-second interval makes it worse.

For durable headroom beyond catching the error, request a **Service Quotas** increase for the model's
requests-per-minute and tokens-per-minute limits, and route overflow through a **cross-Region
inference profile** to distribute load; InvokeModel and Converse share the same account limits, so
switching APIs bypasses nothing. When requests must still complete during spikes even at reduced
quality, buffer them on an **Amazon SQS** queue drained by a consumer with backoff to smooth bursts,
and add application-level **fallback** to a secondary, higher-availability model when the primary
throttles. For a downstream dependency suffering extended outages, add a **circuit breaker** that
stops calling the failing dependency for a cooldown and fails fast or returns a fallback, protecting
the thread pool from cascading timeouts.

## Embeddings pipelines for semantic search

Semantic search needs vectors, not prose. An **embeddings model** such as Amazon Titan Text Embeddings
maps text to a fixed-length dense vector for nearest-neighbor retrieval, where a generation model
cannot produce comparable vectors. Embed each document at index time; at query time, embed the query
and retrieve nearest vectors, which on Amazon Aurora PostgreSQL is **pgvector** similarity search over
the stored vectors.

The load-bearing rule: use the **same embedding model and output dimension** for both the indexed
documents and the incoming queries so their vectors share one comparable space. Mixing models produces
incompatible vectors and collapses retrieval quality. For bulk workloads of tens of millions of
documents, submit an **Amazon Bedrock batch inference job** that reads from S3 and writes embeddings
back to S3 at the discounted batch price rather than looping real-time calls, and configure **Titan
Text Embeddings V2** to emit smaller-dimension vectors (such as 256) to cut vector storage and query
cost.

## Practice this domain

Take a [Domain 2 drill](/aws/aip-c01/practice?mode=drill&domain=Implementation%20%26%20Integration)
or the [full AIP-C01 mock exam](/aws/aip-c01/practice?mode=mock).
