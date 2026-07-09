# Applications of Foundation Models on AWS (AIF-C01 Domain 3)

*Verified Q3 2026 - covers ~28% of the AIF-C01 exam.*

## What this domain tests

This is the largest AIF-C01 domain, and it stays at a business-practitioner level rather than an
engineer's implementation depth.
It covers how to select and use a foundation model responsibly: the design tradeoffs behind model
choice, the inference parameters that shape output, Retrieval Augmented Generation (RAG) and vector
databases at a concept level, prompt engineering techniques and their security risks, how foundation
models are trained and customized, and how teams judge whether a model's output is actually good.

## Choosing a foundation model

Foundation model selection is a tradeoff exercise, not a search for the "best" model in the abstract.
**A smaller, more efficient model that already clears the accuracy bar is usually the right choice
over a larger model**, because larger models typically cost more per request and add latency without
a matching business benefit.
Selection criteria include the model's modality (text-only, image-generation, or multi-modal), its
**context window** (the maximum amount of text, measured in tokens, the model can consider in a single
request), licensing and compliance constraints, and raw task performance.
Feeding input that exceeds the context window does not raise an error so much as silently drop or
truncate earlier content, so a model choice has to account for how much source material a task
actually needs in one pass.

Interface choice follows from the use case as much as the model does: a text or chat interface fits
conversational assistants, while a visual interface matters for image-generation or document-analysis
products. None of these are purely technical decisions; they are business decisions about cost,
responsiveness, and user experience that a practitioner is expected to reason through.

## Inference parameters

A handful of parameters shape a model's output at request time without touching its underlying
weights. **Temperature** controls the randomness of token selection: lowering it produces more
deterministic, focused output well suited to fact-lookup or classification-style tasks, while raising
it produces more varied, creative output suited to brainstorming or copywriting. **Max tokens** caps
how many tokens a response can contain, controlling both output length and per-request cost; a
response that cuts off mid-sentence usually means this limit was too low, not that temperature was
misconfigured. These parameters are independent of each other and of the context window, which is a
fixed property of the model architecture rather than something a single request can adjust.

## Retrieval Augmented Generation and vector databases

**Retrieval Augmented Generation (RAG)** retrieves relevant passages from an external knowledge source
at query time and inserts them into the prompt, letting a model ground its answer in current
information without retraining. This is the standard answer whenever a scenario describes information
that changes often (product catalogs, policy documents, weekly updated manuals): retraining or
fine-tuning a model every time source data changes is slow and expensive compared to RAG's lightweight
retrieval step.

RAG needs a place to store and search the numeric representations of a knowledge source. **An
embedding (vector) represents text as a list of numbers positioned so that semantically similar content
lands close together in that numeric space**, even when the underlying wording differs substantially.
**A vector database indexes those embeddings and efficiently finds the nearest vectors to a query
embedding**, which is exactly the similarity search a RAG retrieval step depends on. A conventional
relational database's exact-match queries, or plain object storage with no search capability, cannot
perform this kind of similarity ranking.

## Prompt engineering techniques

Several prompting patterns shape a foundation model's behavior without any training update at all.
**Zero-shot prompting** gives the model no examples and relies entirely on its pre-trained knowledge.
**Few-shot prompting** includes a small number of example input-output pairs directly in the prompt to
guide response format and style. **Chain-of-thought prompting** asks the model to work through
intermediate reasoning steps before producing a final answer, which often improves accuracy on
multi-step problems such as word problems or multi-part instructions. A **prompt template** is simply
a reusable, parameterized structure for formatting these instructions consistently across many
requests.

Prompt engineering also introduces its own attack surface, and the exam expects practitioners to
recognize the vocabulary of these risks rather than to design defenses. **Prompt injection** is
malicious input crafted to override or manipulate a model's intended instructions, for example hidden
text embedded in a webpage a model is asked to summarize. **Jailbreaking** is a crafted prompt that
tries to bypass a model's safety guidelines to produce restricted or harmful content. **Prompt
leaking** is an attempt to expose confidential system-prompt content that was never meant to be shared
with the end user. None of these risks are eliminated just by "using" generative AI carefully; they are
why guardrails, input validation, and content filtering exist as separate, necessary safeguards.

