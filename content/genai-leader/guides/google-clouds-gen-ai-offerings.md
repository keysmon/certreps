# Google Cloud's Gen AI Offerings (Generative AI Leader Domain 2)

*Verified Q3 2026 - covers ~35% of the Generative AI Leader exam, the largest domain.*

## What this domain tests

Google Cloud's gen AI offerings is the heaviest-weighted domain on the Generative AI Leader exam, and for good reason: this is a business-level, product-naming domain.
It asks whether you can recognize Google's gen AI product portfolio, from consumer-facing apps to the developer platform used to build custom agents, and connect each product to a business use case.
Google does not disclose exam scoring (results are pass/fail only) - we use a 70% study target.
This domain also carries the sharpest naming risk on the exam: Google rebranded its developer AI platform from Vertex AI to the Gemini Enterprise Agent Platform, and renamed Vertex AI Search to Agent Search, so old blog posts and older study guides describe products that no longer carry those names.
If a practice question or an older article mentions "Vertex AI Agent Builder" or "Vertex AI Search," treat those as the prior names for what the current exam calls the Gemini Enterprise Agent Platform and Agent Search, respectively.

## Google's AI-first infrastructure and platform strengths

Google Cloud's gen AI advantage starts at the hardware layer.
**Tensor Processing Units (TPUs) are custom chips Google designed specifically to accelerate the matrix math behind machine learning training and inference**, and **AI Hypercomputer is the supercomputing architecture that integrates TPUs, GPUs, storage, networking, and software into one system for demanding AI workloads**.
On top of that infrastructure, Google positions its enterprise AI platform around five qualities: **responsible, secure, private, reliable, and scalable**.
Two more strategic themes matter for the exam: Google Cloud's **open approach** offers a genuine choice of models, first-party (Gemini, Gemma), open (such as Llama), and third-party (such as Anthropic's Claude), rather than locking customers into one vendor's models, and Google Cloud **democratizes AI development** through low-code and no-code tools, pretrained foundation models, and simple APIs, so teams without deep ML expertise can still ship gen AI features.
A related theme the exam guide calls out explicitly is control: Google Cloud's AI platform is designed to give customers control over their own data through security, privacy, and governance settings, even while using Google's first-party models and prebuilt, customizable solutions.
For a business stakeholder, the practical takeaway is that adopting Google Cloud's gen AI stack is not an all-or-nothing bet on one model or one level of technical investment; a team can start with a prebuilt, no-code product and later add a custom, code-first agent without switching platforms.

## Prebuilt offerings for AI-powered work

Several Google products bring gen AI directly to end users rather than requiring custom development.
**The Gemini app is Google's consumer chatbot, and Gemini Advanced is its premium subscription tier**, which adds access to Google's most capable models and the ability to create **Gems**, custom saved AI personas configured for a specific repeated task, such as a "coding tutor" or "resume reviewer" Gem.
**Gemini Enterprise is a separate, enterprise-grade product: an intranet search, AI assistant, and agentic platform** that connects to data across an organization, including third-party sources like Confluence, SharePoint, Jira, and ServiceNow, with permissions-aware access so a search only surfaces what the requesting employee is already allowed to see.
Gemini Enterprise also gives access to **NotebookLM (in an enterprise edition)**, a research and writing tool that grounds its answers strictly in a curated set of sources a user uploads, such as PDFs, Google Docs, and Slides, and can produce a cited summary or an audio overview from them.
Separately, **Gemini for Google Workspace embeds Gemini's capabilities directly inside familiar productivity apps**, such as summarizing a long email thread in Gmail, drafting a first pass of a document in Docs, or building a formula in Sheets, without the user ever leaving the app they are already working in.
The exam differentiates these three cleanly: the Gemini app and Gemini Advanced are consumer products, Gemini Enterprise is the cross-source enterprise search and agent platform, and Gemini for Google Workspace is Gemini embedded inside specific productivity tools.

## Improving the customer experience

