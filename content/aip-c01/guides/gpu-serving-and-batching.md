# GPU Serving, Memory and Batching

Reviewed 2026-11-05. Optional lesson: use measured workload evidence to choose a serving configuration. Parameter names depend on the container and engine version.

## Establish the actual bottleneck

Collect input/output token lengths, concurrent requests, queue time, time to first token, token throughput and GPU memory utilization. A GPU that is allocated is not necessarily doing useful work. Model weights, activations and the attention KV cache all consume memory. An overly generous supported context limit can constrain useful concurrency even when typical requests are much shorter.

Right-size context support to a documented workload envelope and enforce a compatible admission limit. Do not shrink the limit below legitimate requests just to improve a benchmark. Measure representative long requests and concurrent workloads, not just a single short warm request. Retain enough memory margin for the actual serving engine.

## Compare parallelism and batching deliberately

Tensor parallelism partitions a model across GPUs. If the workload fits with fewer partitions, a different partition count may free resources for other serving workers, but that depends on model support, memory and the worker configuration. Reducing the partition count alone does not guarantee another replica will start. Avoid assuming that doubling GPUs automatically doubles throughput.

Continuous batching can admit work as sequences finish, improving utilization under mixed generation lengths. It still requires queue and memory controls to meet latency goals. Increasing the batch or concurrency ceiling without checking KV-cache pressure can worsen failures or tail latency.

DJL/LMI releases and backends have different configuration controls. A historical lmi-dist rolling-batch property is not automatically a current vLLM setting. Pin the image/backend version before interpreting names such as tensor-parallel degree, maximum model length or maximum concurrent sequences.

## Try it

Build an offline experiment table with three candidate configurations. Change one variable at a time: supported context, tensor parallelism or concurrent sequences. Define success as both adequate throughput and an acceptable p95 latency at the required quality. Include memory headroom and rejected oversized requests. Write a rollback condition before recommending a production change.

## Check your reasoning

- Model weights fitting in memory prove the serving workload will fit: false; include runtime and cache needs.
- Reducing tensor parallelism automatically creates extra replicas: false; worker placement is a separate configuration decision.
- A larger batch is always cheaper per successful request: false; consider latency, failures and utilization.

Sources: [SageMaker inference optimization](https://docs.aws.amazon.com/sagemaker/latest/dg/inference-cost-optimization.html), [AWS LMI/vLLM deployment example](https://aws.amazon.com/blogs/machine-learning/accelerating-llm-inference-with-post-training-weight-and-activation-using-awq-and-gptq-on-amazon-sagemaker-ai/).
