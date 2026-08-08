# Personal instructions

## Code comments — minimal

- Do not write comments that restate code, justify a change, or add a doc block per declaration. Default for any change is zero new comments.
- A comment is allowed only for a constraint the code cannot show, in 1-2 tight lines. Rationale (WHY) belongs in the PR body or commit message, not the code.
- New comments are written EN+JP together.
- Existing comments: when touching the relevant code, you may update old comments to comply with these rules (trim or delete restatements). Do not rewrite comments in code you are not otherwise touching.

## README style (all repos, all future READMEs)

- Open with plain paragraphs saying what the thing is and why it exists — including the honest motivation ("built to learn X properly rather than to ship a product").
- Put a mermaid overview diagram near the top when there's architecture to show.
- Conversational but precise prose: full sentences, no marketing voice, the *why* explained inline.
- Show real artifacts, never invented ones — actual program output, real log lines, real frames — and say they're real ("That is a real frame").
- Give the one-command path first, then the manual/detailed path ("The quick way" / "The interesting way").
- Italicised one-line intros before command blocks (*"Run in the root of this repo:"*).
- GitHub callouts (`[!NOTE]`/`[!TIP]`/`[!IMPORTANT]`) for gotchas, including "this looks broken but is fine" warnings.
- Tables for enumerable facts (ports, endpoints, file maps); prose everywhere else.
- Emoji on operational headings only, sparingly; never in prose.
- End with an honest known-flaws section ("Looking Forward"), each item naming the proper fix.
- Link tools and libraries on first mention.

## Commits & PRs

- Conventional commits, always: `type(scope): imperative subject` ≤72 chars (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, …); body in plain English only when the why isn't obvious.
- PR descriptions: plain English, what changed and why, no boilerplate, no attribution of any kind.

## Git autonomy

- On feature branches: commit, push, and open PRs freely as part of approved work.
- Never commit or push directly to main/master/develop. Merging PRs is always the user's.
