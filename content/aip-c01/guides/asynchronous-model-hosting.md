# Choose Asynchronous Model Hosting

Reviewed 2026-11-05. Optional lesson: choose a deployment from the caller's contract, payload, accelerator and latency needs.

## Distinguish the request contracts

A real-time endpoint keeps a request/response interaction open. An asynchronous endpoint queues work and returns an acknowledgement, with results obtained later. Batch Transform addresses offline datasets and jobs. A synchronous front end wrapped around an asynchronous model does not automatically give the user immediate model results; the application needs an accepted-job response and a completion/status path.

SageMaker Asynchronous Inference is designed for larger payloads and longer processing times than an interactive synchronous call. Its documented workload envelope includes requests up to 1 GB and processing up to one hour. It can use an appropriate GPU instance/container and can be configured to scale to zero; wake-up and queue latency still matter. These service limits are ceilings, not a latency promise.

## Follow an end-to-end job

In a common S3-backed flow, the client places input in S3 and submits its location with InvokeEndpointAsync. The service returns an identifier and output location; processing produces output in S3. Optional notifications can inform a completion handler. New API input forms should be checked in the current API reference rather than assuming every request must use one transport.

Separate the execution timeout from the maximum time waiting in a queue. Monitor backlog, failures and end-to-end completion time, not only the duration of a model computation. A worker that retries after losing a client connection must not silently create duplicate business-side effects.

## Try it

Compare four fictional workloads: an interactive chat, a GPU image job with a several-minute deadline, nightly inference over a large corpus and an intermittent small CPU request. For each, choose a hosting contract and explain one disqualifying constraint for another option. For the queued job, draw upload, acceptance, processing, result storage and client notification. Add the behavior when the endpoint is scaled to zero and when a queued request expires.

## Check your reasoning

- Does an accepted asynchronous invocation prove the result was generated? No; observe the terminal outcome.
- Does a scale-to-zero capability remove wake-up latency? No; allow for cold capacity and queue time.
- Does the word serverless alone prove an option supports the required GPU workload? No; check the specific hosting product and exclusions.

Sources: [Asynchronous Inference](https://docs.aws.amazon.com/sagemaker/latest/dg/async-inference.html), [InvokeEndpointAsync API](https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_runtime_InvokeEndpointAsync.html).