Two families of offerings improve how a business's customers experience its gen AI investment.
For external, customer-facing search, **Agent Search (the current name for what was Vertex AI Search) delivers Google-Search-quality retrieval and RAG that a business can embed on its own website or app over its own catalog or content data**, and businesses can also ground responses using plain **Google Search** for public, up-to-date information.
For contact centers, Google's **Customer Engagement Suite** bundles four core products: **Conversational Agents** (self-service virtual agents customers talk to directly), **Agent Assist** (real-time suggestions, summaries, and coaching for a human agent during a live conversation), **Conversational Insights** (analytics that surface KPIs, inquiry-topic trends, and coaching opportunities from historical and real-time interaction data), and **Contact Center as a Service (CCaaS)** (a fully managed, omnichannel contact center platform, removing the need to build and maintain telephony infrastructure).
A useful way to keep these apart on exam day: Conversational Agents faces the customer, Agent Assist faces the human agent, Conversational Insights faces the operations manager, and CCaaS is the underlying platform all three run on.

## The Gemini Enterprise Agent Platform: building for developers

The product formerly known as Vertex AI is now the **Gemini Enterprise Agent Platform**, organized around four areas: build, scale, govern, and optimize.
Its core components appear across the exam guide's developer-facing considerations.
**Model Garden is the model catalog** where a developer discovers, evaluates, and deploys first-party Gemini and Gemma models alongside open models like Llama and third-party models like Claude.
For retrieval-augmented generation, Google offers layered options depending on how much control a team wants: **prebuilt RAG with Agent Search** for a fully managed, minimal-configuration experience, **RAG APIs** for programmatic integration into an existing application, and the **Vertex AI RAG Engine**, a fully managed service that still lets a developer choose their own embedding model, vector database, and data sources when they want more control than a prebuilt solution offers.
For building custom agents, two tools sit at different ends of the code spectrum: the **Agent Development Kit (ADK)** is a code-first framework for defining an agent's reasoning loop, tool use, and orchestration logic, while **Agent Studio is a low-code, visual canvas** inside the Gemini Enterprise Agent Platform for designing, prototyping, and managing agents without writing that orchestration code by hand.
Do not confuse Agent Studio with **Google AI Studio**, a separate, lighter-weight tool aimed at developers experimenting directly with Gemini model prompts and API calls rather than assembling a full agent.

## Agent tooling: how agents act on the world

An agent is only as useful as the tools it can call.
The exam guide groups these tools into **extensions** (calling external APIs to take real-world actions), **functions** (executing defined code), **data stores** (retrieving information from a connected knowledge base or database), and **plugins** (adding external capabilities to an agent).
Google Cloud backs these categories with prebuilt, single-purpose AI APIs a developer can wire into an agent as tools: the **Speech-to-Text API** (audio to text), **Text-to-Speech API** (text to audio, the reverse), **Translation API** and **Document Translation API** (translating plain text or whole documents), **Document AI API** (extracting structured data out of documents such as invoices or forms), **Cloud Vision API** (analyzing image content), **Cloud Video Intelligence API** (extracting metadata and insights from video), and **Natural Language API** (analyzing the sentiment and structure of existing text).
General-purpose Cloud Storage, databases, Cloud Functions, and Cloud Run round out the tooling an agent can call to store data, run custom code, or serve an API endpoint.
On exam day, think of tooling as the layer that turns a model from a text generator into something that can actually finish a task: a support agent that only generates text can draft a reply, but an agent wired to a data store and the Translation API can look up a customer's order and reply in the customer's own language without a human relaying each step.

## Putting the portfolio together

A useful way to hold this whole domain in your head is to sort every Google offering by who uses it and how much building it requires.
At one end, the Gemini app, Gemini Advanced, and Gemini for Google Workspace are ready-to-use products for individual knowledge workers, requiring no setup beyond a subscription or an existing Workspace license.
Gemini Enterprise and NotebookLM sit a step further in: still largely prebuilt, but configured by an organization's admins to connect specific data sources before employees can search or converse across them.
The Customer Engagement Suite occupies a similar space, aimed at a contact center's operations rather than an individual employee.
At the far end sits the Gemini Enterprise Agent Platform, where Model Garden, Agent Search, the RAG offerings, Agent Studio, and the Agent Development Kit give a development team the raw materials to assemble a fully custom agent.
When a question describes who is doing the work (an individual employee, a contact center, or a development team) and how much customization they want, that framing alone usually narrows the answer to one tier of this portfolio before you even need to recall an exact product name.

## Practice this domain

Take a [Domain 2 drill](/gcp/genai-leader/practice?mode=drill&domain=Google%20Cloud's%20gen%20AI%20offerings)
or the [full Generative AI Leader mock exam](/gcp/genai-leader/practice?mode=mock).
