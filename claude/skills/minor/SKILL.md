---
name: minor
description: "Small fixes: implement the change, then sweep out unnecessary comments and simplify what changed. No gates, no verify, no commit."
disable-model-invocation: true
---

# /minor

The lightweight counterpart to /implement, for a small change. Often a follow-up after a long /implement session, sometimes just a one-off tweak. The point of the flow is that the change lands clean even when it is tiny: no comments that should not be there, no complexity the fix did not need.

Two phases, in order. The second one never gets skipped, however small the change.

Branch-agnostic. Run wherever the session already is, whether that is main, develop, or a feature branch. Never create a branch or a worktree.

Invoking `/minor` is the go-ahead. No grilling, no plan mode, no approval gate. Ask a question only when the request is genuinely ambiguous, by exception rather than by default.

**Escape hatch**: if the work turns out not to be minor, because it spans several subsystems or rests on a product decision or wants a reviewable plan, stop and say so, and point at /implement. Do not plow through.

## Phases

### 1. Implement
Make the change. Repo skills apply as normal (backend-architecture, frontend-architecture, yourtory-design-system, testing). Keep track of every file touched, because phase 2 needs exactly that list.

### 2a. Comment sweep, always
Re-read the diff of every file touched in phase 1, whatever kind of file it is: source, dotfile, config, YAML, shell script, `.gitignore`. Find every comment the change added and delete the ones that do not earn their place. A comment that explains what the code does or how gets deleted, and so does a JSDoc per prop or function. A comment survives only when it explains a why that a future agent reading the code could miss. Survivors stay at 1-2 tight lines, written in English and Japanese. See `~/.codex/AGENTS.md` and the yourtory-comment-style memory.

This half of the flow exists because that rule keeps getting ignored on changes that feel too small to be worth a review. A one-line addition to `.gitignore` came back with a comment explaining the line. Small is not an exemption, and no diff is too trivial for the sweep.

### 2b. Simplify, when there is code to simplify
Invoke the `simplify` skill, scoped to the files touched in phase 1 and nothing else. Other uncommitted work in the tree is off limits. Skip this half when the change touched no code, such as a dotfile or config edit.

Then apply the user's contract to every survivor:
- Remove defenses for rare cases whose failure is benign.
- Remove speculative abstraction, indirection, and generality the change does not need.

Flag genuine judgement calls to the user rather than deciding them.

## Out of scope
No lint, no type-check, no tests, no Codex review, no commit, no push, no PR. The change is left in the working tree for the user to check and commit.

## Completion
Report in plain English: what changed, and what the cleanup pass removed or flagged. Close by saying that nothing was verified or committed.
