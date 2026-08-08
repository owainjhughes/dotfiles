# dotfiles

Personal agent and dev configuration for Windows, version-controlled so a brand-new machine goes from clone to developing with one script. This exists because the setup that matters day to day — [Claude Code](https://docs.anthropic.com/en/docs/claude-code) instructions and skills, [Codex](https://github.com/openai/codex) instructions, VS Code, git — took a long time to settle and lived on exactly one machine. Now it lives here.

It is a manually curated baseline, not a live mirror: nothing syncs automatically. When the live setup improves, the baseline is refreshed by hand and the diff reviewed before it lands (see [Updating the baseline](#updating-the-baseline)).

## 🚀 New machine

_Run in PowerShell:_

```powershell
git clone https://github.com/owainjhughes/dotfiles
cd dotfiles
.\install.ps1
```

That installs the missing tools (git, Node and VS Code via [winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/); Claude Code and Codex via npm), copies every config into place, restores the third-party skills from the lock file, and installs the VS Code extensions.

> [!NOTE]
> If winget had to install Node or VS Code, `npm` and `code` are not on PATH in the terminal that installed them. Open a new terminal and run `.\install.ps1` again — it is idempotent and skips everything already done.

_Then the only manual steps, because they are interactive logins:_

```powershell
gh auth login
claude    # log in on first run
codex     # log in on first run
```

## What's tracked

| Repo path | Installs to | What |
|---|---|---|
| `claude/CLAUDE.md` | `~\.claude\CLAUDE.md` | Global Claude Code instructions — working contract, simplicity rules, README style, commit and git-autonomy policy |
| `claude/settings.json` | `~\.claude\settings.json` | Model, plugins and marketplaces (auto-install on first run), hook wiring, attribution stripped |
| `claude/hooks/ask-git-gate.js` | `~\.claude\hooks\` | Protected-branch gate: agents commit, push and open PRs freely on feature branches; main/master/develop asks first |
| `claude/skills/` | `~\.claude\skills\<name>\` | Skills authored here (`implement`, `understand`), shipped with the repo |
| `codex/AGENTS.md` | `~\.codex\AGENTS.md` | Codex instructions, mirroring the Claude policies |
| `codex/config.toml` | `~\.codex\config.toml` | Codex model config |
| `agents/skill-lock.json` | `~\.agents\.skill-lock.json` | Third-party skills manifest — install restores each one from its GitHub source rather than vendoring it |
| `vscode/settings.json`, `vscode/keybindings.json` | `%APPDATA%\Code\User\` | VS Code editor config |
| `vscode/extensions.txt` | — | Extension list, looped through `code --install-extension` |
| `git/gitconfig` | `~\.gitconfig` | Git identity and defaults |

## Updating the baseline

_When the live setup has improved, from the repo root:_

```powershell
.\install.ps1 -Export
git diff
```

Export copies the live files back into the repo, re-scrubs `codex/config.toml` (the auto-managed machine-local block is dropped), refreshes the extension list, and removes the shipped skills from the lock file. It never touches git — reviewing the diff and committing what you actually want is the point.

## Deliberately not synced

- Credentials and tokens, ever. The install script only touches the files in the table above.
- Histories, sessions and agent memories — per-machine state, some of it large.
- `settings.local.json` — per-machine permission grants.

## Looking Forward

- **Windows-only.** The configs themselves are platform-neutral, so the day a non-Windows machine is real, an `install.sh` against that machine is all that's missing.
- **Never run on a truly fresh machine.** The install path is tested as a no-op on the machine it was exported from; the honest test is a clean Windows VM.
- **Skill restore shells out per source repo.** The skills CLI's own lockfile restore is project-scoped and experimental; when a global restore lands, `install.ps1` should use it instead of looping `skills add`.
- **No `harness/` yet.** The planned home for proven agentic-pipeline config (errors auto-drafted into issues, issues worked autonomously into PRs) once it has been built and earned inside a real project.
