# SageMaker FM lifecycle: from candidate to retirement

Checked against AWS documentation on 2026-11-22. This lesson covers deployment and governance of already customized models, rather than model-training algorithms.

## Choose the hosting boundary

Start with the required model, runtime, governance, latency, and operating model. If a supported Amazon Bedrock model and its deployment options meet the requirements, its managed APIs can reduce serving operations. Choose SageMaker AI dedicated hosting when you need direct control of the inference container and serving resources. Avoid a blanket claim that every customized model requires SageMaker: Bedrock has customization and import options, whose compatibility must be checked for the particular model.

A model release is more than weights. Record the exact package ARN and a manifest tying together weights or adapters, tokenizer, inference code, configuration, and container image. Use stable references and preserve the files needed to reproduce the tested serving behavior. These release-manifest practices are engineering recommendations derived from the component dependencies, rather than an AWS service that automatically guarantees reproducibility.

## Know which control answers which question

| Control | Question it answers | Boundary |
| --- | --- | --- |
| Model Registry version | Which candidate and metadata are we discussing? | Cataloging does not prove it is serving |
| Approval status | Has the configured release process accepted this version? | Does not grant IAM, S3, ECR, or KMS access |
| Pipelines condition | Did measured results satisfy a defined gate? | Only enforces conditions actually implemented |
| Lineage | Which tracked execution and artifacts produced this version? | Include custom workflow steps explicitly when needed |
| Model Card | What are the intended uses, risks, and evaluation observations? | Documentation does not enforce runtime policy |
| Endpoint deployment | Which serving configuration is provisioned? | Request acceptance does not prove the update finished |
| Runtime evaluation | How is the application behaving now? | Infrastructure health alone does not prove answer quality |

Model Group versions and an endpoint are different resources. For example, approving package version 24 does not itself replace an endpoint in an account without deployment automation. Some SageMaker project templates wire approval changes into CI/CD. Inspect the actual workflow before inferring what an approval transition does.

## Try it: a maintenance-advice assistant

A manufacturer has a fine-tuned open-weight FM that requires a custom inference runtime. Its service must retain a recoverable previous release for 30 days, reject unsupported repair advice, and limit production exposure during updates.

1. **Package the candidate.** Assign a unique release identity and preserve the complete serving bundle. Store the evaluation dataset revision and evaluator configuration with the release evidence. Bind later stages to the exact package ARN, avoiding a lookup of whichever version is latest when a delayed event executes.
2. **Evaluate before promotion.** Run representative repair questions, including hazardous and unsupported scenarios. Write the quality report as a pipeline output. A condition step can make passing evaluation a prerequisite for registration or another configured promotion step. The choice of quality threshold is the organization's policy, not a universal AWS threshold.
3. **Register and document.** Add the candidate to the appropriate Model Group. Record lineage to the relevant execution and artifacts, and document intended uses, known gaps, and evaluation findings in its Model Card. The registry is the release catalog; the card explains the evidence and limitations.
4. **Check deployment authorization.** Verify the release role can deploy and that the serving identity can retrieve the image and artifacts. In a cross-account design, validate the relevant registry, S3, ECR, and KMS policies. An Approved label cannot repair an artifact-access denial.
5. **Choose a compatible rollout.** For a compatible real-time endpoint, a shadow test can compare operational behavior using copies of live requests while production supplies client responses. Evaluate semantic quality separately. For promotion, a supported canary update can expose a small traffic share before the remaining shift. Configure appropriate alarms and verify their permissions.
6. **Observe the outcome.** Use endpoint state and release-specific operational metrics to verify the update. Keep the quality evaluation tied to the candidate's actual output. If repair advice regresses while latency remains normal, the content gate still fails.
7. **Retain and retire deliberately.** Keep the complete previous bundle through the recovery window. After the window, compute dependencies across active and retained releases before deletion. Delete serving resources when retiring an endpoint, then separately handle eligible metadata, artifacts, images, captured data, and identities according to their dependencies and retention requirements.

## Rollout compatibility and capacity

| Mechanism | Useful for | Critical constraint |
| --- | --- | --- |
| Shadow test | Compare a candidate with copied production requests | Native shadow tests exclude asynchronous and serverless inference, among other documented features |
| Blue/green canary | Shift a small portion, observe, then shift the remainder | Requires new fleet capacity; budget for both fleets during staged updates |
| Linear blue/green | Shift traffic in several equal increments | Longer observation increases overlapping fleet time |
| Rolling deployment | Replace a large fleet incrementally | Requires compatible endpoint features and capacity planning for batches and rollback |
| All-at-once | Shorter update with immediate full traffic shift | Larger immediate exposure to a regression |

