// SessionStart hook: snapshot the comment lines already added in the checkout's
// working tree, so comment-gate.js only flags lines this session itself adds.
const fs = require('fs')
const path = require('path')
const { collect } = require('./comment-scan-lib')

const STATE_DIR = path.join(__dirname, '.state')
const PRUNE_MS = 7 * 24 * 60 * 60 * 1000

let data = ''
process.stdin.on('data', (c) => (data += c))
process.stdin.on('end', () => {
  let sessionId = ''
  let cwd = ''
  try {
    const input = JSON.parse(data)
    sessionId = input.session_id || ''
    cwd = input.cwd || ''
  } catch {
    return
  }
  if (!sessionId) return

  const snapshot = collect(cwd) || { root: '', lines: [] }

  try {
    fs.mkdirSync(STATE_DIR, { recursive: true })
    fs.writeFileSync(path.join(STATE_DIR, `comment-baseline-${sessionId}.json`), JSON.stringify(snapshot))
    for (const f of fs.readdirSync(STATE_DIR)) {
      const p = path.join(STATE_DIR, f)
      if (Date.now() - fs.statSync(p).mtimeMs > PRUNE_MS) fs.unlinkSync(p)
    }
  } catch {}
})
