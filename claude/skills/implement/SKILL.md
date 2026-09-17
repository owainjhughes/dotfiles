---
name: implement
description: "The user's full engineering flow for a fix or feature — grill, test runbook, plan, implement, simplify, verify, live test, Codex review, PR, CI, bookkeeping."
disable-model-invocation: true
---

# /implement — linear engineering flow

Run these phases strictly in order. Create one todo per phase before starting. A phase begins only when the previous one is complete. Never skip or reorder. The only human gates are phase 1 (grill answers), phase 2 (the test runbook), phase 3 (plan approval) and phases 7 and 11 when a failure needs a real decision; otherwise phases 4-12 run without asking. Stop mid-flow only for those, genuine scope changes, or destructive actions.

If the tree turns out to have moved under an approved plan anyway, stop and re-grill the decisions that changed rather than guessing — the user answered against the old shape.

## Standing rules (these outrank every phase below)

Where a phase seems to instruct one of these, the rule wins. Do not reason your way past one because a phase says otherwise — that is exactly how each of these got broken.

1. **Never create a GitHub issue without an explicit yes.** Applies to flywheel proposals, follow-ups for descoped work, and anything else. Offer it in chat; file only on a yes. Default is not to file.
2. **Never tell the user how or when to merge.** Report PR state, stop.
3. **Native tools for anything touching files.** Read / Grep / Glob to read and search, Edit / Write to change. Never `grep`, `cat`, `sed`, `find`, `ls`, `rm`, heredocs or scripts through Bash — each one costs the user a permission prompt.
4. **One plain command per Bash call.** No `cd … &&` prefix (the cwd persists), no `&&` chains, no pipes into `jq`/`node -e`, no `until`/`while` polling loops. Compound commands get flagged for approval every time, and in a worktree session the guard rejects them outright. Never poll CI in a loop; phase 11 waits on one background `gh pr checks --watch` instead.
5. **Subagents inherit rules 3 and 4** — say so in their prompt, or they will flood the user with prompts.
6. **Ask before spawning subagents for anything the flow does not explicitly require.** Phases 5 and 8 name theirs; nothing else needs one.

## Phases

### 0. Worktree (before reading any code)
If invoked in the user's main checkout, create the worktree FIRST and read, grill, plan and implement inside it:

```
git fetch origin develop
git worktree add .claude/worktrees/<short-name> -b <branch> origin/develop
```

Then start dependency install in the background and read every file from the worktree path.

If the request is tied to a GitHub issue, move it to In progress on EVERY project board it is linked to (`gh issue view <n> --json projectItems`, then `gh project item-edit`; ids in the issue-in-progress-on-board memory). Do this now, not at the end: the board is read as "what is live".

This is phase 0, not phase 4, because the main checkout is routinely behind `develop`. Grilling and planning against it produces a plan for code that no longer exists — a whole feature can have been reworked since. Discovering that mid-implementation wastes the plan and forces re-grilling the user on decisions already made. It also keeps their working copy free, which was the original reason.

### 1. Grill
Invoke the `grilling` skill on the request. Iterate until the user confirms shared understanding.

### 2. Test runbook (approval gate)
Settle the runbook before any plan exists — the scenarios that define "working", each with its expected result. What the change should do is the user's decision, so the runbook is theirs.

- **They supplied one** (with the request, or at any point during the grill): it is the spec. Interrogate it instead of your own guess at the behaviour. Which scenarios are missing, what the denial path returns, what an empty dataset does, where it contradicts the code as it stands. Their answers amend it. Never rewrite, extend or reorder it silently.
- **They did not**: draft one from the grill conclusions and present it for confirmation or replacement.

Each entry names the action, the request where there is one, and the expected response and DB row. Write them from the requirement, never from an imagined implementation.

This is its own phase rather than a section of the plan so the runbook can itself be argued over ("you said 403, the endpoint currently returns 404 — which do you want?"). Buried in the plan it becomes one section of a document being approved for structure, and the behaviour question goes unread. The phase does not end until the user has confirmed the runbook.

### 3. Plan (approval gate)
Enter plan mode and write the plan, with the grill conclusions at the top of the plan file. Present it for approval.

The plan ends with two sections:

- **Acceptance checks**: the phase 2 runbook, copied in verbatim. This is the source for the phase 7 probes and the PR test tasks. Do not re-author, extend or reorder it. If writing the plan exposes a gap, say so and ask, because that is a behaviour decision and not a planning one.
- **Claude decides alone**: the forks most likely to come up in phases 4-11, each marked either with the answer Claude applies or with "stop and ask".

Example:

```markdown
## Acceptance checks
- Live test (UI): open a plan with no rows, click Export > Slides. Expect POST /api/fintory/export → 200 and a .pptx with 1 title slide, 0 data slides.
- Live test (backend): same POST with another team's plan id. Expect 403, no export row written.
- PR test tasks: the two above, plus "export a plan with 50 rows; deck has 50 rows across data slides".

## Claude decides alone
- No empty plan in the seed data: create one in the local DB.
- Button label or position differs from the plan: fine, test the behaviour.
- 403 comes back as 404: stop and ask.
```

