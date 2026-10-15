# CheckChaser job-search agent

This agent reads an import-ready CheckChaser resume, the current search policy, and an optional export of prior jobs and outcomes. It searches live postings, verifies strict eligibility gates, removes duplicates, and writes a staged research batch that CheckChaser can import.

It never submits applications or contacts employers.

## Run

```powershell
npm run agent:search -- --resume "..\Maurice_Thomas_Hims_Hers_AI_Product_Manager_Resume.json" --count 12
```

To include prior CheckChaser history, export **Agent records** from the Job queue and add:

```powershell
--context "C:\path\to\checkchaser-agent-records.json"
```

The default result is written to `agent/output/checkchaser-agent-batch.json`. Import it through **Job queue -> Import research** and review every role before taking external action.


