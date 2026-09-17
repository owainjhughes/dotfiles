// PreToolUse(Bash|Edit|Write|NotebookEdit) hook: Claude may only touch files inside the
// allowed roots below. Edit/Write targets are checked directly; for Bash, every absolute
// path in the command (and any relative path that climbs out with ..) must be inside a root.
const os = require('os')
const path = require('path')

const HOME = os.homedir()
const ALLOWED_ROOTS = [].map(normalize)

const ALWAYS_ALLOWED = new Set(['/dev/null'])

function normalize(p) {
  let s = p.replace(/\\/g, '/')
  const gitBashDrive = s.match(/^\/([a-zA-Z])(\/|$)/)
  if (gitBashDrive) s = `${gitBashDrive[1]}:/${s.slice(3)}`
  return path.posix.normalize(s).replace(/\/$/, '').toLowerCase()
}

function isInside(p) {
  const n = normalize(p)
  return ALLOWED_ROOTS.some((root) => n === root || n.startsWith(`${root}/`))
}

function expandHome(token) {
  return token
    .replace(/^~(?=\/|\\|$)/, HOME)
    .replace(/^\$\{?HOME\}?/, HOME)
    .replace(/^%USERPROFILE%/i, HOME)
    .replace(/^\$env:USERPROFILE/i, HOME)
}

const ABSOLUTE = /^([a-zA-Z]:[\\/]|\/[a-zA-Z](\/|$)|\/(tmp|home|users|etc|var|usr|opt|mnt|private)(\/|$))/i

function outsidePaths(command, cwd) {
  const tokens = command.split(/[\s;|&<>()'"=`,]+/).filter(Boolean)
  const found = []
  for (const raw of tokens) {
    if (ALWAYS_ALLOWED.has(raw)) continue
    const token = expandHome(raw)
    if (ABSOLUTE.test(token)) {
      if (!isInside(token)) found.push(raw)
    } else if (/^\.\.([\\/]|$)/.test(token) && cwd) {
      if (!isInside(path.resolve(cwd, token))) found.push(raw)
    }
  }
  return found
}

function deny(reason) {
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `${reason} Allowed roots: ${ALLOWED_ROOTS.join(', ')} (~/.claude/hooks/write-boundary.js).`,
      },
    }),
  )
}

let data = ''
process.stdin.on('data', (c) => (data += c))
process.stdin.on('end', () => {
  let input
  try {
    input = JSON.parse(data)
  } catch {
    return
  }
  const toolInput = input.tool_input || {}

  if (input.tool_name === 'Bash') {
    const outside = outsidePaths(toolInput.command || '', input.cwd)
    if (outside.length > 0) deny(`Bash command references paths outside the allowed roots: ${outside.join(', ')}.`)
    return
  }

  const file = toolInput.file_path || toolInput.notebook_path
  if (file && !isInside(file)) deny(`${file} is outside the allowed roots.`)
})