On approval, save the grill conclusions + runbook + approved plan to `PLAN.local.md` in the worktree root. Never commit this file — when committing, stage files explicitly, never `git add -A`.

### 4. Implement
Execute the approved plan. Repo skills (backend-architecture / frontend-architecture / testing / yourtory-design-system) apply as normal. Commits on the feature branch are authorized as part of this flow.

Before leaving this phase, update the documentation the change made wrong or incomplete, and nothing else: the feature `CLAUDE.md` / README next to the code touched; `docs/`, ADRs and `.claude/skills/` that describe the changed behaviour; `../YourtoryDocument` only for architectural decisions or big changes. Write no new docs unless the plan called for them. Docs live here so they get simplified, verified and Codex-reviewed with the code.

### 5. Simplify
Invoke the `simplify` skill on the full diff. Then apply the user's contract to every survivor: remove defenses for rare cases whose failure is benign, remove speculative abstraction, and apply the comment rules (default zero new comments; see `~/.codex/AGENTS.md` and the yourtory-comment-style memory).

### 6. Verify (machine gate)
Run the repo's full verify (lint + type-check + test; `make verify`, or the direct script equivalents on Windows per the windows-dev-environment memory). Fix failures autonomously and re-run until green. Run the full suite ONCE here, not per-phase.

### 7. Live test (behaviour gate)
Verify proves the code compiles and the tests pass. It does not prove the change does what the plan says, and it cannot check an infra change at all. Exercise the changed behaviour for real by running the runbook in the plan's acceptance checks, scoped strictly to what this branch touched. Nothing else: no visuals, no screenshots, no regression tour of untouched screens.

This phase changes nothing in the repo. It adds no spec, fixture, script or CI step to `e2e-pw/`, `scripts/verify.sh` or the workflows, and it does not replace verify. Everything it creates is throwaway and is gone before the commit.

