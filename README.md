# Job Search Agent Repository

This repository captures the repeatable agent workflow for finding, ranking, tailoring, and applying to jobs using a base master resume, accumulated profile knowledge, and prior collaboration memory.

The operating target is a research budget of up to 30-60 roles, returning only evidence-supported matches ranked by rubric points, followed by tailored resumes, cover letters, application-question macros, and approved application submission.

## Repository Map

- `skills/job-search-agent/SKILL.md` - reusable Codex skill instructions for the agent.
- `workflow/daily-pipeline.md` - daily execution flow from sourcing to application logging.
- `workflow/match-scoring.md` - eligibility gates and evidence-backed 0–100 rubric.
- `workflow/tailoring-system.md` - resume, cover letter, and application-answer tailoring rules.
- `templates/` - reusable artifacts for resumes, cover letters, macros, trackers, and review notes.
- `config/search-profile.yaml` - editable target-role and filter configuration.
- `data/` - place source materials here, including the master resume and profile knowledge.

## Daily Operating Standard

1. Research up to 30-60 roles from approved job boards, company career pages, referrals, and alerts.
2. Score each role against the master profile using the match rubric.
3. Apply hard eligibility gates, then prioritize roles at or above 85 points unless the user explicitly asks to review stretch roles.
4. Produce a ranked shortlist with rationale, risk flags, compensation/location notes, and application status.
5. Tailor the resume for the top roles, preserving truthfulness and ATS readability.
6. Draft cover letters only when useful or required.
7. Prepare macros for application questions using the user's validated experience.
8. Submit applications only after the user has approved the role, tailored materials, and any application answers.
9. Log every application, source URL, submission date, versioned materials, and follow-up action.

## Authorization Boundaries

The agent may research roles, rank matches, and draft materials locally. Filling third-party forms may transmit personal data and requires the applicable authorization. It must not submit an application, invent credentials, misrepresent work authorization, fabricate employment history, or answer demographic/legal questions on the user's behalf without explicit direction.

## First Setup

Add the user's private source material to `data/private/`:

- `master-resume.md`
- `profile-knowledge.md`
- `job-search-memory.md`
- `target-companies.md`
- `application-history.csv`

Keep private files out of version control unless the user explicitly wants them committed.


## Self-contained skill and verification

Copy `skills/job-search-agent/` as a unit when installing; its reference links and optional checker are packaged inside that folder. The configuration is a generic template, not validated candidate data. Keep actual profile and application records private.

The optional Python 3 checker screens structured research evidence; it does not scrape boards, calculate fit scores, infer qualifications, or apply. See [record schema](skills/job-search-agent/references/record-schema.md).

```sh
python3 -m unittest discover -s tests -v
python3 skills/job-search-agent/scripts/check_jobs.py examples/research-fixture.json --now 2026-09-30T16:00:00Z
```

The synthetic fixture covers eligible pay, OTE, hourly contracts, state restrictions, unknown degree equivalency, stale verification, and a prior application. It contains no live listings or candidate data. No network services or third-party packages are required for these checks.
