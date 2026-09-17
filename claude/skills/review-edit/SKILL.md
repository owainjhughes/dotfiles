---
name: review-edit
description: "The user's full review flow for a change someone else wrote. Explains it in plain English, finishes the bookkeeping the author skipped, simplifies, Codex review, verify, flywheel, push."
disable-model-invocation: true
---

# /review-edit

The review counterpart to `/implement`. Where `/implement` builds a change and hands it over, this one picks up a change that already exists, teaches the user what it is, and leaves it in the state the author should have left it in.

Run the phases strictly in order. Create one todo per phase before starting. A phase begins only when the previous one is complete. Never skip or reorder. The only human gate is phase 1, where the flow stops for the user's questions. Phases 2-8 run without asking. Stop mid-flow only for that, genuine scope changes, or destructive actions.

Use `/review-noedit` instead when the change should not be touched.

## Standing rules (these outrank every phase below)

Where a phase seems to instruct one of these, the rule wins. Do not reason your way past one because a phase says otherwise. That is exactly how each of these got broken.

1. **Never create a GitHub issue without an explicit yes.** Applies to flywheel proposals, follow-ups for descoped work, and anything else. Offer it in chat; file only on a yes. Default is not to file.
2. **Never tell the user how or when to merge.** Report PR state, stop.
3. **Native tools for anything touching files.** Read / Grep / Glob to read and search, Edit / Write to change. Never `grep`, `cat`, `sed`, `find`, `ls`, `rm`, heredocs or scripts through Bash, because each one costs the user a permission prompt.
4. **One plain command per Bash call.** No `cd … &&` prefix (the cwd persists), no `&&` chains, no pipes into `jq`/`node -e`, no `until`/`while` polling loops. Compound commands get flagged for approval every time, and in a worktree session the guard rejects them outright. Never poll CI in a loop.
5. **Subagents inherit rules 3 and 4.** Say so in their prompt, or they will flood the user with prompts.
6. **Ask before spawning subagents for anything the flow does not explicitly require.** Phase 4 names its own; nothing else needs one.

## Phases

### 0. Locate and worktree (before reading any code)

Resolve what is under review from the argument.

- `/review-edit 1586` reviews that PR. Run `gh pr view 1586` for the branch, title, body, linked issues and CI state.
- `/review-edit` with no argument reviews the current branch against `origin/develop`.

Always work in a worktree, never the user's main checkout, and check out the real branch rather than a detached copy, because phase 7 pushes it.

```
git fetch origin <branch>
git worktree add --track -b <branch> .claude/worktrees/review-<n> origin/<branch>
```

If the local branch already exists that fails; use `git worktree add .claude/worktrees/review-<n> <branch>` instead and pull.

Start dependency install in the background and read every file from the worktree path.

Then read the change before forming any view: the diff, the PR body, the linked issue or spec, and every ADR and doc that issue body cites. An ADR may already have decided a point you are about to argue against.

### 1. Explain (human gate)

Teach the user what this change is, in plain English. Write as a person explaining to a colleague, not as a model producing a summary. No Claudish: no "the key insight is", no colon-hinged labels, no verbless fragments, no "not X but Y", no metaphors, no em dashes. Short sentences with real verbs. Define any term the user may not have met rather than talking around it.

Cover, in this order:

1. **The problem.** What was broken or missing, why it existed, who it affected.
2. **The fix.** What the change actually does, why this approach and not the obvious alternative, what it costs.
3. **The blast radius.** What else this touches, and what would break if it is wrong.

Stay high level. Do not walk through line-level mechanics unless a piece is one of the two or three parts that really matter, or is a failure case that could bite. Going a layer too deep uninvited is the failure mode here.

Then **stop and wait.** Answer whatever the user asks, however many rounds it takes. Do not quiz them, do not ask them to play anything back, and do not append to the /understand knowledge base, which is `/understand`'s job rather than this one's. Move on when they say to, or when they ask nothing.

### 2. Bookkeeping the author skipped

Finish what the change should have come with. Fix each of these directly; do not produce a list for the user to work through.

GitHub side:

