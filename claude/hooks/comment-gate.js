// Stop hook: added-comment gate. Blocks the first stop of a chain when the working
// tree has newly added comment lines, so each one is justified or deleted before done.
const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const SLASH = ['//', '/*', '*/', '*', '{/*']
const HASH = ['#']
const DASH = ['--']
const ANGLE = ['<!--']

const BY_EXT = {
  js: SLASH, jsx: SLASH, mjs: SLASH, cjs: SLASH, ts: SLASH, tsx: SLASH, mts: SLASH, cts: SLASH,
  css: SLASH, scss: SLASH, less: SLASH, go: SLASH, java: SLASH, c: SLASH, h: SLASH, cpp: SLASH,
  rs: SLASH, swift: SLASH, kt: SLASH, php: SLASH, scala: SLASH, proto: SLASH,
  py: HASH, rb: HASH, sh: HASH, bash: HASH, zsh: HASH, ps1: HASH, yml: HASH, yaml: HASH,
  toml: HASH, ini: HASH, conf: HASH, tf: HASH, mk: HASH,
  sql: DASH,
  html: ANGLE, xml: ANGLE, svg: ANGLE,
  vue: SLASH.concat(ANGLE), svelte: SLASH.concat(ANGLE),
}

const BY_NAME = {
  '.gitignore': HASH, '.dockerignore': HASH, '.gitattributes': HASH, '.npmrc': HASH,
  '.editorconfig': HASH, '.prettierignore': HASH, '.eslintignore': HASH,
  dockerfile: HASH, makefile: HASH,
}

const SKIP = /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock)$|\.mdx?$/i

function markersFor(file) {
  const name = file.split('/').pop().toLowerCase()
  if (name.startsWith('.env')) return HASH
  if (BY_NAME[name]) return BY_NAME[name]
  return BY_EXT[name.includes('.') ? name.split('.').pop() : name] || null
}

function scan(file, lines, out) {
  if (SKIP.test(file)) return
  const markers = markersFor(file)
  if (!markers) return
  for (const raw of lines) {
    const text = raw.trim()
    if (!text || text.startsWith('#!')) continue
    if (markers.some((m) => text.startsWith(m))) out.push(`${file}: ${text}`)
  }
}

function git(args, cwd) {
  return execSync(`git ${args}`, {
    cwd: cwd || undefined,
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024,
  }).toString()
}

let data = ''
process.stdin.on('data', (c) => (data += c))
process.stdin.on('end', () => {
  let cwd = ''
  try {
    const input = JSON.parse(data)
    if (input.stop_hook_active) return
    cwd = input.cwd || ''
  } catch {
    return
  }

  const found = []

  try {
    let file = null
    let lines = []
    for (const line of git('diff -U0 HEAD', cwd).split('\n')) {
      if (line.startsWith('+++ b/')) {
        if (file) scan(file, lines, found)
        file = line.slice(6)
        lines = []
      } else if (file && line.startsWith('+') && !line.startsWith('+++')) {
        lines.push(line.slice(1))
      }
    }
    if (file) scan(file, lines, found)
  } catch {
    return // not a git repo, or git missing
  }

  try {
    for (const file of git('ls-files --others --exclude-standard', cwd).split('\n').filter(Boolean)) {
      if (SKIP.test(file) || !markersFor(file)) continue
      scan(file, fs.readFileSync(path.join(cwd, file), 'utf8').split('\n'), found)
    }
  } catch {}

  if (found.length === 0) return

  console.log(
    JSON.stringify({
      decision: 'block',
      reason: [
        `Added-comment gate (~/.claude/hooks/comment-gate.js): this change adds ${found.length} comment line(s).`,
        '',
        found.map((f) => `  ${f}`).join('\n'),
        '',
        'The default is zero new comments. Delete every one of these unless it states a',
        'non-obvious constraint a reader cannot get from the code itself. Rationale belongs',
        'in the PR body, not the file; config and dotfiles sit at the strictest end of the bar.',
        'A comment that genuinely earns its place is kept and written in English and Japanese,',
        'and you must say explicitly which ones you kept and why before finishing.',
      ].join('\n'),
    }),
  )
})
