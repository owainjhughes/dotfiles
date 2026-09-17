// Stop hook: added-comment gate. Blocks the first stop of a chain when the working
// tree has newly added comment lines, so each one is justified or deleted before done.
// Comment lines that already existed at session start (another session's work) are
// excluded via the baseline snapshot written by comment-baseline.js.
const fs = require('fs')
const path = require('path')
const { collect } = require('./comment-scan-lib')

let data = ''
process.stdin.on('data', (c) => (data += c))
process.stdin.on('end', () => {
  let cwd = ''
  let sessionId = ''
  try {
    const input = JSON.parse(data)
    if (input.stop_hook_active) return
    cwd = input.cwd || ''
    sessionId = input.session_id || ''
  } catch {
    return
  }

  const current = collect(cwd)
  if (!current || current.lines.length === 0) return

  // baseline は root ごとに持つ。worktree と本チェックアウトを行き来すると root が変わり、
  // 単一 root では毎回「初見」に見えて同じ行を報告し続けるため。
  // The baseline is kept per root. Moving between a worktree and the main checkout changes the
  // root, and with a single root every stop looks like a first sighting and re-reports the same
  // lines.
  const statePath = path.join(__dirname, '.state', `comment-baseline-${sessionId}.json`)
  let state = { roots: {} }
  if (sessionId) {
    try {
      const raw = JSON.parse(fs.readFileSync(statePath, 'utf8'))
      state = raw.roots ? raw : { roots: raw.root ? { [raw.root]: raw.lines } : {} }
    } catch {}
  }

  const base = new Set(state.roots[current.root] || [])
  const found = current.lines.filter((line) => !base.has(line))

  if (found.length === 0) return

  // 一度ブロックした行は baseline に足して二度と報告しない。目的は 1 回の説明であって、
  // 停止のたびに同じ一覧を出すことではない。全行の貼り付けもしない (画面が埋まるため)。
  // Lines that have blocked once are folded into the baseline and never reported again: the
  // point is one justification pass, not the same list at every stop. The lines themselves are
  // not printed either, because that fills the screen.
  if (sessionId) {
    try {
      fs.mkdirSync(path.join(__dirname, '.state'), { recursive: true })
      state.roots[current.root] = current.lines
      fs.writeFileSync(statePath, JSON.stringify(state))
    } catch {}
  }

  console.log(
    JSON.stringify({
      decision: 'block',
      reason:
        `Added-comment gate: ${found.length} new comment line(s). ` +
        'Find them, delete any that explain what or how rather than a why a future agent could miss, and say which you kept and why.',
    }),
  )
})