Current deployment guardrails apply to asynchronous and real-time endpoints. That does **not** imply native shadow tests support both. Check each feature's compatibility independently. Marketplace containers and Inf1 instances have documented guardrail exclusions; new and old variant names must match for guardrail updates. Rolling deployments also exclude multi-variant endpoints. Do not infer that every capability supports every instance generation or hosting mode.

CloudWatch alarms are required for auto-rollback monitoring; the execution role needs `cloudwatch:DescribeAlarms` on the configured alarms. Select signals that measure the failure you care about. An error or latency alarm does not automatically measure unsupported advice.

## Production quality and the Model Monitor boundary

As of this check, SageMaker Model Monitor is closed to new customers; existing customers can continue. AWS documents an alternative using open-source SageMaker monitoring solutions, QuickSight, and CloudWatch. Existing Model Monitor users must also respect its tabular-statistics boundary: raw generated text does not acquire a universal factuality or hallucination metric merely because data capture is enabled.

For FMs, define the quality task and evaluator explicitly. SageMaker's foundation-model evaluation options include automated and human evaluation. A report measures the selected dimensions on the selected inputs; it is not a guarantee about every future answer. Monitor operational health and FM output quality as separate evidence streams, then combine them in promotion and incident decisions.

## Cleanup pitfalls

- Deleting an endpoint configuration does not delete its endpoint or stop its serving charges. Do not delete configurations still in use by live or updating endpoints.
- `DeleteModel` removes the SageMaker model entry. It does not delete its model artifacts, inference code, or IAM role.
- Retaining registry metadata while deleting the referenced image or tokenizer can make a promised rollback impossible.
- A successful `UpdateEndpoint` request is followed by an endpoint transition. Verify the outcome before removing prior release dependencies.

## Check your reasoning

1. A package is Approved but no release automation exists. Is production updated?
2. An asynchronous endpoint can use deployment guardrails. Can it therefore use native shadow tests?
3. The candidate passes latency and error thresholds but fails a repair-advice factuality check. Should it pass the release gate?
4. The old weights are retained but the tokenizer and image were deleted. Is rollback demonstrated?
5. Does deleting a model entry remove all files and permissions associated with it?

### Answers

1. No. Run the authorized deployment workflow and verify the endpoint outcome.
2. No. Native shadow testing excludes asynchronous inference.
3. No. The defined semantic requirement remains unmet.
4. No. Restore and validate the compatible complete serving bundle.
5. No. Artifact, image, identity, and serving cleanup have separate dependencies.

## Sources

AWS sources checked 2026-11-22:

- [Bedrock or SageMaker AI decision guide](https://docs.aws.amazon.com/decision-guides/latest/decision-guides/bedrock-or-sagemaker.html)
- [Model Registry](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html), [approval behavior](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry-approve.html), and [deployment and cross-account access](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry-deploy.html)
- [Pipelines conditional evaluation](https://docs.aws.amazon.com/sagemaker/latest/dg/define-pipeline.html), [pipeline lineage](https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines-lineage-tracking.html), and [Model Cards](https://docs.aws.amazon.com/sagemaker/latest/dg/model-cards.html)
- [Shadow tests](https://docs.aws.amazon.com/sagemaker/latest/dg/shadow-tests.html), [deployment guardrails](https://docs.aws.amazon.com/sagemaker/latest/dg/deployment-guardrails.html), [exclusions](https://docs.aws.amazon.com/sagemaker/latest/dg/deployment-guardrails-exclusions.html), [blue/green](https://docs.aws.amazon.com/sagemaker/latest/dg/deployment-guardrails-blue-green.html), [rolling deployments](https://docs.aws.amazon.com/sagemaker/latest/dg/deployment-guardrails-rolling.html), and [alarm configuration](https://docs.aws.amazon.com/sagemaker/latest/dg/deployment-guardrails-configuration.html)
- [Model Monitor limitations](https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor.html), [availability change](https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor-availability-change.html), and [FM evaluation options](https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-foundation-model-evaluate-get-started.html)
- [AWS example packaging model and tokenizer](https://aws.amazon.com/blogs/machine-learning/exploring-summarization-options-for-healthcare-with-amazon-sagemaker/), [UpdateEndpoint](https://docs.aws.amazon.com/sagemaker/latest/APIReference/API_UpdateEndpoint.html), and [resource deletion semantics](https://docs.aws.amazon.com/sagemaker/latest/dg/realtime-endpoints-delete-resources.html)
