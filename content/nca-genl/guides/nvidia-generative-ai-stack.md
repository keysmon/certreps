# The NVIDIA Generative AI Stack: From Transformer to Production Service (NCA-GENL)

*Verified Q3 2026 - draws on Domain 1 (Core Machine Learning and AI Knowledge, 30%) and Domain 2 (Software Development, 24%) of the NVIDIA-Certified Associate: Generative AI LLM (NCA-GENL) exam, together the two heaviest-weighted domains.*

## What this guide covers

NCA-GENL is a 50-60 question, 60-minute multiple-choice exam, and NVIDIA's own certification page lists "a basic understanding of generative AI and large language models" as the expected prerequisite.
NVIDIA does not publish a passing score for this exam, so the 70% line used across this site is a study target we chose, not an official pass mark.
This guide follows one thread across the exam's two biggest domains: how a transformer works and gets customized (Domain 1), and how NVIDIA's software stack turns that customized model into a running production service (Domain 2).
If you can trace a model from raw transformer through fine-tuned for a specific task through packaged, served, and optimized for inference, you have covered the throughline behind a large share of this exam's questions.

## Transformer foundations the exam expects you to know

The exam sorts transformer architectures into three families by what they are trained to do.
**Encoder-only models such as BERT** build a bidirectional representation suited to understanding tasks like classification; **decoder-only models such as GPT** generate text autoregressively, one token at a time; **encoder-decoder models such as T5** pair an encoder with a decoder for sequence-to-sequence tasks like translation and summarization.
Inside each of those architectures, self-attention projects every token into Query, Key, and Value vectors: a token's Query is compared against every token's Key to compute attention weights, and those weights combine the Value vectors into an attention-weighted representation that uses every other token in the sequence as context.
Transformers run several of these attention computations in parallel as **multi-head attention**, and because the heads run in parallel rather than sequentially, different heads can specialize in different dependency ranges, for example some capturing short-range relationships and others longer-range ones.
Because self-attention treats a sequence as an unordered set of token representations, transformers also need injected positional information.
**RoPE** blends absolute and relative position signals so attention between distant tokens decays as distance grows, which helps a model generalize past the sequence lengths it was trained on, while **ALiBi** biases attention scores directly with a penalty proportional to token distance rather than concatenating a position vector.
Before any of this runs, text has to become tokens: **Byte-Pair Encoding (BPE)** starts from individual characters and iteratively merges the most frequent adjacent pairs into larger subword units, which keeps vocabulary size manageable while still letting rare or unseen words be represented as a sequence of known subwords.
Once encoded, a token or document is represented as an **embedding**, a dense, high-dimensional vector that captures semantic meaning so that texts with related meaning sit close together in vector space, which is exactly what a RAG pipeline's similarity search compares.

## Adapting a pretrained model: transfer learning and PEFT

BERT and GPT are both pretrained with self-supervised objectives on unlabeled text, but the objectives differ in a way the exam tests directly.
**BERT's masked language modeling** hides random tokens and predicts them from context on both sides, while **GPT's causal language modeling** predicts each next token from only the preceding tokens.
Rather than training a new model from scratch for every task, **transfer learning** reuses the general knowledge a model already learned during large-scale pretraining as a starting point, then adapts that starting point to a smaller, task-specific dataset at a fraction of the cost.
NVIDIA's own framing lays out a spectrum of customization techniques ordered by increasing data and compute cost.
**Prompt engineering** manipulates only the prompt sent to the model and changes no parameters; **prompt learning** trains virtual token embeddings while keeping the pretrained weights frozen; **parameter-efficient fine-tuning (PEFT)** trains a small set of additional parameters on top of frozen pretrained weights; and **full fine-tuning** updates every pretrained weight, which needs the most data and compute but produces the most accuracy for a specific use case.
**LoRA (Low-Rank Adaptation)**, the PEFT method most likely to appear on the exam, freezes the pretrained weights and trains only small low-rank matrices that approximate the needed weight update.
NVIDIA reports this cuts trainable parameters roughly 10,000-fold and GPU memory requirements roughly threefold compared to full fine-tuning, and because the low-rank matrices merge back into the original weights after training, a LoRA-adapted model runs at the same inference latency as the base model.
**DoRA (Weight-Decomposed Low-Rank Adaptation)** is presented as an alternative that splits each pretrained weight into a magnitude and a direction, then fine-tunes both, applying a LoRA-style low-rank update to the directional part; like LoRA, DoRA's trained components merge back into the base weights, so it adds no extra inference overhead either.

## NeMo Framework: training and customizing at scale

NVIDIA describes its **NeMo Framework** as a scalable, cloud-native generative AI framework built on Python and PyTorch for researchers and developers working on large language models, multimodal models, and speech AI, letting a team efficiently create, customize, and deploy new generative AI models by leveraging existing code and pretrained model checkpoints.
Two concrete NeMo capabilities show up on the exam under its Experimentation domain: the **NeMo Experiment Manager**, built on PyTorch Lightning, automatically checkpoints a training run (optionally keyed to a monitored metric such as validation loss), supports resuming after an interruption, and logs to dashboards such as TensorBoard or Weights and Biases; and **Hydra multirun**, which runs a grid search over hyperparameter values such as learning rates and batch sizes defined in a NeMo configuration, launching one run per combination, optionally across multiple GPUs, without hand-editing a config file and relaunching for every combination.
NeMo is also the umbrella under which NVIDIA ships LLM evaluation (NeMo Evaluator) and runtime safety (NeMo Guardrails), both of which the exam tests separately under its Experimentation and Trustworthy AI domains.

