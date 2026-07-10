# AIP-C01 Exam-Week Rapid Review

## How to use this

Read this guide start to finish the night before your exam, then skim only the tables and
the final checklist the morning of.
It does not teach concepts from scratch; it compresses the five domain guides and the
practice bank into the shape you need for fast recall under time pressure.
If a line here does not click, go back to the matching domain guide for the full explanation
rather than trying to memorize it cold.

## The exam shape

AIP-C01 is 65 scored questions in 156 minutes, which works out to about 2.4 minutes per
question.
The pass line is 75 percent (750 out of 1000 scaled points).
The five domains are not weighted evenly, so spend your review time where the exam spends its
questions:

| Domain | Weight |
|---|---|
| 1. Foundation Model Integration & Compliance | 31% |
| 2. Implementation & Integration | 26% |
| 3. AI Safety, Security & Governance | 20% |
| 4. Operational Efficiency & Optimization | 12% |
| 5. Testing, Validation & Troubleshooting | 11% |

Domains 1 and 2 alone are more than half the exam. If your review time is short, prioritize
model selection, RAG and Knowledge Bases, the customization ladder, the Converse API, and
AgentCore before anything else.

Time discipline: at 2.4 minutes a question you cannot afford to stall. If a scenario has not
clicked after two reads, flag it and move on; come back after finishing the rest of the section.
A blank answer costs the same as a wrong one, so never leave a question unanswered when you
run low on time.

The single highest-leverage habit: **read the qualifier word before the options.** "MOST
cost-effective," "LEAST operational overhead," "BEST fit," and "MOST appropriate" are not
interchangeable. Two or three options are often technically valid; only one satisfies the exact
qualifier the stem asks for. Underline it mentally before you read option A.

## Service-selection tables

### Foundation model selection

| Need | Model | Why |
|---|---|---|
| Very long document (a 250-page contract), reasoning across distant sections | Anthropic Claude | 200K-token context window, strong reasoning |
| High-volume, low-latency, low-cost short-text tasks (intent classification) | Amazon Nova Micro | text-only, cheapest, fastest |
| Multimodal input (text, image, video) | Amazon Nova Lite or Nova Pro | multimodal |
| Image generation from text | Amazon Nova Canvas | text-to-image; do not confuse with the text-understanding Nova models |
| Open-weight, self-hostable to avoid vendor lock-in | Meta Llama | openly licensed, can also run on Amazon SageMaker |
| Text embeddings, need to tune vector size | Amazon Titan Text Embeddings V2 | 1024 (default), 512, or 256 output dimensions |
| Cross-lingual text embeddings from one model | Cohere Embed Multilingual | maps many languages into one shared vector space |
| Image-plus-text embeddings | Amazon Titan Multimodal Embeddings | shared space for text-to-image and image-to-image search |

### Q Business vs. Q Developer

| Need | Service |
|---|---|
| Non-technical employees ask natural-language questions over enterprise content (SharePoint, Salesforce, Slack) and want cited answers with minimal build effort | Amazon Q Business |
| Developers want an IDE assistant that explains and refactors code, implements features from prompts, and automates AWS config and language-version upgrades | Amazon Q Developer |

### The customization ladder

Climb only as far as the requirement forces you: **prompt engineering, then RAG, then
fine-tuning, then continued pre-training.**

- RAG fits changing or current facts, source citations, and adding knowledge without retraining.
- Fine-tuning enforces a proprietary output format or tone from labeled prompt-and-completion
  pairs (a JSONL file), when the underlying knowledge itself is stable.
- Continued pre-training consumes a large unlabeled corpus to teach domain vocabulary and style
  when there are no labeled pairs.
- Serving custom models: **custom Amazon Nova models (Micro, Lite, Nova 2 Lite, Pro) and Meta
  Llama 3.3 70B can be deployed for on-demand inference**, while an **Anthropic Claude
  fine-tune still requires Provisioned Throughput.**

### Vector store selection

| Need | Store |
|---|---|
| Fastest path, no manual vector-store setup | Amazon OpenSearch Serverless (the Knowledge Bases quick-create default) |
| Already run Aurora PostgreSQL, moderate corpus, keep ops consolidated | Aurora PostgreSQL with pgvector |
| Already run a standalone vector database | Pinecone |
| Single-digit millisecond latency, in-memory | Redis Enterprise |
| Large, latency-tolerant corpus, optimize for cost | S3 Vectors |
| Multi-hop questions over explicit entity relationships (GraphRAG) | Amazon Neptune Analytics |

