# Job Search Agent Repository

This repository captures the repeatable agent workflow for finding, ranking, tailoring, and applying to jobs using a base master resume, accumulated profile knowledge, and prior collaboration memory.

The operating target is a daily batch of 30-60 strong job matches ranked from 99% down to 85%, followed by tailored resumes, cover letters, application-question macros, and approved application submission.

## Repository Map

- `skills/job-search-agent/SKILL.md` - reusable Codex skill instructions for the agent.
- `workflow/daily-pipeline.md` - daily execution flow from sourcing to application logging.
- `workflow/match-scoring.md` - scoring rubric for 99%-85% match ranking.
- `workflow/tailoring-system.md` - resume, cover letter, and application-answer tailoring rules.
- `templates/` - reusable artifacts for resumes, cover letters, macros, trackers, and review notes.
- `config/search-profile.yaml` - editable target-role and filter configuration.
- `data/` - place source materials here, including the master resume and profile knowledge.

## Daily Operating Standard

1. Source 30-60 qualified roles from approved job boards, company career pages, referrals, and alerts.
2. Score each role against the master profile using the match rubric.
3. Keep only roles at or above 85% unless the user explicitly asks to review stretch roles.
4. Produce a ranked shortlist with rationale, risk flags, compensation/location notes, and application status.
5. Tailor the resume for the top roles, preserving truthfulness and ATS readability.
6. Draft cover letters only when useful or required.
7. Prepare macros for application questions using the user's validated experience.
8. Submit applications only after the user has approved the role, tailored materials, and any application answers.
9. Log every application, source URL, submission date, versioned materials, and follow-up action.

## Authorization Boundaries

The agent may research roles, rank matches, draft materials, and prepare application forms. It must not submit an application, invent credentials, misrepresent work authorization, fabricate employment history, or answer demographic/legal questions on the user's behalf without explicit direction.

## First Setup

Add the user's private source material to `data/private/`:

- `master-resume.md`
- `profile-knowledge.md`
- `job-search-memory.md`
- `target-companies.md`
- `application-history.csv`

Keep private files out of version control unless the user explicitly wants them committed.