- **UI**: boot the app from the worktree and drive it with Playwright. Write a throwaway spec in `e2e-pw/` using the `authedContext` fixture, run it with `BASE_URL` and `E2E_JWT_TOKEN`, then delete it (never commit it). Check only the functionality the runbook describes: the click, submit or render, and the request it fires. Use the `@yourtory/e2e-pw` package, not the Playwright MCP (its default Chrome channel is not installed on this machine).
- **Backend**: boot the same way and hit the touched endpoints with real HTTP requests. The happy path per the runbook, plus one denial (no cookie, or another team's id). Compare the response and the DB row to what the runbook says, not to what the code does.
- **Infra**: probe only if the change is already applied somewhere reachable (dev or staging). Check it serves the right connections and denies the wrong ones: TLS required, IP outside the allowlist, a role without the grant, a workflow without the permission. If it is not applied yet, write the exact probe commands into the PR under Notes for Reviewer and into the final report, so they run straight after apply. Never apply infra in this phase.

Boot recipe, from the worktree only (never the main checkout), on port 3000 (Google OAuth is only registered for `localhost:3000`). If port 3000 is already listening, that is the user's server: do not kill it, ask. Migrate and seed the local DB (`pnpm --filter @yourtory/db db:migrate`, `pnpm --filter web db:seed`), mint the token with `pnpm tsx apps/web/src/scripts/gen-e2e-jwt.ts`, copy the main checkout's `apps/web/.env.local` into the worktree, and start `pnpm exec next dev --port 3000` in `apps/web` with the env the e2e job in `.github/workflows/ci.yml` uses (`AUTH_TRUST_HOST=true`, `NEXT_PUBLIC_ENV=local`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`). Stop the server and kill any orphan node process on the port when done, unless the user asks to keep it up.

Keep it quick. If the boot or login does not work after two attempts, or the check needs a real third party, seeded data states, or an environment that is not reachable, report "not live-tested: <reason>" with the probe you would have run, and move on. Do not build mocks or debug the harness to force it.

**On failure: diagnose and fix.** Do not stop at the first failure and hand back a "should I investigate?" choice. Probe until you know whether the cause is the harness, the branch's code, or something older than the branch. Fix harness problems and bugs in the branch's own code, then re-run. A fork listed under the plan's "Claude decides alone" follows that answer; "stop and ask" items go to the user. Otherwise go back to the user only when the fix needs a real decision: the runbook itself was wrong, the fix is a product or scope change such as an older bug outside the branch, or it needs access you don't have. Then report what the runbook expected, what happened, the probe that showed it, and the decision needed.

Record the outcome per runbook entry, and the whole phase in one line: what was exercised and the result, in the PR under Notes for Reviewer and in the final message.

### 8. Codex review (adversarial gate)
The review must be done by Codex — a different model family reviewing is the entire point. Never substitute a Claude-based review (no /code-review, no ultra).
- Run the Codex plugin review over the full branch diff, passing `PLAN.local.md` as the spec to check conformance against.
- Prompt framing: flag real bugs, spec mismatches, and unnecessary complexity. Do NOT flag missing defenses for vanishingly-rare cases whose failure is benign.
- Filter findings through the same rule before acting: fix confirmed real issues (re-run verify if code changed), and report defensive-coding suggestions to the user as "Codex suggested X, skipping because Y".

### 9. Flywheel check
Did this run surface a correction or failure that is a repeating class? If yes, route it per the `harness-flywheel` skill and PROPOSE the fixation to the user in chat — they decide.

**Never file it yourself.** No issue, no inbox entry, no `FLYWHEEL.local.md` append, unless the user answers yes. A proposal they never saw does not go anywhere; a proposal they saw and left unanswered stays in the final report as prose. Only file after an explicit yes, and then it is one issue labeled `flywheel` (English title, EN+JP body where the repo is bilingual).

The bar is high: most runs should produce zero. If nothing is a genuinely repeating class, say so in one line and move on.

### 10. Open PR
Run `git fetch origin develop`, then `git merge origin/develop`, because develop moves during a long run. Resolve any conflicts and re-run verify only if the merge changed code the branch touches. Push the branch and open a PR (`gh pr create --base develop --assignee @me`). Body = the repo template `.github/pull_request_template.md`, filled exactly — add nothing outside its sections:
- **Summary**: 2-4 plain-English sentences, then one-line bullets only if needed. No trailing "because/so that" clauses.
- **Screenshots / Demo**: KEEP this section and its placeholder table, always, exactly as the template has it, so the user can paste images in themselves. The phase 7 live test is functional only and produces no screenshots. Never delete it.
- **Notes for Reviewer** / **Concerns**: one-sentence bullets, only if there is something real to say; otherwise "None." The phase 7 outcome line (or its probe commands) always goes under Notes for Reviewer.
- **Test tasks**: always under Notes for Reviewer, as a `- [ ]` checklist headed "Test tasks". One task per runbook entry, in the runbook's order, rephrased as a manual action a person does in the product with its expected result. Example: "Go to Fintory and export an empty plan as a presentation slide deck. The deck downloads with a title slide and no data slides." For infra changes the tasks are the probes. The runbook sets the coverage and the count — do not invent extra tasks to pad it out, or drop ones that are awkward to phrase.
- Then repeat the WHOLE body in Japanese — Summary, Notes for Reviewer and Concerns, headings translated too. Screenshots / Demo is the only exclusion: it appears once, in the English half. The Japanese is a straight translation, never freewritten.
- `Closes #n` for every linked issue, so merge moves it to Done.
- No attribution footer, and no attribution line of any kind.

### 11. CI (GitHub gate)
GitHub Actions runs build, e2e and the preview deploy, which verify does not cover. Wait for that run and fix what it finds.

- Wait with one command, `gh pr checks <n> --watch --fail-fast`, run in the background so the session wakes when it exits. No loops, no sleeps.
- On a red check, read the failing job log (`gh run view <run-id> --log-failed`) and find the cause. Fix failures in the branch's own code, push, and wait again.
- A failure that looks flaky (passes locally, unrelated to the diff) gets one `gh run rerun <run-id> --failed`. If it fails again, treat it as real.
- A failure that is already red on develop, or needs access or a decision, goes to the user with the failing job, the log line and the cause. Do not fix it on this branch.
- Stop after three fix pushes and report what is still red.

### 12. Bookkeeping
GitHub-side only; docs were handled in phase 4.
- Confirm every linked issue is In progress on every board it sits on (phase 0 should have done this; fix it if not). Never set Done: that happens at merge via `Closes #n`.
- Comment on an issue only if the implementation diverged from what the issue describes (plan changed mid-development, partial fix). Otherwise no comment; the linked PR is enough.
- **Do NOT file follow-up issues.** Scope deliberately left out goes in the PR body under Concerns or Notes for Reviewer, and in the final report as prose. Then offer: "want these as issues?" and file only on a yes. Filing unasked inflates the backlog — the user's words: "2 issues are added for every one fixed. STOP adding them automatically."

## Completion
Report done only when: verify green, live test passed (or reported as not testable, with the probe), Codex findings resolved or explicitly skipped with reasons, PR open, PR checks green (or the remaining red reported per phase 11). Final message: plain-English wrap-up (no jargon), worktree location, PR link, the live-test outcome line, the CI result, the bookkeeping done (boards moved, issues commented), and the test runbook played back with results.

Play back the phase 2 runbook as the user settled it, in its order, with each entry annotated by what phase 7 did to it: passed, failed and fixed, or not exercised with the reason. Add only the detail needed to follow it without opening the code — where to run it (the PR's preview deploy, or local when the preview cannot exercise the change), any data setup needed first (for example "create a plan with no rows"), and the exact clicks or requests. Never add, drop or reorder entries, so a result maps straight back to a PR checkbox.

**Never tell the user how or when to merge.** No merge command, no "once CI is green, run…", no reminder that merging is their call. State the PR's status and stop. Their words: "Dont tell me how or when to merge."
