# CheckChaser UI

## Resume uploads

In **Master CV → Upload resume**, choose a searchable PDF or DOCX (8 MB maximum; PDFs up to 30 pages). Review the extracted preview and select **Use this resume**, then correct any layout-dependent fields in the editor. Files are parsed locally in the browser; there is no resume-upload API or third-party parsing service. Scanned PDFs require OCR before upload. Unsupported, empty, damaged and password-protected documents return actionable errors.

Optional JSON accepts the exported master CV, a `{ "cv": ... }` wrapper, or the earlier named profile format with `experience` / `applied_ai_experience`. CheckChaser CV JSON validates section, entry and bullet IDs, arrays and text fields with field-specific errors. Failed imports and cancellation preserve the saved CV. Importing invalidates earlier material approvals.

Parsing preserves source wording, recognizes common headings, and maps pipe-separated company/role/date lines. Uncertain layouts remain editable source facts rather than inferred claims. Tailoring continues to select exact source bullets; this does not perform automatic rewriting or guarantee a third-party ATS score.

Use Node 22.13+ or 24. `npm ci`, `npm test`, `npm run validate`, and `npm run build` validate and bundle the app. `npm run dev` also builds the locally served PDF.js worker and Mammoth bundle. Generated vendor assets are ignored by Git and recreated during deployment. The Mammoth browser bundle excludes its command-line argparse/sprintf dependency path; npm audit currently reports three moderate findings on that unused CLI path.

Verification includes actual PDF/DOCX bytes, malformed JSON and schema errors, scanned/corrupt files, size/type limits, and selected-fact DOCX text extraction. Browser checks covered both upload formats, preview, persistence, fact selection, save and download; the downloaded DOCX was re-read to confirm selected facts were present and excluded facts absent.

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


