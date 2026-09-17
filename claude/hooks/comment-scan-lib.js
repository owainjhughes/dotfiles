// Shared scanner for comment-gate.js (Stop) and comment-baseline.js (SessionStart):
// collects added comment lines from a checkout's working tree (diff vs HEAD + untracked).
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

// Returns { root, lines } or null when cwd is not a git checkout.
function collect(cwd) {
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
    return null // not a git repo, or git missing
  }

  try {
    for (const file of git('ls-files --others --exclude-standard', cwd).split('\n').filter(Boolean)) {
      if (SKIP.test(file) || !markersFor(file)) continue
      scan(file, fs.readFileSync(path.join(cwd, file), 'utf8').split('\n'), found)
    }
  } catch {}

  let root = ''
  try {
    root = git('rev-parse --show-toplevel', cwd).trim()
  } catch {}

  return { root, lines: found }
}

module.exports = { collect }