## How foundation models are trained and customized

A foundation model's lifecycle runs through several distinct stages, and the exam frequently asks
practitioners to place a described scenario into the right one. **Pre-training** builds the base model
from a broad, largely unlabeled corpus at massive scale. **Fine-tuning** starts from an already
pre-trained model and further trains it on a smaller, often labeled, domain-specific dataset, for
example a company's own support transcripts, to adapt tone, terminology, or task behavior. Because
fine-tuning quality depends heavily on the accuracy and consistency of the training examples, a small,
clean, correctly labeled dataset typically outperforms a larger but noisy, inconsistently labeled one;
skipping data preparation or simply adding more low-quality examples does not substitute for that
cleanup.

**Reinforcement Learning from Human Feedback (RLHF)** is a distinct refinement technique: human raters
rank multiple candidate responses to the same prompt, those rankings train a reward model, and the
reward model then guides further training so the foundation model produces more helpful,
human-preferred output. This is different from ordinary supervised fine-tuning, which trains directly
on labeled input-output pairs rather than on ranked preferences.

## Evaluating foundation model performance

Automated metrics and human judgment answer different questions, and choosing the wrong one for the
task is a common exam trap. **ROUGE** measures the overlap of words and phrases (n-grams) between a
generated summary and a human-written reference summary, making it the standard automated metric for
summarization quality. **BLEU** is the closely related metric designed primarily for evaluating machine
translation against reference translations; using it to judge a summarizer, or ROUGE to judge a
translator, is a mismatch the exam likes to test. Classification metrics such as accuracy, precision,
recall, and F1 score compare predicted labels to true labels among a fixed set of categories, which is
a different evaluation problem from comparing generated text to reference text.

Neither automated metric captures subjective qualities like tone, creativity, or brand fit. **Human
evaluation**, where people directly review and rate model outputs against defined criteria, is the
right tool whenever the quality being judged is difficult to reduce to a formula, such as whether
marketing copy sounds authentic and on-brand. In practice, teams often use automated benchmarks for
fast, repeatable regression checks and reserve human evaluation for the qualities that require
judgment.

## Pre-built AWS AI services versus foundation models

Not every "AI application" needs a foundation model at all. AWS offers a family of pre-built AI
services that solve common perception and language tasks directly through an API, without any prompt
engineering, fine-tuning, or model selection. **Amazon Transcribe converts spoken audio into text**,
and **Amazon Polly does the reverse, converting text into natural-sounding speech**; confusing the two
directions is a common exam trap. **Amazon Rekognition analyzes images and video to detect objects,
faces, and scenes.** **Amazon Kendra is an intelligent enterprise search service** that answers natural
language questions over a company's own indexed documents, which is a different job from Polly's
speech synthesis or Lex's conversational interface. **Amazon Lex builds conversational chatbot and
voice interfaces**, handling intent recognition and dialog management, not data storage. **Amazon
Comprehend** extracts insights such as entities, sentiment, and personally identifiable information
(PII) from text, and **Amazon Translate** converts text between languages.

Choosing between one of these managed AI services and a foundation-model-based application usually
comes down to fit and effort: if a pre-built service already solves the exact task (transcribing a call
recording, redacting PII, translating a document), it is typically the lower-effort, more predictable
choice, while a foundation model earns its cost and complexity when the task needs open-ended language
generation, reasoning over unstructured prompts, or a conversational experience that a fixed-function
service cannot provide.

## Practice this domain

Take a
[Domain 3 drill](/aws/aif-c01/practice?mode=drill&domain=Applications%20of%20Foundation%20Models)
or the [full AIF-C01 mock exam](/aws/aif-c01/practice?mode=mock).
