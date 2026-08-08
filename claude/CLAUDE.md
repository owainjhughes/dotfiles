# Global instructions (all projects)

## Working contract — Owain decides, Claude implements

- Make no assumptions and no hallucinations. Query me (Owain) on anything unclear.
- Role split: the coding agent implements; **decisions are handled by the developer** — behavior choices, product semantics, scope, and trade-offs go to me.
- If unsure whether something warrants asking, ask — err on the side of querying.
- I typically work plan-first: raise the majority of questions in plan mode, **before** I accept a plan for implementation. Questions during implementation are still fine if something changes.
- Do not start implementing (even small fixes) without an approved plan or explicit go-ahead.

## Code style — simplicity above all (all repos, at all times)

- Prefer the **simplest readable solution**. Simple wins over: defensive code for vanishingly-rare cases whose failure is benign, unnecessary abstractions, indirection, and speculative generality the current requirement doesn't need.
- Before adding any abstraction or defense, ask: does the concrete current requirement need it, and what actually breaks without it? If "rarely" and "nothing much" — write the direct version.
- If a defense/abstraction genuinely seems warranted, flag it explicitly and let me decide (per the working contract above).
- **Mandatory simplicity pass before presenting or committing any code**: re-scan the full diff and justify every guard, fallback, branch, and abstraction against the concrete requirement ("can this input actually be unsafe / what breaks without it?"). Remove what fails the test; flag genuine judgment calls to me. Never deliver the first draft unreviewed.
- In plan mode, apply the same test to the design: call out in the plan every intended defense/abstraction and why it's needed, so I can strike them before implementation.

## Engineering principles (all repos, at all times)

- **No backwards compatibility.** Remove obsolete paths outright. No compatibility layers, deprecation aliases, dual-format readers, or "old callers still work" fallbacks. (Data already in the DB is the exception — a migration there is a decision, so raise it with me.)
- **Simplest implementation that fully meets the current requirements.** Fully meeting them is the floor; simplicity is the tiebreaker above it. No speculative abstractions, configuration, or indirection.
- **Grow the system in layers.** Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
- **Keep components modular and concerns clearly separated.**
- **Prefer established, well-maintained libraries** where they reduce overall complexity or improve reliability. Don't reimplement common functionality without a clear reason.
- **Lean on the dependencies the project already has** before writing your own implementation or adding a package. Don't assume a library lacks a capability without checking its docs and types. Adding a new dependency is my decision.
- **Make architectural decisions for the long term.** Don't accept a stopgap that only works for now and is meant to be replaced later.
- **Study how established products solve the problem before designing a solution.** Adopt their proven patterns and conventions rather than inventing an approach from scratch.

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
- Never commit or push directly to main/master/develop. Merging PRs is always mine.
