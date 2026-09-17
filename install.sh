#!/usr/bin/env bash
# Bootstrap a Debian/Ubuntu machine from this repo. Export stays in install.ps1,
# so the Windows machine is the only one the baseline is refreshed from.
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
CODE_USER="$HOME/.config/Code/User"

# repo-relative path -> live absolute path
FILES=(
    "claude/CLAUDE.md:$HOME/.claude/CLAUDE.md"
    "claude/settings.json:$HOME/.claude/settings.json"
    "claude/hooks/ask-git-gate.js:$HOME/.claude/hooks/ask-git-gate.js"
    "claude/hooks/comment-gate.js:$HOME/.claude/hooks/comment-gate.js"
    "claude/hooks/comment-baseline.js:$HOME/.claude/hooks/comment-baseline.js"
    "claude/hooks/comment-scan-lib.js:$HOME/.claude/hooks/comment-scan-lib.js"
    "claude/hooks/herdr-pane-title.js:$HOME/.claude/hooks/herdr-pane-title.js"
    "claude/hooks/session-lock.js:$HOME/.claude/hooks/session-lock.js"
    "claude/hooks/write-boundary.js:$HOME/.claude/hooks/write-boundary.js"
    "codex/AGENTS.md:$HOME/.codex/AGENTS.md"
    "codex/config.toml:$HOME/.codex/config.toml"
    "git/gitconfig:$HOME/.gitconfig"
    "vscode/settings.json:$CODE_USER/settings.json"
    "vscode/keybindings.json:$CODE_USER/keybindings.json"
)
VENDORED_SKILLS=(implement understand bro deliver flywheel-review minor review-edit review-noedit)

# Tools first; everything after assumes they exist.
if ! command -v git >/dev/null; then
    sudo apt-get update
    sudo apt-get install -y git
fi
if ! command -v node >/dev/null; then
    # Ubuntu's own nodejs package is too old for Claude Code
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
if ! command -v code >/dev/null; then
    curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor | sudo tee /usr/share/keyrings/microsoft.gpg >/dev/null
    echo "deb [arch=amd64,arm64,armhf signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/repos/code stable main" | sudo tee /etc/apt/sources.list.d/vscode.list >/dev/null
    sudo apt-get update
    sudo apt-get install -y code
fi
command -v claude >/dev/null || sudo npm install -g @anthropic-ai/claude-code
command -v codex >/dev/null || sudo npm install -g @openai/codex

for pair in "${FILES[@]}"; do
    live="${pair#*:}"
    mkdir -p "$(dirname "$live")"
    cp "$REPO/${pair%%:*}" "$live"
done

# herdr-agent-state.ps1 is herdr's PowerShell integration, and herdr writes its own
node -e "const fs=require('fs'),f=process.argv[1],c=JSON.parse(fs.readFileSync(f,'utf8'));c.hooks.SessionStart=c.hooks.SessionStart.map(g=>({...g,hooks:g.hooks.filter(h=>!h.command.includes('herdr-agent-state.ps1'))})).filter(g=>g.hooks.length);fs.writeFileSync(f,JSON.stringify(c,null,2)+'\n')" "$HOME/.claude/settings.json"

roots=()
echo "Folders Claude may touch, one per line (blank line to finish):"
while read -rp 'Allowed root: ' root && [ -n "$root" ]; do roots+=("$root"); done
node -e "const fs=require('fs'),[f,...r]=process.argv.slice(1);fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('const ALLOWED_ROOTS = []','const ALLOWED_ROOTS = [\n'+r.map(x=>\"  '\"+x+\"',\").join('\n')+'\n]'))" "$HOME/.claude/hooks/write-boundary.js" "${roots[@]}"

for name in "${VENDORED_SKILLS[@]}"; do
    mkdir -p "$HOME/.claude/skills/$name"
    cp -r "$REPO/claude/skills/$name/." "$HOME/.claude/skills/$name/"
done

# Third-party skills: seed the lock, then reinstall each source repo globally.
mkdir -p "$HOME/.agents"
cp "$REPO/agents/skill-lock.json" "$HOME/.agents/.skill-lock.json"
node -e "const s=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8').replace(/^﻿/,'')).skills,by={};for(const[n,v]of Object.entries(s))(by[v.source]??=[]).push(n);for(const[src,ns]of Object.entries(by))console.log(src,ns.join(','))" "$REPO/agents/skill-lock.json" |
    while read -r source names; do
        npx --yes skills add "$source" -g -y -s "$names" </dev/null
    done

while read -r ext; do
    ext="$(printf '%s' "$ext" | tr -d '\r\357\273\277')"
    if [ -n "$ext" ]; then code --install-extension "$ext"; fi
done <"$REPO/vscode/extensions.txt"

echo
echo "Done. Remaining manual steps (interactive logins):"
echo "  gh auth login"
echo "  claude   (log in on first run)"
echo "  codex    (log in on first run)"