## Packaging for reproducibility: NGC containers and the NGC Catalog

Before a model reaches a server, NVIDIA's stack solves a more mundane problem: making sure a training or inference job behaves identically on a laptop, an on-prem GPU server, and a cloud VM.
An **NGC deep learning framework container** bundles a framework together with matched CUDA, cuDNN, and other library versions, so, in NVIDIA's own words, the execution environment is the same on whatever Linux system runs it, avoiding the library-version drift that plain system Python installs are prone to.
The **NGC Catalog**, served from the `nvcr.io` registry, is NVIDIA's curated set of GPU-optimized containers, pretrained models, and Helm charts, tuned and tested so a team can pull a ready-to-use image instead of assembling and validating one by hand.

## Serving the stack: Triton Inference Server

Once a model is trained and packaged, **Triton Inference Server** is NVIDIA's open source inference serving software, built to deploy models from multiple deep learning and machine learning frameworks, including TensorRT, PyTorch, ONNX, OpenVINO, Python, and RAPIDS FIL, from a single, file-system-based model repository, and to run them across NVIDIA GPUs, x86/ARM CPUs, or AWS Inferentia.
A team with models trained in three different frameworks does not need three separate servers: Triton dispatches each incoming request to the right per-model backend and scheduler on its own.
For workloads made up of many small, independent requests per second, Triton's **dynamic batching** groups compatible incoming requests together before running them through the backend, which raises GPU utilization and throughput; a **backend C API** further lets Triton be extended with new frameworks or custom pre- and post-processing logic.

## Compiling for speed: TensorRT-LLM and inference-time optimizations

Where Triton answers how to serve many models from one platform, **TensorRT-LLM** answers how to make one LLM as fast as possible on NVIDIA GPUs: it gives a Python API to define an LLM and compile it into an optimized TensorRT engine, plus Python and C++ runtimes to execute that engine, bundling inference-time features such as streaming, in-flight batching, paged attention, and quantization.
Three of those features solve a shared problem in autoregressive decoding.
**KV caching** stores each token's Key and Value tensors in GPU memory the first time they are computed so later decoding steps reuse them instead of recomputing attention over the whole prefix again, but the cache's memory footprint grows with batch size and sequence length, which becomes the new bottleneck.
**In-flight batching** addresses the resulting scheduling waste: instead of static batching, which forces an entire batch to wait for its slowest request, in-flight batching evicts finished sequences from a running batch as soon as they finish and admits new requests immediately, removing idle GPU cycles when output lengths vary widely.
**Paged attention** addresses the memory waste: it borrows the idea of OS memory paging, storing the KV cache in fixed-size, non-contiguous blocks so memory is allocated as tokens are generated rather than reserved up front for a worst-case length, cutting fragmentation without eliminating the KV cache itself.
Quantization rounds out the toolkit, and the exam draws a specific line between two ways to apply it.
**Post-training quantization (PTQ)** is applied to an already-trained model and can be weight-only (needing no additional data, since weights are fixed and known) or extended to activations (which needs representative calibration data), while **quantization-aware training (QAT)** simulates low-precision arithmetic during training itself through "fake quantization," so the model learns to compensate for quantization error before it is ever deployed.
Converting a 7B-parameter Llama2 model from FP16 to FP8, for example, roughly halves its memory footprint, from about 14 GB to about 7 GB.

## The fast path to production: NVIDIA NIM

Building a serving stack from Triton, TensorRT-LLM, and NGC containers by hand is one path to production; **NVIDIA NIM** is the other.
NIM packages a foundation model as a validated, model-specific container with curated weights, a validated quantization profile, and optimal runtime configuration behind a standard inference API, which NVIDIA positions as the fastest path to production for models it has already validated.
For a model that is not one of NIM's pre-validated, model-specific containers, a **model-free NIM container** serves a model configured dynamically at runtime instead of a fixed, pre-curated one, and can pull weights from NGC, Hugging Face, Amazon S3, Google Cloud Storage, or a local directory.
On the client side, NIM for LLMs exposes OpenAI-compatible REST endpoints, including `/v1/chat/completions` and `/v1/completions`, so application code already written against the OpenAI Chat Completions API shape can typically point at a self-hosted NIM URL with minimal changes rather than a full rewrite.

## Putting the stack together

A useful way to hold this whole thread in your head is to sort every piece by how much of the stack it builds versus how much it hands you pre-assembled.
At one end, NeMo Framework, NGC containers, Triton Inference Server, and TensorRT-LLM are building blocks: a team chooses PEFT or full fine-tuning, packages the result reproducibly, and decides for itself whether it needs Triton's multi-framework flexibility or TensorRT-LLM's single-model compiled speed, or both together.
At the other end, NVIDIA NIM hands a team a validated container, curated weights, and a standard API for models it already supports, trading some of that low-level control for a much shorter path to a running production endpoint.
When a question describes how much a team wants to build versus how quickly they need something running, that framing alone usually narrows the answer to one tier of this stack before you need to recall an exact product name.

## Practice this domain

Take a [Domain 1 drill](/nvidia/nca-genl/practice?mode=drill&domain=Core%20Machine%20Learning%20and%20AI%20Knowledge), a [Domain 2 drill](/nvidia/nca-genl/practice?mode=drill&domain=Software%20Development), or the [full NCA-GENL mock exam](/nvidia/nca-genl/practice?mode=mock).
