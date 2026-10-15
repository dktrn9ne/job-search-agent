# CheckChaser UI

A browser interface for the job-search-agent workflow, inspired by Jobmaxxer’s job queue, master CV editor, source-linked tailoring, exports and follow-ups.

## Run locally

Requires Node.js 18 or newer. From this directory run:

```sh
npm run dev
```

Open http://127.0.0.1:4173. Keep the server running while using the local version. Editable browser assets live in `web/`; `npm run build` produces the deployable Worker in `dist/`.

## Your first search

1. Open Master CV and add your validated experience, or import the Jobmaxxer-style structured master CV JSON.
2. Set target roles, locations, daily goal and optional minimum base pay in Preferences.
3. Have the job-search-agent produce records using its record schema. Import a JSON object containing jobs and optional history/policy. Your existing UI policy is preserved; imported history is retained.
4. Review each role’s evidence. The browser adapter evaluates the same eligibility gates as the Python checker: open posting, current verification, location, authorization, qualifications, compensation and duplicate history.
5. Tailor a CV by selecting exact source bullets. Save the result, download DOCX, or use Print / Save PDF. Export a tailoring brief to continue drafting with the agent.
6. Submit through the employer’s site, then record confirmation or uncertainty in the Application tab. Add a follow-up date.
7. Export agent records to pass updated history back to the agent. Export workspace backups for a complete restore.

## What is connected

Research import and export use the agent’s structured JSON contract. The browser eligibility adapter is checked against the original Python implementation and synthetic research fixture, included in tests/reference and tests/fixtures. It does not fetch job boards, call an AI provider or send applications. Your agent remains responsible for sourcing and evidence-backed drafting. A live agent service and cross-device database are future extensions.

Facts, jobs, answers and history save to this browser’s local storage. The hosted site is owner-private, but data does not automatically sync between browsers or between the hosted and local versions. Use workspace export/import to transfer it. File imports are explicit. Sample mode uses fictional records and does not overwrite the real workspace.

## CV exports

DOCX is generated as a genuine Office Open XML ZIP package with no third-party document dependency. PDF uses the browser print dialog. The page estimate is approximate; print headers, browser settings and font rendering can change pagination. Review the downloaded file before use.

Tailoring selects facts without rewording them. Master CV changes invalidate current role drafts and review flags. Recorded application snapshots preserve the submitted material while follow-up status changes.

## Verification

```sh
npm test
```

Tests need Python 3 for comparison with the original checker. Browser QA covered adding a role, evidence gates, source-based CV selection, DOCX download, application confirmation, history persistence, follow-ups, escaped research text and mobile layout.

The embedded reference checker carries the job-search-agent MIT license. Interface implementation is original; no Claude artifact API or Jobmaxxer assets are required.

## Evidence context contract
Read `context/domain_rules.md` and `context/table_guide.md` before running this workflow. Mandatory qualifications need requirement-to-proof records; unknowns stay in review. Deterministic checks validate structure, not source truth or model accuracy.


