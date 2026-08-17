# dotfiles

Personal agent and dev configuration for Windows.

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
| `claude/settings.json` | `~\.claude\settings.json` | Plugins and marketplaces (auto-install on first run), hook wiring, effort level, attribution stripped |
| `claude/hooks/ask-git-gate.js` | `~\.claude\hooks\` | Protected-branch gate: agents commit, push and open PRs freely on feature branches; main/master/develop asks first |
| `claude/hooks/comment-gate.js` | `~\.claude\hooks\` | Added-comment gate: blocks the first stop of a chain when the working tree has new comment lines, so each one is justified or deleted |
| `claude/hooks/herdr-agent-state.ps1` | `~\.claude\hooks\` | Reports session state to herdr when running inside one of its panes, and exits immediately when not |
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

Export copies the live files back into the repo, refreshes the extension list, removes the shipped skills from the lock file, and scrubs the machine-local state out of `claude/settings.json` and `codex/config.toml`: the current model, the `autoMode` work-environment notes, and the project trust levels, hook hashes and marketplace revisions Codex writes back on its own. It never touches git: reviewing the diff and committing what you actually want is the point. Two consecutive exports produce the same result, so anything showing up in `git diff` is real drift rather than churn.
