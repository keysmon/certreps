# Building GenAI Applications on Databricks (Generative AI Engineer Domain 3)

*Verified Q3 2026 - covers ~30% of the Generative AI Engineer Associate exam, the largest domain.*

## What this domain tests

Application Development is the single heaviest-weighted domain on the Databricks Generative AI Engineer Associate exam, and it is also the most hands-on: it asks whether you can actually build the pieces of a GenAI application, not just recognize product names.
Databricks does not publish a passing score; the 70% line shown on this site is a study target.
This domain also carries real naming risk if you are studying from older material.
Databricks' documented, currently recommended interface for authoring a tool-calling agent is **ResponsesAgent**, compatible with the OpenAI Responses schema; the older **ChatAgent** and **ChatModel** classes are now documented as legacy schemas, so treat them as the prior approach rather than the current answer on an exam question.
Similarly, Databricks rebranded **Mosaic AI Vector Search** to **Databricks AI Search**; if you see "Vector Search" in an older guide or even in the exam's own published objectives, read it as the same product under its current name.

## From prompt to production

Every GenAI application starts with getting reliable output out of a model, and Databricks gives you layered control over that reliability.
**Structured Outputs**, set through the response_format parameter on Foundation Model APIs, constrain a chat model's free-text baseline into a specific JSON shape by supplying a schema, which is the most reliable way to guarantee a downstream parser never chokes on malformed output.
Below that, **temperature** controls how deterministic or exploratory a model's sampling is, and a **system message** sets persistent behavioral instructions, together the two most direct levers for pulling a model's baseline behavior toward a desired style, such as short and consistent answers instead of long and variable ones.
For retrieval-augmented generation, the shape is consistent everywhere on Databricks: a user's request is distilled into the key fields and intent that make a good retrieval query, that query runs against a knowledge source such as a Databricks AI Search index, and the retrieved content is combined with the original question inside a prompt template before it ever reaches the LLM.
Skipping straight from a raw, chatty user message to the LLM, or dropping the original question after retrieval, breaks that chain and produces answers that are either ungrounded or unfocused.

## Choosing and evaluating models

Model selection on Databricks is a tradeoff exercise, not a search for the single best model.
When a small model already matches a larger model's accuracy on a simple, well-scoped task, the smaller model wins on latency and cost at volume, and Foundation Model APIs' supported-models list documents context length, size, and other attributes side by side so that comparison is explicit rather than guessed.
Embedding models carry the same constraint in a different place: an embedding model can only encode text that fits its context window, so a chunking strategy that produces 4,000-token chunks needs an embedding model whose context window is at least that large, or the model silently truncates the chunk and retrieval quality degrades without an obvious error.
Databricks Marketplace extends this same evaluation habit to third-party and specialized models: a listing ships with the provider's description and metadata plus pre-built example notebooks, and the model itself is delivered through a Unity Catalog share, so an engineer can judge task fit before adopting a model rather than after.
When comparing your own fine-tuned or prompted candidates, the right metric depends on what "better" means for the task: ROUGE is the recall-oriented overlap metric built for comparing generated summaries against a human-written reference, while cost and latency are tracked as separate, deterministic signals alongside whatever quality judge you choose.

## Guardrails and quality judges

Two different mechanisms protect a GenAI application, and the exam expects you to know which one applies where.
**Unity AI Gateway guardrails** sit in front of or behind a serving endpoint and can block or sanitize requests and responses for categories such as PII, jailbreak attempts, and unsafe content; a guardrail's Log mode lets a team measure how often it would trigger on real traffic before ever enforcing an action, which is the safe way to roll one out without surprising real users.
Once a response comes back, **MLflow's built-in judges** assess it qualitatively: RetrievalGroundedness checks whether a response's claims are actually supported by the retrieved context, catching confident-sounding hallucinations that a relevance check alone would miss, RelevanceToQuery checks whether a response addresses what was actually asked, Safety screens for harmful content, and Correctness compares a response against a labeled expected answer or fact, which means Correctness is the one judge on this list that cannot run without ground truth in your evaluation dataset.

## Authoring and observing agents

For a tool-calling agent that needs to decide for itself when to retrieve information, the databricks-langchain package's VectorSearchRetrieverTool wraps a Databricks AI Search index as a named, described tool that an LLM can invoke on demand, which is the documented pattern for on-demand retrieval instead of dumping an entire index into a static prompt.
When you are ready to package that agent for logging and deployment, build it on **ResponsesAgent**; it integrates directly with MLflow logging, tracing, evaluation, and Agent Framework deployment, and it is the interface Databricks currently recommends over the legacy ChatAgent schema.
Once an agent is running, **MLflow Tracing** gives you one-line autologging, such as mlflow.langchain.autolog(), that captures every request as a trace with a span for each step, the retriever call, the assembled prompt, and the LLM call, with the inputs and outputs at each stage, which is far less effort than hand-inserting print statements or manually building span objects.

## Evaluation versus monitoring

These two phases of a GenAI application's life cycle are easy to blur together, but Databricks treats them as distinct and complementary.
**Evaluation** runs offline, typically before deployment, scoring the application against a curated dataset that can carry expectations such as expected facts or a reference answer.
**Monitoring** runs the same kinds of scorers on a sample of live production traces after deployment and attaches the results to those traces for review, without requiring a ground-truth label on every single production request, which is why reference-free judges like groundedness and safety carry so much of the monitoring load.
The two phases are meant to reinforce each other: the same scorer definitions can run in both places, so a regression caught in offline evaluation before a prompt or retrieval change ships is the same kind of signal a team later watches for in production monitoring after it ships.

## Multi-agent orchestration with Genie

When an application needs to answer natural-language questions over structured, tabular data as part of a larger agent, a **Genie space** is the Databricks building block for that, and the **Genie Conversation API** is how another agent calls it programmatically: starting a conversation once and posting each follow-up as a new message in that same conversation, so a question like "now break that down by region" is correctly interpreted using the accumulated context of everything asked before it in that session.
That stateful, conversational pattern is also why Genie spaces plug cleanly into a **Multi-Agent Supervisor**, which coordinates Genie spaces, Knowledge Assistants, Unity Catalog functions, and other agents into one governed system rather than forcing a single custom chain to reimplement everything from scratch.

## Practice this domain

Take a [Domain 3 drill](/databricks/genai-engineer/practice?mode=drill&domain=Application%20Development)
or the [full Generative AI Engineer Associate mock exam](/databricks/genai-engineer/practice?mode=mock).
