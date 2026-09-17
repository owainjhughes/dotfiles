// PreToolUse/PostToolUse(Edit|Write) hook: one session per checkout. The first session
// to edit a main checkout takes a lock (.git/claude-session.lock); an edit from a
// different session prompts for approval, and approving takes the lock over.
// Linked worktrees are exempt — they are single-session by construction.
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const STALE_MS = 60 * 60 * 1000 // a lock untouched for an hour is considered released

let data = ''
process.stdin.on('data', (c) => (data += c))
process.stdin.on('end', () => {
  let input
  try {
    input = JSON.parse(data)
  } catch {
    return
  }
  const sessionId = input.session_id
  const toolInput = input.tool_input || {}
  const file = toolInput.file_path || toolInput.notebook_path
  if (!sessionId || !file) return

  const dir = path.dirname(file)
  const git = (args) =>
    execSync(`git ${args}`, { cwd: dir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()

  let gitDir
  try {
    gitDir = git('rev-parse --absolute-git-dir')
    const commonDir = git('rev-parse --path-format=absolute --git-common-dir')
    if (path.resolve(commonDir) !== path.resolve(gitDir)) return // linked worktree
  } catch {
    return // not a git checkout — nothing to guard
  }

  const lockFile = path.join(gitDir, 'claude-session.lock')

  if (input.hook_event_name === 'PostToolUse') {
    // The edit ran (fresh claim, own lock, or approved takeover) — claim/refresh.
    try {
      fs.writeFileSync(lockFile, sessionId)
    } catch {}
    return
  }

  let holder = null
  try {
    if (Date.now() - fs.statSync(lockFile).mtimeMs < STALE_MS) {
      holder = fs.readFileSync(lockFile, 'utf8').trim()
    }
  } catch {}

  if (holder && holder !== sessionId) {
    // Name the holder by its herdr pane title when it runs in a pane; fall back to the id.
    let who = `session ${holder.slice(0, 8)}`
    try {
      const list = JSON.parse(
        execSync('herdr agent list', { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString(),
      )
      const agent = (list.result.agents || []).find((a) => a.agent_session && a.agent_session.value === holder)
      if (agent && agent.terminal_title_stripped) who = `the "${agent.terminal_title_stripped}" pane`
    } catch {}
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'ask',
          permissionDecisionReason: `One session per checkout: ${who} already holds this working tree (~/.claude/hooks/session-lock.js). Approving takes it over.`,
        },
      }),
    )
    return
  }

  try {
    fs.writeFileSync(lockFile, sessionId)
  } catch {}
})
