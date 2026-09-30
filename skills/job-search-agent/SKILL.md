---
name: job-search-agent
description: Run a high-volume, high-fit job search workflow using a master resume and validated candidate knowledge to find, rank, tailor, and prepare applications.
---

# Job Search Agent

Use this skill when the user wants an agentic job-search workflow that sources roles, scores fit, tailors materials, drafts application answers, and prepares applications from a master resume and validated profile knowledge.

## Inputs

Use the latest available versions of:

- Master resume.
- Candidate profile knowledge and prior job-search memory.
- Target role, industry, location, compensation, and work-authorization constraints.
- Application history, companies already contacted, and rejected roles.
- User preferences about tone, risk tolerance, application volume, and auto-apply approvals.

If source material is missing, proceed with the best available profile information and clearly mark unknowns that require user confirmation.

## Core Workflow

1. Source a daily pool of jobs from approved sources, prioritizing company pages and high-signal postings.
2. Deduplicate by company, role, location, posting URL, and description similarity.
3. Score each role from 0-100 using the match rubric in [workflow/match-scoring.md](workflow/match-scoring.md).
4. Keep 30-60 roles when possible, ordered from 99% to 85% fit.
5. Reject roles below 85% unless the user explicitly asks for stretch opportunities.
6. For each selected role, produce a concise fit rationale, risks, likely keywords, and recommended application strategy.
7. Tailor the resume by reordering, emphasizing, and phrasing only truthful existing experience.
8. Draft cover letters when required or strategically useful.
9. Draft application-question answers and reusable macros from validated facts.
10. Prepare applications for submission and request explicit approval before any submission.
11. Log every sourced role, application, versioned material, decision, and follow-up.

## Match Requirements

Prioritize roles where the candidate's evidence directly maps to the job's required outcomes. A high match must have strong overlap in job function, seniority, domain context, tooling, measurable impact, and location/work constraints.

Do not inflate scores because a role sounds desirable. Penalize unclear compensation, heavy onsite requirements, missing work-authorization fit, suspicious postings, extreme seniority mismatch, or requirements that would require inventing experience.

## Tailoring Rules

Maintain a single source of truth from the master resume and validated profile knowledge. Tailoring may change ordering, emphasis, keywords, summaries, and bullet framing. It may not fabricate employers, titles, dates, degrees, certifications, clearances, tools, metrics, or responsibilities.

Keep resumes ATS-friendly:

- Plain section headings.
- Consistent dates and titles.
- No tables unless the user explicitly wants a designed version.
- Keywords integrated naturally.
- Bullets focused on scope, action, tools, and measurable outcome.

## Application Answers

Use reusable macros for common questions, but adapt them to the company and role. If a question asks for legal, demographic, disability, veteran, background-check, immigration, salary, or availability information and the answer is not already validated, ask the user.

## Auto-Apply Boundary

The agent can fill drafts, stage applications, and prepare submission packets. It must get explicit user approval before submitting any application or sending any message. Batch approval is acceptable only when the user has reviewed the batch contents and approved that exact submission set.

## Output Standard

For each daily run, produce:

- Ranked match table.
- Top opportunities summary.
- Role-by-role tailoring notes.
- Resume and cover-letter files where requested.
- Application macros and question answers.
- Submission checklist.
- Updated application tracker.
