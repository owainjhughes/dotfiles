// UserPromptSubmit/Stop/SessionEnd hook: mirror the session's task summary (the
// terminal title Claude Code sets) into the herdr pane's metadata title and the
// agents-panel label ("Claude · <task>"), so both the pane chrome and the left
// panel say what each agent is working on. SessionEnd clears both.
const { execFileSync } = require('child_process')

let data = ''
process.stdin.on('data', (c) => (data += c))
process.stdin.on('end', () => {
  if (process.env.HERDR_ENV !== '1') return
  const pane = process.env.HERDR_PANE_ID
  if (!pane) return

  let event = ''
  try {
    event = JSON.parse(data).hook_event_name || ''
  } catch {
    return
  }

  const herdr = (args) =>
    execFileSync('herdr', args, { stdio: ['ignore', 'pipe', 'ignore'], timeout: 3000 }).toString()

  try {
    if (event === 'SessionEnd') {
      herdr(['pane', 'report-metadata', pane, '--source', 'herdr:claude-hooks', '--clear-title', '--clear-display-agent'])
      return
    }
    const list = JSON.parse(herdr(['agent', 'list']))
    const agent = (list.result.agents || []).find((a) => a.pane_id === pane)
    if (!agent) return

    const title = agent.terminal_title_stripped
    if (!title || title === 'Claude Code') return
    herdr([
      'pane', 'report-metadata', pane, '--source', 'herdr:claude-hooks', '--agent', 'claude',
      '--title', title,
      '--display-agent', `Claude · ${title}`,
    ])
  } catch {}
})
