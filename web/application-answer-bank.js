export const APPLICATION_ANSWER_BANK=[
 {
  id:'ai-product-ownership',
  category:'AI product ownership',
  question:'Describe the most significant AI, GenAI, or ML-enabled product you have owned. What decisions were you personally responsible for, and what outcomes did the product achieve?',
  answer:'The most significant AI-enabled product I have owned is FiveM Developer, a reusable agentic AI product that turns complex game-development workflows into guided, multi-step agent capabilities. I was personally responsible for defining the user problem, product scope, MVP requirements, roadmap, and release priorities. I designed how the agent selects tools, manages context, interacts with APIs, structures outputs, handles incomplete information, and recovers from failures. I also established the evaluation approach, using realistic tasks, adversarial prompts, and edge cases to test instruction adherence, accuracy, reliability, and usability. Based on observed usage and failure patterns, I decided which workflows to improve, simplify, or expand. I owned the product from concept through implementation, publication, and iteration across product management, prompt and context design, technical architecture, quality evaluation, and user experience. FiveM Developer has achieved more than 3,100 downloads through ClawHub. Together with Mux Video Bot, my published agent capabilities have exceeded 5,600 cumulative downloads.',
  evidence:['FiveM Developer: 3,100+ ClawHub downloads','FiveM Developer and Mux Video Bot: 5,600+ cumulative downloads','Owned tool selection, context management, structured outputs, failure handling, publication, and iteration'],
  guardrail:'Do not imply revenue, retention, enterprise adoption, or outcomes beyond the documented download figures.',
  tags:['agentic AI','product ownership','LLM evaluation','0-to-1']
 },
 {
  id:'healthcare-ai-trust',
  category:'Healthcare AI',
  question:'If you have experience with AI in healthcare, describe how you addressed clinical trust, explainability, or decision-support requirements.',
  answer:'I hold a HIPAA certification and understand that healthcare AI must earn trust through privacy protection, transparency, and appropriate human oversight. Although my AI work has not involved owning an autonomous clinical decision-making system, I have evaluated advanced GenAI experiences using structured rubrics, adversarial testing, edge-case analysis, and detailed failure classification. I would apply the same discipline in healthcare by clearly defining the system\'s intended use, validating outputs against approved evidence, documenting limitations, and making the basis for recommendations understandable to clinicians and users. For decision-support products, I believe AI should augment, not replace, qualified clinical judgment. I would prioritize human-in-the-loop review, confidence and uncertainty indicators, source traceability, audit logs, escalation paths, and safeguards that prevent unsupported recommendations from being presented as medical facts. My HIPAA training also informs how I approach minimum-necessary data access, sensitive-data handling, role-based permissions, and avoiding protected health information in model prompts or logs unless the system is explicitly designed and authorized for it.',
  evidence:['HIPAA certification confirmed by Maurice','Structured GenAI evaluation, adversarial testing, edge-case analysis, and failure classification'],
  guardrail:'State clearly that direct ownership of an autonomous clinical decision-making system is not claimed.',
  tags:['HIPAA','healthcare AI','clinical trust','explainability','human in the loop']
 },
 {
  id:'ai-evaluation-lifecycle',
  category:'AI evaluation',
  question:'How did you evaluate whether an AI system was performing well before and after launch?',
  answer:'Before launch, I define the AI system\'s intended outcomes and convert them into a structured evaluation rubric. I test task completion, accuracy, instruction adherence, reasoning quality, usability, latency, and safe failure behavior. I also use representative scenarios, adversarial prompts, edge cases, and incomplete or conflicting inputs to identify hallucinations and behavioral inconsistencies. After launch, I treat the agent like an employee receiving a recurring performance review. Every two weeks, I review user feedback, production failures, successful interactions, newly available context, and qualitative notes. I identify whether each issue comes from instructions, context, tool use, workflow design, or the underlying model, then create a prioritized improvement plan. Each discovered failure becomes a new evaluation or regression test. I update the agent\'s instructions, knowledge, tools, or workflows and compare the revised version against the previous baseline before promoting it. My standard is not whether the model produces a plausible response, but whether the complete system delivers reliable, explainable, and repeatable outcomes that improve over time.',
  evidence:['Structured rubric-based evaluation','Adversarial prompts, edge cases, and failure analysis','Biweekly agent-review process selected as the CheckChaser improvement cadence'],
  guardrail:'Describe the biweekly review as the operating process being implemented; do not invent historical metric improvements.',
  tags:['evals','pre-launch','post-launch','regression testing','continuous improvement']
 },
 {
  id:'ai-failure-mode',
  category:'AI quality and safety',
  question:'Describe a failure mode, hallucination risk, or quality issue you encountered in an AI product. How did you address it?',
  answer:'One failure mode I encountered in an agentic AI product was the system producing a confident, plausible answer when a required tool call had failed or when the available context was incomplete. Instead of clearly reporting the missing information, the agent could infer an outcome that had not been verified. This created a trust risk because the response looked successful even though the underlying task had not been completed. I addressed the issue at several levels. I revised the agent instructions to distinguish explicitly between observed tool results, model inference, and unavailable information. I required successful tool output before the agent could claim completion and added structured response fields for status, evidence, uncertainty, and next action. I also added input validation, API-error handling, retry limits, and escalation paths. When necessary evidence was unavailable, the agent had to stop, explain the limitation, and request clarification or human review. Finally, I created adversarial and regression tests covering missing context, conflicting inputs, malformed responses, unavailable tools, and partial execution. Each newly observed failure became a permanent evaluation case.',
  evidence:['Agent tool-use, context-management, structured-output, and failure-handling work','Adversarial evaluation and failure analysis experience'],
  guardrail:'Do not claim a quantified error-rate reduction unless measurement data is added later.',
  tags:['hallucination','tool failure','guardrails','regression testing']
 },
 {
  id:'ai-product-tradeoff',
  category:'Technical product decisions',
  question:'Describe a technical decision involving AI, LLMs, data architecture, or model implementation where you had to make a product tradeoff. What options were considered and how was the decision made?',
  answer:'While building CheckChaser, an AI job-search agent, I had to decide how much autonomy to give the LLM. The product goal was to help a job seeker evaluate 30-60 opportunities per day, but allowing the agent to search, make eligibility decisions, answer screening questions, and submit applications without review created accuracy, privacy, and trust risks. I considered a fully autonomous agent, a recommendation-only tool, and a hybrid system with automated research and a human approval gate. Full autonomy offered the highest speed but could act on duplicate, expired, underpaid, or poorly matched roles and transmit incorrect personal information. A recommendation-only product was safer but left too much repetitive work to the user. I chose the hybrid approach. The agent searches approved sources, normalizes opportunities, verifies compensation and location requirements, checks sponsorship rules, scores fit, identifies qualification gaps, and deduplicates against prior activity. It can prepare tailored materials, but application submission and sensitive screening responses require explicit approval. The decision was based on task risk: automate high-volume, reversible research while keeping consequential and identity-bearing actions under human control.',
  evidence:['CheckChaser product and operating workflow','30-60 daily opportunity target','Human approval required before external submission'],
  guardrail:'Do not imply that CheckChaser autonomously submits applications.',
  tags:['LLM autonomy','human approval','data architecture','product tradeoff']
 },
 {
  id:'ai-workflow-impact',
  category:'AI product outcomes',
  question:'How did the AI capability change the user\'s workflow? What evidence did you have that it improved outcomes versus the prior process?',
  answer:'Before CheckChaser, the workflow was fragmented and repetitive: search multiple job boards, open each listing, confirm that it was active, interpret compensation and location requirements, compare the role with several resume versions, check for duplicates, and decide whether to apply. The AI capability changed the workflow from manual search to exception-based review. The agent gathers opportunities from approved sources, converts inconsistent postings into a common structure, applies salary, location, work-authorization, and role-fit rules, removes duplicates, identifies qualification gaps, and recommends the appropriate resume positioning. The user reviews a ranked shortlist with the evidence behind each recommendation and approves or rejects roles in batches. During the pilot, the clearest evidence was behavioral and operational rather than a completed hiring-outcome experiment: the system produced repeatable batches, supported group approvals, maintained application history, and surfaced expired listings, unverified compensation, and misleading location labels before submission. I would measure long-term improvement through time-to-qualified-shortlist, approval rate, rule-violation rate, application completion, recruiter responses, interviews, and offers. I would not claim improved hiring outcomes until those downstream measures show sustained lift over the prior manual process.',
  evidence:['CheckChaser pilot produced ranked batches and group approvals','Application history and duplicate controls are implemented','Eligibility checks flag posting, compensation, and location uncertainty'],
  guardrail:'Do not claim a hiring-outcome lift or quantified time savings before comparative data exists.',
  tags:['workflow transformation','outcomes','job search','metrics']
 }
];


