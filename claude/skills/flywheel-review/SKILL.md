---
name: flywheel-review
description: "Batch-review pending flywheel proposals: list the repo's flywheel-labeled issues, get a decision on each, route accepted ones per harness-flywheel, close the rest."
disable-model-invocation: true
---

# /flywheel-review — the flywheel inbox

Fixation proposals that were not decided in the session that raised them land in the repo's flywheel inbox (filed by /implement phase 7, or by hand). The inbox location is a repo decision: GitHub issues labeled `flywheel` in repos that track work on issues (work repos like Yourtory), an untracked `FLYWHEEL.local.md` at the repo root elsewhere. This skill empties the inbox in one sitting.

## Process

### 1. List
Check both sources: `gh issue list --label flywheel --state open` and `FLYWHEEL.local.md` at the repo root. If both are empty, say so and stop. First runs only: task memories may still carry "flywheel proposals pending" entries that predate the inbox — offer once to move those into the repo's inbox so everything lives in one queue.

### 2. Present
For each issue, one short block: the failure or correction it came from, the proposed fixation layer per the repo's `harness-flywheel` skill (lint/test > AGENTS.md > skill > ADR > drop), and a recommendation stating the counter-argument it survived. Batch the decisions with AskUserQuestion where the list allows. The user decides each: accept, reject, or defer.

### 3. Route
- **Accepted** — implement per `harness-flywheel` on a feature branch. The normal contract applies: no commit without an explicit instruction. Regression-check that the new rule actually catches the original failure. Close the issue linking to where the rule landed (or remove the `FLYWHEEL.local.md` entry, noting where it landed).
- **Rejected** — close (or remove the entry) with a one-line reason.
- **Deferred** — leave in the inbox.

### 4. Report
Plain-English summary: what was decided, where each accepted rule landed, what stays open.