### Serving tiers

| Mode | Best for |
|---|---|
| On-demand | variable or unpredictable traffic, pay-per-token, default for new custom Nova/Llama 3.3 70B models |
| Provisioned Throughput | high, steady, predictable utilization; still required to serve a Claude fine-tune |
| Batch inference | large, non-urgent, asynchronous jobs at a discounted price; never the answer for interactive chat |

On-demand invocation also takes a `service_tier` request parameter, independent of the modes above:

| service_tier | Best for |
|---|---|
| priority | customer-facing, latency-critical traffic; served ahead of standard and flex |
| standard (default) | routine traffic with no special latency or cost need |
| flex | large, delay-tolerant jobs (bulk summarization, non-urgent generation); discounted price for longer processing, still a synchronous call |
| reserved | mission-critical, always-on capacity backed by a token-per-minute capacity reservation |

Swapping priority and flex is the classic trap: it slows the latency-critical workload and pays a
premium for the delay-tolerant one.

### AgentCore primitives

| Primitive | Job |
|---|---|
| Runtime | secure, serverless host; each session runs in its own isolated microVM, up to 8 hours, talks over MCP or agent-to-agent (A2A) |
| Gateway | turns REST APIs, Lambda functions, and other agents/MCP servers into MCP tools behind one authenticated endpoint; semantic tool selection surfaces only relevant tools from a large catalog |
| Policy | evaluates every tool call at the Gateway boundary against Cedar or natural-language rules, regardless of how the agent is prompted |
| Memory | short-term memory holds turn-by-turn context within a session; long-term memory extracts and persists facts across separate sessions |
| Identity | gives each agent its own identity, integrates with your IdP (Cognito, Okta, Entra ID), and authenticates outbound to third-party services |
| Built-in tools | Code Interpreter runs agent-written code in a secure sandbox (numeric analysis, chart generation from CSVs); Browser gives the agent a managed cloud browser to log in, navigate, and fill forms on sites with no API |
| Observability | emits OpenTelemetry traces to CloudWatch showing reasoning, tool calls, and step inputs/outputs |

One date to remember: the original Bedrock Agents (now **Agents Classic**) is **closed to new
customers as of July 30, 2026**. AgentCore is the current path, and the exam frames agent
scenarios in AgentCore terms.

## The classic discriminators

One line each. If a phrase here does not immediately recall the reasoning, go back to the
matching domain guide.

1. **Fine-tuning vs. RAG vs. prompt engineering** - climb the ladder in that order; do not
   jump straight to fine-tuning when RAG or better prompting would fix it.
2. **Guardrails vs. Comprehend vs. Macie for PII** - Guardrails masks or blocks PII inline at
   inference time; a Comprehend custom entity recognizer needs training and hosting for a
   bespoke format; Macie discovers PII/PHI across a bulk S3 corpus before fine-tuning, not at
   inference time.
3. **Screening input vs. output in a custom RAG app** - call ApplyGuardrail on the raw user
   input before retrieval, and pass the same guardrail in guardrailConfig on the Converse
   request to screen the output. One guardrail, two touchpoints.
4. **Knowledge Bases vs. AgentCore Memory** - Knowledge Bases retrieve external document facts
   for RAG; AgentCore Memory holds conversation and user state (short-term within a session,
   long-term across sessions).
