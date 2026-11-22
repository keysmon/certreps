# Data services and multimodal pipelines

Reviewed: 2026-11-22. Optional depth lesson for AIP-C01 Task 1.3, especially skills 1.3.1 through 1.3.4. These are original learning scenarios, not recalled exam content.

## Start with the acceptance contract

A model-input pipeline is a sequence of transformations and decisions. A successful extraction API request does not establish that the result is complete, safe to publish, or formatted for the selected inference API. Define what is allowed to cross the model-input boundary before selecting services.

For a claim-processing assistant, that contract might require a stable claim ID, an approved source, a supported language, a valid currency code, source-linked extracted fields, and a privacy assessment that passed. A payment workflow can require additional human confirmation of uncertain account details. A summary workflow might tolerate a misspelled description but still reject an ambiguous claim ID.

Separate three kinds of validity:

- Structural validity: required fields exist, types match, and the model request uses the selected API contract.
- Semantic validity: amounts, dates, identifiers, relationships, and extracted meanings satisfy the business rules.
- Eligibility: the source is approved and privacy, access, and review conditions permit this derivative to be used.

A schema-valid number can still be the wrong invoice amount. A perfectly extracted document can still lack permission for use. The official task explicitly covers validation, complex modalities, model-specific input formatting, and input-quality improvement. [AWS exam guide](https://docs.aws.amazon.com/aws-certification/latest/ai-professional-01/ai-professional-01-domain1.html)

## Match the service to the processing boundary

| Service or capability | Useful pipeline responsibility | What still needs an explicit decision |
| --- | --- | --- |
| AWS Glue Data Quality | Evaluate structured-data rules, including required values and dataset-level conditions | Which failures block publication; which supported row checks can isolate individual failures |
| SageMaker Data Wrangler in Canvas | Explore tabular quality and build reusable preparation transformations | Which transformations preserve business meaning; how the flow becomes a production gate |
| Amazon Macie | Discover sensitive data in the S3 data estate and report findings | Remediation, corpus eligibility, and the publication workflow |
| Amazon Comprehend | Extract linguistic entities or use a supported PII operation on text | Feature-specific languages, confidence policy, and use of text offsets |
| Amazon Textract | Extract text and document structures from supported documents | Field correctness, document quality, and appropriate human scrutiny |
| Amazon Transcribe | Convert speech into text and identify supported languages | Feature compatibility, transcript validation, and downstream privacy controls |
| Bedrock Data Automation | Extract information from multiple modalities through a managed interface; use document blueprints for named business fields | Output validation, review thresholds, source linkage, and asynchronous completion |

Glue rules assess data properties; Data Wrangler provides an interactive preparation experience. They can complement each other. The current Data Wrangler experience is in SageMaker Canvas; instructions centered on the earlier Studio Classic experience require a migration check. [Glue overview](https://docs.aws.amazon.com/glue/latest/dg/glue-data-quality.html), [Data Wrangler in Canvas](https://docs.aws.amazon.com/sagemaker/latest/dg/canvas-data-prep.html)

Macie discovery and text PII processing also serve different boundaries. Macie produces sensitive-data findings about S3 data. An application creating redacted text needs a separate processing path. Comprehend PII detection supports English and Spanish; its language coverage should not be inferred from the coverage of ordinary entity detection. [Macie](https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html), [Comprehend PII](https://docs.aws.amazon.com/comprehend/latest/dg/pii.html), [Comprehend entities](https://docs.aws.amazon.com/comprehend/latest/dg/how-entities.html)

## Enforce quality at the correct granularity

Consider a daily supplier catalog. The contract requires every offered item to have a valid supplier ID, every price to be nonnegative, and the delivered batch to include the expected set of products. Individual records may satisfy their own checks even when half the expected delivery never arrived.

Use two release decisions: one for the batch and one for individual records. Supported row-level checks can separate invalid rows for quarantine. A failed dataset-level delivery check can block the whole batch. Publishing all rows marked Passed would not repair the missing records.

Also define severity. A 99% quality score means a fraction of evaluated rules passed; it does not establish that a mandatory rights or identity rule passed. Mark mandatory constraints explicitly rather than hiding their importance inside an average.

Glue exposes quality outputs and failure actions. The default does not automatically turn every ruleset failure into a failed ETL job. Configure the intended gate and confirm that it prevents target publication. Dataset-level failures and passing individual row outcomes can coexist. [Glue ETL outputs and actions](https://docs.aws.amazon.com/glue/latest/dg/tutorial-data-quality.html)

Watch null semantics. A CSV string column can contain an empty string that satisfies a non-null check. If an ID must contain meaningful characters, normalize whitespace and test for nonblank values too. Casting an alphanumeric ID to an integer can destroy legitimate IDs and leading zeros. [IsComplete behavior](https://docs.aws.amazon.com/glue/latest/dg/dqdl-rule-types-IsComplete.html)

## Use confidence to allocate review

Confidence is evidence about an extraction, not a universal release policy. Define thresholds using representative reviewed data and the consequence of each error. An uncertain product description and an uncertain payment destination should not receive the same treatment.

A useful decision record includes the field, extracted value, source location, confidence where available, validation result, processing version, and review disposition. Preserve a distinction between machine extraction and a reviewer correction. Do not silently replace original evidence with a generated summary.

Textract recommends considering confidence alongside use-case sensitivity. Better input quality also matters: repeatedly processing an unreadable scan may not fix it. Route a low-quality document toward rescanning or review when warranted. [Textract best practices](https://docs.aws.amazon.com/textract/latest/dg/textract-best-practices.html)

For BDA, standard outputs provide modality-dependent information, while document blueprints let an application specify business fields. Compare a blueprint approach with Textract plus custom normalization using the same reviewed documents and field schema. Measure critical-field errors, review volume, and operational complexity. A shorter orchestration graph alone does not establish extraction quality. [BDA processing concepts](https://docs.aws.amazon.com/bedrock/latest/userguide/bda-how-it-works.html), [Document custom output](https://docs.aws.amazon.com/bedrock/latest/userguide/bda-custom-output-idp.html)

## Preserve text and source identity across transformations

A Comprehend PII result includes offsets into the analyzed text. If another component changes that text before masking, the old offsets can point at the wrong characters. Either apply the detections to the exact analyzed text or analyze the transformed text again. Keep the text version connected to the detections. [PII entity offsets](https://docs.aws.amazon.com/comprehend/latest/dg/how-pii.html)

For every derivative, retain a stable source reference, such as an object version or content hash, and the processing configuration version. An object name alone is insufficient when the same key can be overwritten. A completion timestamp alone cannot reconstruct the input bytes. These are application-design recommendations for reproducible validation, rather than automatic guarantees supplied by an extraction service.

Keep the original source under appropriate access control. Store cleaned model-ready content separately from raw or quarantined content. An assistant should not gain access to an unreviewed raw transcript merely because a processing job is still running.

## Try it: bilingual claims intake

An insurer receives an English claim PDF, a photo of damaged equipment, and a call recording that switches between English and Spanish. The assistant summarizes the case but cannot publish raw personal information. The payout service additionally requires a confirmed amount and destination. The following design illustrates the decisions; it is not a service quota or a required AWS reference architecture.

1. **Register the intake.** Assign a claim ID and record source identity, media type, ownership, and received language information. Preserve the raw objects in a controlled location. Reject unsupported files before expensive processing.
2. **Choose preparation paths.** Use a supported document extractor for the PDF and a suitable image-analysis path for the equipment photo. A BDA project can organize modality-specific extraction; a document blueprint can define claim fields. The image description remains an extracted observation, not proof of the amount owed.
3. **Transcribe the call.** Use multi-language identification for supported code-switching audio. Check the exact language and feature matrix. A feature supported for a batch language is not necessarily supported in streaming mode. [Language identification](https://docs.aws.amazon.com/transcribe/latest/dg/lang-id.html), [Feature matrix](https://docs.aws.amazon.com/transcribe/latest/dg/supported-languages.html)
4. **Enforce the privacy stage.** A streaming language-identification request cannot combine built-in redaction with that feature. Use a compatible separate privacy stage and keep its outputs blocked from the summarizer until it passes. If using Comprehend PII for the resulting supported English or Spanish text, maintain the association between text versions and detections. Unsupported-language material needs a validated alternative path. [Streaming API compatibility](https://docs.aws.amazon.com/transcribe/latest/APIReference/API_streaming_StartStreamTranscription.html)
5. **Validate the combined record.** Check claim ID consistency, required fields, currency and amount rules, processing status, and privacy disposition. Do not average away an uncertain payment field because the description is high confidence. Queue the critical field for review.
6. **Wait for completion.** If using BDA asynchronous processing, retain the invocation identifier, retrieve status, and validate the completed output. Acceptance of the start request does not justify publishing an empty result. [BDA API workflow](https://docs.aws.amazon.com/bedrock/latest/userguide/bda-using-api.html)
7. **Prepare inference input.** Serialize the validated, permitted derivative according to the selected model and API contract. Keep source evidence references available for verification. An API-compatible payload does not waive business validation. [Converse API](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html)
8. **Publish or quarantine.** Publish only the approved representation. Quarantine a failed source or field with reasons and processing versions. A repaired source or revised blueprint creates a traceable new attempt, and its output must pass the same release checks.

A possible failure illustrates the boundary: the recording is transcribed successfully, but its privacy stage fails. The claim PDF can still be independently processed if policy allows, while the unassessed transcript remains unavailable to the summarizer. The disposition should be visible as partial intake rather than silently presented as a complete case.

## Quarantine and reprocessing contract

Quarantine is useful only when it has an owner and a replay path. Record the failed contract, evidence location, supported remediation, and what would make the record eligible for another attempt. Distinguish a transient service failure from an invalid input, an uncertain extraction, and a policy rejection. Retrying the same unsupported feature combination cannot correct its contract.

When a normalization rule or blueprint changes, preserve the earlier attempt and its disposition. Reprocessing should identify both the source version and the new configuration. Before replacing a published derivative, rerun the acceptance checks. Do not infer that a successful later attempt validates the earlier result.

## Failure checklist

- Did an API call only start work, or is the extraction terminally complete?
- Does the serving location receive only data that passed the required gate?
- Are row-level outcomes being confused with batch completeness?
- Can an aggregate quality score conceal a mandatory failure?
- Are semantic blank strings accepted as meaningful IDs?
- Are model inputs serialized for the selected inference API and model?
- Does every detected entity or PII operation support the actual language?
- Are streaming features compatible in the same request?
- Are text offsets applied to the exact text version that was analyzed?
- Can a critical low-confidence field hide inside a document average?
- Can a reviewer trace a derivative to the source and processing version?
- Does a quarantine entry explain how correction and replay work?

## Check your reasoning

**1.** Every delivered row passes its field checks, but the required daily delivery count fails. Can the pipeline publish based only on the row pass rate?

**2.** An extraction produces a schema-valid amount with weak evidence. Does valid JSON make it safe to pay?

**3.** A streaming pipeline needs multi-language identification and PII protection. Can it assume built-in streaming redaction works in the same request?

**4.** Whitespace normalization occurs after PII analysis. What must happen before using the returned offsets?

**5.** A document blueprint revision fixes a common date error. What distinguishes the corrected result from an earlier extraction?

### Answers

1. No. Row validity does not establish batch completeness. Enforce the batch-level release condition separately.
2. No. A structural constraint does not prove the field value. Apply business validation and required review.
3. No. Check compatibility and separate incompatible processing stages; enforce the privacy stage before downstream access.
4. Mask the exact analyzed text, or analyze the changed text again. Preserve the text-to-detection version relationship.
5. Its source identity, processing or blueprint version, attempt tracking, and new validation disposition. Rerun the release checks before publication.

## Source and verification limits

The linked primary AWS documentation was checked on 2026-11-22. This lesson does not claim live deployment testing or an AWS workload execution. Regional availability, supported file types, language combinations, quotas, and new feature availability must be verified for an actual deployment. BDA documentation currently differs across pages about custom-output modality coverage; this lesson uses document blueprints and makes no claim about video custom-output availability.
