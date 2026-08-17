# Bootstrap a Windows machine from this repo (default), or pull the live
# config back into the repo for review (-Export).
param([switch]$Export)

$ErrorActionPreference = 'Stop'
$Repo = $PSScriptRoot
$CodeUser = "$env:APPDATA\Code\User"

# repo-relative path -> live absolute path
$Files = @(
    @{ repo = 'claude\CLAUDE.md';             live = "$HOME\.claude\CLAUDE.md" }
    @{ repo = 'claude\settings.json';         live = "$HOME\.claude\settings.json" }
    @{ repo = 'claude\hooks\ask-git-gate.js'; live = "$HOME\.claude\hooks\ask-git-gate.js" }
    @{ repo = 'claude\hooks\comment-gate.js'; live = "$HOME\.claude\hooks\comment-gate.js" }
    @{ repo = 'claude\hooks\herdr-agent-state.ps1'; live = "$HOME\.claude\hooks\herdr-agent-state.ps1" }
    @{ repo = 'codex\AGENTS.md';              live = "$HOME\.codex\AGENTS.md" }
    @{ repo = 'codex\config.toml';            live = "$HOME\.codex\config.toml" }
    @{ repo = 'git\gitconfig';                live = "$HOME\.gitconfig" }
    @{ repo = 'vscode\settings.json';         live = "$CodeUser\settings.json" }
    @{ repo = 'vscode\keybindings.json';      live = "$CodeUser\keybindings.json" }
)
$VendoredSkills = @('implement', 'understand')

function Copy-Into($source, $target) {
    $dir = Split-Path $target -Parent
    New-Item -ItemType Directory -Force $dir | Out-Null
    Copy-Item $source $target -Force
}

if ($Export) {
    foreach ($f in $Files) {
        if ($f.repo -eq 'codex\config.toml') { continue } # scrubbed below
        Copy-Into $f.live "$Repo\$($f.repo)"
    }

    # settings.json: drop the model and the work-specific autoMode notes
    node -e "const fs=require('fs'),f=process.argv[1],c=JSON.parse(fs.readFileSync(f,'utf8'));delete c.model;delete c.autoMode;fs.writeFileSync(f,JSON.stringify(c,null,2)+'\n')" "$Repo\claude\settings.json"

    # config.toml: drop the model and the per-machine state codex writes back
    $out = @(); $skip = $false
    foreach ($line in Get-Content "$HOME\.codex\config.toml") {
        if ($line -match '^# === nogic-extension (begin|end)') { continue }
        if ($line -match '^\[') { $skip = $line -match '^\[(projects\.|hooks\.state|mcp_servers\.nogic)' }
        if ($skip) { continue }
        if ($line -match '^(model|last_updated|last_revision) *=') { continue }
        $out += $line
    }
    New-Item -ItemType Directory -Force "$Repo\codex" | Out-Null
    ($out -join "`n").TrimEnd() + "`n" | Out-File "$Repo\codex\config.toml" -Encoding utf8 -NoNewline

    # skill lock: drop vendored skills, they ship with this repo
    $lock = Get-Content "$HOME\.agents\.skill-lock.json" -Raw | ConvertFrom-Json
    foreach ($name in $VendoredSkills) { $lock.skills.PSObject.Properties.Remove($name) }
    New-Item -ItemType Directory -Force "$Repo\agents" | Out-Null
    $lock | ConvertTo-Json -Depth 10 | Out-File "$Repo\agents\skill-lock.json" -Encoding utf8

    foreach ($name in $VendoredSkills) {
        New-Item -ItemType Directory -Force "$Repo\claude\skills\$name" | Out-Null
        Copy-Item "$HOME\.claude\skills\$name\*" "$Repo\claude\skills\$name\" -Recurse -Force
    }

    New-Item -ItemType Directory -Force "$Repo\vscode" | Out-Null
    code --list-extensions | Out-File "$Repo\vscode\extensions.txt" -Encoding utf8

    Write-Host "Exported. Review with 'git diff', then commit."
    exit 0
}

# --- Install ---

# Tools first; everything after assumes they exist.
$winget = @(
    @{ cmd = 'git';  id = 'Git.Git' }
    @{ cmd = 'node'; id = 'OpenJS.NodeJS.LTS' }
    @{ cmd = 'code'; id = 'Microsoft.VisualStudioCode' }
)
foreach ($t in $winget) {
    if (-not (Get-Command $t.cmd -ErrorAction SilentlyContinue)) {
        winget install --id $t.id -e --accept-source-agreements --accept-package-agreements
    }
}
foreach ($t in @(@{ cmd = 'claude'; pkg = '@anthropic-ai/claude-code' }, @{ cmd = 'codex'; pkg = '@openai/codex' })) {
    if (-not (Get-Command $t.cmd -ErrorAction SilentlyContinue)) {
        npm install -g $t.pkg
    }
}

foreach ($f in $Files) { Copy-Into "$Repo\$($f.repo)" $f.live }

foreach ($name in $VendoredSkills) {
    New-Item -ItemType Directory -Force "$HOME\.claude\skills\$name" | Out-Null
    Copy-Item "$Repo\claude\skills\$name\*" "$HOME\.claude\skills\$name\" -Recurse -Force
}

# Third-party skills: seed the lock, then reinstall each source repo globally.
Copy-Into "$Repo\agents\skill-lock.json" "$HOME\.agents\.skill-lock.json"
$lock = Get-Content "$Repo\agents\skill-lock.json" -Raw | ConvertFrom-Json
$bySource = @{}
foreach ($p in $lock.skills.PSObject.Properties) {
    if (-not $bySource.ContainsKey($p.Value.source)) { $bySource[$p.Value.source] = @() }
    $bySource[$p.Value.source] += $p.Name
}
foreach ($source in $bySource.Keys) {
    npx --yes skills add $source -g -y -s ($bySource[$source] -join ',')
}

foreach ($ext in Get-Content "$Repo\vscode\extensions.txt") {
    if ($ext.Trim()) { code --install-extension $ext.Trim() }
}

Write-Host ""
Write-Host "Done. Remaining manual steps (interactive logins):"
Write-Host "  gh auth login"
Write-Host "  claude   (log in on first run)"
Write-Host "  codex    (log in on first run)"