5. **Geo-scoped vs. Global cross-Region profiles** - a system-defined cross-Region profile absorbs
   traffic bursts by auto-routing across Regions with no app-side failover; a Geo-scoped profile
   (for example EU) confines that routing to one geography for residency (verify its destination
   Regions via the model's Regional table or GetInferenceProfile), while a Global-scoped profile
   spans all commercial Regions and fails a residency requirement.
6. **Prompt caching placement** - the checkpoint goes after the static prefix and before the
   variable question; content before the checkpoint is what gets cached and discounted.
7. **Guardrail versions** - iterate on the working draft, publish and test a numbered version,
   point production at a specific version, and roll back instantly by repointing.
8. **Prompt Management versions vs. Flows aliases** - Prompt Management has no alias concept:
   publish an immutable numbered version and point production at that version, not the
   ever-changing draft. Bedrock Flows, one level up, does have aliases - a stable endpoint you
   repoint across published flow versions with no app-code change. Neither evaluates quality;
   that still needs a golden-dataset CI gate.
9. **Automatic vs. LLM-judge vs. human evaluation** - automatic reference-based metrics
   (BERTScore, F1) need gold answers and miss nuance; LLM-as-a-judge scores nuanced dimensions
   automatically at scale on every release; human evaluation is for subjective, high-stakes,
   regulated sign-off (brand voice, legal tone).
10. **Lexical vs. semantic vs. hybrid retrieval** - BM25 is lexical (keyword) matching, not
    semantic; Knowledge Bases embedding-based retrieval is semantic; hybrid search blends both by
    adding a keyword/BM25-capable index (for example on OpenSearch Serverless) alongside the
    vector field and setting the query's search type to hybrid, needed when exact terms like SKUs
    must count too.
11. **Interface VPC endpoint vs. the public path** - an interface VPC endpoint (PrivateLink)
    keeps Bedrock traffic off the public internet; a NAT gateway still uses the public path.
12. **SCP vs. IAM condition key for model governance** - an Organizations SCP enforces an
    approved-model allowlist across many accounts from one place; the
    bedrock:GuardrailIdentifier condition key denies InvokeModel calls that omit the required
    guardrail.
13. **Model invocation logging vs. CloudTrail** - invocation logging captures the full prompt
    and response content to S3 and CloudWatch Logs; CloudTrail records the API-level who/what/
    when, never the bodies.
14. **Direct vs. indirect prompt injection** - direct injection is blocked with the prompt-attack
    filter on the input; indirect injection means treating retrieved or user-contributed
    documents as untrusted and screening both the retrieved content and the response.
15. **Distillation vs. Provisioned Throughput** - distillation trains a smaller, cheaper student
    model that reproduces a teacher's behavior for a narrow task, cutting per-token cost;
    Provisioned Throughput just reserves capacity on the existing model and does not lower cost
    per token.
16. **Latency-optimized inference vs. streaming vs. batch** - latency-optimized serves supported
    models on faster infrastructure for lower actual latency; streaming (ConverseStream) improves
    perceived latency; batch optimizes cost, the opposite goal of both.
17. **Retrieval-miss root causes** - a metadata filter whose expression does not match the
    document's attributes, or a chunking strategy that splits the answer's facts from the
    query's key terms, both silently drop the right passage before it ever reaches the model.
18. **Groundedness vs. context relevance** - low context relevance is a retrieval problem; high
    context relevance with low groundedness means the model is adding unsupported content during
    generation, fixed with a grounding-focused prompt, lower temperature, or a contextual
    grounding check guardrail.
19. **AccessDeniedException root cause** - when IAM already allows bedrock:InvokeModel, other
    models work, but one new model fails every call immediately, the fix is granting model
    access for that model in that account and Region, a Bedrock setting separate from IAM.
20. **ValidationException vs. ThrottlingException** - Validation is a fixed constraint (for
    example a prompt that exceeds the context window) that retries will never fix; Throttling is
    transient and calls for exponential backoff with jitter.
21. **ToolChoice forcing** - the `tool` member forces one named tool every turn, but AWS documents
    specific-tool forcing as supported only by Anthropic Claude 3 and Amazon Nova models, so
    confirm the model family first; `any` only guarantees some tool is called, not a specific one,
    and `auto` (the default) leaves the choice to the model.
22. **GuardDuty's Bedrock-specific findings** - foundational threat detection reads CloudTrail
    management events with no custom rules needed, surfacing a "suspicious Bedrock model
    invocation" finding (a credential calling models it has no reason to) and a "disabled Bedrock
    invocation logging" finding (an attacker covering tracks); neither needs VPC Flow Logs or S3
    access logging.
23. **Guardrails PII: inputAction vs. outputAction** - a single sensitive-information entity type
    can be configured independently per direction, for example BLOCK on input and ANONYMIZE (mask)
    on output for the same phone-number entity type; that is a different lever from discriminator
    3's ApplyGuardrail-on-input-plus-guardrailConfig-on-output pattern, which is about which API
    screens which direction, not per-entity action.
24. **Q Business vs. Q Developer** - Q Business is the managed assistant for non-technical
    employees asking over enterprise content (SharePoint, Salesforce, Slack) with citations; Q
    Developer is the IDE-embedded assistant for engineers who explain, refactor, and upgrade code.
    Same "Amazon Q" family, opposite audience - do not swap them.

## Common traps

These are the wrong-answer patterns that show up more than once across the practice bank.

1. **Assuming Bedrock trains on your prompts or outputs.** It does not. Your content is not used
   to train base models and is not shared with third-party model providers - this holds for
   both HIPAA and GDPR compliance scenarios.
2. **Assuming Guardrails changes the model itself.** Guardrails is a runtime policy layer; it
   filters or blocks content at invocation time and does not retrain or alter the model. To
   quantify and document bias or stereotyping, you need SageMaker Clarify, not Guardrails.
3. **Overgeneralizing "custom models always need Provisioned Throughput."** True for a Claude
   fine-tune. False, since a 2025 update, for custom Nova family models and Meta Llama 3.3 70B,
   which support on-demand deployment.
4. **Confusing Bedrock Agents Classic with AgentCore.** Classic is closed to new customers as of
   July 30, 2026. AgentCore (Runtime, Gateway, Policy, Memory, Identity, Observability) is the
   current, framework-agnostic path the exam expects.
5. **Treating batch inference as usable for real-time traffic because it is cheaper.** Batch is
   asynchronous only. It is never the answer for an interactive chat experience, no matter how
   attractive the discount looks.
6. **Mixing embedding models or output dimensions between index time and query time.** Vectors
   from different models, or different dimensions of the same model, are not comparable and
   collapse retrieval quality. Always match the embedding model and dimension on both sides.
7. **Assuming cross-Region inference automatically preserves data residency.** It can route
   requests outside the desired geography unless you use a geography-scoped inference profile or
   disable cross-Region routing.
8. **Assuming reference-based automatic metrics fully capture quality.** BERTScore and F1 need
   gold reference outputs and measure surface overlap; they poorly capture faithfulness,
   coherence, or tone.
9. **Assuming an LLM judge is always as reliable as a human expert.** For subjective, high-stakes,
   regulated dimensions - brand voice, cultural sensitivity, legal tone - human evaluation is the
   correct sign-off, not a judge model.
10. **Assuming Prompt Management alone blocks a quality regression.** It stores and versions
    prompts; it does not evaluate quality. Catching a regression requires a versioned golden
    dataset plus an automated evaluation gate in the pull-request pipeline.

## The final checklist

1. Read the qualifier word first - MOST cost-effective, LEAST overhead, BEST fit - before you
   read the options.
2. Budget about 2.4 minutes per question (156 minutes over 65 scored questions); flag and move
   rather than stall.
3. The pass line is 75 percent (750 of 1000). Two clean mock exams above that line is real
   signal, not luck.
4. Domains 1 and 2 (57% combined) are model selection, RAG, and Converse/AgentCore
   fundamentals - review those first if time is short.
5. PII scenario: is it inference-time (Guardrails), bulk-corpus discovery (Macie), or a bespoke
   format (a regex pattern in the Guardrails sensitive-information policy)?
6. Agent scenario: default to AgentCore terminology, not Agents Classic.
7. Cost-at-scale-for-a-narrow-task scenario: think distillation before Provisioned Throughput.
8. Quality-proof scenario: "automatically, every release" means LLM-as-a-judge; "subjective,
   regulated sign-off" means human evaluation.
9. Retrieval-returns-nothing-relevant scenario: suspect metadata filters or chunking before you
   touch the generation model.
10. Exception-name scenario: match the fix to that exact exception - do not swap
    ThrottlingException's backoff for ValidationException's input-size fix, or the reverse.

Two clean mocks above the line and you're ready to book.

Take the [full AIP-C01 mock exam](/aws/aip-c01/practice?mode=mock) or drill a single domain:
[Domain 1](/aws/aip-c01/practice?mode=drill&domain=Foundation%20Model%20Integration%20%26%20Compliance),
[Domain 2](/aws/aip-c01/practice?mode=drill&domain=Implementation%20%26%20Integration),
[Domain 3](/aws/aip-c01/practice?mode=drill&domain=AI%20Safety%2C%20Security%20%26%20Governance),
[Domain 4](/aws/aip-c01/practice?mode=drill&domain=Operational%20Efficiency%20%26%20Optimization),
[Domain 5](/aws/aip-c01/practice?mode=drill&domain=Testing%2C%20Validation%20%26%20Troubleshooting).
