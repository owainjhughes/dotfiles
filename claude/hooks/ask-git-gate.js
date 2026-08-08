// PreToolUse(Bash) hook: protected-branch gate. Feature-branch commits, pushes
// and PR creation run freely; only writes that land on main/master/develop
// surface an "ask" prompt (blocked entirely in headless sessions).
const { execSync } = require('child_process')

const PROTECTED = /^(main|master|develop)$/

let data = ''
process.stdin.on('data', (c) => (data += c))
process.stdin.on('end', () => {
  let cmd = ''
  let cwd = ''
  try {
    const input = JSON.parse(data)
    cmd = input.tool_input.command || ''
    cwd = input.cwd || ''
  } catch {}

  // Match within one command segment (survives `cd x && git push`,
  // `git -C path push`, `git -c k=v commit`). False positives just re-prompt.
  if (!/\bgit\b[^|;&()]*\b(commit|push)\b/.test(cmd)) return

  // A push that names a protected branch is gated regardless of current branch.
  const namesProtected = /\bgit\b[^|;&()]*\bpush\b[^|;&()]*\b(main|master|develop)\b/.test(cmd)

  let onProtected = false
  if (!namesProtected) {
    try {
      const branch = execSync('git branch --show-current', {
        cwd: cwd || undefined,
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .toString()
        .trim()
      onProtected = PROTECTED.test(branch)
    } catch {
      return // not a git repo, or git missing — nothing to protect
    }
  }

  if (namesProtected || onProtected) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason:
            'Protected-branch gate: commits and pushes to main/master/develop need approval (~/.claude/hooks/ask-git-gate.js)',
        },
      }),
    )
  }
})
