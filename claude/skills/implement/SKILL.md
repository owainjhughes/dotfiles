---
name: implement
description: "The user's full engineering flow for a fix or feature — grill, plan, implement, simplify, verify, Codex review, draft PR."
disable-model-invocation: true
---

# /implement — linear engineering flow

Run these phases strictly in order. Create one todo per phase before starting. A phase begins only when the previous one is complete. Never skip or reorder. The only human gates are phase 1 (grill answers) and phase 2 (plan approval); after approval, phases 3-8 run without asking. Stop mid-flow only for genuine scope changes or destructive actions.

If invoked in the user's main checkout, run phases 3 onward in a worktree (or as a background job in one) so their working copy stays free.

## Phases

### 1. Grill
Invoke the `grilling` skill on the request. Iterate until the user confirms shared understanding.

### 2. Plan (approval gate)
Enter plan mode and write the plan. On approval:
- Create the feature branch immediately — no edit ever lands on develop.
- Save the grill conclusions + approved plan to `PLAN.local.md` in the worktree root. Never commit this file — when committing, stage files explicitly, never `git add -A`.

### 3. Implement
Execute the approved plan. Repo skills (backend-architecture / frontend-architecture / testing / yourtory-design-system) apply as normal. Commits on the feature branch are authorized as part of this flow.

### 4. Simplify
Invoke the `simplify` skill on the full diff. Then apply the user's contract to every survivor: remove defenses for rare cases whose failure is benign, remove speculative abstraction, and apply the comment rules (default zero new comments; see `~/.codex/AGENTS.md` and the yourtory-comment-style memory).

### 5. Verify (machine gate)
Run the repo's full verify (lint + type-check + test; `make verify`, or the direct script equivalents on Windows per the windows-dev-environment memory). Fix failures autonomously and re-run until green. Run the full suite ONCE here, not per-phase.

### 6. Codex review (adversarial gate)
The review must be done by Codex — a different model family reviewing is the entire point. Never substitute a Claude-based review (no /code-review, no ultra).
- Run the Codex plugin review over the full branch diff, passing `PLAN.local.md` as the spec to check conformance against.
- Prompt framing: flag real bugs, spec mismatches, and unnecessary complexity. Do NOT flag missing defenses for vanishingly-rare cases whose failure is benign.
- Filter findings through the same rule before acting: fix confirmed real issues (re-run verify if code changed), and report defensive-coding suggestions to the user as "Codex suggested X, skipping because Y".

### 7. Flywheel check
Did this run surface a correction or failure that is a repeating class? If yes, route it per the `harness-flywheel` skill and PROPOSE the fixation to the user — they decide; never fixate to the repo unprompted.

### 8. Draft PR
Push the branch and open a draft PR (`gh pr create --draft --base develop --assignee @me`). Body = the repo template `.github/pull_request_template.md`, filled exactly — add nothing outside its sections:
- **Summary**: 2-4 plain-English sentences, then one-line bullets only if needed. No trailing "because/so that" clauses.
- **Screenshots / Demo**: KEEP this section and its placeholder table, always. Fill the table in only if a Playwright loop actually ran during the flow (rare); otherwise leave it exactly as the template has it, so the user can paste images in themselves. Never delete it.
- **Notes for Reviewer** / **Concerns**: one-sentence bullets, only if there is something real to say; otherwise "None."
- Then repeat the WHOLE body in Japanese — Summary, Notes for Reviewer and Concerns, headings translated too. Screenshots / Demo is the only exclusion: it appears once, in the English half. The Japanese is a straight translation, never freewritten.
- No attribution footer, and no attribution line of any kind.

## Completion
Report done only when: verify green, Codex findings resolved or explicitly skipped with reasons, draft PR open. Final message: plain-English wrap-up (no jargon), worktree location, PR link.
