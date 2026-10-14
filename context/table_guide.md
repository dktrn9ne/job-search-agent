# Workflow record guide
Version: 1.0 · Reviewed: 2026-10-14

- Research role grain: one employer requisition, identified by employer/requisition ID or canonical role URL. Different boards can refer to the same role.
- `gates`: hard-constraint assessments, each with evidence. Unknown is neither pass nor failure.
- `requirement_evidence`: required/preferred conditions mapped to source-backed candidate proof. See domain_rules.md.
- `fit_points`: rubric ranking, never a percentage probability or eligibility override.
- `verified_at`: timezone-aware time the posting was actually checked; not its publication date.
- `compensation`: preserve currency, period, base/OTE/total type and source. Hourly annualization is illustrative, with assumptions; do not describe it as guaranteed salary.
- Documents: generated files and source versions; generated does not imply tailored or approved.
- Application history: one attempt and its evidence; prepared, submitted, submission-uncertain and failed are distinct. Keep prior attempts when refreshing a role.
- Candidate claims: private, source-backed facts; a public repository example is never candidate proof.

Adapters: job-search-agent uses JSON research batches; job-hunter-bot uses SQLite jobs/documents/events; CheckChaser uses durable research JSON and browser-local CV/application history. Research sync is not application-history sync.
