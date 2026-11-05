# CertReps

Free, original, deeply-explained practice exams for IT certifications.
No signup, no paywall, no brain dumps.
First cert: AWS Certified Generative AI Developer - Professional (AIP-C01).

- `app/` - Next.js App Router site (static SEO pages + client exam engine)
- `content/` - question banks (JSON) + study guides (Markdown). Git is the CMS.
- `pipeline/` - content generation/validation tooling
- `docs/specs/` + `docs/plans/` - design spec and implementation plans

Dev: `npm install && npm run dev`
Test: `npm test`
Typecheck: `npm run typecheck`
Content gate: `python3 pipeline/validate_bank.py` (validates every cert; `--cert <certId>` for one) must pass before committing any change to `content/*/questions.json`.
Published-bank invariant (review-past replays depend on it): question ids are append-only - never delete or renumber; `options` and `correct` are immutable once published; `explanation` and `docUrl` may be improved.

CertReps is an independent study resource.
Not affiliated with, endorsed by, or sponsored by Amazon Web Services.
All questions are original - never actual exam content.

### Reviewed question lifecycle

`getBank` retains all published records for historical grading. New practice uses
`getPracticeBank`; every sampler also excludes `excludedFromPractice` records.
A question with a defective stem, option, or answer key is retired and replaced
with an appended ID (`supersededBy`), preserving published options and keys.
Unresolved items remain excluded until reviewed. Existing sessions containing
excluded items must start fresh; their saved history is preserved. Completed mocks
containing excluded items remain reviewable but do not contribute to readiness.
The AIP-C01 source review and correction mapping is in `content/aip-c01/review.json`.


### AIP-C01 implementation-depth release

The 2026-11-05 release adds 60 original scenarios and replaces 40 weaker records under
new IDs. Its item-level sources, supersessions and historical-contract checksum are
in `content/aip-c01/depth-release-2026-11-05.json`. All 100 scenarios include canonical
option rationales; six optional implementation lessons and a resource/readiness guide
are available from the AIP-C01 curriculum. Practice scores are not AWS pass guarantees.

Quick practice uses available exam-domain weights before approximate difficulty
balancing, retaining adaptive item weights within each domain. Depleted domains
backfill from remaining active content. Full-mock quotas are unchanged.