- Every linked issue is In progress on every board it sits on (`gh issue view <n> --json projectItems`, then `gh project item-edit`; ids in the issue-in-progress-on-board memory). Never set Done, which happens at merge.
- `Closes #n` present for every linked issue, so merge moves it.
- Assignee set (`gh pr edit --add-assignee`).
- PR body matches `.github/pull_request_template.md` exactly, with nothing outside its sections. Summary is 2-4 plain-English sentences, then one-line bullets if needed. The Screenshots / Demo section and its placeholder table stay, always. Notes for Reviewer and Concerns are one-sentence bullets, or "None." Then the whole body repeated in Japanese with the headings translated, a straight translation rather than freewritten. Screenshots / Demo appears once, in the English half. No attribution line of any kind.

Repo side. Update the documentation this change made wrong or incomplete, and nothing else:

- The feature `CLAUDE.md` or README next to the code touched.
- `docs/`, ADRs and `.claude/skills/` that describe the changed behaviour.
- `../YourtoryDocument` only for architectural decisions or big changes.

Write no new docs. Docs are fixed here so they get simplified, Codex-reviewed and verified along with the code.

### 3. Simplify and comment pass

Invoke the `simplify` skill on the full branch diff. Then apply the user's contract to every survivor:

- Remove defenses for cases that are vanishingly rare and whose failure is benign.
- Remove speculative abstraction, indirection, and generality the current requirement does not need.
- Delete comments that do not earn their place. The default is zero new comments, no JSDoc per prop or function; the why belongs in the PR body. A survivor is written in English and Japanese. See `~/.codex/AGENTS.md` and the yourtory-comment-style memory.

**Carve-out:** code that handles PII or money gets worst-case defense. Leave its guards alone.

Flag genuine judgement calls to the user rather than deciding them.

### 4. Codex review (adversarial gate)

The review must be done by Codex. A different model family reviewing is the entire point, so never substitute a Claude-based review (no /code-review, no ultra).

```
node "C:/Users/owain/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs" adversarial-review --wait --base origin/develop --scope branch "<focus text>"
```

Run it in the background with a long timeout; it takes several minutes. Do not poll it in a loop. `--help` is not usage text. It starts a real review that never returns.

Frame the focus text as: flag real bugs and spec mismatches against the linked issue. Do NOT flag missing defenses for vanishingly-rare cases whose failure is benign.

Filter findings through the same rule before acting. Fix confirmed real issues. Report defensive-coding suggestions to the user as "Codex suggested X, skipping because Y". Codex's sandbox is read-only and cannot create Vitest temp dirs, so "run the tests in a writable environment" is not a finding.

### 5. Verify (machine gate)

Run the repo's full verify (lint + type-check + test). Run it ONCE, here, not per-phase. It sits after Codex so a single run covers both the simplify pass and the Codex fixes.

On Windows run the three checks as separate commands rather than `verify.sh`, which hangs on a cold Docker (see the verify-hangs-on-cold-docker and windows-dev-environment memories). Never run two test suites at once; they share the test database.

Fix failures autonomously and re-run until green.

### 6. Flywheel check

Did this review surface a correction or failure that is a repeating class? If yes, route it per the `harness-flywheel` skill and PROPOSE the fixation to the user in chat. They decide.

**Never file it yourself.** No issue, no inbox entry, no `FLYWHEEL.local.md` append, unless the user answers yes. A proposal they saw and left unanswered stays in the final report as prose. Only file after an explicit yes, and then it is one issue labeled `flywheel`, English title, EN+JP body.

The bar is high and most runs should produce zero. If nothing is a genuinely repeating class, say so in one line and move on.

### 7. Commit and push

Stage files explicitly, never `git add -A`. One conventional commit covering the review pass (`chore(review): …`, or `fix(...)` / `docs(...)` if that describes it better), with no attribution footer of any kind. Push to the branch under review.

This flow pushes to a branch the user may not own. That is the user's standing decision for `/review-edit`, so do not re-ask it. Never push to `main`, `staging` or `develop`, never force-push, never merge.

### 8. Report

Chat only. Plain English, no jargon:

- What the change does and whether it looks sound.
- What the bookkeeping pass fixed: boards moved, PR body rewritten, docs corrected.
- What simplify removed, and any judgement calls left for the user.
- The Codex findings, fixed or skipped with the reason.
- Verify result.
- The flywheel proposal, if there is one, and that it has not been filed.
- The worktree path, the commit, and the PR's CI state as a fact.

Report done only when verify is green, Codex findings are resolved or explicitly skipped with reasons, and the branch is pushed.

**Never tell the user how or when to merge.** No merge command, no "once CI is green, run…", no reminder that merging is their call. State the PR's status and stop.
