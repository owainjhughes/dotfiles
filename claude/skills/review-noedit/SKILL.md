---
name: review-noedit
description: "Read-only review. Explains the change in plain English, checks it against the user's code principles, runs a Codex review, summarises. Writes nothing."
disable-model-invocation: true
---

# /review-noedit

The read-only half of the review pair. Use it on work that should not be touched, most often a colleague's open PR. Use `/review-edit` when the change is the user's to fix.

Run the phases strictly in order. Create one todo per phase before starting. Phase 1 ends in a stop and the flow waits for the user. Nothing else asks.

**This skill writes nothing.** No edits, no commits, no pushes, no GitHub comments, no issues. Every finding is prose in chat. If something clearly needs fixing, say so and stop. The user decides whether to run `/review-edit` or hand it back to the author.

## Standing rules (these outrank every phase below)

1. **Never create a GitHub issue without an explicit yes.** Offer in chat; file only on a yes. Default is not to file.
2. **Never tell the user how or when to merge.** Report PR state, stop.
3. **Native tools for anything touching files.** Read / Grep / Glob to read and search. Never `grep`, `cat`, `sed`, `find`, `ls`, `rm`, heredocs or scripts through Bash, because each one costs the user a permission prompt.
4. **One plain command per Bash call.** No `cd … &&` prefix (the cwd persists), no `&&` chains, no pipes into `jq`/`node -e`, no `until`/`while` polling loops. Compound commands get flagged for approval every time.
5. **Subagents inherit rules 3 and 4.** Say so in their prompt, or they will flood the user with prompts.
6. **Ask before spawning subagents.** No phase here requires one.

## Phases

### 0. Locate and check out

Resolve what is under review from the argument.

- `/review-noedit 1586` reviews that PR. Run `gh pr view 1586` for the branch, title, body, linked issues and CI state.
- `/review-noedit` with no argument reviews the current branch's diff against `origin/develop`.

Codex reads files from disk, so the code has to be local either way. If the branch is not already checked out, put it in a throwaway worktree:

```
git fetch origin <branch>
git worktree add .claude/worktrees/review-<n> origin/<branch>
```

Read every file from that path. The worktree is disposable, so say where it is in the final report and the user can delete it.

Then read the change: the diff, the PR body, and the linked issue or spec it claims to implement. Read every ADR and doc the issue body cites before forming a view. An ADR may already have decided a point you are about to argue against.

### 1. Explain (human gate)

First read the understanding knowledge base (`~/.claude/projects/<project>/memory/understanding-knowledge-base.md`). Anything listed there under Demonstrated is already his; do not explain it again, and do not define terms it shows he already uses. Explain only the delta this PR adds on top of what he knows.

Teach the user what this change is, in plain English. Write as a person explaining to a colleague, not as a model producing a summary. No Claudish: no "the key insight is", no colon-hinged labels, no verbless fragments, no "not X but Y", no metaphors, no em dashes. Short sentences with real verbs. Define any term the user may not have met rather than talking around it.

Cover, in this order:

1. **The problem.** What was broken or missing, why it existed, who it affected.
2. **The fix.** What the change actually does, why this approach and not the obvious alternative, what it costs.
3. **The blast radius.** What else this touches, and what would break if it is wrong.

Stay high level. Do not walk through line-level mechanics unless a piece is one of the two or three parts that really matter, or is a failure case that could bite. Going a layer too deep uninvited is the failure mode here.

Then **stop and wait.** Answer whatever the user asks, however many rounds it takes. Do not quiz them, do not ask them to play anything back, and do not append to the /understand knowledge base, which is `/understand`'s job rather than this one's. Move on when they say to, or when they ask nothing.

### 2. Principles pass

Check the diff against the user's code contract, and nothing else. Correctness is phase 3's job, so do not duplicate it here.

- Defenses for cases that are vanishingly rare and whose failure is benign.
- Speculative abstraction, indirection, and generality the current requirement does not need.
- Comments that should not be there. The default is zero new comments, no JSDoc per prop or function; the why belongs in the PR body. A comment that genuinely earns its place is written in English and Japanese. See `~/.codex/AGENTS.md` and the yourtory-comment-style memory.
- Repo-standard breaches, cited to the repo file that states the standard (`AGENTS.md`, a skill, an ADR). Never a personal preference dressed up as a rule.

**Carve-out:** code that handles PII or money gets worst-case defense. Do not flag a guard there as unnecessary.

Report each finding as what it is, where it is, and the smaller version that would replace it. Judgement calls go to the user as judgement calls, not verdicts.

### 3. Codex review

A different model family reviewing is the point, so never substitute a Claude-based review.

```
node "C:/Users/owain/.claude/plugins/cache/openai-codex/codex/1.0.6/scripts/codex-companion.mjs" adversarial-review --wait --base origin/develop --scope branch "<focus text>"
```

Run it in the background with a long timeout; it takes several minutes. Do not poll it in a loop. `--help` is not usage text. It starts a real review that never returns.

Frame the focus text as: flag real bugs and spec mismatches against the linked issue. Do NOT flag missing defenses for vanishingly-rare cases whose failure is benign.

Filter the findings through the same rule before reporting. Codex's sandbox is read-only and cannot create Vitest temp dirs, so "run the tests in a writable environment" is not a finding.

Fix nothing.

### 4. Summary

Chat only. Plain English, no jargon:

- One paragraph on what the change does and whether it looks sound.
- The principles findings, worst first.
- The Codex findings, worst first, with anything skipped and why.
- The worktree path, so the user can delete it.
- The PR's CI state as a fact, never a merge instruction.
