# Structured research checker

Run from this skill directory:

```sh
python3 scripts/check_jobs.py /path/to/private-research.json
```

Python 3 standard library only. It reads one local JSON file, outputs decisions to stdout, and performs no network calls or mutations. It trusts supplied evidence text; it cannot verify that text, diagnose a false claim, or independently parse a job description. Research must validate sources first. The helper is a conservative eligibility screen, not a scorer or application engine.

Input shape (all names below are literal):

```json
{
  "policy": {"minimum_base_usd": 120000, "verification_max_age_hours": 72},
  "history": [],
  "jobs": [{
    "company": "Example Co",
    "title": "Product Manager",
    "requisition_id": "REQ-123",
    "url": "https://careers.example.com/jobs/123",
    "alternate_urls": [],
    "posting_status": "open",
    "verified_at": "2026-09-30T12:00:00Z",
    "verification_source": "https://careers.example.com/jobs/123",
    "employment_type": "employee",
    "gates": {
      "location": {"status": "pass", "evidence": "Posting explicitly accepts candidate's state; profile location verified"},
      "work_authorization": {"status": "pass", "evidence": "Validated candidate answer matches posting"},
      "qualifications": {"status": "pass", "evidence": "Required qualifications mapped to documented candidate evidence"}
    },
    "compensation": {
      "currency": "USD", "type": "base", "period": "year",
      "minimum": 130000, "maximum": 160000,
      "source": "Employer's location-specific posting band"
    }
  }]
}
```

The example is synthetic, not a candidate's private profile or live job. Replace its placeholders with real evidence. A null/omitted pay floor means no numeric pay gate, not a claim that compensation is known. Missing mandatory gate information yields `review`. Gate statuses are `pass`, `fail`, or `unknown`. Posting statuses are `open`, `closed`, or `unknown`. Use `employment_type: contract` for contracts, even when an annual amount is advertised. For hourly illustrations use `period: hour`, `hours_per_week`, and `weeks_per_year`; never supply assumed hours as established facts.

History records need company/requisition ID and/or direct URL/alternate URLs, plus `status`. Submitted/applied/interviewing/offer/rejected/withdrawn histories block another application to that same requisition. Keep history for submissions even if rejected or withdrawn; resubmission requires a deliberate separate decision. Prepared/failed records do not count as submitted. A matching `submission-uncertain` history goes to review and must be reconciled before retrying.

Results are `eligible`, `review`, `reject`, `already_applied`, or `duplicate`, with reasons. When batch identities collide, an earlier eligible record moves to review; later duplicates preserve their original gate decision and reasons. Merge all evidence and reevaluate before use; no record is silently preferred. URL fragments and identity query parameters are preserved because ATS systems can route requisitions through them. The tool does not fuzzy-match company aliases/titles or determine cross-board requisition identity without explicit IDs/aliases. These remain research checks. Use `--now 2026-09-30T13:00:00Z` only for reproducible fixtures; production uses the actual UTC time.
