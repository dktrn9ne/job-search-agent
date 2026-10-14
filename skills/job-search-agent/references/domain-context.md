# Job workflow domain rules
Version: 1.0 · Reviewed: 2026-10-14 · Owner: repository maintainer

Load before research, ranking, tailoring, or application logging. Candidate facts remain private; examples are synthetic. Current user instructions override default preferences. Never convert a compensation target into a hard floor without an explicit policy.

| Condition | Instruction | Reason | Correct / incorrect example |
| --- | --- | --- | --- |
| Evaluating required qualifications | Record each required condition, candidate proof, source reference and met/unknown/unmet assessment. Keep unknowns in review. | A general summary can hide a mandatory gap. | Three years of SaaS PM is unknown when only broad product ownership is evidenced; do not equate them. |
| Evaluating preferred qualifications | Report gaps separately; do not reject solely for a preference. | Preferred is not mandatory. | Missing optional tool experience is a gap, not a failed hard gate. |
| Reporting fit | Label points as rubric points, separate from eligibility. | Keyword overlap is not qualification proof or an interview probability. | 90 points with an unknown required condition stays in review. |
| Tailoring | Select or rephrase source-backed claims and retain their source IDs. | New wording must not invent new experience. | Reorder a verified bullet; do not add an unsupported metric. |
| Copying a base resume | Label output as a base copy awaiting tailoring and review. | File generation alone does not tailor content. | Prepared base copy, not tailored resume. |
| Logging submission | Require confirmation evidence; keep ambiguous attempts submission-uncertain and reconcile before retrying. | A click, draft, or provider acceptance is not employer confirmation. | Receipt or confirmation page, not generated PDF. |
| Reusing memory | Retain source, review date and scope; newer confirmed facts supersede old claims. | Memory can be stale or describe a different kind of experience. | Distinguish technical tenure from engineering tenure. |

## Required qualification evidence record
`requirement_evidence` is a non-empty array of `{requirement, required, assessment, candidate_evidence, source_ref}`. `required` is boolean; assessment is met, unknown, or unmet. Met requires both candidate evidence and source reference. The researcher must check completeness against the full posting; validators cannot detect an omitted requirement or verify a source's truth.

## Quality review
Run deterministic regression tests before release. Separately evaluate real model outputs against independently reviewed posting-to-proof maps, record false eligible decisions, unsupported claims, duplicate submissions, latency and cost. Do not claim model accuracy from schema tests. Review failures after meaningful changes and periodically during use.
