---
name: deliver
description: "Autonomous issue-to-PR pipeline for technical issues: fetch the GitHub issue, triage, plan (Fable), implement via Sonnet subagents, simplify, verify, Codex review, open a ready PR to develop. Zero user interaction after invocation."
disable-model-invocation: true
allowed-tools: Bash PowerShell Read Edit Write Glob Grep Agent Skill EnterWorktree
---

# /deliver — autonomous issue → PR

The autonomous counterpart to /implement. The user invokes `/deliver issue #278` (also accepts `#278`, `278`, or a full issue URL; repo = current checkout) and does not interact again until the end. Run in the invoking session — never self-fork into a background job; the user backgrounds it themselves if they want.

**Scope: technical issues** — bugs, errors, well-specified fixes. A product or feature decision belongs to the user; a choice the repository already settles does not. Investigate before concluding which one you are looking at (see triage).

Create one todo per phase. Phases run strictly in order, fully autonomously — no questions to the user, ever. Every stop is an abort path (below), never a prompt.

The `allowed-tools` grant above pre-approves the whole pipeline for this turn, so no permission prompts appear; the run must therefore complete within the single invoking turn. PreToolUse hooks run before permission evaluation and are unaffected by the grant — the protected-branch git gate stays fully active.

## Phases

### 1. Fetch & triage
`gh issue view` the issue. Abort immediately with a clear message if the repo has no `develop` branch. Then run a grill-substitute on the issue: enumerate every open question and answer each from the code and repo conventions.

Investigate first, then judge. The test for an open question is **where the answer lives**, not how product-shaped it sounds: one the schema, the existing code, a convention or an ADR settles is closed, however many options the issue listed. Options an issue enumerates are candidates, not a mandate to choose between them; investigation usually kills most of them. A `needs:*` label on the issue records where someone else stopped, not a verdict to repeat. Reach your own conclusion; deferring to the label only re-derives it.

Two things are never grounds to abort. **That the change alters behaviour**: that is what a fix is, and it is what the issue asked for. **A side effect outside the issue's scope**: deliver the fix and record the side effect as an assumption, so the user can strike it from a working PR.

Abort — by posting the questions as an issue comment and stopping, before any code — if either:
- **Ambiguity**: after investigating, a question is still live, the repository is genuinely silent on it, and a wrong answer is not something the user can undo from the PR. Err toward resolving; an issue parked on a decision the code could have settled is a failure of this phase.
- **Size**: the work won't fit one coherent, reviewable PR (plan of roughly ≤8 tasks). The comment proposes a concrete split into sub-issues instead.

Otherwise proceed, recording every assumption made — they go in the PR body verbatim.

### 2. Plan
Create a fresh worktree off `develop`. Write the plan as a numbered task list to `PLAN.local.md` in the worktree root, with the triage assumptions at the top. Never commit this file — stage files explicitly, never `git add -A`.

### 3. Implement
Dispatch each plan task sequentially to an Agent subagent with `model: sonnet`, giving it the task, the relevant plan context, and the worktree path. After each task, sanity-check the diff against the plan before dispatching the next. A failed or off-plan task gets at most 2 retries with corrected instructions; if it still can't land, take the stuck path (below). Repo skills apply as normal. Commit as you go on the feature branch — conventional commits, and **every commit uses `--author "Claude <noreply@anthropic.com>"`**.

### 4. Simplify
Invoke the `simplify` skill on the full diff, then apply the user's contract to every survivor: remove defenses for rare cases whose failure is benign, remove speculative abstraction, default zero new comments.

### 5. Verify
Run the repo's full verify (lint + type-check + test; per the windows-dev-environment memory on Windows). Fix failures and re-run — but after 3 distinct failed fix attempts, take the stuck path. Green verify is required for a PR to exist.

### 6. Codex review
The review must be done by Codex — never substitute a Claude-based review. Run the Codex plugin review over the full branch diff with `PLAN.local.md` as the spec. Framing: flag real bugs, spec mismatches, and unnecessary complexity; do NOT flag missing defenses for vanishingly-rare benign cases. Filter findings through that same rule, dispatch fixes as a Sonnet task, re-run verify. If code changed, Codex re-reviews once — **max 2 rounds total**. Every finding still open or deliberately skipped goes in the PR body with its reason.

### 7. PR
Push the branch and open a **ready-for-review** PR: `gh pr create --base develop --assignee @me`. Body:
- Repo template skeleton (`.github/pull_request_template.md`), sections written in guide voice — for a reader who wasn't in the process: the context, what changed and why, how to review the diff. Keep the Screenshots placeholder table untouched.
- `Closes #N`.
- Added sections: **Assumptions & decisions** (from triage, verbatim), **Codex review** (rounds, fixed/skipped findings with reasons), **Attribution** — planned and written by Claude Code (Fable orchestrating, Sonnet implementing), reviewed by Codex; no human authorship.
- Then the whole body repeated in Japanese (straight translation, headings too; Screenshots appears once, in the English half). The added sections are translated like the rest.

## Abort paths
- **Triage abort** (ambiguity / size / no develop branch): issue comment with the questions or split proposal; no branch, no code.
- **Stuck** (task won't land after retries, or verify red after 3 fix attempts): push the branch, post an issue comment stating what was built, what fails, and the branch name; open no PR.

## Completion
Final message to the user: the PR link. Nothing else.
